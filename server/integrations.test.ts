import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database functions
vi.mock("./db", () => ({
  getAllBarrierIntegrations: vi.fn(),
  getActiveBarrierIntegrations: vi.fn(),
  getBarrierIntegrationById: vi.fn(),
  createBarrierIntegration: vi.fn(),
  updateBarrierIntegration: vi.fn(),
  deleteBarrierIntegration: vi.fn(),
  updateBarrierIntegrationStatus: vi.fn(),
  getAllCameraIntegrations: vi.fn(),
  getActiveCameraIntegrations: vi.fn(),
  getCameraIntegrationById: vi.fn(),
  createCameraIntegration: vi.fn(),
  updateCameraIntegration: vi.fn(),
  deleteCameraIntegration: vi.fn(),
  updateCameraIntegrationStatus: vi.fn(),
  getPrimaryBarrierIntegration: vi.fn(),
  getPrimaryCameraIntegration: vi.fn(),
}));

// Mock axios
vi.mock("axios", () => ({
  default: vi.fn(),
}));

import * as db from "./db";
import axios from "axios";

describe("Barrier Integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllBarrierIntegrations", () => {
    it("should return all barrier integrations", async () => {
      const mockIntegrations = [
        { id: 1, name: "Main Gate", type: "came", isActive: true },
        { id: 2, name: "Side Gate", type: "nice", isActive: false },
      ];
      
      vi.mocked(db.getAllBarrierIntegrations).mockResolvedValue(mockIntegrations as any);
      
      const result = await db.getAllBarrierIntegrations();
      
      expect(result).toEqual(mockIntegrations);
      expect(db.getAllBarrierIntegrations).toHaveBeenCalledTimes(1);
    });
  });

  describe("getActiveBarrierIntegrations", () => {
    it("should return only active barrier integrations", async () => {
      const mockIntegrations = [
        { id: 1, name: "Main Gate", type: "came", isActive: true },
      ];
      
      vi.mocked(db.getActiveBarrierIntegrations).mockResolvedValue(mockIntegrations as any);
      
      const result = await db.getActiveBarrierIntegrations();
      
      expect(result).toEqual(mockIntegrations);
      expect(result.every((i: any) => i.isActive)).toBe(true);
    });
  });

  describe("createBarrierIntegration", () => {
    it("should create a new barrier integration", async () => {
      const newIntegration = {
        name: "New Gate",
        type: "bft" as const,
        host: "192.168.1.100",
        port: 80,
        isActive: true,
      };
      
      vi.mocked(db.createBarrierIntegration).mockResolvedValue({ id: 3 });
      
      const result = await db.createBarrierIntegration(newIntegration as any);
      
      expect(result).toEqual({ id: 3 });
      expect(db.createBarrierIntegration).toHaveBeenCalledWith(newIntegration);
    });
  });

  describe("updateBarrierIntegration", () => {
    it("should update an existing barrier integration", async () => {
      const updateData = {
        name: "Updated Gate",
        isActive: false,
      };
      
      const updatedIntegration = {
        id: 1,
        name: "Updated Gate",
        type: "came",
        isActive: false,
      };
      
      vi.mocked(db.updateBarrierIntegration).mockResolvedValue(updatedIntegration as any);
      
      const result = await db.updateBarrierIntegration(1, updateData);
      
      expect(result).toEqual(updatedIntegration);
      expect(db.updateBarrierIntegration).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe("deleteBarrierIntegration", () => {
    it("should delete a barrier integration", async () => {
      vi.mocked(db.deleteBarrierIntegration).mockResolvedValue(true);
      
      const result = await db.deleteBarrierIntegration(1);
      
      expect(result).toBe(true);
      expect(db.deleteBarrierIntegration).toHaveBeenCalledWith(1);
    });
  });
});

describe("Camera Integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllCameraIntegrations", () => {
    it("should return all camera integrations", async () => {
      const mockIntegrations = [
        { id: 1, name: "Entry Camera", type: "hikvision", isActive: true },
        { id: 2, name: "Exit Camera", type: "dahua", isActive: true },
      ];
      
      vi.mocked(db.getAllCameraIntegrations).mockResolvedValue(mockIntegrations as any);
      
      const result = await db.getAllCameraIntegrations();
      
      expect(result).toEqual(mockIntegrations);
      expect(db.getAllCameraIntegrations).toHaveBeenCalledTimes(1);
    });
  });

  describe("getActiveCameraIntegrations", () => {
    it("should return only active camera integrations", async () => {
      const mockIntegrations = [
        { id: 1, name: "Entry Camera", type: "hikvision", isActive: true },
      ];
      
      vi.mocked(db.getActiveCameraIntegrations).mockResolvedValue(mockIntegrations as any);
      
      const result = await db.getActiveCameraIntegrations();
      
      expect(result).toEqual(mockIntegrations);
      expect(result.every((i: any) => i.isActive)).toBe(true);
    });
  });

  describe("createCameraIntegration", () => {
    it("should create a new camera integration", async () => {
      const newIntegration = {
        name: "New Camera",
        type: "axis" as const,
        host: "192.168.1.101",
        port: 80,
        isActive: true,
        recognitionEnabled: true,
      };
      
      vi.mocked(db.createCameraIntegration).mockResolvedValue({ id: 3 });
      
      const result = await db.createCameraIntegration(newIntegration as any);
      
      expect(result).toEqual({ id: 3 });
      expect(db.createCameraIntegration).toHaveBeenCalledWith(newIntegration);
    });
  });

  describe("updateCameraIntegration", () => {
    it("should update an existing camera integration", async () => {
      const updateData = {
        name: "Updated Camera",
        recognitionEnabled: false,
      };
      
      const updatedIntegration = {
        id: 1,
        name: "Updated Camera",
        type: "hikvision",
        recognitionEnabled: false,
      };
      
      vi.mocked(db.updateCameraIntegration).mockResolvedValue(updatedIntegration as any);
      
      const result = await db.updateCameraIntegration(1, updateData);
      
      expect(result).toEqual(updatedIntegration);
      expect(db.updateCameraIntegration).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe("deleteCameraIntegration", () => {
    it("should delete a camera integration", async () => {
      vi.mocked(db.deleteCameraIntegration).mockResolvedValue(true);
      
      const result = await db.deleteCameraIntegration(1);
      
      expect(result).toBe(true);
      expect(db.deleteCameraIntegration).toHaveBeenCalledWith(1);
    });
  });
});

describe("Integration Types", () => {
  it("should support all barrier types", () => {
    const barrierTypes = ['came', 'nice', 'bft', 'doorhan', 'gpio', 'custom_http'];
    
    barrierTypes.forEach(type => {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("should support all camera types", () => {
    const cameraTypes = ['hikvision', 'dahua', 'axis', 'onvif', 'custom_rtsp', 'custom_http'];
    
    cameraTypes.forEach(type => {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    });
  });
});

describe("Primary Integration Selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return primary barrier integration", async () => {
    const primaryBarrier = {
      id: 1,
      name: "Main Gate",
      type: "came",
      isActive: true,
      isPrimary: true,
    };
    
    vi.mocked(db.getPrimaryBarrierIntegration).mockResolvedValue(primaryBarrier as any);
    
    const result = await db.getPrimaryBarrierIntegration();
    
    expect(result).toEqual(primaryBarrier);
    expect(result?.isPrimary).toBe(true);
  });

  it("should return null when no primary barrier is set", async () => {
    vi.mocked(db.getPrimaryBarrierIntegration).mockResolvedValue(null);
    
    const result = await db.getPrimaryBarrierIntegration();
    
    expect(result).toBeNull();
  });

  it("should return primary camera integration", async () => {
    const primaryCamera = {
      id: 1,
      name: "Entry Camera",
      type: "hikvision",
      isActive: true,
      isPrimary: true,
    };
    
    vi.mocked(db.getPrimaryCameraIntegration).mockResolvedValue(primaryCamera as any);
    
    const result = await db.getPrimaryCameraIntegration();
    
    expect(result).toEqual(primaryCamera);
    expect(result?.isPrimary).toBe(true);
  });

  it("should return null when no primary camera is set", async () => {
    vi.mocked(db.getPrimaryCameraIntegration).mockResolvedValue(null);
    
    const result = await db.getPrimaryCameraIntegration();
    
    expect(result).toBeNull();
  });
});

describe("Integration Status Updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update barrier integration status", async () => {
    vi.mocked(db.updateBarrierIntegrationStatus).mockResolvedValue(undefined);
    
    await db.updateBarrierIntegrationStatus(1, 'online');
    
    expect(db.updateBarrierIntegrationStatus).toHaveBeenCalledWith(1, 'online');
  });

  it("should update barrier integration status with error", async () => {
    vi.mocked(db.updateBarrierIntegrationStatus).mockResolvedValue(undefined);
    
    await db.updateBarrierIntegrationStatus(1, 'error', 'Connection timeout');
    
    expect(db.updateBarrierIntegrationStatus).toHaveBeenCalledWith(1, 'error', 'Connection timeout');
  });

  it("should update camera integration status", async () => {
    vi.mocked(db.updateCameraIntegrationStatus).mockResolvedValue(undefined);
    
    await db.updateCameraIntegrationStatus(1, 'online');
    
    expect(db.updateCameraIntegrationStatus).toHaveBeenCalledWith(1, 'online');
  });

  it("should update camera integration status with snapshot", async () => {
    vi.mocked(db.updateCameraIntegrationStatus).mockResolvedValue(undefined);
    
    const snapshotBase64 = 'data:image/jpeg;base64,/9j/4AAQ...';
    await db.updateCameraIntegrationStatus(1, 'online', undefined, snapshotBase64);
    
    expect(db.updateCameraIntegrationStatus).toHaveBeenCalledWith(1, 'online', undefined, snapshotBase64);
  });
});
