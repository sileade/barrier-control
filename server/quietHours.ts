import { getSetting, createPendingNotification, getPendingNotifications, markNotificationsSent } from "./db";
import { notifyOwner } from "./_core/notification";
import { sendTelegramMessage } from "./telegramNotification";

export type NotificationType = "unknown_vehicle" | "blacklist_detected" | "manual_open" | "unauthorized_access";
export type Severity = "low" | "medium" | "high" | "critical";

export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  licensePlate?: string;
  photoUrl?: string;
  severity?: Severity;
}

/**
 * Check if current time is within quiet hours
 */
export async function isQuietHoursActive(): Promise<boolean> {
  const enabled = await getSetting("quietHoursEnabled");
  if (!enabled || enabled.value !== "true") {
    return false;
  }

  const startTime = await getSetting("quietHoursStart");
  const endTime = await getSetting("quietHoursEnd");

  if (!startTime?.value || !endTime?.value) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = startTime.value.split(":").map(Number);
  const [endHour, endMinute] = endTime.value.split(":").map(Number);
  const startTimeMinutes = startHour * 60 + startMinute;
  const endTimeMinutes = endHour * 60 + endMinute;

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startTimeMinutes > endTimeMinutes) {
    return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
  }

  // Normal range (e.g., 01:00 - 06:00)
  return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
}

/**
 * Check if notification should bypass quiet hours based on severity
 */
export async function shouldBypassQuietHours(severity: Severity): Promise<boolean> {
  const bypassCritical = await getSetting("quietHoursBypassCritical");
  
  if (bypassCritical?.value === "true") {
    return severity === "critical" || severity === "high";
  }
  
  return false;
}

/**
 * Queue notification for later delivery or send immediately
 */
export async function queueOrSendNotification(data: NotificationData): Promise<{ queued: boolean; sent: boolean }> {
  const severity = data.severity || "medium";
  const isQuietHours = await isQuietHoursActive();
  const shouldBypass = await shouldBypassQuietHours(severity);

  // If not in quiet hours or should bypass, send immediately
  if (!isQuietHours || shouldBypass) {
    const sent = await sendNotificationImmediately(data);
    return { queued: false, sent };
  }

  // Queue the notification
  await createPendingNotification({
    type: data.type,
    title: data.title,
    message: data.message,
    licensePlate: data.licensePlate,
    photoUrl: data.photoUrl,
    severity,
  });

  console.log(`[QuietHours] Notification queued: ${data.title}`);
  return { queued: true, sent: false };
}

/**
 * Send notification immediately via all configured channels
 */
async function sendNotificationImmediately(data: NotificationData): Promise<boolean> {
  let success = false;

  try {
    // Send via owner notification (email)
    const emailResult = await notifyOwner({
      title: data.title,
      content: data.message,
    });
    if (emailResult) success = true;
  } catch (error) {
    console.error("[QuietHours] Failed to send email notification:", error);
  }

  try {
    // Send via Telegram
    const telegramEnabled = await getSetting("telegram_enabled");
    if (telegramEnabled?.value === "true") {
      const telegramResult = await sendTelegramMessage({ title: data.title, content: data.message });
      if (telegramResult) success = true;
    }
  } catch (error) {
    console.error("[QuietHours] Failed to send Telegram notification:", error);
  }

  return success;
}

/**
 * Send all pending notifications as a summary
 */
export async function sendPendingSummary(): Promise<{ sent: number; failed: number }> {
  const pending = await getPendingNotifications(true);
  
  if (pending.length === 0) {
    console.log("[QuietHours] No pending notifications to send");
    return { sent: 0, failed: 0 };
  }

  // Group notifications by type
  const grouped = pending.reduce((acc, notification) => {
    const type = notification.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(notification);
    return acc;
  }, {} as Record<string, typeof pending>);

  // Build summary message
  let summaryTitle = `📋 Сводка уведомлений (${pending.length})`;
  let summaryMessage = `За время тихих часов накопилось ${pending.length} уведомлений:\n\n`;

  const typeLabels: Record<string, string> = {
    unknown_vehicle: "🚗 Неизвестные автомобили",
    blacklist_detected: "🚫 Обнаружены из чёрного списка",
    manual_open: "🔓 Ручные открытия",
    unauthorized_access: "⚠️ Попытки несанкционированного доступа",
  };

  for (const [type, notifications] of Object.entries(grouped)) {
    const label = typeLabels[type] || type;
    summaryMessage += `**${label}** (${notifications.length}):\n`;
    
    for (const n of notifications.slice(0, 5)) {
      const time = new Date(n.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
      const plate = n.licensePlate ? ` [${n.licensePlate}]` : "";
      summaryMessage += `  • ${time}${plate}: ${n.title}\n`;
    }
    
    if (notifications.length > 5) {
      summaryMessage += `  ... и ещё ${notifications.length - 5}\n`;
    }
    summaryMessage += "\n";
  }

  // Send summary
  let sent = 0;
  let failed = 0;

  try {
    const emailResult = await notifyOwner({
      title: summaryTitle,
      content: summaryMessage,
    });
    if (emailResult) sent++;
  } catch (error) {
    console.error("[QuietHours] Failed to send summary email:", error);
    failed++;
  }

  try {
    const telegramEnabled = await getSetting("telegram_enabled");
    if (telegramEnabled?.value === "true") {
      const telegramResult = await sendTelegramMessage({ title: summaryTitle, content: summaryMessage });
      if (telegramResult) sent++;
    }
  } catch (error) {
    console.error("[QuietHours] Failed to send summary to Telegram:", error);
    failed++;
  }

  // Mark all as sent
  if (sent > 0) {
    const ids = pending.map(n => n.id);
    await markNotificationsSent(ids);
    console.log(`[QuietHours] Marked ${ids.length} notifications as sent`);
  }

  return { sent, failed };
}

/**
 * Get quiet hours configuration
 */
export async function getQuietHoursConfig(): Promise<{
  enabled: boolean;
  startTime: string;
  endTime: string;
  bypassCritical: boolean;
}> {
  const enabled = await getSetting("quietHoursEnabled");
  const startTime = await getSetting("quietHoursStart");
  const endTime = await getSetting("quietHoursEnd");
  const bypassCritical = await getSetting("quietHoursBypassCritical");

  return {
    enabled: enabled?.value === "true",
    startTime: startTime?.value || "22:00",
    endTime: endTime?.value || "07:00",
    bypassCritical: bypassCritical?.value === "true",
  };
}
