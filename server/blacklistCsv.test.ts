import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getAllBlacklistEntries: vi.fn(),
  getBlacklistEntryById: vi.fn(),
  getBlacklistEntryByPlate: vi.fn(),
  createBlacklistEntry: vi.fn(),
  updateBlacklistEntry: vi.fn(),
  deleteBlacklistEntry: vi.fn(),
  isPlateBlacklisted: vi.fn(),
  incrementBlacklistAttempt: vi.fn(),
  getBlacklistStats: vi.fn(),
  getAllVehicles: vi.fn(),
  getVehicleById: vi.fn(),
  getVehicleByPlate: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
  getPassages: vi.fn(),
  getPassageById: vi.fn(),
  createPassage: vi.fn(),
  getPassageStats: vi.fn(),
  getDailyPassageStats: vi.fn(),
  getMedicalRecords: vi.fn(),
  getMedicalRecordByPlate: vi.fn(),
  upsertMedicalRecord: vi.fn(),
  deleteMedicalRecord: vi.fn(),
  getSetting: vi.fn(),
  getAllSettings: vi.fn(),
  upsertSetting: vi.fn(),
  logBarrierAction: vi.fn(),
  getBarrierActions: vi.fn(),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("blacklist CSV export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports blacklist entries to CSV format", async () => {
    const mockEntries = [
      {
        id: 1,
        licensePlate: "A123BC777",
        severity: "high",
        reason: "Test reason",
        ownerName: "Test Owner",
        vehicleModel: "Toyota",
        vehicleColor: "Black",
        notifyOnDetection: true,
        attemptCount: 5,
        isActive: true,
        expiresAt: null,
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-15"),
      },
      {
        id: 2,
        licensePlate: "B456CD999",
        severity: "medium",
        reason: null,
        ownerName: null,
        vehicleModel: null,
        vehicleColor: null,
        notifyOnDetection: false,
        attemptCount: 0,
        isActive: true,
        expiresAt: new Date("2025-01-01"),
        createdAt: new Date("2024-02-20"),
        updatedAt: new Date("2024-02-20"),
      },
    ];

    vi.mocked(db.getAllBlacklistEntries).mockResolvedValue(mockEntries as any);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.blacklist.export();

    expect(result.count).toBe(2);
    expect(result.filename).toMatch(/^blacklist_export_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(result.csv).toContain("licensePlate");
    expect(result.csv).toContain("A123BC777");
    expect(result.csv).toContain("B456CD999");
    expect(result.csv).toContain("high");
    expect(result.csv).toContain("medium");
  });

  it("exports empty list when no entries exist", async () => {
    vi.mocked(db.getAllBlacklistEntries).mockResolvedValue([]);

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.blacklist.export();

    expect(result.count).toBe(0);
    expect(result.csv).toContain("licensePlate");
  });
});

describe("blacklist CSV import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("imports new entries from valid CSV", async () => {
    const csvData = `licensePlate,severity,reason,ownerName
A123BC777,high,Test reason,Test Owner
B456CD999,medium,Another reason,Another Owner`;

    vi.mocked(db.getBlacklistEntryByPlate).mockResolvedValue(null);
    vi.mocked(db.createBlacklistEntry).mockResolvedValue({ id: 1 } as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.blacklist.import({ csvData });

    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(db.createBlacklistEntry).toHaveBeenCalledTimes(2);
  });

  it("skips duplicates when skipDuplicates is true", async () => {
    const csvData = `licensePlate,severity
A123BC777,high
B456CD999,medium`;

    vi.mocked(db.getBlacklistEntryByPlate)
      .mockResolvedValueOnce({ id: 1, licensePlate: "A123BC777" } as any)
      .mockResolvedValueOnce(null);
    vi.mocked(db.createBlacklistEntry).mockResolvedValue({ id: 2 } as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.blacklist.import({ csvData, skipDuplicates: true });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(db.createBlacklistEntry).toHaveBeenCalledTimes(1);
  });

  it("updates existing entries when updateExisting is true", async () => {
    const csvData = `licensePlate,severity,reason
A123BC777,critical,Updated reason`;

    vi.mocked(db.getBlacklistEntryByPlate).mockResolvedValue({
      id: 1,
      licensePlate: "A123BC777",
      severity: "high",
      reason: "Old reason",
    } as any);
    vi.mocked(db.updateBlacklistEntry).mockResolvedValue({ id: 1 } as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.blacklist.import({ csvData, updateExisting: true });

    expect(result.updated).toBe(1);
    expect(result.imported).toBe(0);
    expect(db.updateBlacklistEntry).toHaveBeenCalledTimes(1);
  });

  it("throws error when required field is missing", async () => {
    const csvData = `severity,reason
high,Test reason`;

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.blacklist.import({ csvData })).rejects.toThrow(
      "Missing required fields: licensePlate"
    );
  });

  it("throws error for empty CSV", async () => {
    const csvData = `licensePlate`;

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.blacklist.import({ csvData })).rejects.toThrow(
      "CSV file is empty or has no data rows"
    );
  });

  it("handles CSV with quoted values", async () => {
    const csvData = `licensePlate,reason
"A123BC777","Reason with, comma"`;

    vi.mocked(db.getBlacklistEntryByPlate).mockResolvedValue(null);
    vi.mocked(db.createBlacklistEntry).mockResolvedValue({ id: 1 } as any);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.blacklist.import({ csvData });

    expect(result.imported).toBe(1);
    expect(db.createBlacklistEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        licensePlate: "A123BC777",
      })
    );
  });

  it("rejects import for non-admin users", async () => {
    const csvData = `licensePlate
A123BC777`;

    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.blacklist.import({ csvData })).rejects.toThrow(
      "Admin access required"
    );
  });
});

describe("blacklist CSV preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("previews import data correctly", async () => {
    const csvData = `licensePlate,severity,reason
A123BC777,high,Test reason
B456CD999,medium,Another reason`;

    vi.mocked(db.getBlacklistEntryByPlate)
      .mockResolvedValueOnce({ id: 1 } as any)
      .mockResolvedValueOnce(null);

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.blacklist.previewImport({ csvData });

    expect(result.totalRows).toBe(2);
    expect(result.hasRequiredFields).toBe(true);
    expect(result.headers).toContain("licensePlate");
    expect(result.sampleRows).toHaveLength(2);
    expect(result.duplicates).toBe(1);
    expect(result.newEntries).toBe(1);
  });

  it("detects missing required fields", async () => {
    const csvData = `severity,reason
high,Test`;

    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.blacklist.previewImport({ csvData });

    expect(result.hasRequiredFields).toBe(false);
  });
});
