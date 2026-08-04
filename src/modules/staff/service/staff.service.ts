import bcrypt from "bcryptjs";
import {
  isProtectedPlatformRole,
  jobRoleToPlatformRole,
  platformRoleToJobRole,
} from "@/lib/hotel/staffPlatformRole";
import { normalizeUzPhone } from "@/lib/phone";
import {
  assertShiftTransition,
  StaffShiftStatusError,
} from "../domain/shift-status";
import {
  assertTaskTransition,
  StaffTaskStatusError,
} from "../domain/task-status";
import type {
  AdminHotelStaffView,
  StaffOpsTaskStatus,
  StaffShiftStatus,
} from "../domain/types";
import { staffRepository } from "../repository/staff.repository";
import {
  resolveStaffContext,
  StaffContextError,
} from "./staff-context";

function randomTempPassword(): string {
  return `St@ff${Math.random().toString(36).slice(-8)}`;
}

function placeholderPhone(): string {
  return `+998${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0")}`;
}

export class StaffNotFoundError extends Error {
  constructor(message = "Topilmadi") {
    super(message);
    this.name = "StaffNotFoundError";
  }
}

export class StaffService {
  async context(userId: string) {
    return resolveStaffContext(userId);
  }

  async dashboard(userId: string) {
    const ctx = await resolveStaffContext(userId);
    const stats = await staffRepository.dashboardStats(ctx.staffId, ctx.hotelId);
    return { ctx, ...stats };
  }

  async profile(userId: string) {
    const ctx = await resolveStaffContext(userId);
    const profile = await staffRepository.getProfile(ctx.staffId, userId);
    if (!profile) throw new StaffNotFoundError("Profil topilmadi");
    return { ctx, profile };
  }

  async patchProfile(
    userId: string,
    patch: {
      firstName?: string;
      lastName?: string | null;
      phone?: string | null;
    },
  ) {
    const ctx = await resolveStaffContext(userId);
    if (
      patch.firstName === undefined &&
      patch.lastName === undefined &&
      patch.phone === undefined
    ) {
      throw new Error("VALIDATION");
    }

    let phone = patch.phone;
    if (phone !== undefined && phone !== null) {
      const normalized = normalizeUzPhone(phone);
      if (!normalized) throw new Error("PHONE_INVALID");
      phone = normalized;
    }

    const profile = await staffRepository.updateProfile(ctx.staffId, userId, {
      ...patch,
      ...(phone !== undefined ? { phone } : {}),
    });
    return { ctx, profile };
  }

  async listShifts(userId: string, range?: { from?: Date; to?: Date }) {
    const ctx = await resolveStaffContext(userId);
    const from = range?.from ?? new Date(Date.now() - 2 * 24 * 3600 * 1000);
    const to = range?.to ?? new Date(Date.now() + 14 * 24 * 3600 * 1000);
    const items = await staffRepository.listShiftsForStaff({
      staffId: ctx.staffId,
      from,
      to,
    });
    return { ctx, items };
  }

  async patchShift(userId: string, shiftId: string, status: StaffShiftStatus) {
    const ctx = await resolveStaffContext(userId);
    const shift = await staffRepository.getShift(shiftId, ctx.staffId);
    if (!shift) throw new StaffNotFoundError("Smena topilmadi");
    assertShiftTransition(shift.status, status);
    const updated = await staffRepository.updateShiftStatus(shiftId, status);
    return updated;
  }

  async listTasks(userId: string, status: StaffOpsTaskStatus | "all" = "all") {
    const ctx = await resolveStaffContext(userId);
    const items = await staffRepository.listTasks({
      hotelId: ctx.hotelId,
      staffId: ctx.staffId,
      status,
    });
    return { ctx, items };
  }

  async syncHousekeeping(userId: string) {
    const ctx = await resolveStaffContext(userId);
    return staffRepository.syncHousekeepingTasks({
      hotelId: ctx.hotelId,
      staffId: ctx.staffId,
    });
  }

  async createShift(
    actorUserId: string,
    input: {
      staffId: string;
      title: string;
      location?: string;
      startsAt: string;
      endsAt: string;
      notes?: string;
    },
  ) {
    // Manager path: resolve via their hotel staff or hotel ownership
    const managerStaff = await resolveStaffContext(actorUserId).catch(() => null);
    let hotelId = managerStaff?.hotelId;
    if (!hotelId) {
      hotelId =
        (await staffRepository.findHotelIdOwnedByUser(actorUserId)) ?? undefined;
    }
    if (!hotelId) throw new StaffContextError("Hotel topilmadi");

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (!(startsAt < endsAt)) {
      throw new StaffShiftStatusError("startsAt endsAt dan oldin bo‘lishi kerak");
    }

    return staffRepository.createShift({
      hotelId,
      staffId: input.staffId,
      title: input.title,
      location: input.location,
      startsAt,
      endsAt,
      notes: input.notes,
    });
  }

  async createTask(
    userId: string,
    input: {
      title: string;
      description?: string;
      priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      department?: string;
      dueAt?: string;
      staffId?: string;
    },
  ) {
    const ctx = await resolveStaffContext(userId);
    return staffRepository.createTask({
      hotelId: ctx.hotelId,
      staffId: input.staffId ?? ctx.staffId,
      createdByUserId: userId,
      title: input.title,
      description: input.description,
      department: input.department ?? ctx.department,
      priority: input.priority,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    });
  }

  async patchTask(
    userId: string,
    taskId: string,
    patch: { status?: StaffOpsTaskStatus },
  ) {
    const ctx = await resolveStaffContext(userId);
    const task = await staffRepository.getTask(taskId, ctx.hotelId);
    if (!task) throw new StaffNotFoundError("Vazifa topilmadi");
    if (task.staffId && task.staffId !== ctx.staffId) {
      // unassigned or own only for now
      throw new StaffContextError("Bu vazifa sizga biriktirilmagan");
    }
    if (patch.status) {
      assertTaskTransition(task.status, patch.status);
      return staffRepository.updateTaskStatus(taskId, patch.status);
    }
    return staffRepository.listTasks({
      hotelId: ctx.hotelId,
      staffId: ctx.staffId,
    }).then((items) => items.find((i) => i.id === taskId)!);
  }

  async listThreads(userId: string) {
    const ctx = await resolveStaffContext(userId);
    const items = await staffRepository.listThreads(ctx);
    return { ctx, items };
  }

  async listMessages(userId: string, threadId: string) {
    const ctx = await resolveStaffContext(userId);
    const thread = await staffRepository.getThread(threadId, ctx.hotelId);
    if (!thread) throw new StaffNotFoundError("Chat topilmadi");
    await staffRepository.ensureMembership(threadId, userId);
    const messages = await staffRepository.listMessages(threadId, userId);
    return { thread, messages };
  }

  async sendMessage(userId: string, threadId: string, body: string) {
    const ctx = await resolveStaffContext(userId);
    const thread = await staffRepository.getThread(threadId, ctx.hotelId);
    if (!thread) throw new StaffNotFoundError("Chat topilmadi");
    await staffRepository.ensureMembership(threadId, userId);
    return staffRepository.sendMessage({
      threadId,
      authorUserId: userId,
      body,
    });
  }

  async listCourses(userId: string) {
    await resolveStaffContext(userId);
    const items = await staffRepository.listCourses(userId);
    return { items };
  }

  async getCourse(userId: string, courseId: string) {
    await resolveStaffContext(userId);
    const detail = await staffRepository.getCourseDetail(courseId, userId);
    if (!detail) throw new StaffNotFoundError("Kurs topilmadi");
    return detail;
  }

  async enroll(userId: string, courseId: string) {
    const ctx = await resolveStaffContext(userId);
    await staffRepository.enroll(courseId, userId, ctx.staffId);
    return this.getCourse(userId, courseId);
  }

  async completeModule(userId: string, courseId: string, moduleId: string) {
    await resolveStaffContext(userId);
    const { progressPct } = await staffRepository.completeModule({
      courseId,
      userId,
      moduleId,
    });
    const detail = await this.getCourse(userId, courseId);
    return { ...detail, progressPct };
  }

  // ── Super-admin: link staff profiles to hotels ─────────────────────

  async adminListHotelStaff(hotelId: string): Promise<AdminHotelStaffView[]> {
    const ok = await staffRepository.hotelExists(hotelId);
    if (!ok) throw new StaffNotFoundError("Mehmonxona topilmadi");
    return staffRepository.listAdminHotelStaff(hotelId);
  }

  async adminGetUserHotelStaff(
    userId: string,
  ): Promise<AdminHotelStaffView | null> {
    return staffRepository.findAdminStaffByUserId(userId);
  }

  async adminListHotelsForSelect() {
    return staffRepository.listHotelsForAdminSelect();
  }

  async adminLinkHotelStaff(
    hotelId: string,
    input: {
      userId?: string;
      email?: string;
      firstName?: string;
      lastName?: string | null;
      phone?: string | null;
      role: "RECEPTION" | "CLEANER" | "WAITER" | "MANAGER";
      password?: string;
      reassign?: boolean;
    },
  ): Promise<{
    staff: AdminHotelStaffView;
    generatedPassword: string | null;
    passwordWasGenerated: boolean;
    createdUser: boolean;
  }> {
    const ok = await staffRepository.hotelExists(hotelId);
    if (!ok) throw new StaffNotFoundError("Mehmonxona topilmadi");

    const platformRole = jobRoleToPlatformRole(input.role);
    let user = await staffRepository.findUserForStaffLink({
      userId: input.userId,
      email: input.email,
    });

    let createdUser = false;
    let generatedPassword: string | null = null;
    let passwordWasGenerated = false;

    if (!user) {
      if (!input.email) throw new Error("USER_NOT_FOUND");
      const firstName = input.firstName?.trim();
      if (!firstName) throw new Error("FIRST_NAME_REQUIRED");

      const rawPassword = input.password?.trim() || randomTempPassword();
      passwordWasGenerated = !input.password?.trim();
      generatedPassword = rawPassword;
      const passwordHash = await bcrypt.hash(rawPassword, 12);

      const phoneNorm = input.phone
        ? normalizeUzPhone(input.phone) ?? input.phone.trim()
        : placeholderPhone();

      user = await staffRepository.createUserForStaffLink({
        email: input.email,
        firstName,
        lastName: (input.lastName ?? "").trim(),
        phone: phoneNorm,
        passwordHash,
        platformRole,
      });
      createdUser = true;
    } else if (
      isProtectedPlatformRole(user.role) &&
      user.role !== "hotel_manager"
    ) {
      // hotel_manager may also have a HotelStaff row for /staff PWA.
      throw new Error("PROTECTED_USER");
    }

    const existing = await staffRepository.findAdminStaffByUserId(user.id);
    if (existing && existing.hotelId !== hotelId && !input.reassign) {
      throw new Error("USER_OTHER_HOTEL");
    }

    const firstName =
      input.firstName?.trim() || user.first_name || "Xodim";
    const lastName =
      input.lastName !== undefined
        ? input.lastName
        : user.last_name || null;
    const phone =
      input.phone !== undefined
        ? input.phone
          ? normalizeUzPhone(input.phone) ?? input.phone.trim()
          : null
        : user.phone;

    if (input.password?.trim() && !createdUser) {
      // Password changes stay on dedicated admin password endpoint.
    }

    const staff = await staffRepository.adminUpsertHotelStaffLink({
      hotelId,
      userId: user.id,
      firstName,
      lastName: lastName ? String(lastName) : null,
      phone,
      jobRole: input.role,
      platformRole,
      syncPlatformRole: !isProtectedPlatformRole(user.role),
      existingStaffId: existing?.id ?? null,
    });

    return {
      staff,
      generatedPassword,
      passwordWasGenerated,
      createdUser,
    };
  }

  async adminLinkUserToHotel(
    userId: string,
    input: {
      hotelId: string;
      role?: "RECEPTION" | "CLEANER" | "WAITER" | "MANAGER";
      reassign?: boolean;
    },
  ): Promise<AdminHotelStaffView> {
    const user = await staffRepository.findUserForStaffLink({ userId });
    if (!user) throw new StaffNotFoundError("Foydalanuvchi topilmadi");
    if (isProtectedPlatformRole(user.role) && user.role !== "hotel_manager") {
      throw new Error("PROTECTED_USER");
    }

    const jobRole = input.role ?? platformRoleToJobRole(user.role);
    const result = await this.adminLinkHotelStaff(input.hotelId, {
      userId,
      role: jobRole,
      firstName: user.first_name,
      lastName: user.last_name || null,
      phone: user.phone,
      reassign: input.reassign ?? true,
    });
    return result.staff;
  }

  async adminPatchHotelStaff(input: {
    staffId: string;
    firstName?: string;
    lastName?: string | null;
    phone?: string | null;
    role?: "RECEPTION" | "CLEANER" | "WAITER" | "MANAGER";
    isActive?: boolean;
    hotelId?: string;
  }): Promise<AdminHotelStaffView> {
    const existing = await staffRepository.findAdminStaffById(input.staffId);
    if (!existing) throw new StaffNotFoundError("Xodim topilmadi");

    const platformRole = input.role
      ? jobRoleToPlatformRole(input.role)
      : undefined;
    const syncPlatformRole = Boolean(
      platformRole &&
        existing.platformRole &&
        !isProtectedPlatformRole(existing.platformRole),
    );

    return staffRepository.adminPatchHotelStaff({
      staffId: input.staffId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: input.role,
      isActive: input.isActive,
      hotelId: input.hotelId,
      platformRole,
      syncPlatformRole,
    });
  }

  async adminUnlinkHotelStaff(staffId: string): Promise<void> {
    const existing = await staffRepository.findAdminStaffById(staffId);
    if (!existing) throw new StaffNotFoundError("Xodim topilmadi");
    await staffRepository.adminUnlinkHotelStaff(staffId);
  }
}

export const staffService = new StaffService();

export {
  StaffContextError,
  StaffShiftStatusError,
  StaffTaskStatusError,
};
