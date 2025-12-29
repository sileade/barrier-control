import { getSetting } from "./db";

export type TelegramNotificationPayload = {
  title: string;
  content: string;
  photoUrl?: string;
};

/**
 * Sends a message to Telegram using the Bot API.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID settings to be configured.
 */
export async function sendTelegramMessage(payload: TelegramNotificationPayload): Promise<boolean> {
  try {
    // Check if Telegram notifications are enabled
    const telegramEnabled = await getSetting('telegram_enabled');
    if (telegramEnabled?.value === 'false') {
      console.log('[Telegram] Telegram notifications are disabled');
      return false;
    }

    // Get bot token and chat ID from settings
    const botTokenSetting = await getSetting('telegram_bot_token');
    const chatIdSetting = await getSetting('telegram_chat_id');

    if (!botTokenSetting?.value || !chatIdSetting?.value) {
      console.warn('[Telegram] Bot token or chat ID not configured');
      return false;
    }

    const botToken = botTokenSetting.value;
    const chatId = chatIdSetting.value;

    // Format the message with HTML
    const message = formatTelegramMessage(payload);

    // Send the message
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to send message:', error);
      return false;
    }

    const result = await response.json();
    if (!result.ok) {
      console.error('[Telegram] API error:', result.description);
      return false;
    }

    console.log(`[Telegram] Message sent successfully to chat ${chatId}`);

    // If there's a photo, send it separately
    if (payload.photoUrl) {
      await sendTelegramPhoto(botToken, chatId, payload.photoUrl, payload.title);
    }

    return true;
  } catch (error) {
    console.error('[Telegram] Error sending message:', error);
    return false;
  }
}

/**
 * Sends a photo to Telegram.
 */
async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  photoUrl: string,
  caption?: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: caption ? `📷 ${caption}` : undefined,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Telegram] Failed to send photo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram] Error sending photo:', error);
    return false;
  }
}

/**
 * Formats the notification payload into a Telegram-friendly HTML message.
 */
function formatTelegramMessage(payload: TelegramNotificationPayload): string {
  let message = `<b>${escapeHtml(payload.title)}</b>\n\n`;
  message += escapeHtml(payload.content);
  return message;
}

/**
 * Escapes HTML special characters for Telegram.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Tests the Telegram connection by sending a test message.
 */
export async function testTelegramConnection(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const message = `✅ <b>Тест подключения</b>\n\nСистема управления шлагбаумом успешно подключена к Telegram!\n\n🕐 ${new Date().toLocaleString('ru-RU')}`;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      let errorMessage = 'Unknown error';
      try {
        const parsed = JSON.parse(error);
        errorMessage = parsed.description || error;
      } catch {
        errorMessage = error;
      }
      return { success: false, error: errorMessage };
    }

    const result = await response.json();
    if (!result.ok) {
      return { success: false, error: result.description };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

/**
 * Gets bot info to validate the token.
 */
export async function getBotInfo(botToken: string): Promise<{ success: boolean; botName?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Invalid bot token' };
    }

    const result = await response.json();
    if (!result.ok) {
      return { success: false, error: result.description };
    }

    return { 
      success: true, 
      botName: result.result.username 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}

// Notification helper functions that integrate with the existing notification system

/**
 * Sends unknown vehicle notification to Telegram.
 */
export async function telegramNotifyUnknownVehicle(data: {
  licensePlate: string;
  confidence: number;
  photoUrl?: string;
  timestamp: Date;
}): Promise<boolean> {
  const formattedTime = data.timestamp.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return sendTelegramMessage({
    title: `🚨 Неизвестный автомобиль: ${data.licensePlate}`,
    content: `📋 Номер: ${data.licensePlate}\n📊 Уверенность: ${data.confidence}%\n🕐 Время: ${formattedTime}\n\n⚠️ Автомобиль не зарегистрирован в базе данных`,
    photoUrl: data.photoUrl,
  });
}

/**
 * Sends manual barrier open notification to Telegram.
 */
export async function telegramNotifyManualOpen(data: {
  userName: string;
  userId: number;
  timestamp: Date;
  notes?: string;
}): Promise<boolean> {
  const formattedTime = data.timestamp.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  let content = `👤 Пользователь: ${data.userName} (ID: ${data.userId})\n🕐 Время: ${formattedTime}`;
  if (data.notes) {
    content += `\n📝 Примечание: ${data.notes}`;
  }

  return sendTelegramMessage({
    title: '🚧 Ручное открытие шлагбаума',
    content,
  });
}

/**
 * Sends unauthorized access notification to Telegram.
 */
export async function telegramNotifyUnauthorizedAccess(data: {
  licensePlate: string;
  attemptCount: number;
  timestamp: Date;
  photoUrl?: string;
}): Promise<boolean> {
  const formattedTime = data.timestamp.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return sendTelegramMessage({
    title: '⚠️ Попытка несанкционированного доступа',
    content: `📋 Номер: ${data.licensePlate}\n🔢 Попыток: ${data.attemptCount}\n🕐 Время: ${formattedTime}\n\n🔴 Рекомендуется проверить камеру`,
    photoUrl: data.photoUrl,
  });
}

/**
 * Sends allowed vehicle passage notification to Telegram.
 */
export async function telegramNotifyAllowedPassage(data: {
  licensePlate: string;
  ownerName?: string;
  timestamp: Date;
}): Promise<boolean> {
  // Check if allowed passage notifications are enabled
  const notifyAllowed = await getSetting('telegram_notify_allowed');
  if (notifyAllowed?.value !== 'true') {
    return false;
  }

  const formattedTime = data.timestamp.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  let content = `📋 Номер: ${data.licensePlate}\n🕐 Время: ${formattedTime}`;
  if (data.ownerName) {
    content += `\n👤 Владелец: ${data.ownerName}`;
  }

  return sendTelegramMessage({
    title: '✅ Разрешённый проезд',
    content,
  });
}
