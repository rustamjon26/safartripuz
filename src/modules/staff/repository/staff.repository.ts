import { prisma } from "@/src/shared/db/prisma";
import type {
  ChatMessageView,
  CourseView,
  ModuleView,
  ShiftView,
  StaffContext,
  StaffOpsTaskStatus,
  StaffShiftStatus,
  TaskView,
  ThreadView,
} from "../domain/types";

function mapShift(row: {
  id: string;
  title: string;
  location: string | null;
  startsAt: Date;
  endsAt: Date;
  status: StaffShiftStatus;
  notes: string | null;
}): ShiftView {
  return {
    id: row.id,
    title: row.title,
    location: row.location,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    notes: row.notes,
  };
}

export class StaffRepository {
  /** Active HotelStaff record (with hotel status) for the logged-in user. */
  async findActiveStaffForUser(userId: string): Promise<{
    id: string;
    hotelId: string;
    role: string;
    firstName: string;
    lastName: string | null;
    hotelStatus: string;
  } | null> {
    const staff = await prisma.hotelStaff.findFirst({
      where: { userId, isActive: true },
      select: {
        id: true,
        hotelId: true,
        role: true,
        firstName: true,
        lastName: true,
        hotel: { select: { status: true } },
      },
    });
    if (!staff) return null;
    return {
      id: staff.id,
      hotelId: staff.hotelId,
      role: staff.role,
      firstName: staff.firstName,
      lastName: staff.lastName,
      hotelStatus: staff.hotel.status,
    };
  }

  /** Hotel owned by a partner user (manager shift-create path). */
  async findHotelIdOwnedByUser(userId: string): Promise<string | null> {
    const owned = await prisma.hotel.findFirst({
      where: { partner: { userId } },
      select: { id: true },
    });
    return owned?.id ?? null;
  }

  /**
   * hotel_manager can open /staff without a HotelStaff row — create one so
   * dashboard/shifts/tasks resolve. Idempotent on userId unique.
   */
  async ensureManagerStaffProfile(
    userId: string,
    hotelId: string,
  ): Promise<{
    id: string;
    hotelId: string;
    role: string;
    firstName: string;
    lastName: string | null;
    hotelStatus: string;
  }> {
    const existing = await this.findActiveStaffForUser(userId);
    if (existing) return existing;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true },
    });
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { status: true },
    });

    try {
      const created = await prisma.hotelStaff.create({
        data: {
          hotelId,
          userId,
          firstName: user?.first_name?.trim() || "Manager",
          lastName: user?.last_name?.trim() || null,
          role: "MANAGER",
          isActive: true,
        },
        select: {
          id: true,
          hotelId: true,
          role: true,
          firstName: true,
          lastName: true,
        },
      });

      return {
        id: created.id,
        hotelId: created.hotelId,
        role: created.role,
        firstName: created.firstName,
        lastName: created.lastName,
        hotelStatus: hotel?.status ?? "draft",
      };
    } catch {
      // Concurrent create (userId unique) — re-read.
      const raced = await this.findActiveStaffForUser(userId);
      if (raced) return raced;
      throw new Error("HotelStaff profil yaratilmadi");
    }
  }

  async listShiftsForStaff(input: {
    staffId: string;
    from?: Date;
    to?: Date;
  }): Promise<ShiftView[]> {
    const rows = await prisma.staffShift.findMany({
      where: {
        staffId: input.staffId,
        startsAt: {
          gte: input.from,
          lte: input.to,
        },
      },
      orderBy: { startsAt: "asc" },
    });
    return rows.map(mapShift);
  }

  async getShift(id: string, staffId: string) {
    return prisma.staffShift.findFirst({ where: { id, staffId } });
  }

  async updateShiftStatus(id: string, status: StaffShiftStatus): Promise<ShiftView> {
    const row = await prisma.staffShift.update({
      where: { id },
      data: { status },
    });
    return mapShift(row);
  }

  async listTasks(input: {
    hotelId: string;
    staffId: string;
    status?: StaffOpsTaskStatus | "all";
  }): Promise<TaskView[]> {
    const rows = await prisma.staffOpsTask.findMany({
      where: {
        hotelId: input.hotelId,
        OR: [{ staffId: input.staffId }, { staffId: null }],
        status:
          input.status && input.status !== "all" ? input.status : undefined,
      },
      include: {
        staff: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      department: r.department,
      priority: r.priority,
      status: r.status,
      dueAt: r.dueAt,
      staffId: r.staffId,
      assigneeName: r.staff
        ? `${r.staff.firstName}${r.staff.lastName ? ` ${r.staff.lastName}` : ""}`
        : null,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    }));
  }

  async getTask(id: string, hotelId: string) {
    return prisma.staffOpsTask.findFirst({ where: { id, hotelId } });
  }

  async createTask(input: {
    hotelId: string;
    staffId?: string | null;
    createdByUserId: string;
    title: string;
    description?: string | null;
    department?: string | null;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    dueAt?: Date | null;
  }): Promise<TaskView> {
    const r = await prisma.staffOpsTask.create({
      data: {
        hotelId: input.hotelId,
        staffId: input.staffId ?? null,
        createdByUserId: input.createdByUserId,
        title: input.title,
        description: input.description ?? null,
        department: input.department ?? null,
        priority: input.priority,
        dueAt: input.dueAt ?? null,
      },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      department: r.department,
      priority: r.priority,
      status: r.status,
      dueAt: r.dueAt,
      staffId: r.staffId,
      assigneeName: r.staff
        ? `${r.staff.firstName}${r.staff.lastName ? ` ${r.staff.lastName}` : ""}`
        : null,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    };
  }

  async updateTaskStatus(
    id: string,
    status: StaffOpsTaskStatus,
  ): Promise<TaskView> {
    const r = await prisma.staffOpsTask.update({
      where: { id },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      },
      include: { staff: { select: { firstName: true, lastName: true } } },
    });
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      department: r.department,
      priority: r.priority,
      status: r.status,
      dueAt: r.dueAt,
      staffId: r.staffId,
      assigneeName: r.staff
        ? `${r.staff.firstName}${r.staff.lastName ? ` ${r.staff.lastName}` : ""}`
        : null,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    };
  }

  /** Ensure default department channels exist (hotelkit-style). */
  async ensureDepartmentThreads(hotelId: string): Promise<void> {
    const defaults = [
      { department: "RECEPTION", name: "Reception (Qabulxona)" },
      { department: "HOUSEKEEPING", name: "Housekeeping (Tozalash)" },
      { department: "RESTAURANT", name: "Restoran Jamoasi" },
      { department: "MANAGEMENT", name: "Management" },
      { department: "GENERAL", name: "Umumiy kanal" },
    ];
    for (const d of defaults) {
      await prisma.staffChatThread.upsert({
        where: {
          hotelId_kind_department: {
            hotelId,
            kind: "DEPARTMENT",
            department: d.department,
          },
        },
        create: {
          hotelId,
          kind: "DEPARTMENT",
          department: d.department,
          name: d.name,
        },
        update: {},
      });
    }
  }

  async ensureMembership(threadId: string, userId: string): Promise<void> {
    await prisma.staffChatMember.upsert({
      where: { threadId_userId: { threadId, userId } },
      create: { threadId, userId },
      update: {},
    });
  }

  async listThreads(ctx: StaffContext): Promise<ThreadView[]> {
    await this.ensureDepartmentThreads(ctx.hotelId);
    const threads = await prisma.staffChatThread.findMany({
      where: {
        hotelId: ctx.hotelId,
        OR: [
          { kind: "DEPARTMENT" },
          { kind: "ANNOUNCEMENT" },
          { members: { some: { userId: ctx.userId } } },
        ],
      },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        members: { where: { userId: ctx.userId }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Auto-join department channel for own department + GENERAL
    for (const t of threads) {
      if (
        t.kind === "DEPARTMENT" &&
        (t.department === ctx.department || t.department === "GENERAL")
      ) {
        await this.ensureMembership(t.id, ctx.userId);
      }
    }

    return threads.map((t) => {
      const last = t.messages[0] ?? null;
      const member = t.members[0];
      const unread =
        last && member?.lastReadAt
          ? last.createdAt > member.lastReadAt
            ? 1
            : 0
          : last
            ? 1
            : 0;
      return {
        id: t.id,
        name: t.name,
        kind: t.kind,
        department: t.department,
        preview: last?.body ?? null,
        lastMessageAt: last?.createdAt ?? null,
        unread,
      };
    });
  }

  async getThread(id: string, hotelId: string) {
    return prisma.staffChatThread.findFirst({ where: { id, hotelId } });
  }

  async listMessages(
    threadId: string,
    viewerUserId: string,
  ): Promise<ChatMessageView[]> {
    const rows = await prisma.staffChatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        author: { select: { first_name: true, last_name: true } },
      },
    });
    await prisma.staffChatMember.updateMany({
      where: { threadId, userId: viewerUserId },
      data: { lastReadAt: new Date() },
    });
    return rows.map((r) => ({
      id: r.id,
      authorUserId: r.authorUserId,
      authorName: `${r.author.first_name}${r.author.last_name ? ` ${r.author.last_name}` : ""}`.trim(),
      body: r.body,
      createdAt: r.createdAt,
      me: r.authorUserId === viewerUserId,
    }));
  }

  async sendMessage(input: {
    threadId: string;
    authorUserId: string;
    body: string;
  }): Promise<ChatMessageView> {
    const r = await prisma.$transaction(async (tx) => {
      const msg = await tx.staffChatMessage.create({
        data: {
          threadId: input.threadId,
          authorUserId: input.authorUserId,
          body: input.body,
        },
        include: {
          author: { select: { first_name: true, last_name: true } },
        },
      });
      await tx.staffChatThread.update({
        where: { id: input.threadId },
        data: { updatedAt: new Date() },
      });
      return msg;
    });
    return {
      id: r.id,
      authorUserId: r.authorUserId,
      authorName: `${r.author.first_name}${r.author.last_name ? ` ${r.author.last_name}` : ""}`.trim(),
      body: r.body,
      createdAt: r.createdAt,
      me: true,
    };
  }

  async ensurePlatformCourses(): Promise<void> {
    const count = await prisma.staffCourse.count({ where: { hotelId: null } });
    if (count > 0) return;

    const course = await prisma.staffCourse.create({
      data: {
        hotelId: null,
        title: "Premium Mehmonlarga Xizmat Ko‘rsatish",
        description:
          "Yuqori martabali mehmonlarning kutishlarini qondirish usullari.",
        category: "STANDARDS",
        durationMin: 15,
        modules: {
          create: [
            {
              sortOrder: 1,
              title: "Tabassum bilan kutib olish",
              body: "Mehmon bilan ko‘z muloqotini o‘rnating va samimiy tabassum qiling.",
            },
            {
              sortOrder: 2,
              title: "Milliy ehtirom ko‘rsatish",
              body: "O‘ng qo‘lingizni ko‘ksingizga qo‘yib, Assalomu alaykum deb kutib oling.",
            },
            {
              sortOrder: 3,
              title: "Ehtiyojlarni aniqlash",
              body: "Yuklarga yordam bering va dam olish yoki ichimlik taklif eting.",
            },
            {
              sortOrder: 4,
              title: "Premium servislarni taklif qilish",
              body: "Maxsus xizmatlar haqida ma’lumot bering.",
            },
          ],
        },
      },
    });
    void course;
  }

  async listCourses(userId: string): Promise<CourseView[]> {
    await this.ensurePlatformCourses();
    const courses = await prisma.staffCourse.findMany({
      where: { isPublished: true, OR: [{ hotelId: null }, { hotelId: { not: null } }] },
      include: {
        modules: { select: { id: true } },
        enrollments: { where: { userId }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      durationMin: c.durationMin,
      moduleCount: c.modules.length,
      progressPct: c.enrollments[0]?.progressPct ?? 0,
      enrolled: c.enrollments.length > 0,
    }));
  }

  async getCourseDetail(courseId: string, userId: string): Promise<{
    course: CourseView;
    modules: ModuleView[];
  } | null> {
    const c = await prisma.staffCourse.findFirst({
      where: { id: courseId, isPublished: true },
      include: {
        modules: { orderBy: { sortOrder: "asc" } },
        enrollments: {
          where: { userId },
          take: 1,
          include: { moduleProgress: true },
        },
      },
    });
    if (!c) return null;
    const enrollment = c.enrollments[0];
    const done = new Set(
      enrollment?.moduleProgress.filter((p) => p.completed).map((p) => p.moduleId) ??
        [],
    );
    return {
      course: {
        id: c.id,
        title: c.title,
        description: c.description,
        category: c.category,
        durationMin: c.durationMin,
        moduleCount: c.modules.length,
        progressPct: enrollment?.progressPct ?? 0,
        enrolled: !!enrollment,
      },
      modules: c.modules.map((m) => ({
        id: m.id,
        sortOrder: m.sortOrder,
        title: m.title,
        body: m.body,
        videoUrl: m.videoUrl,
        completed: done.has(m.id),
      })),
    };
  }

  async enroll(courseId: string, userId: string, staffId: string) {
    return prisma.staffCourseEnrollment.upsert({
      where: { courseId_userId: { courseId, userId } },
      create: { courseId, userId, staffId },
      update: {},
    });
  }

  async completeModule(input: {
    courseId: string;
    userId: string;
    moduleId: string;
  }): Promise<{ progressPct: number }> {
    const enrollment = await prisma.staffCourseEnrollment.findUnique({
      where: {
        courseId_userId: { courseId: input.courseId, userId: input.userId },
      },
    });
    if (!enrollment) throw new Error("ENROLLMENT_REQUIRED");

    const moduleCount = await prisma.staffCourseModule.count({
      where: { courseId: input.courseId },
    });

    await prisma.staffModuleProgress.upsert({
      where: {
        enrollmentId_moduleId: {
          enrollmentId: enrollment.id,
          moduleId: input.moduleId,
        },
      },
      create: {
        enrollmentId: enrollment.id,
        moduleId: input.moduleId,
        completed: true,
        completedAt: new Date(),
      },
      update: { completed: true, completedAt: new Date() },
    });

    const completedCount = await prisma.staffModuleProgress.count({
      where: { enrollmentId: enrollment.id, completed: true },
    });
    const progressPct =
      moduleCount > 0 ? Math.round((completedCount / moduleCount) * 100) : 0;

    await prisma.staffCourseEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPct,
        completedAt: progressPct >= 100 ? new Date() : null,
      },
    });

    return { progressPct };
  }

  async createShift(input: {
    hotelId: string;
    staffId: string;
    title: string;
    location?: string | null;
    startsAt: Date;
    endsAt: Date;
    notes?: string | null;
  }): Promise<ShiftView> {
    const row = await prisma.staffShift.create({
      data: {
        hotelId: input.hotelId,
        staffId: input.staffId,
        title: input.title,
        location: input.location ?? null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        notes: input.notes ?? null,
      },
    });
    return mapShift(row);
  }

  /** Pull open housekeeping tasks into StaffOpsTask (idempotent by housekeepingTaskId). */
  async syncHousekeepingTasks(input: {
    hotelId: string;
    staffId: string;
  }): Promise<{ created: number }> {
    const open = await prisma.housekeepingTask.findMany({
      where: {
        hotelId: input.hotelId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        OR: [{ staffId: input.staffId }, { staffId: null }],
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    let created = 0;
    for (const hk of open) {
      const existing = await prisma.staffOpsTask.findFirst({
        where: { housekeepingTaskId: hk.id },
        select: { id: true },
      });
      if (existing) continue;
      await prisma.staffOpsTask.create({
        data: {
          hotelId: input.hotelId,
          staffId: hk.staffId ?? input.staffId,
          title: `${hk.taskType}: xona vazifasi`,
          description: hk.notes,
          department: "HOUSEKEEPING",
          priority:
            hk.priority === "URGENT" || hk.priority === "HIGH"
              ? (hk.priority as "HIGH" | "URGENT")
              : hk.priority === "LOW"
                ? "LOW"
                : "NORMAL",
          status: hk.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING",
          housekeepingTaskId: hk.id,
        },
      });
      created += 1;
    }
    return { created };
  }

  async dashboardStats(staffId: string, hotelId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const [todayTasks, todayShift] = await Promise.all([
      prisma.staffOpsTask.count({
        where: {
          hotelId,
          OR: [{ staffId }, { staffId: null }],
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
      prisma.staffShift.findFirst({
        where: {
          staffId,
          startsAt: { lte: end },
          endsAt: { gte: start },
          status: { in: ["SCHEDULED", "ACTIVE"] },
        },
        orderBy: { startsAt: "asc" },
      }),
    ]);

    return { todayTasks, todayShift: todayShift ? mapShift(todayShift) : null };
  }
}

export const staffRepository = new StaffRepository();
