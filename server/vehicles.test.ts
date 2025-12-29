import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getAllVehicles: vi.fn(),
  getVehicleById: vi.fn(),
  getVehicleByPlate: vi.fn(),
  createVehicle: vi.fn(),
  updateVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("vehicles router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("vehicles.list", () => {
    it("returns list of vehicles for authenticated user", async () => {
      const mockVehicles = [
        { id: 1, licensePlate: "A123BC777", ownerName: "John Doe", isActive: true },
        { id: 2, licensePlate: "B456DE999", ownerName: "Jane Smith", isActive: true },
      ];
      vi.mocked(db.getAllVehicles).mockResolvedValue(mockVehicles as any);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vehicles.list();

      expect(result).toEqual(mockVehicles);
      expect(db.getAllVehicles).toHaveBeenCalledWith(false);
    });

    it("includes inactive vehicles when requested by admin", async () => {
      const mockVehicles = [
        { id: 1, licensePlate: "A123BC777", isActive: true },
        { id: 2, licensePlate: "B456DE999", isActive: false },
      ];
      vi.mocked(db.getAllVehicles).mockResolvedValue(mockVehicles as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vehicles.list({ includeInactive: true });

      expect(result).toEqual(mockVehicles);
      expect(db.getAllVehicles).toHaveBeenCalledWith(true);
    });
  });

  describe("vehicles.getByPlate", () => {
    it("returns vehicle by license plate", async () => {
      const mockVehicle = { id: 1, licensePlate: "A123BC777", ownerName: "John Doe" };
      vi.mocked(db.getVehicleByPlate).mockResolvedValue(mockVehicle as any);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vehicles.getByPlate({ licensePlate: "A123BC777" });

      expect(result).toEqual(mockVehicle);
      expect(db.getVehicleByPlate).toHaveBeenCalledWith("A123BC777");
    });

    it("returns null for non-existent plate", async () => {
      vi.mocked(db.getVehicleByPlate).mockResolvedValue(null);

      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vehicles.getByPlate({ licensePlate: "UNKNOWN" });

      expect(result).toBeNull();
    });
  });

  describe("vehicles.create", () => {
    it("creates vehicle when called by admin", async () => {
      const newVehicle = {
        id: 1,
        licensePlate: "A123BC777",
        ownerName: "John Doe",
        isActive: true,
      };
      vi.mocked(db.getVehicleByPlate).mockResolvedValue(null);
      vi.mocked(db.createVehicle).mockResolvedValue(newVehicle as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vehicles.create({
        licensePlate: "A123BC777",
        ownerName: "John Doe",
      });

      expect(result).toEqual(newVehicle);
      expect(db.createVehicle).toHaveBeenCalled();
    });

    it("throws error when non-admin tries to create", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.vehicles.create({
          licensePlate: "A123BC777",
          ownerName: "John Doe",
        })
      ).rejects.toThrow("Admin access required");
    });

    it("throws error when plate already exists", async () => {
      vi.mocked(db.getVehicleByPlate).mockResolvedValue({ id: 1 } as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.vehicles.create({
          licensePlate: "A123BC777",
          ownerName: "John Doe",
        })
      ).rejects.toThrow("Vehicle with this plate already exists");
    });
  });

  describe("vehicles.update", () => {
    it("updates vehicle when called by admin", async () => {
      const updatedVehicle = {
        id: 1,
        licensePlate: "A123BC777",
        ownerName: "Updated Name",
        isActive: true,
      };
      vi.mocked(db.updateVehicle).mockResolvedValue(updatedVehicle as any);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vehicles.update({
        id: 1,
        ownerName: "Updated Name",
      });

      expect(result).toEqual(updatedVehicle);
      expect(db.updateVehicle).toHaveBeenCalledWith(1, { ownerName: "Updated Name" });
    });

    it("throws error when non-admin tries to update", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.vehicles.update({
          id: 1,
          ownerName: "Updated Name",
        })
      ).rejects.toThrow("Admin access required");
    });
  });

  describe("vehicles.delete", () => {
    it("deletes vehicle when called by admin", async () => {
      vi.mocked(db.deleteVehicle).mockResolvedValue(true);

      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.vehicles.delete({ id: 1 });

      expect(result).toBe(true);
      expect(db.deleteVehicle).toHaveBeenCalledWith(1);
    });

    it("throws error when non-admin tries to delete", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.vehicles.delete({ id: 1 })).rejects.toThrow("Admin access required");
    });
  });
});
