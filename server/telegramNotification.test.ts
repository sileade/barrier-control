import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the db module
vi.mock("./db", () => ({
  getSetting: vi.fn(),
}));

import { getSetting } from "./db";
import { 
  sendTelegramMessage, 
  testTelegramConnection, 
  getBotInfo,
  telegramNotifyUnknownVehicle,
  telegramNotifyManualOpen,
  telegramNotifyUnauthorizedAccess
} from "./telegramNotification";

describe("telegramNotification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendTelegramMessage", () => {
    it("sends message when Telegram is enabled and configured", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce(null) // telegram_enabled - not set means enabled
        .mockResolvedValueOnce({ key: "telegram_bot_token", value: "test_token" } as any)
        .mockResolvedValueOnce({ key: "telegram_chat_id", value: "123456" } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await sendTelegramMessage({
        title: "Test Title",
        content: "Test content",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bottest_token/sendMessage",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("does not send when Telegram is disabled", async () => {
      vi.mocked(getSetting).mockResolvedValueOnce({ 
        key: "telegram_enabled", 
        value: "false" 
      } as any);

      const result = await sendTelegramMessage({
        title: "Test",
        content: "Test",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not send when bot token is missing", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce(null) // telegram_enabled
        .mockResolvedValueOnce(null) // telegram_bot_token - missing
        .mockResolvedValueOnce({ key: "telegram_chat_id", value: "123456" } as any);

      const result = await sendTelegramMessage({
        title: "Test",
        content: "Test",
      });

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("handles API errors gracefully", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key: "telegram_bot_token", value: "test_token" } as any)
        .mockResolvedValueOnce({ key: "telegram_chat_id", value: "123456" } as any);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve("Unauthorized"),
      });

      const result = await sendTelegramMessage({
        title: "Test",
        content: "Test",
      });

      expect(result).toBe(false);
    });
  });

  describe("testTelegramConnection", () => {
    it("returns success when connection is valid", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await testTelegramConnection("valid_token", "123456");

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns error when connection fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('{"description": "Invalid token"}'),
      });

      const result = await testTelegramConnection("invalid_token", "123456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid token");
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await testTelegramConnection("token", "123456");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("getBotInfo", () => {
    it("returns bot name when token is valid", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          ok: true, 
          result: { username: "test_bot" } 
        }),
      });

      const result = await getBotInfo("valid_token");

      expect(result.success).toBe(true);
      expect(result.botName).toBe("test_bot");
    });

    it("returns error when token is invalid", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await getBotInfo("invalid_token");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid bot token");
    });
  });

  describe("telegramNotifyUnknownVehicle", () => {
    it("sends notification with correct format", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key: "telegram_bot_token", value: "token" } as any)
        .mockResolvedValueOnce({ key: "telegram_chat_id", value: "123" } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await telegramNotifyUnknownVehicle({
        licensePlate: "A123BC777",
        confidence: 95,
        timestamp: new Date("2024-01-15T10:30:00"),
      });

      expect(result).toBe(true);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.text).toContain("A123BC777");
      expect(callBody.text).toContain("95%");
    });
  });

  describe("telegramNotifyManualOpen", () => {
    it("sends notification with user info", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key: "telegram_bot_token", value: "token" } as any)
        .mockResolvedValueOnce({ key: "telegram_chat_id", value: "123" } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await telegramNotifyManualOpen({
        userName: "Admin User",
        userId: 1,
        timestamp: new Date("2024-01-15T10:30:00"),
        notes: "Emergency",
      });

      expect(result).toBe(true);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.text).toContain("Admin User");
      expect(callBody.text).toContain("Emergency");
    });
  });

  describe("telegramNotifyUnauthorizedAccess", () => {
    it("sends notification with attempt count", async () => {
      vi.mocked(getSetting)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key: "telegram_bot_token", value: "token" } as any)
        .mockResolvedValueOnce({ key: "telegram_chat_id", value: "123" } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await telegramNotifyUnauthorizedAccess({
        licensePlate: "X999YY777",
        attemptCount: 3,
        timestamp: new Date("2024-01-15T10:30:00"),
      });

      expect(result).toBe(true);
      
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.text).toContain("X999YY777");
      expect(callBody.text).toContain("3");
    });
  });
});
