import { notifyOwner } from "./_core/notification";
import { getSetting } from "./db";
import { telegramNotifyUnknownVehicle, telegramNotifyManualOpen, telegramNotifyUnauthorizedAccess } from "./telegramNotification";

export type UnknownVehicleNotification = {
  licensePlate: string;
  confidence: number;
  photoUrl?: string;
  timestamp: Date;
};

/**
 * Sends notification to the owner when an unknown vehicle is detected.
 * Uses the built-in Manus notification service.
 */
export async function notifyUnknownVehicle(data: UnknownVehicleNotification): Promise<boolean> {
  // Check if notifications are enabled
  const notificationEnabled = await getSetting('notifications_enabled');
  if (notificationEnabled?.value === 'false') {
    console.log('[Notification] Notifications are disabled');
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

  const title = `🚨 Неизвестный автомобиль: ${data.licensePlate}`;
  
  let content = `**Обнаружен неизвестный автомобиль**\n\n`;
  content += `📋 **Номер:** ${data.licensePlate}\n`;
  content += `📊 **Уверенность распознавания:** ${data.confidence}%\n`;
  content += `🕐 **Время:** ${formattedTime}\n`;
  
  if (data.photoUrl) {
    content += `\n📷 **Фото:** ${data.photoUrl}\n`;
  }
  
  content += `\n---\n`;
  content += `Этот автомобиль не зарегистрирован в базе данных разрешённых транспортных средств.\n`;
  content += `Для добавления в базу перейдите в раздел "Vehicles" панели управления.`;

  try {
    // Send to Manus notification system
    const manusResult = await notifyOwner({ title, content });
    
    // Send to Telegram
    const telegramResult = await telegramNotifyUnknownVehicle(data);
    
    if (manusResult || telegramResult) {
      console.log(`[Notification] Unknown vehicle notification sent for ${data.licensePlate}`);
    } else {
      console.warn(`[Notification] Failed to send notification for ${data.licensePlate}`);
    }
    return manusResult || telegramResult;
  } catch (error) {
    console.error('[Notification] Error sending unknown vehicle notification:', error);
    return false;
  }
}

/**
 * Sends notification when manual barrier open is triggered.
 */
export async function notifyManualBarrierOpen(data: {
  userName: string;
  userId: number;
  timestamp: Date;
  notes?: string;
}): Promise<boolean> {
  const notificationEnabled = await getSetting('notifications_enabled');
  if (notificationEnabled?.value === 'false') {
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

  const title = `🚧 Ручное открытие шлагбаума`;
  
  let content = `**Шлагбаум открыт вручную**\n\n`;
  content += `👤 **Пользователь:** ${data.userName} (ID: ${data.userId})\n`;
  content += `🕐 **Время:** ${formattedTime}\n`;
  
  if (data.notes) {
    content += `📝 **Примечание:** ${data.notes}\n`;
  }

  try {
    // Send to Manus notification system
    const manusResult = await notifyOwner({ title, content });
    
    // Send to Telegram
    const telegramResult = await telegramNotifyManualOpen(data);
    
    return manusResult || telegramResult;
  } catch (error) {
    console.error('[Notification] Error sending manual open notification:', error);
    return false;
  }
}

/**
 * Sends notification for unauthorized access attempts.
 */
export async function notifyUnauthorizedAccess(data: {
  licensePlate: string;
  attemptCount: number;
  timestamp: Date;
  photoUrl?: string;
}): Promise<boolean> {
  const notificationEnabled = await getSetting('notifications_enabled');
  if (notificationEnabled?.value === 'false') {
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

  const title = `⚠️ Попытка несанкционированного доступа`;
  
  let content = `**Обнаружена попытка несанкционированного доступа**\n\n`;
  content += `📋 **Номер:** ${data.licensePlate}\n`;
  content += `🔢 **Количество попыток:** ${data.attemptCount}\n`;
  content += `🕐 **Время:** ${formattedTime}\n`;
  
  if (data.photoUrl) {
    content += `\n📷 **Фото:** ${data.photoUrl}\n`;
  }
  
  content += `\n---\n`;
  content += `Рекомендуется проверить камеру видеонаблюдения.`;

  try {
    // Send to Manus notification system
    const manusResult = await notifyOwner({ title, content });
    
    // Send to Telegram
    const telegramResult = await telegramNotifyUnauthorizedAccess(data);
    
    return manusResult || telegramResult;
  } catch (error) {
    console.error('[Notification] Error sending unauthorized access notification:', error);
    return false;
  }
}

/**
 * Sends daily summary notification.
 */
export async function notifyDailySummary(data: {
  date: Date;
  totalPassages: number;
  allowedPassages: number;
  deniedPassages: number;
  manualOpens: number;
  unknownVehicles: number;
}): Promise<boolean> {
  const notificationEnabled = await getSetting('daily_summary_enabled');
  if (notificationEnabled?.value === 'false') {
    return false;
  }

  const formattedDate = data.date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const title = `📊 Ежедневный отчёт: ${formattedDate}`;
  
  let content = `**Статистика за ${formattedDate}**\n\n`;
  content += `📈 **Всего проездов:** ${data.totalPassages}\n`;
  content += `✅ **Разрешено:** ${data.allowedPassages}\n`;
  content += `❌ **Отказано:** ${data.deniedPassages}\n`;
  content += `🔓 **Ручных открытий:** ${data.manualOpens}\n`;
  content += `❓ **Неизвестных авто:** ${data.unknownVehicles}\n`;
  
  const successRate = data.totalPassages > 0 
    ? ((data.allowedPassages / data.totalPassages) * 100).toFixed(1) 
    : '0';
  content += `\n📊 **Процент успешных проездов:** ${successRate}%`;

  try {
    return await notifyOwner({ title, content });
  } catch (error) {
    console.error('[Notification] Error sending daily summary:', error);
    return false;
  }
}
