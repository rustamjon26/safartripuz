import { z } from "zod";

export const shiftStatusSchema = z.enum([
  "SCHEDULED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const taskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
]);

export const taskPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const listShiftsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const patchShiftSchema = z.object({
  status: shiftStatusSchema,
});

export const listTasksQuerySchema = z.object({
  status: z
    .enum(["all", "PENDING", "IN_PROGRESS", "DONE", "CANCELLED"])
    .default("all"),
});

export const patchStaffProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().min(5).max(32).optional().nullable(),
});

export const hotelStaffJobRoleSchema = z.enum([
  "RECEPTION",
  "CLEANER",
  "WAITER",
  "MANAGER",
]);

/** Super-admin: create or link a staff profile to a hotel. */
export const adminLinkHotelStaffSchema = z
  .object({
    userId: z.string().min(1).optional(),
    email: z.string().trim().email().max(191).optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().max(100).optional().nullable(),
    phone: z.string().trim().max(32).optional().nullable(),
    role: hotelStaffJobRoleSchema,
    password: z.string().min(8).max(72).optional(),
    /** Move user from another hotel if already linked. */
    reassign: z.boolean().optional().default(false),
  })
  .refine((v) => Boolean(v.userId || v.email), {
    message: "userId yoki email kerak",
  });

export const adminPatchHotelStaffSchema = z
  .object({
    staffId: z.string().min(1),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().max(100).optional().nullable(),
    phone: z.string().trim().max(32).optional().nullable(),
    role: hotelStaffJobRoleSchema.optional(),
    isActive: z.boolean().optional(),
    /** Move this staff row to another hotel. */
    hotelId: z.string().min(1).optional(),
  })
  .refine(
    (v) =>
      v.firstName !== undefined ||
      v.lastName !== undefined ||
      v.phone !== undefined ||
      v.role !== undefined ||
      v.isActive !== undefined ||
      v.hotelId !== undefined,
    { message: "Kamida bitta maydon kerak" },
  );

export const adminLinkUserToHotelSchema = z.object({
  hotelId: z.string().min(1),
  role: hotelStaffJobRoleSchema.optional(),
  reassign: z.boolean().optional().default(true),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(191),
  description: z.string().trim().max(5000).optional(),
  priority: taskPrioritySchema.default("NORMAL"),
  department: z.string().trim().max(64).optional(),
  dueAt: z.string().datetime().optional(),
  staffId: z.string().min(1).optional(),
});

export const patchTaskSchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const completeModuleSchema = z.object({
  moduleId: z.string().min(1),
});
