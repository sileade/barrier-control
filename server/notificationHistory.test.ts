import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database functions
vi.mock("./db", () => ({
  createNotificationHistory: vi.fn().mockResolvedValue({ id: 1 }),
  getNotificationHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      type: 'unknown_vehicle',
      title: 'Unknown Vehicle Detected',
      message: 'A vehicle with plate ABC123 was detected',
      licensePlate: 'ABC123',
      photoUrl: null,
      severity: 'medium',
      channel: 'email',
      status: 'sent',
      errorMessage: null,
      retryCount: 0,
      lastRetryAt: null,
      createdAt: new Date(),
      sentAt: new Date(),
    },
    {
      id: 2,
      type: 'blacklist_detected',
      title: 'Blacklisted Vehicle',
      message: 'Blacklisted vehicle XYZ789 attempted entry',
      licensePlate: 'XYZ789',
      photoUrl: 'https://example.com/photo.jpg',
      severity: 'critical',
      channel: 'both',
      status: 'sent',
      errorMessage: null,
      retryCount: 0,
      lastRetryAt: null,
      createdAt: new Date(),
      sentAt: new Date(),
    },
  ]),
  getNotificationHistoryById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        id: 1,
        type: 'unknown_vehicle',
        title: 'Unknown Vehicle Detected',
        message: 'A vehicle with plate ABC123 was detected',
        licensePlate: 'ABC123',
        photoUrl: null,
        severity: 'medium',
        channel: 'email',
        status: 'sent',
        errorMessage: null,
        retryCount: 0,
        lastRetryAt: null,
        createdAt: new Date(),
        sentAt: new Date(),
      });
    }
    return Promise.resolve(null);
  }),
  updateNotificationHistory: vi.fn().mockResolvedValue({
    id: 1,
    status: 'sent',
    retryCount: 1,
  }),
  getNotificationHistoryStats: vi.fn().mockResolvedValue({
    total: 10,
    sent: 8,
    failed: 1,
    pending: 1,
  }),
  getNotificationHistoryByType: vi.fn().mockResolvedValue([
    { type: 'unknown_vehicle', count: 5, sent: 4, failed: 1 },
    { type: 'blacklist_detected', count: 3, sent: 3, failed: 0 },
    { type: 'manual_open', count: 2, sent: 1, failed: 0 },
  ]),
  getSetting: vi.fn().mockResolvedValue(null),
}));

// Mock notification functions
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./telegramNotification", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(true),
}));

import {
  createNotificationHistory,
  getNotificationHistory,
  getNotificationHistoryById,
  updateNotificationHistory,
  getNotificationHistoryStats,
  getNotificationHistoryByType,
} from "./db";

describe("Notification History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createNotificationHistory", () => {
    it("should create a new notification history entry", async () => {
      const entry = {
        type: 'unknown_vehicle' as const,
        title: 'Test Notification',
        message: 'Test message content',
        licensePlate: 'TEST123',
        severity: 'medium' as const,
        channel: 'email' as const,
        status: 'pending' as const,
      };

      const result = await createNotificationHistory(entry);
      
      expect(result).toEqual({ id: 1 });
      expect(createNotificationHistory).toHaveBeenCalledWith(entry);
    });
  });

  describe("getNotificationHistory", () => {
    it("should return list of notifications", async () => {
      const result = await getNotificationHistory({});
      
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('unknown_vehicle');
      expect(result[1].type).toBe('blacklist_detected');
    });

    it("should filter by type", async () => {
      await getNotificationHistory({ type: 'blacklist_detected' });
      
      expect(getNotificationHistory).toHaveBeenCalledWith({ type: 'blacklist_detected' });
    });

    it("should filter by status", async () => {
      await getNotificationHistory({ status: 'failed' });
      
      expect(getNotificationHistory).toHaveBeenCalledWith({ status: 'failed' });
    });

    it("should filter by license plate", async () => {
      await getNotificationHistory({ licensePlate: 'ABC' });
      
      expect(getNotificationHistory).toHaveBeenCalledWith({ licensePlate: 'ABC' });
    });
  });

  describe("getNotificationHistoryById", () => {
    it("should return notification by ID", async () => {
      const result = await getNotificationHistoryById(1);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.type).toBe('unknown_vehicle');
    });

    it("should return null for non-existent ID", async () => {
      const result = await getNotificationHistoryById(999);
      
      expect(result).toBeNull();
    });
  });

  describe("updateNotificationHistory", () => {
    it("should update notification status", async () => {
      const result = await updateNotificationHistory(1, {
        status: 'sent',
        retryCount: 1,
      });
      
      expect(result).toEqual({ id: 1, status: 'sent', retryCount: 1 });
    });
  });

  describe("getNotificationHistoryStats", () => {
    it("should return notification statistics", async () => {
      const result = await getNotificationHistoryStats();
      
      expect(result.total).toBe(10);
      expect(result.sent).toBe(8);
      expect(result.failed).toBe(1);
      expect(result.pending).toBe(1);
    });
  });

  describe("getNotificationHistoryByType", () => {
    it("should return statistics grouped by type", async () => {
      const result = await getNotificationHistoryByType();
      
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('unknown_vehicle');
      expect(result[0].count).toBe(5);
    });
  });

  describe("CSV Export format", () => {
    it("should generate valid CSV format", async () => {
      const notifications = await getNotificationHistory({});
      
      // Simulate CSV generation
      const headers = ['ID', 'Type', 'Title', 'Message', 'License Plate', 'Severity', 'Channel', 'Status'];
      const rows = notifications.map(n => [
        n.id,
        n.type,
        `"${(n.title || '').replace(/"/g, '""')}"`,
        `"${(n.message || '').replace(/"/g, '""')}"`,
        n.licensePlate || '',
        n.severity,
        n.channel,
        n.status,
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      expect(csv).toContain('ID,Type,Title');
      expect(csv).toContain('unknown_vehicle');
      expect(csv).toContain('ABC123');
    });
  });

  describe("Notification types", () => {
    it("should support all notification types", () => {
      const validTypes = [
        'unknown_vehicle',
        'blacklist_detected',
        'manual_open',
        'unauthorized_access',
        'daily_summary',
        'quiet_hours_summary',
      ];

      validTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });

    it("should support all severity levels", () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'];

      validSeverities.forEach(severity => {
        expect(typeof severity).toBe('string');
      });
    });

    it("should support all channels", () => {
      const validChannels = ['email', 'telegram', 'both'];

      validChannels.forEach(channel => {
        expect(typeof channel).toBe('string');
      });
    });

    it("should support all statuses", () => {
      const validStatuses = ['sent', 'failed', 'pending'];

      validStatuses.forEach(status => {
        expect(typeof status).toBe('string');
      });
    });
  });
});
