import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { 
  getAllVehicles, getVehicleById, getVehicleByPlate, createVehicle, updateVehicle, deleteVehicle,
  getPassages, getPassageById, createPassage, getPassageStats, getDailyPassageStats,
  getMedicalRecords, getMedicalRecordByPlate, upsertMedicalRecord, deleteMedicalRecord,
  getSetting, getAllSettings, upsertSetting,
  logBarrierAction, getBarrierActions,
  getAllBlacklistEntries, getBlacklistEntryById, getBlacklistEntryByPlate, 
  createBlacklistEntry, updateBlacklistEntry, deleteBlacklistEntry,
  isPlateBlacklisted, incrementBlacklistAttempt, getBlacklistStats
} from "./db";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { notifyUnknownVehicle, notifyManualBarrierOpen } from "./emailNotification";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { testTelegramConnection, getBotInfo } from "./telegramNotification";
import { notifyBlacklistDetection } from "./blacklistNotification";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Vehicle router - CRUD for allowed vehicles
const vehicleRouter = router({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return getAllVehicles(input?.includeInactive ?? false);
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getVehicleById(input.id);
    }),
  
  getByPlate: protectedProcedure
    .input(z.object({ licensePlate: z.string() }))
    .query(async ({ input }) => {
      return getVehicleByPlate(input.licensePlate);
    }),
  
  create: adminProcedure
    .input(z.object({
      licensePlate: z.string().min(1).max(20),
      ownerName: z.string().optional(),
      ownerPhone: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehicleColor: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getVehicleByPlate(input.licensePlate);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Vehicle with this plate already exists' });
      }
      return createVehicle({ ...input, createdBy: ctx.user.id });
    }),
  
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      licensePlate: z.string().min(1).max(20).optional(),
      ownerName: z.string().optional(),
      ownerPhone: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehicleColor: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateVehicle(id, data);
    }),
  
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteVehicle(input.id);
    }),
});

// Passage router - logs and history
const passageRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).optional(),
      offset: z.number().min(0).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      licensePlate: z.string().optional(),
      isAllowed: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return getPassages(input ?? {});
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getPassageById(input.id);
    }),
  
  stats: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).optional() }).optional())
    .query(async ({ input }) => {
      return getPassageStats(input?.days ?? 30);
    }),
  
  dailyStats: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(90).optional() }).optional())
    .query(async ({ input }) => {
      return getDailyPassageStats(input?.days ?? 7);
    }),
  
  create: protectedProcedure
    .input(z.object({
      licensePlate: z.string(),
      photoUrl: z.string().optional(),
      recognizedPlate: z.string().optional(),
      confidence: z.number().optional(),
      isAllowed: z.boolean(),
      wasManualOpen: z.boolean().optional(),
      barrierOpened: z.boolean().optional(),
      vehicleId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createPassage({ ...input, openedBy: ctx.user.id });
    }),
});

// Medical database router
const medicalRouter = router({
  list: adminProcedure.query(async () => {
    return getMedicalRecords();
  }),
  
  lookup: protectedProcedure
    .input(z.object({ licensePlate: z.string() }))
    .query(async ({ input }) => {
      return getMedicalRecordByPlate(input.licensePlate);
    }),
  
  upsert: adminProcedure
    .input(z.object({
      licensePlate: z.string().min(1).max(20),
      driverName: z.string().min(1),
      driverPhone: z.string().optional(),
      medicalStatus: z.enum(["valid", "expired", "suspended", "unknown"]).optional(),
      expirationDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return upsertMedicalRecord(input);
    }),
  
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteMedicalRecord(input.id);
    }),
  
  // External API endpoint for medical database integration
  sync: publicProcedure
    .input(z.object({
      apiKey: z.string(),
      records: z.array(z.object({
        licensePlate: z.string(),
        driverName: z.string(),
        driverPhone: z.string().optional(),
        medicalStatus: z.enum(["valid", "expired", "suspended", "unknown"]).optional(),
        expirationDate: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      // Validate API key from settings
      const apiKeySetting = await getSetting('medical_api_key');
      if (!apiKeySetting || apiKeySetting.value !== input.apiKey) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid API key' });
      }
      
      const results = [];
      for (const record of input.records) {
        const result = await upsertMedicalRecord({
          ...record,
          expirationDate: record.expirationDate ? new Date(record.expirationDate) : undefined,
        });
        results.push(result);
      }
      return { synced: results.length, records: results };
    }),
});

// Settings router
const settingsRouter = router({
  list: adminProcedure.query(async () => {
    return getAllSettings();
  }),
  
  get: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return getSetting(input.key);
    }),
  
  set: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return upsertSetting(input.key, input.value, input.description);
    }),
});

// Barrier control router
const barrierRouter = router({
  open: protectedProcedure
    .input(z.object({
      confirm: z.boolean(),
      passageId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.confirm) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Confirmation required' });
      }
      
      // Log the barrier action
      await logBarrierAction({
        action: 'open',
        triggeredBy: 'manual',
        userId: ctx.user.id,
        passageId: input.passageId,
        success: true,
      });
      
      // Send notification about manual barrier open
      await notifyManualBarrierOpen({
        userName: ctx.user.name || ctx.user.email || 'Unknown',
        userId: ctx.user.id,
        timestamp: new Date(),
        notes: input.notes,
      });
      
      // Here you would integrate with actual barrier hardware
      // For now, we simulate success
      return { success: true, message: 'Barrier opened successfully' };
    }),
  
  actions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
    .query(async ({ input }) => {
      return getBarrierActions(input?.limit ?? 50);
    }),
});

// Telegram router - Telegram bot integration
const telegramRouter = router({
  testConnection: adminProcedure
    .input(z.object({
      botToken: z.string().min(1),
      chatId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      return testTelegramConnection(input.botToken, input.chatId);
    }),
  
  getBotInfo: adminProcedure
    .input(z.object({
      botToken: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      return getBotInfo(input.botToken);
    }),
});

// Blacklist router - manage blocked vehicles
const blacklistRouter = router({
  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return getAllBlacklistEntries(input?.includeInactive ?? false);
    }),
  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getBlacklistEntryById(input.id);
    }),
  
  getByPlate: protectedProcedure
    .input(z.object({ licensePlate: z.string() }))
    .query(async ({ input }) => {
      return getBlacklistEntryByPlate(input.licensePlate);
    }),
  
  check: protectedProcedure
    .input(z.object({ licensePlate: z.string() }))
    .query(async ({ input }) => {
      const entry = await isPlateBlacklisted(input.licensePlate);
      return { isBlacklisted: !!entry, entry };
    }),
  
  stats: protectedProcedure.query(async () => {
    return getBlacklistStats();
  }),
  
  create: adminProcedure
    .input(z.object({
      licensePlate: z.string().min(1).max(20),
      reason: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      ownerName: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehicleColor: z.string().optional(),
      notifyOnDetection: z.boolean().optional(),
      expiresAt: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getBlacklistEntryByPlate(input.licensePlate);
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'This plate is already in the blacklist' });
      }
      return createBlacklistEntry({ ...input, addedBy: ctx.user.id });
    }),
  
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      licensePlate: z.string().min(1).max(20).optional(),
      reason: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      ownerName: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehicleColor: z.string().optional(),
      isActive: z.boolean().optional(),
      notifyOnDetection: z.boolean().optional(),
      expiresAt: z.date().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateBlacklistEntry(id, data);
    }),
  
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deleteBlacklistEntry(input.id);
    }),
});

// Recognition router - plate recognition using OpenAI Vision
const recognitionRouter = router({
  analyze: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      autoOpen: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Use OpenAI Vision to recognize the license plate
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a license plate recognition system. Analyze the image and extract the vehicle license plate number. Return ONLY a JSON object with the format: {\"plate\": \"LICENSE_PLATE_HERE\", \"confidence\": 0-100}. If no plate is visible, return {\"plate\": null, \"confidence\": 0}."
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${input.imageBase64}`,
                    detail: "high"
                  }
                },
                {
                  type: "text",
                  text: "Extract the license plate number from this image."
                }
              ]
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "plate_recognition",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  plate: { type: ["string", "null"], description: "The recognized license plate" },
                  confidence: { type: "integer", description: "Confidence level 0-100" }
                },
                required: ["plate", "confidence"],
                additionalProperties: false
              }
            }
          }
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response from recognition service");
        }
        
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const result = JSON.parse(contentStr) as { plate: string | null; confidence: number };
        
        // Save the image to S3
        const imageBuffer = Buffer.from(input.imageBase64, 'base64');
        const imageKey = `passages/${Date.now()}-${nanoid(8)}.jpg`;
        const { url: photoUrl } = await storagePut(imageKey, imageBuffer, 'image/jpeg');
        
        // Check if plate is blacklisted first
        let isBlacklisted = false;
        let blacklistEntry = null;
        if (result.plate) {
          blacklistEntry = await isPlateBlacklisted(result.plate);
          isBlacklisted = blacklistEntry !== null;
        }
        
        // If blacklisted, handle immediately
        if (isBlacklisted && blacklistEntry) {
          // Increment attempt count
          await incrementBlacklistAttempt(blacklistEntry.id);
          
          // Create passage record for blacklisted vehicle
          const passage = await createPassage({
            licensePlate: result.plate || 'UNKNOWN',
            photoUrl,
            recognizedPlate: result.plate,
            confidence: result.confidence,
            isAllowed: false,
            wasManualOpen: false,
            barrierOpened: false,
            openedBy: ctx.user.id,
            notes: `BLACKLISTED: ${blacklistEntry.reason || 'No reason specified'}`,
          });
          
          // Send enhanced notification for blacklisted vehicle
          if (blacklistEntry.notifyOnDetection) {
            await notifyBlacklistDetection({
              entry: blacklistEntry,
              photoUrl,
              timestamp: new Date(),
            });
          }
          
          return {
            plate: result.plate,
            confidence: result.confidence,
            isAllowed: false,
            isBlacklisted: true,
            blacklistEntry,
            vehicle: null,
            passageId: passage.id,
            photoUrl,
            barrierOpened: false,
          };
        }
        
        // Check if plate is in allowed list
        let isAllowed = false;
        let vehicle = null;
        if (result.plate) {
          vehicle = await getVehicleByPlate(result.plate);
          isAllowed = vehicle !== null && vehicle.isActive;
        }
        
        // Create passage record
        const passage = await createPassage({
          licensePlate: result.plate || 'UNKNOWN',
          photoUrl,
          recognizedPlate: result.plate,
          confidence: result.confidence,
          isAllowed,
          wasManualOpen: false,
          barrierOpened: isAllowed && input.autoOpen,
          vehicleId: vehicle?.id,
          openedBy: ctx.user.id,
        });
        
        // Auto-open barrier if allowed
        if (isAllowed && input.autoOpen) {
          await logBarrierAction({
            action: 'open',
            triggeredBy: 'auto',
            userId: ctx.user.id,
            passageId: passage.id,
            success: true,
          });
        }
        
        // Notify owner for unknown plates
        if (!isAllowed && result.plate) {
          await notifyUnknownVehicle({
            licensePlate: result.plate,
            confidence: result.confidence,
            photoUrl,
            timestamp: new Date(),
          });
        }
        
        return {
          plate: result.plate,
          confidence: result.confidence,
          isAllowed,
          isBlacklisted: false,
          blacklistEntry: null,
          vehicle,
          passageId: passage.id,
          photoUrl,
          barrierOpened: isAllowed && input.autoOpen,
        };
      } catch (error) {
        console.error("Recognition error:", error);
        throw new TRPCError({ 
          code: 'INTERNAL_SERVER_ERROR', 
          message: 'Failed to recognize license plate' 
        });
      }
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  
  vehicles: vehicleRouter,
  passages: passageRouter,
  medical: medicalRouter,
  settings: settingsRouter,
  barrier: barrierRouter,
  recognition: recognitionRouter,
  telegram: telegramRouter,
  blacklist: blacklistRouter,
});

export type AppRouter = typeof appRouter;
