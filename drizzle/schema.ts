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

/**
 * Pending notifications table - stores notifications queued during quiet hours
 */
export const pendingNotifications = mysqlTable("pendingNotifications", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["unknown_vehicle", "blacklist_detected", "manual_open", "unauthorized_access"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  licensePlate: varchar("licensePlate", { length: 20 }),
  photoUrl: text("photoUrl"),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  isSent: boolean("isSent").default(false).notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PendingNotification = typeof pendingNotifications.$inferSelect;
export type InsertPendingNotification = typeof pendingNotifications.$inferInsert;

/**
 * Notification history table - stores all sent notifications for tracking and resending
 */
export const notificationHistory = mysqlTable("notificationHistory", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["unknown_vehicle", "blacklist_detected", "manual_open", "unauthorized_access", "daily_summary", "quiet_hours_summary"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  licensePlate: varchar("licensePlate", { length: 20 }),
  photoUrl: text("photoUrl"),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  channel: mysqlEnum("channel", ["email", "telegram", "both"]).default("email").notNull(),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  lastRetryAt: timestamp("lastRetryAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
});

export type NotificationHistoryEntry = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistoryEntry = typeof notificationHistory.$inferInsert;

/**
 * Barrier integrations table - stores barrier hardware configurations
 */
export const barrierIntegrations = mysqlTable("barrierIntegrations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["came", "nice", "bft", "doorhan", "gpio", "custom_http"]).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  // Connection settings
  host: varchar("host", { length: 255 }),
  port: int("port"),
  username: varchar("username", { length: 100 }),
  password: varchar("password", { length: 255 }),
  // API settings
  apiEndpoint: text("apiEndpoint"),
  apiKey: varchar("apiKey", { length: 255 }),
  openCommand: varchar("openCommand", { length: 255 }),
  closeCommand: varchar("closeCommand", { length: 255 }),
  statusCommand: varchar("statusCommand", { length: 255 }),
  // GPIO settings
  gpioPin: int("gpioPin"),
  gpioActiveHigh: boolean("gpioActiveHigh").default(true),
  // Timing settings
  openDuration: int("openDuration").default(5000), // milliseconds
  timeout: int("timeout").default(10000), // milliseconds
  // Status
  lastStatus: mysqlEnum("lastStatus", ["online", "offline", "error", "unknown"]).default("unknown"),
  lastStatusCheck: timestamp("lastStatusCheck"),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BarrierIntegration = typeof barrierIntegrations.$inferSelect;
export type InsertBarrierIntegration = typeof barrierIntegrations.$inferInsert;

/**
 * Camera integrations table - stores camera hardware configurations
 */
export const cameraIntegrations = mysqlTable("cameraIntegrations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["hikvision", "dahua", "axis", "onvif", "custom_rtsp", "custom_http"]).notNull(),
  isActive: boolean("isActive").default(false).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  // Connection settings
  host: varchar("host", { length: 255 }),
  port: int("port"),
  username: varchar("username", { length: 100 }),
  password: varchar("password", { length: 255 }),
  // Stream settings
  rtspUrl: text("rtspUrl"),
  httpSnapshotUrl: text("httpSnapshotUrl"),
  streamChannel: int("streamChannel").default(1),
  streamSubtype: int("streamSubtype").default(0), // 0 = main, 1 = sub
  // Recognition settings
  recognitionEnabled: boolean("recognitionEnabled").default(true),
  recognitionInterval: int("recognitionInterval").default(2000), // milliseconds
  recognitionConfidenceThreshold: int("recognitionConfidenceThreshold").default(70),
  // Status
  lastStatus: mysqlEnum("lastStatus", ["online", "offline", "error", "unknown"]).default("unknown"),
  lastStatusCheck: timestamp("lastStatusCheck"),
  lastError: text("lastError"),
  lastSnapshot: text("lastSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CameraIntegration = typeof cameraIntegrations.$inferSelect;
export type InsertCameraIntegration = typeof cameraIntegrations.$inferInsert;
