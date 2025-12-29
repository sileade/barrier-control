import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  vehicles, InsertVehicle, Vehicle,
  passages, InsertPassage, Passage,
  medicalRecords, InsertMedicalRecord, MedicalRecord,
  settings, InsertSetting, Setting,
  barrierActions, InsertBarrierAction, BarrierAction
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER OPERATIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ VEHICLE OPERATIONS ============

export async function getAllVehicles(includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  
  if (includeInactive) {
    return db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
  }
  return db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(desc(vehicles.createdAt));
}

export async function getVehicleById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getVehicleByPlate(licensePlate: string) {
  const db = await getDb();
  if (!db) return null;
  
  const normalizedPlate = licensePlate.toUpperCase().replace(/\s/g, '');
  const result = await db.select().from(vehicles)
    .where(eq(vehicles.licensePlate, normalizedPlate))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createVehicle(vehicle: InsertVehicle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const normalizedPlate = vehicle.licensePlate.toUpperCase().replace(/\s/g, '');
  await db.insert(vehicles).values({ ...vehicle, licensePlate: normalizedPlate });
  return getVehicleByPlate(normalizedPlate);
}

export async function updateVehicle(id: number, data: Partial<InsertVehicle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (data.licensePlate) {
    data.licensePlate = data.licensePlate.toUpperCase().replace(/\s/g, '');
  }
  await db.update(vehicles).set(data).where(eq(vehicles.id, id));
  return getVehicleById(id);
}

export async function deleteVehicle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(vehicles).set({ isActive: false }).where(eq(vehicles.id, id));
  return true;
}

export async function hardDeleteVehicle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(vehicles).where(eq(vehicles.id, id));
  return true;
}

// ============ PASSAGE OPERATIONS ============

export async function getPassages(options: {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  licensePlate?: string;
  isAllowed?: boolean;
} = {}) {
  const db = await getDb();
  if (!db) return [];
  
  const { limit = 100, offset = 0, startDate, endDate, licensePlate, isAllowed } = options;
  
  const conditions = [];
  if (startDate) conditions.push(gte(passages.timestamp, startDate));
  if (endDate) conditions.push(lte(passages.timestamp, endDate));
  if (licensePlate) conditions.push(like(passages.licensePlate, `%${licensePlate}%`));
  if (isAllowed !== undefined) conditions.push(eq(passages.isAllowed, isAllowed));
  
  const query = conditions.length > 0
    ? db.select().from(passages).where(and(...conditions)).orderBy(desc(passages.timestamp)).limit(limit).offset(offset)
    : db.select().from(passages).orderBy(desc(passages.timestamp)).limit(limit).offset(offset);
  
  return query;
}

export async function getPassageById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(passages).where(eq(passages.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createPassage(passage: InsertPassage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const normalizedPlate = passage.licensePlate.toUpperCase().replace(/\s/g, '');
  const result = await db.insert(passages).values({ ...passage, licensePlate: normalizedPlate });
  return { id: Number(result[0].insertId) };
}

export async function getPassageStats(days = 30) {
  const db = await getDb();
  if (!db) return { total: 0, allowed: 0, denied: 0, manual: 0 };
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await db.select({
    total: sql<number>`COUNT(*)`,
    allowed: sql<number>`SUM(CASE WHEN isAllowed = true THEN 1 ELSE 0 END)`,
    denied: sql<number>`SUM(CASE WHEN isAllowed = false THEN 1 ELSE 0 END)`,
    manual: sql<number>`SUM(CASE WHEN wasManualOpen = true THEN 1 ELSE 0 END)`,
  }).from(passages).where(gte(passages.timestamp, startDate));
  
  return result[0] || { total: 0, allowed: 0, denied: 0, manual: 0 };
}

export async function getDailyPassageStats(days = 7) {
  const db = await getDb();
  if (!db) return [];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const result = await db.select({
    date: sql<string>`DATE(timestamp)`,
    total: sql<number>`COUNT(*)`,
    allowed: sql<number>`SUM(CASE WHEN isAllowed = true THEN 1 ELSE 0 END)`,
    denied: sql<number>`SUM(CASE WHEN isAllowed = false THEN 1 ELSE 0 END)`,
  }).from(passages)
    .where(gte(passages.timestamp, startDate))
    .groupBy(sql`DATE(timestamp)`)
    .orderBy(sql`DATE(timestamp)`);
  
  return result;
}

// ============ MEDICAL RECORDS OPERATIONS ============

export async function getMedicalRecords() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(medicalRecords).orderBy(desc(medicalRecords.updatedAt));
}

export async function getMedicalRecordByPlate(licensePlate: string) {
  const db = await getDb();
  if (!db) return null;
  
  const normalizedPlate = licensePlate.toUpperCase().replace(/\s/g, '');
  const result = await db.select().from(medicalRecords)
    .where(eq(medicalRecords.licensePlate, normalizedPlate))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertMedicalRecord(record: InsertMedicalRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const normalizedPlate = record.licensePlate.toUpperCase().replace(/\s/g, '');
  const existing = await getMedicalRecordByPlate(normalizedPlate);
  
  if (existing) {
    await db.update(medicalRecords)
      .set({ ...record, licensePlate: normalizedPlate })
      .where(eq(medicalRecords.id, existing.id));
    return getMedicalRecordByPlate(normalizedPlate);
  } else {
    await db.insert(medicalRecords).values({ ...record, licensePlate: normalizedPlate });
    return getMedicalRecordByPlate(normalizedPlate);
  }
}

export async function deleteMedicalRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(medicalRecords).where(eq(medicalRecords.id, id));
  return true;
}

// ============ SETTINGS OPERATIONS ============

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(settings);
}

export async function upsertSetting(key: string, value: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSetting(key);
  if (existing) {
    await db.update(settings).set({ value, description }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value, description });
  }
  return getSetting(key);
}

// ============ BARRIER ACTIONS OPERATIONS ============

export async function logBarrierAction(action: InsertBarrierAction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(barrierActions).values(action);
  return true;
}

export async function getBarrierActions(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(barrierActions).orderBy(desc(barrierActions.timestamp)).limit(limit);
}
