import { prisma } from "@/src/shared/db/prisma";
import type {
  SupportMemberRole,
  SupportMessageView,
  SupportPartyType,
  SupportThreadStatus,
  SupportThreadView,
} from "../domain/types";

function displayName(first: string, last: string): string {
  return `${first} ${last}`.trim() || "Foydalanuvchi";
}

export class SupportChatRepository {
  async findUser(userId: string): Promise<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  } | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
      },
    });
  }

  async createThread(input: {
    subject: string;
    partyType: SupportPartyType;
    partyUserId: string;
    body: string;
  }): Promise<SupportThreadView> {
    const now = new Date();
    const thread = await prisma.$transaction(async (tx) => {
      const created = await tx.supportThread.create({
        data: {
          subject: input.subject,
          partyType: input.partyType,
          partyUserId: input.partyUserId,
          status: "OPEN",
          lastMessageAt: now,
          members: {
            create: {
              userId: input.partyUserId,
              role: "PARTY",
              lastReadAt: now,
            },
          },
          messages: {
            create: {
              authorUserId: input.partyUserId,
              body: input.body,
            },
          },
        },
        include: {
          partyUser: {
            select: { first_name: true, last_name: true, email: true },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true },
          },
        },
      });
      return created;
    });

    return {
      id: thread.id,
      subject: thread.subject,
      partyType: thread.partyType,
      partyUserId: thread.partyUserId,
      partyName: displayName(
        thread.partyUser.first_name,
        thread.partyUser.last_name,
      ),
      partyEmail: thread.partyUser.email,
      status: thread.status,
      preview: thread.messages[0]?.body ?? input.body,
      lastMessageAt: thread.lastMessageAt?.toISOString() ?? now.toISOString(),
      unread: 0,
      createdAt: thread.createdAt.toISOString(),
    };
  }

  async listForAgent(filter: {
    status: "all" | SupportThreadStatus;
    partyType: "all" | SupportPartyType;
    q?: string;
    agentUserId: string;
  }): Promise<SupportThreadView[]> {
    const rows = await prisma.supportThread.findMany({
      where: {
        ...(filter.status !== "all" ? { status: filter.status } : {}),
        ...(filter.partyType !== "all" ? { partyType: filter.partyType } : {}),
        ...(filter.q
          ? {
              OR: [
                { subject: { contains: filter.q } },
                { partyUser: { email: { contains: filter.q } } },
                { partyUser: { first_name: { contains: filter.q } } },
                { partyUser: { last_name: { contains: filter.q } } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        partyUser: {
          select: { first_name: true, last_name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true, authorUserId: true },
        },
        members: {
          where: { userId: filter.agentUserId },
          select: { lastReadAt: true },
          take: 1,
        },
      },
    });

    return Promise.all(
      rows.map(async (row) => {
        const lastRead = row.members[0]?.lastReadAt ?? null;
        const unread = await prisma.supportMessage.count({
          where: {
            threadId: row.id,
            authorUserId: { not: filter.agentUserId },
            ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
          },
        });
        return {
          id: row.id,
          subject: row.subject,
          partyType: row.partyType,
          partyUserId: row.partyUserId,
          partyName: displayName(
            row.partyUser.first_name,
            row.partyUser.last_name,
          ),
          partyEmail: row.partyUser.email,
          status: row.status,
          preview: row.messages[0]?.body ?? null,
          lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
          unread,
          createdAt: row.createdAt.toISOString(),
        };
      }),
    );
  }

  async listForParty(partyUserId: string): Promise<SupportThreadView[]> {
    const rows = await prisma.supportThread.findMany({
      where: { partyUserId },
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        partyUser: {
          select: { first_name: true, last_name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true },
        },
        members: {
          where: { userId: partyUserId },
          select: { lastReadAt: true },
          take: 1,
        },
      },
    });

    return Promise.all(
      rows.map(async (row) => {
        const lastRead = row.members[0]?.lastReadAt ?? null;
        const unread = await prisma.supportMessage.count({
          where: {
            threadId: row.id,
            authorUserId: { not: partyUserId },
            ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
          },
        });
        return {
          id: row.id,
          subject: row.subject,
          partyType: row.partyType,
          partyUserId: row.partyUserId,
          partyName: displayName(
            row.partyUser.first_name,
            row.partyUser.last_name,
          ),
          partyEmail: row.partyUser.email,
          status: row.status,
          preview: row.messages[0]?.body ?? null,
          lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
          unread,
          createdAt: row.createdAt.toISOString(),
        };
      }),
    );
  }

  async getThread(threadId: string) {
    return prisma.supportThread.findUnique({
      where: { id: threadId },
      include: {
        partyUser: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async ensureMember(input: {
    threadId: string;
    userId: string;
    role: SupportMemberRole;
  }): Promise<void> {
    await prisma.supportThreadMember.upsert({
      where: {
        threadId_userId: {
          threadId: input.threadId,
          userId: input.userId,
        },
      },
      create: {
        threadId: input.threadId,
        userId: input.userId,
        role: input.role,
      },
      update: {},
    });
  }

  async listMessages(
    threadId: string,
    viewerUserId: string,
  ): Promise<SupportMessageView[]> {
    const rows = await prisma.supportMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
      take: 500,
      include: {
        author: { select: { first_name: true, last_name: true, role: true } },
      },
    });

    const members = await prisma.supportThreadMember.findMany({
      where: { threadId },
      select: { userId: true, role: true },
    });
    const roleByUser = new Map(members.map((m) => [m.userId, m.role]));

    return rows.map((r) => ({
      id: r.id,
      authorUserId: r.authorUserId,
      authorName: displayName(r.author.first_name, r.author.last_name),
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      me: r.authorUserId === viewerUserId,
      role: roleByUser.get(r.authorUserId) ?? null,
    }));
  }

  async sendMessage(input: {
    threadId: string;
    authorUserId: string;
    body: string;
  }): Promise<SupportMessageView> {
    const now = new Date();
    const msg = await prisma.$transaction(async (tx) => {
      const created = await tx.supportMessage.create({
        data: {
          threadId: input.threadId,
          authorUserId: input.authorUserId,
          body: input.body,
        },
        include: {
          author: { select: { first_name: true, last_name: true } },
        },
      });
      await tx.supportThread.update({
        where: { id: input.threadId },
        data: { lastMessageAt: now, status: "OPEN" },
      });
      await tx.supportThreadMember.updateMany({
        where: { threadId: input.threadId, userId: input.authorUserId },
        data: { lastReadAt: now },
      });
      return created;
    });

    const member = await prisma.supportThreadMember.findUnique({
      where: {
        threadId_userId: {
          threadId: input.threadId,
          userId: input.authorUserId,
        },
      },
      select: { role: true },
    });

    return {
      id: msg.id,
      authorUserId: msg.authorUserId,
      authorName: displayName(msg.author.first_name, msg.author.last_name),
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      me: true,
      role: member?.role ?? null,
    };
  }

  async markRead(threadId: string, userId: string): Promise<void> {
    await prisma.supportThreadMember.updateMany({
      where: { threadId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  async updateStatus(
    threadId: string,
    status: SupportThreadStatus,
  ): Promise<void> {
    await prisma.supportThread.update({
      where: { id: threadId },
      data: { status },
    });
  }
}

export const supportChatRepository = new SupportChatRepository();
