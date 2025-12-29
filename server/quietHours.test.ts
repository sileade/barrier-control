import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database functions
vi.mock("./db", () => ({
  getSetting: vi.fn(),
  createPendingNotification: vi.fn(),
  getPendingNotifications: vi.fn(),
  markNotificationsSent: vi.fn(),
}));

// Mock notification services
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(),
}));

vi.mock("./telegramNotification", () => ({
  sendTelegramMessage: vi.fn(),
}));

import { getSetting, createPendingNotification, getPendingNotifications, markNotificationsSent } from "./db";
import { notifyOwner } from "./_core/notification";
import { sendTelegramMessage } from "./telegramNotification";
import { 
  isQuietHoursActive, 
  shouldBypassQuietHours, 
  queueOrSendNotification,
  sendPendingSummary,
  getQuietHoursConfig
} from "./quietHours";

describe("Quiet Hours Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe("isQuietHoursActive", () => {
    it("returns false when quiet hours are disabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ id: 1, key: "quietHoursEnabled", value: "false", description: null, updatedAt: new Date() });
      
      const result = await isQuietHoursActive();
      expect(result).toBe(false);
    });

    it("returns false when quiet hours setting is missing", async () => {
      vi.mocked(getSetting).mockResolvedValue(null);
      
      const result = await isQuietHoursActive();
      expect(result).toBe(false);
    });

    it("returns true when current time is within quiet hours (normal range)", async () => {
      // Set time to 03:00
      vi.setSystemTime(new Date("2025-01-15T03:00:00"));
      
      vi.mocked(getSetting)
        .mockResolvedValueOnce({ id: 1, key: "quietHoursEnabled", value: "true", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 2, key: "quietHoursStart", value: "01:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 3, key: "quietHoursEnd", value: "06:00", description: null, updatedAt: new Date() });
      
      const result = await isQuietHoursActive();
      expect(result).toBe(true);
    });

    it("returns true when current time is within overnight quiet hours", async () => {
      // Set time to 23:30
      vi.setSystemTime(new Date("2025-01-15T23:30:00"));
      
      vi.mocked(getSetting)
        .mockResolvedValueOnce({ id: 1, key: "quietHoursEnabled", value: "true", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 2, key: "quietHoursStart", value: "22:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 3, key: "quietHoursEnd", value: "07:00", description: null, updatedAt: new Date() });
      
      const result = await isQuietHoursActive();
      expect(result).toBe(true);
    });

    it("returns false when current time is outside quiet hours", async () => {
      // Set time to 12:00
      vi.setSystemTime(new Date("2025-01-15T12:00:00"));
      
      vi.mocked(getSetting)
        .mockResolvedValueOnce({ id: 1, key: "quietHoursEnabled", value: "true", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 2, key: "quietHoursStart", value: "22:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 3, key: "quietHoursEnd", value: "07:00", description: null, updatedAt: new Date() });
      
      const result = await isQuietHoursActive();
      expect(result).toBe(false);
    });
  });

  describe("shouldBypassQuietHours", () => {
    it("returns true for critical severity when bypass is enabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ id: 1, key: "quietHoursBypassCritical", value: "true", description: null, updatedAt: new Date() });
      
      const result = await shouldBypassQuietHours("critical");
      expect(result).toBe(true);
    });

    it("returns true for high severity when bypass is enabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ id: 1, key: "quietHoursBypassCritical", value: "true", description: null, updatedAt: new Date() });
      
      const result = await shouldBypassQuietHours("high");
      expect(result).toBe(true);
    });

    it("returns false for medium severity even when bypass is enabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ id: 1, key: "quietHoursBypassCritical", value: "true", description: null, updatedAt: new Date() });
      
      const result = await shouldBypassQuietHours("medium");
      expect(result).toBe(false);
    });

    it("returns false for critical severity when bypass is disabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ id: 1, key: "quietHoursBypassCritical", value: "false", description: null, updatedAt: new Date() });
      
      const result = await shouldBypassQuietHours("critical");
      expect(result).toBe(false);
    });
  });

  describe("queueOrSendNotification", () => {
    it("sends notification immediately when not in quiet hours", async () => {
      // Set time to 12:00 (outside quiet hours)
      vi.setSystemTime(new Date("2025-01-15T12:00:00"));
      
      vi.mocked(getSetting)
        .mockResolvedValueOnce({ id: 1, key: "quietHoursEnabled", value: "true", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 2, key: "quietHoursStart", value: "22:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 3, key: "quietHoursEnd", value: "07:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 4, key: "quietHoursBypassCritical", value: "false", description: null, updatedAt: new Date() });
      
      vi.mocked(notifyOwner).mockResolvedValue(true);
      vi.mocked(getSetting).mockResolvedValueOnce({ id: 5, key: "telegram_enabled", value: "false", description: null, updatedAt: new Date() });
      
      const result = await queueOrSendNotification({
        type: "unknown_vehicle",
        title: "Test",
        message: "Test message",
        severity: "medium",
      });
      
      expect(result.queued).toBe(false);
      expect(result.sent).toBe(true);
      expect(notifyOwner).toHaveBeenCalled();
    });

    it("queues notification during quiet hours", async () => {
      // Set time to 03:00 (inside quiet hours)
      vi.setSystemTime(new Date("2025-01-15T03:00:00"));
      
      vi.mocked(getSetting)
        .mockResolvedValueOnce({ id: 1, key: "quietHoursEnabled", value: "true", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 2, key: "quietHoursStart", value: "22:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 3, key: "quietHoursEnd", value: "07:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 4, key: "quietHoursBypassCritical", value: "false", description: null, updatedAt: new Date() });
      
      vi.mocked(createPendingNotification).mockResolvedValue({ id: 1 });
      
      const result = await queueOrSendNotification({
        type: "unknown_vehicle",
        title: "Test",
        message: "Test message",
        severity: "medium",
      });
      
      expect(result.queued).toBe(true);
      expect(result.sent).toBe(false);
      expect(createPendingNotification).toHaveBeenCalled();
    });

    it("sends critical notification immediately even during quiet hours", async () => {
      // Set time to 03:00 (inside quiet hours)
      vi.setSystemTime(new Date("2025-01-15T03:00:00"));
      
      vi.mocked(getSetting)
        .mockResolvedValueOnce({ id: 1, key: "quietHoursEnabled", value: "true", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 2, key: "quietHoursStart", value: "22:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 3, key: "quietHoursEnd", value: "07:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 4, key: "quietHoursBypassCritical", value: "true", description: null, updatedAt: new Date() });
      
      vi.mocked(notifyOwner).mockResolvedValue(true);
      vi.mocked(getSetting).mockResolvedValueOnce({ id: 5, key: "telegram_enabled", value: "false", description: null, updatedAt: new Date() });
      
      const result = await queueOrSendNotification({
        type: "blacklist_detected",
        title: "Critical Alert",
        message: "Blacklisted vehicle detected",
        severity: "critical",
      });
      
      expect(result.queued).toBe(false);
      expect(result.sent).toBe(true);
      expect(notifyOwner).toHaveBeenCalled();
    });
  });

  describe("sendPendingSummary", () => {
    it("returns zero counts when no pending notifications", async () => {
      vi.mocked(getPendingNotifications).mockResolvedValue([]);
      
      const result = await sendPendingSummary();
      
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("sends summary and marks notifications as sent", async () => {
      const mockNotifications = [
        { id: 1, type: "unknown_vehicle" as const, title: "Test 1", message: "Message 1", licensePlate: "A123BC", photoUrl: null, severity: "medium" as const, isSent: false, sentAt: null, createdAt: new Date() },
        { id: 2, type: "blacklist_detected" as const, title: "Test 2", message: "Message 2", licensePlate: "X789YZ", photoUrl: null, severity: "high" as const, isSent: false, sentAt: null, createdAt: new Date() },
      ];
      
      vi.mocked(getPendingNotifications).mockResolvedValue(mockNotifications);
      vi.mocked(notifyOwner).mockResolvedValue(true);
      vi.mocked(getSetting).mockResolvedValue({ id: 1, key: "telegram_enabled", value: "false", description: null, updatedAt: new Date() });
      vi.mocked(markNotificationsSent).mockResolvedValue(true);
      
      const result = await sendPendingSummary();
      
      expect(result.sent).toBeGreaterThan(0);
      expect(markNotificationsSent).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe("getQuietHoursConfig", () => {
    it("returns default values when settings are not configured", async () => {
      vi.mocked(getSetting).mockResolvedValue(null);
      
      const config = await getQuietHoursConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.startTime).toBe("22:00");
      expect(config.endTime).toBe("07:00");
      expect(config.bypassCritical).toBe(false);
    });

    it("returns configured values", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce({ id: 1, key: "quietHoursEnabled", value: "true", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 2, key: "quietHoursStart", value: "23:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 3, key: "quietHoursEnd", value: "06:00", description: null, updatedAt: new Date() })
        .mockResolvedValueOnce({ id: 4, key: "quietHoursBypassCritical", value: "true", description: null, updatedAt: new Date() });
      
      const config = await getQuietHoursConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.startTime).toBe("23:00");
      expect(config.endTime).toBe("06:00");
      expect(config.bypassCritical).toBe(true);
    });
  });
});
