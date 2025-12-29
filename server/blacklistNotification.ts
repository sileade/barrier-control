import { notifyOwner } from "./_core/notification";
import { sendTelegramMessage } from "./telegramNotification";
import { BlacklistEntry } from "../drizzle/schema";

export type BlacklistDetectionData = {
  entry: BlacklistEntry;
  photoUrl?: string;
  timestamp: Date;
};

/**
 * Sends enhanced notification when a blacklisted vehicle is detected.
 * This sends both email and Telegram notifications with high priority.
 */
export async function notifyBlacklistDetection(data: BlacklistDetectionData): Promise<boolean> {
  const { entry, photoUrl, timestamp } = data;
  
  const formattedTime = timestamp.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const severityEmoji = getSeverityEmoji(entry.severity);
  const severityText = getSeverityText(entry.severity);

  // Email notification
  const title = `🚨 ВНИМАНИЕ: Обнаружен автомобиль из чёрного списка - ${entry.licensePlate}`;
  
  let content = `## Обнаружен заблокированный автомобиль!\n\n`;
  content += `**Уровень угрозы:** ${severityEmoji} ${severityText}\n\n`;
  content += `### Информация об автомобиле\n`;
  content += `- **Номер:** ${entry.licensePlate}\n`;
  if (entry.ownerName) content += `- **Владелец:** ${entry.ownerName}\n`;
  if (entry.vehicleModel) content += `- **Модель:** ${entry.vehicleModel}\n`;
  if (entry.vehicleColor) content += `- **Цвет:** ${entry.vehicleColor}\n`;
  content += `\n### Причина блокировки\n`;
  content += `${entry.reason || 'Не указана'}\n\n`;
  content += `### Детали обнаружения\n`;
  content += `- **Время:** ${formattedTime}\n`;
  content += `- **Попытка №:** ${entry.attemptCount + 1}\n`;
  if (entry.lastAttempt) {
    content += `- **Предыдущая попытка:** ${entry.lastAttempt.toLocaleString('ru-RU')}\n`;
  }
  content += `\n---\n`;
  content += `⚠️ **Шлагбаум НЕ был открыт. Доступ заблокирован.**`;

  try {
    // Send to Manus notification system
    const manusResult = await notifyOwner({ title, content });
    
    // Send to Telegram with enhanced formatting
    const telegramResult = await sendTelegramMessage({
      title: `${severityEmoji} ЧЁРНЫЙ СПИСОК: ${entry.licensePlate}`,
      content: formatTelegramBlacklistMessage(entry, formattedTime),
      photoUrl,
    });
    
    if (manusResult || telegramResult) {
      console.log(`[Blacklist] Detection notification sent for ${entry.licensePlate}`);
    }
    
    return manusResult || telegramResult;
  } catch (error) {
    console.error('[Blacklist] Error sending detection notification:', error);
    return false;
  }
}

function formatTelegramBlacklistMessage(entry: BlacklistEntry, formattedTime: string): string {
  const severityEmoji = getSeverityEmoji(entry.severity);
  const severityText = getSeverityText(entry.severity);
  
  let message = `🚨 Уровень: ${severityEmoji} ${severityText}\n\n`;
  message += `📋 Номер: ${entry.licensePlate}\n`;
  if (entry.ownerName) message += `👤 Владелец: ${entry.ownerName}\n`;
  if (entry.vehicleModel) message += `🚗 Модель: ${entry.vehicleModel}\n`;
  if (entry.vehicleColor) message += `🎨 Цвет: ${entry.vehicleColor}\n`;
  message += `\n📝 Причина: ${entry.reason || 'Не указана'}\n`;
  message += `\n🕐 Время: ${formattedTime}\n`;
  message += `🔢 Попытка №${entry.attemptCount + 1}\n`;
  message += `\n⛔ ДОСТУП ЗАБЛОКИРОВАН`;
  
  return message;
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

function getSeverityText(severity: string): string {
  switch (severity) {
    case 'critical': return 'КРИТИЧЕСКИЙ';
    case 'high': return 'ВЫСОКИЙ';
    case 'medium': return 'СРЕДНИЙ';
    case 'low': return 'НИЗКИЙ';
    default: return 'НЕ ОПРЕДЕЛЁН';
  }
}
