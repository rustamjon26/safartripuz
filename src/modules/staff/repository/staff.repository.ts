import { prisma } from "@/src/shared/db/prisma";
import type {
  AdminHotelStaffView,
  ChatMessageView,
  CourseView,
  ModuleView,
  ShiftView,
  StaffContext,
  StaffOpsTaskStatus,
  StaffProfileView,
  StaffShiftStatus,
  TaskView,
  ThreadView,
} from "../domain/types";
import {
  growthLabel,
  initialsFromName,
  staffRoleTitle,
} from "../domain/staff-role-label";

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

  async getProfile(staffId: string, userId: string): Promise<StaffProfileView | null> {
    const staff = await prisma.hotelStaff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        salary: true,
        isActive: true,
        hotel: { select: { name: true } },
        user: {
          select: { email: true, phone: true, first_name: true, last_name: true },
        },
      },
    });
    if (!staff) return null;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(monthStart.getTime() - 1);

    // Prefer completedAt; fall back to updatedAt for legacy DONE rows.
    const doneInRange = (from: Date, to?: Date) => ({
      staffId,
      status: "DONE" as const,
      OR: [
        { completedAt: { gte: from, ...(to ? { lte: to } : {}) } },
        {
          completedAt: null,
          updatedAt: { gte: from, ...(to ? { lte: to } : {}) },
        },
      ],
    });

    const [tasksDone, tasksDoneMonth, tasksDonePrevMonth, shiftsCompletedMonth] =
      await Promise.all([
        prisma.staffOpsTask.count({
          where: { staffId, status: "DONE" },
        }),
        prisma.staffOpsTask.count({
          where: doneInRange(monthStart),
        }),
        prisma.staffOpsTask.count({
          where: doneInRange(prevMonthStart, prevMonthEnd),
        }),
        prisma.staffShift.count({
          where: {
            staffId,
            status: "COMPLETED",
            endsAt: { gte: monthStart },
          },
        }),
      ]);

    const firstName = staff.firstName || staff.user?.first_name || "Xodim";
    const lastName = staff.lastName ?? staff.user?.last_name ?? null;
    const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();
    const salaryNum = Number(staff.salary);
    const baseSalaryLabel =
      Number.isFinite(salaryNum) && salaryNum > 0
        ? `${Math.round(salaryNum).toLocaleString("uz-UZ")} UZS`
        : null;

    return {
      firstName,
      lastName,
      fullName,
      title: staffRoleTitle(staff.role),
      role: staff.role,
      phone: staff.phone ?? staff.user?.phone ?? null,
      email: staff.user?.email ?? null,
      hotelName: staff.hotel.name,
      initials: initialsFromName(firstName, lastName),
      isActive: staff.isActive,
      tasksDone,
      tasksDoneMonth,
      growth: growthLabel(tasksDoneMonth, tasksDonePrevMonth),
      shiftsCompletedMonth,
      baseSalaryLabel,
    };
  }

  async updateProfile(
    staffId: string,
    userId: string,
    patch: {
      firstName?: string;
      lastName?: string | null;
      phone?: string | null;
    },
  ): Promise<StaffProfileView> {
    // User.phone is required+unique — only update it when a new number is set.
    if (patch.phone) {
      const taken = await prisma.user.findFirst({
        where: { phone: patch.phone, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) {
        throw new Error("PHONE_TAKEN");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.hotelStaff.update({
        where: { id: staffId },
        data: {
          ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
          ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        },
      });

      if (
        patch.firstName !== undefined ||
        patch.lastName !== undefined ||
        Boolean(patch.phone)
      ) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(patch.firstName !== undefined
              ? { first_name: patch.firstName }
              : {}),
            ...(patch.lastName !== undefined
              ? { last_name: patch.lastName ?? "" }
              : {}),
            ...(patch.phone ? { phone: patch.phone } : {}),
          },
        });
      }
    });

    const profile = await this.getProfile(staffId, userId);
    if (!profile) throw new Error("Profile reload failed");
    return profile;
  }

  private mapAdminHotelStaff(row: {
    id: string;
    hotelId: string;
    userId: string | null;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    hotel: { name: string };
    user: { email: string; role: string } | null;
  }): AdminHotelStaffView {
    return {
      id: row.id,
      hotelId: row.hotelId,
      hotelName: row.hotel.name,
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      role: row.role,
      title: staffRoleTitle(row.role),
      isActive: row.isActive,
      email: row.user?.email ?? null,
      platformRole: row.user?.role ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async hotelExists(hotelId: string): Promise<boolean> {
    const row = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true },
    });
    return Boolean(row);
  }

  async listAdminHotelStaff(hotelId: string): Promise<AdminHotelStaffView[]> {
    const rows = await prisma.hotelStaff.findMany({
      where: { hotelId },
      include: {
        hotel: { select: { name: true } },
        user: { select: { email: true, role: true } },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => this.mapAdminHotelStaff(r));
  }

  async findAdminStaffByUserId(
    userId: string,
  ): Promise<AdminHotelStaffView | null> {
    const row = await prisma.hotelStaff.findFirst({
      where: { userId },
      include: {
        hotel: { select: { name: true } },
        user: { select: { email: true, role: true } },
      },
    });
    return row ? this.mapAdminHotelStaff(row) : null;
  }

  async findAdminStaffById(staffId: string): Promise<AdminHotelStaffView | null> {
    const row = await prisma.hotelStaff.findUnique({
      where: { id: staffId },
      include: {
        hotel: { select: { name: true } },
        user: { select: { email: true, role: true } },
      },
    });
    return row ? this.mapAdminHotelStaff(row) : null;
  }

  async findUserForStaffLink(params: {
    userId?: string;
    email?: string;
  }): Promise<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
  } | null> {
    if (params.userId) {
      return prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          role: true,
        },
      });
    }
    if (params.email) {
      return prisma.user.findUnique({
        where: { email: params.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone: true,
          role: true,
        },
      });
    }
    return null;
  }

  async createUserForStaffLink(input: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    passwordHash: string;
    platformRole: "cleaner" | "receptionist" | "waiter" | "hotel_staff";
  }): Promise<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
  }> {
    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        password: input.passwordHash,
        role: input.platformRole,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
      },
    });
  }

  async adminUpsertHotelStaffLink(input: {
    hotelId: string;
    userId: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    jobRole: string;
    platformRole: "cleaner" | "receptionist" | "waiter" | "hotel_staff";
    syncPlatformRole: boolean;
    existingStaffId: string | null;
  }): Promise<AdminHotelStaffView> {
    const staff = await prisma.$transaction(async (tx) => {
      if (input.syncPlatformRole) {
        await tx.user.update({
          where: { id: input.userId },
          data: {
            role: input.platformRole,
            first_name: input.firstName,
            ...(input.lastName !== null ? { last_name: input.lastName } : {}),
            ...(input.phone ? { phone: input.phone } : {}),
          },
        });
      } else if (input.phone || input.firstName) {
        await tx.user.update({
          where: { id: input.userId },
          data: {
            ...(input.firstName ? { first_name: input.firstName } : {}),
            ...(input.lastName !== null ? { last_name: input.lastName } : {}),
            ...(input.phone ? { phone: input.phone } : {}),
          },
        });
      }

      if (input.existingStaffId) {
        return tx.hotelStaff.update({
          where: { id: input.existingStaffId },
          data: {
            hotelId: input.hotelId,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            role: input.jobRole,
            isActive: true,
          },
          include: {
            hotel: { select: { name: true } },
            user: { select: { email: true, role: true } },
          },
        });
      }

      return tx.hotelStaff.create({
        data: {
          hotelId: input.hotelId,
          userId: input.userId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: input.jobRole,
          isActive: true,
        },
        include: {
          hotel: { select: { name: true } },
          user: { select: { email: true, role: true } },
        },
      });
    });

    return this.mapAdminHotelStaff(staff);
  }

  async adminPatchHotelStaff(input: {
    staffId: string;
    firstName?: string;
    lastName?: string | null;
    phone?: string | null;
    role?: string;
    isActive?: boolean;
    hotelId?: string;
    platformRole?: "cleaner" | "receptionist" | "waiter" | "hotel_staff";
    syncPlatformRole: boolean;
  }): Promise<AdminHotelStaffView> {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.hotelStaff.findUnique({
        where: { id: input.staffId },
        select: { id: true, userId: true },
      });
      if (!existing) throw new Error("STAFF_NOT_FOUND");

      if (input.hotelId) {
        const hotel = await tx.hotel.findUnique({
          where: { id: input.hotelId },
          select: { id: true },
        });
        if (!hotel) throw new Error("HOTEL_NOT_FOUND");
      }

      const staff = await tx.hotelStaff.update({
        where: { id: existing.id },
        data: {
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.hotelId !== undefined ? { hotelId: input.hotelId } : {}),
        },
        include: {
          hotel: { select: { name: true } },
          user: { select: { email: true, role: true } },
        },
      });

      if (
        existing.userId &&
        input.syncPlatformRole &&
        input.platformRole
      ) {
        await tx.user.update({
          where: { id: existing.userId },
          data: { role: input.platformRole },
        });
        staff.user = {
          email: staff.user?.email ?? "",
          role: input.platformRole,
        };
      }

      return staff;
    });

    return this.mapAdminHotelStaff(updated);
  }

  async adminUnlinkHotelStaff(staffId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.hotelStaff.findUnique({
        where: { id: staffId },
        select: { id: true, userId: true },
      });
      if (!existing) throw new Error("STAFF_NOT_FOUND");

      await tx.hotelStaff.delete({ where: { id: existing.id } });

      if (existing.userId) {
        const linked = await tx.user.findUnique({
          where: { id: existing.userId },
          select: { role: true },
        });
        if (
          linked &&
          (linked.role === "cleaner" ||
            linked.role === "receptionist" ||
            linked.role === "waiter" ||
            linked.role === "hotel_staff")
        ) {
          await tx.user.update({
            where: { id: existing.userId },
            data: { role: "user" },
          });
        }
      }
    });
  }

  async listHotelsForAdminSelect(): Promise<
    Array<{ id: string; name: string; city: string | null; status: string }>
  > {
    return prisma.hotel.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true, status: true },
      take: 500,
    });
  }
}

export const staffRepository = new StaffRepository();
