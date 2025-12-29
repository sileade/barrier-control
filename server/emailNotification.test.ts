import { describe, expect, it, vi, beforeEach } from "vitest";
import { notifyUnknownVehicle, notifyManualBarrierOpen, notifyUnauthorizedAccess, notifyDailySummary } from "./emailNotification";

// Mock the notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(),
}));

// Mock the db module
vi.mock("./db", () => ({
  getSetting: vi.fn(),
}));

import { notifyOwner } from "./_core/notification";
import { getSetting } from "./db";

describe("emailNotification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("notifyUnknownVehicle", () => {
    it("sends notification for unknown vehicle when enabled", async () => {
      vi.mocked(getSetting).mockResolvedValue(null); // notifications enabled by default
      vi.mocked(notifyOwner).mockResolvedValue(true);

      const result = await notifyUnknownVehicle({
        licensePlate: "A123BC777",
        confidence: 95,
        photoUrl: "https://example.com/photo.jpg",
        timestamp: new Date("2024-01-15T10:30:00"),
      });

      expect(result).toBe(true);
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain("A123BC777");
      expect(call.content).toContain("A123BC777");
      expect(call.content).toContain("95%");
    });

    it("does not send notification when disabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ key: "notifications_enabled", value: "false" } as any);

      const result = await notifyUnknownVehicle({
        licensePlate: "A123BC777",
        confidence: 95,
        timestamp: new Date(),
      });

      expect(result).toBe(false);
      expect(notifyOwner).not.toHaveBeenCalled();
    });

    it("handles notification service errors gracefully", async () => {
      vi.mocked(getSetting).mockResolvedValue(null);
      vi.mocked(notifyOwner).mockRejectedValue(new Error("Service unavailable"));

      const result = await notifyUnknownVehicle({
        licensePlate: "A123BC777",
        confidence: 95,
        timestamp: new Date(),
      });

      expect(result).toBe(false);
    });
  });

  describe("notifyManualBarrierOpen", () => {
    it("sends notification for manual barrier open", async () => {
      vi.mocked(getSetting).mockResolvedValue(null);
      vi.mocked(notifyOwner).mockResolvedValue(true);

      const result = await notifyManualBarrierOpen({
        userName: "Admin User",
        userId: 1,
        timestamp: new Date("2024-01-15T10:30:00"),
        notes: "Emergency access",
      });

      expect(result).toBe(true);
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain("Ручное открытие");
      expect(call.content).toContain("Admin User");
      expect(call.content).toContain("Emergency access");
    });

    it("does not send notification when disabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ key: "notifications_enabled", value: "false" } as any);

      const result = await notifyManualBarrierOpen({
        userName: "Admin",
        userId: 1,
        timestamp: new Date(),
      });

      expect(result).toBe(false);
      expect(notifyOwner).not.toHaveBeenCalled();
    });
  });

  describe("notifyUnauthorizedAccess", () => {
    it("sends notification for unauthorized access attempts", async () => {
      vi.mocked(getSetting).mockResolvedValue(null);
      vi.mocked(notifyOwner).mockResolvedValue(true);

      const result = await notifyUnauthorizedAccess({
        licensePlate: "X999YY777",
        attemptCount: 3,
        timestamp: new Date("2024-01-15T10:30:00"),
        photoUrl: "https://example.com/photo.jpg",
      });

      expect(result).toBe(true);
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain("несанкционированного");
      expect(call.content).toContain("X999YY777");
      expect(call.content).toContain("3");
    });
  });

  describe("notifyDailySummary", () => {
    it("sends daily summary when enabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ key: "daily_summary_enabled", value: "true" } as any);
      vi.mocked(notifyOwner).mockResolvedValue(true);

      const result = await notifyDailySummary({
        date: new Date("2024-01-15"),
        totalPassages: 100,
        allowedPassages: 80,
        deniedPassages: 20,
        manualOpens: 5,
        unknownVehicles: 15,
      });

      expect(result).toBe(true);
      expect(notifyOwner).toHaveBeenCalledTimes(1);
      
      const call = vi.mocked(notifyOwner).mock.calls[0][0];
      expect(call.title).toContain("отчёт");
      expect(call.content).toContain("100");
      expect(call.content).toContain("80");
      expect(call.content).toContain("20");
    });

    it("does not send summary when disabled", async () => {
      vi.mocked(getSetting).mockResolvedValue({ key: "daily_summary_enabled", value: "false" } as any);

      const result = await notifyDailySummary({
        date: new Date(),
        totalPassages: 100,
        allowedPassages: 80,
        deniedPassages: 20,
        manualOpens: 5,
        unknownVehicles: 15,
      });

      expect(result).toBe(false);
      expect(notifyOwner).not.toHaveBeenCalled();
    });
  });
});
