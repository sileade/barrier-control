import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getPassages: vi.fn(),
  getPassageById: vi.fn(),
  createPassage: vi.fn(),
  getPassageStats: vi.fn(),
  getDailyPassageStats: vi.fn(),
  logBarrierAction: vi.fn(),
  getBarrierActions: vi.fn(),
  getSetting: vi.fn(),
}));

// Mock the email notification module
vi.mock("./emailNotification", () => ({
  notifyUnknownVehicle: vi.fn().mockResolvedValue(true),
  notifyManualBarrierOpen: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "user@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("passages router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("passages.list", () => {
    it("returns list of passages", async () => {
      const mockPassages = [
        { id: 1, licensePlate: "A123BC777", isAllowed: true, timestamp: new Date() },
        { id: 2, licensePlate: "B456DE999", isAllowed: false, timestamp: new Date() },
      ];
      vi.mocked(db.getPassages).mockResolvedValue(mockPassages as any);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.passages.list();

      expect(result).toEqual(mockPassages);
      expect(db.getPassages).toHaveBeenCalledWith({});
    });

    it("filters passages by parameters", async () => {
      vi.mocked(db.getPassages).mockResolvedValue([]);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await caller.passages.list({
        limit: 50,
        isAllowed: true,
        licensePlate: "A123",
      });

      expect(db.getPassages).toHaveBeenCalledWith({
        limit: 50,
        isAllowed: true,
        licensePlate: "A123",
      });
    });
  });

  describe("passages.stats", () => {
    it("returns passage statistics", async () => {
      const mockStats = {
        total: 100,
        allowed: 80,
        denied: 20,
        manual: 5,
      };
      vi.mocked(db.getPassageStats).mockResolvedValue(mockStats);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.passages.stats();

      expect(result).toEqual(mockStats);
      expect(db.getPassageStats).toHaveBeenCalledWith(30);
    });

    it("accepts custom days parameter", async () => {
      vi.mocked(db.getPassageStats).mockResolvedValue({} as any);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await caller.passages.stats({ days: 7 });

      expect(db.getPassageStats).toHaveBeenCalledWith(7);
    });
  });

  describe("passages.dailyStats", () => {
    it("returns daily passage statistics", async () => {
      const mockDailyStats = [
        { date: "2024-01-01", total: 10, allowed: 8, denied: 2 },
        { date: "2024-01-02", total: 15, allowed: 12, denied: 3 },
      ];
      vi.mocked(db.getDailyPassageStats).mockResolvedValue(mockDailyStats as any);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.passages.dailyStats();

      expect(result).toEqual(mockDailyStats);
      expect(db.getDailyPassageStats).toHaveBeenCalledWith(7);
    });
  });

  describe("passages.create", () => {
    it("creates a new passage record", async () => {
      vi.mocked(db.createPassage).mockResolvedValue({ id: 1 });

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.passages.create({
        licensePlate: "A123BC777",
        isAllowed: true,
        wasManualOpen: false,
      });

      expect(result).toEqual({ id: 1 });
      expect(db.createPassage).toHaveBeenCalledWith({
        licensePlate: "A123BC777",
        isAllowed: true,
        wasManualOpen: false,
        openedBy: 1,
      });
    });
  });
});

describe("barrier router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("barrier.open", () => {
    it("opens barrier when confirmed", async () => {
      vi.mocked(db.logBarrierAction).mockResolvedValue(true);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.barrier.open({ confirm: true });

      expect(result).toEqual({ success: true, message: "Barrier opened successfully" });
      expect(db.logBarrierAction).toHaveBeenCalledWith({
        action: "open",
        triggeredBy: "manual",
        userId: 1,
        passageId: undefined,
        success: true,
      });
    });

    it("throws error when not confirmed", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.barrier.open({ confirm: false })).rejects.toThrow("Confirmation required");
    });

    it("logs barrier action with passage id", async () => {
      vi.mocked(db.logBarrierAction).mockResolvedValue(true);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await caller.barrier.open({ confirm: true, passageId: 123 });

      expect(db.logBarrierAction).toHaveBeenCalledWith({
        action: "open",
        triggeredBy: "manual",
        userId: 1,
        passageId: 123,
        success: true,
      });
    });
  });

  describe("barrier.actions", () => {
    it("returns barrier action history", async () => {
      const mockActions = [
        { id: 1, action: "open", triggeredBy: "manual", timestamp: new Date() },
        { id: 2, action: "open", triggeredBy: "auto", timestamp: new Date() },
      ];
      vi.mocked(db.getBarrierActions).mockResolvedValue(mockActions as any);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.barrier.actions();

      expect(result).toEqual(mockActions);
      expect(db.getBarrierActions).toHaveBeenCalledWith(50);
    });

    it("accepts custom limit parameter", async () => {
      vi.mocked(db.getBarrierActions).mockResolvedValue([]);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await caller.barrier.actions({ limit: 10 });

      expect(db.getBarrierActions).toHaveBeenCalledWith(10);
    });
  });
});
