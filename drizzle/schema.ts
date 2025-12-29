import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Allowed vehicles table - stores license plates permitted to pass
 */
export const vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  licensePlate: varchar("licensePlate", { length: 20 }).notNull().unique(),
  ownerName: varchar("ownerName", { length: 255 }),
  ownerPhone: varchar("ownerPhone", { length: 50 }),
  vehicleModel: varchar("vehicleModel", { length: 100 }),
  vehicleColor: varchar("vehicleColor", { length: 50 }),
  notes: text("notes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  createdBy: int("createdBy"),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

/**
 * Passage logs table - records all vehicle passages
 */
export const passages = mysqlTable("passages", {
  id: int("id").autoincrement().primaryKey(),
  licensePlate: varchar("licensePlate", { length: 20 }).notNull(),
  photoUrl: text("photoUrl"),
  recognizedPlate: varchar("recognizedPlate", { length: 20 }),
  confidence: int("confidence"),
  isAllowed: boolean("isAllowed").default(false).notNull(),
  wasManualOpen: boolean("wasManualOpen").default(false).notNull(),
  barrierOpened: boolean("barrierOpened").default(false).notNull(),
  vehicleId: int("vehicleId"),
  openedBy: int("openedBy"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  notes: text("notes"),
});

export type Passage = typeof passages.$inferSelect;
export type InsertPassage = typeof passages.$inferInsert;

/**
 * Medical database records - stores driver medical information
 */
export const medicalRecords = mysqlTable("medicalRecords", {
  id: int("id").autoincrement().primaryKey(),
  licensePlate: varchar("licensePlate", { length: 20 }).notNull(),
  driverName: varchar("driverName", { length: 255 }).notNull(),
  driverPhone: varchar("driverPhone", { length: 50 }),
  medicalStatus: mysqlEnum("medicalStatus", ["valid", "expired", "suspended", "unknown"]).default("unknown").notNull(),
  expirationDate: timestamp("expirationDate"),
  lastCheckDate: timestamp("lastCheckDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;

/**
 * System settings table - stores configuration
 */
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

/**
 * Barrier actions log - tracks all barrier operations
 */
export const barrierActions = mysqlTable("barrierActions", {
  id: int("id").autoincrement().primaryKey(),
  action: mysqlEnum("action", ["open", "close", "error"]).notNull(),
  triggeredBy: mysqlEnum("triggeredBy", ["auto", "manual", "api"]).notNull(),
  userId: int("userId"),
  passageId: int("passageId"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("errorMessage"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type BarrierAction = typeof barrierActions.$inferSelect;
export type InsertBarrierAction = typeof barrierActions.$inferInsert;

/**
 * Blacklist table - stores blocked license plates
 */
export const blacklist = mysqlTable("blacklist", {
  id: int("id").autoincrement().primaryKey(),
  licensePlate: varchar("licensePlate", { length: 20 }).notNull().unique(),
  reason: text("reason"),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  ownerName: varchar("ownerName", { length: 255 }),
  vehicleModel: varchar("vehicleModel", { length: 100 }),
  vehicleColor: varchar("vehicleColor", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  notifyOnDetection: boolean("notifyOnDetection").default(true).notNull(),
  attemptCount: int("attemptCount").default(0).notNull(),
  lastAttempt: timestamp("lastAttempt"),
  addedBy: int("addedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type BlacklistEntry = typeof blacklist.$inferSelect;
export type InsertBlacklistEntry = typeof blacklist.$inferInsert;
