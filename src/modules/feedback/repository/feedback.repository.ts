import { prisma, type Prisma } from "@/src/shared/db/prisma";
import type {
  FeedbackTicketView,
  IngestFeedbackInput,
  ListFeedbackFilter,
} from "../domain/types";
import { sentimentFromRating } from "../domain/sentiment";

function mapTicket(
  row: Prisma.FeedbackTicketGetPayload<{ include: { replies: true } }>,
): FeedbackTicketView {
  return {
    id: row.id,
    channel: row.channel,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    authorUserId: row.authorUserId,
    authorName: row.authorName,
    rating: row.rating,
    body: row.body,
    serviceLabel: row.serviceLabel,
    subjectId: row.subjectId,
    status: row.status,
    sentiment: row.sentiment,
    category: row.category,
    assignedToId: row.assignedToId,
    repliedAt: row.repliedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    replies: row.replies.map((r) => ({
      id: r.id,
      body: r.body,
      authorUserId: r.authorUserId,
      createdAt: r.createdAt,
    })),
  };
}

function buildWhere(filter: ListFeedbackFilter): Prisma.FeedbackTicketWhereInput {
  const where: Prisma.FeedbackTicketWhereInput = {};

  if (filter.status && filter.status !== "all") {
    // Inbox UX:
    //   “javob berilgan”   = ANSWERED + CLOSED
    //   “javob berilmagan” = OPEN + ESCALATED
    if (filter.status === "ANSWERED") {
      where.status = { in: ["ANSWERED", "CLOSED"] };
    } else if (filter.status === "OPEN") {
      where.status = { in: ["OPEN", "ESCALATED"] };
    } else {
      where.status = filter.status;
    }
  }
  if (filter.channel && filter.channel !== "all") {
    where.channel = filter.channel;
  }
  if (filter.rating === "5") where.rating = 5;
  if (filter.rating === "4") where.rating = 4;
  if (filter.rating === "low") where.rating = { lte: 3 };

  const q = filter.q?.trim();
  if (q) {
    where.OR = [
      { authorName: { contains: q } },
      { body: { contains: q } },
      { serviceLabel: { contains: q } },
    ];
  }

  return where;
}

export class FeedbackRepository {
  async ingestIdempotent(
    input: IngestFeedbackInput,
  ): Promise<{ ticket: FeedbackTicketView; created: boolean }> {
    const existing = await prisma.feedbackTicket.findUnique({
      where: {
        sourceType_sourceId: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });
    if (existing) {
      return { ticket: mapTicket(existing), created: false };
    }

    const created = await prisma.feedbackTicket.create({
      data: {
        channel: input.channel,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        authorUserId: input.authorUserId ?? null,
        authorName: input.authorName,
        rating: input.rating,
        body: input.body,
        serviceLabel: input.serviceLabel ?? null,
        subjectId: input.subjectId ?? null,
        category: input.category ?? null,
        sentiment: sentimentFromRating(input.rating),
        status: "OPEN",
        createdAt: input.createdAt,
      },
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });

    return { ticket: mapTicket(created), created: true };
  }

  async list(filter: ListFeedbackFilter): Promise<{
    items: FeedbackTicketView[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where = buildWhere(filter);

    const [total, rows] = await Promise.all([
      prisma.feedbackTicket.count({ where }),
      prisma.feedbackTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { replies: { orderBy: { createdAt: "asc" } } },
      }),
    ]);

    return {
      items: rows.map(mapTicket),
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<FeedbackTicketView | null> {
    const row = await prisma.feedbackTicket.findUnique({
      where: { id },
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });
    return row ? mapTicket(row) : null;
  }

  async addReply(input: {
    ticketId: string;
    authorUserId: string;
    body: string;
    nextStatus: "ANSWERED";
  }): Promise<FeedbackTicketView> {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.feedbackReply.create({
        data: {
          ticketId: input.ticketId,
          authorUserId: input.authorUserId,
          body: input.body,
        },
      });

      return tx.feedbackTicket.update({
        where: { id: input.ticketId },
        data: {
          status: input.nextStatus,
          repliedAt: new Date(),
        },
        include: { replies: { orderBy: { createdAt: "asc" } } },
      });
    });

    return mapTicket(updated);
  }

  async updateTicket(
    id: string,
    data: {
      status?: "OPEN" | "ANSWERED" | "ESCALATED" | "CLOSED";
      assignedToId?: string | null;
      category?: string | null;
    },
  ): Promise<FeedbackTicketView> {
    const row = await prisma.feedbackTicket.update({
      where: { id },
      data: {
        status: data.status,
        assignedToId: data.assignedToId,
        category: data.category,
      },
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });
    return mapTicket(row);
  }

  async overview(): Promise<{
    total: number;
    open: number;
    answeredLike: number;
    avgRating: number;
    positive: number;
    neutral: number;
    negative: number;
  }> {
    const [total, open, answeredLike, agg, positive, neutral, negative] =
      await Promise.all([
        prisma.feedbackTicket.count(),
        prisma.feedbackTicket.count({
          where: { status: { in: ["OPEN", "ESCALATED"] } },
        }),
        prisma.feedbackTicket.count({
          where: { status: { in: ["ANSWERED", "CLOSED"] } },
        }),
        prisma.feedbackTicket.aggregate({ _avg: { rating: true } }),
        prisma.feedbackTicket.count({ where: { sentiment: "POSITIVE" } }),
        prisma.feedbackTicket.count({ where: { sentiment: "NEUTRAL" } }),
        prisma.feedbackTicket.count({ where: { sentiment: "NEGATIVE" } }),
      ]);

    return {
      total,
      open,
      answeredLike,
      avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      positive,
      neutral,
      negative,
    };
  }

  /** Raw (createdAt, sentiment) pairs for the daily trend chart. */
  async sentimentTrendWindow(
    since: Date,
    limit = 5000,
  ): Promise<Array<{ createdAt: Date; sentiment: FeedbackTicketView["sentiment"] }>> {
    return prisma.feedbackTicket.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, sentiment: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async reportsWindow(since: Date): Promise<{
    total: number;
    avgRating: number;
    byChannel: Array<{
      channel: FeedbackTicketView["channel"];
      avgRating: number;
      count: number;
    }>;
    bodies: Array<{
      body: string;
      sentiment: FeedbackTicketView["sentiment"];
    }>;
    negativeGroups: Array<{
      key: string;
      label: string;
      count: number;
      sampleBody: string | null;
    }>;
  }> {
    const where = { createdAt: { gte: since } } satisfies Prisma.FeedbackTicketWhereInput;

    const [total, agg, channelGroups, bodies, negativeTickets] =
      await Promise.all([
        prisma.feedbackTicket.count({ where }),
        prisma.feedbackTicket.aggregate({
          where,
          _avg: { rating: true },
        }),
        prisma.feedbackTicket.groupBy({
          by: ["channel"],
          where,
          _avg: { rating: true },
          _count: { _all: true },
        }),
        prisma.feedbackTicket.findMany({
          where: {
            ...where,
            sentiment: { in: ["POSITIVE", "NEGATIVE"] },
          },
          select: { body: true, sentiment: true },
          orderBy: { createdAt: "desc" },
          take: 800,
        }),
        prisma.feedbackTicket.findMany({
          where: { ...where, sentiment: "NEGATIVE" },
          select: {
            channel: true,
            category: true,
            body: true,
            serviceLabel: true,
          },
          orderBy: { createdAt: "desc" },
          take: 400,
        }),
      ]);

    const groupMap = new Map<
      string,
      { key: string; label: string; count: number; sampleBody: string | null }
    >();
    for (const t of negativeTickets) {
      const key = (t.category?.trim() || t.channel).toLowerCase();
      const label =
        t.category?.trim() ||
        t.serviceLabel?.trim() ||
        t.channel.charAt(0).toUpperCase() + t.channel.slice(1);
      const prev = groupMap.get(key);
      if (!prev) {
        groupMap.set(key, {
          key,
          label,
          count: 1,
          sampleBody: t.body,
        });
      } else {
        prev.count += 1;
      }
    }

    return {
      total,
      avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      byChannel: channelGroups.map((g) => ({
        channel: g.channel,
        avgRating: Math.round((g._avg.rating ?? 0) * 10) / 10,
        count: g._count._all,
      })),
      bodies,
      negativeGroups: [...groupMap.values()],
    };
  }
}

export const feedbackRepository = new FeedbackRepository();
