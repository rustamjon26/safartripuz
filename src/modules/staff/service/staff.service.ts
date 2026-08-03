import {
  assertShiftTransition,
  StaffShiftStatusError,
} from "../domain/shift-status";
import {
  assertTaskTransition,
  StaffTaskStatusError,
} from "../domain/task-status";
import type { StaffOpsTaskStatus, StaffShiftStatus } from "../domain/types";
import { staffRepository } from "../repository/staff.repository";
import {
  resolveStaffContext,
  StaffContextError,
} from "./staff-context";

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
}

export const staffService = new StaffService();

export {
  StaffContextError,
  StaffShiftStatusError,
  StaffTaskStatusError,
};
