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
    // Inbox UX: “javob berilgan” = ANSWERED + CLOSED
    if (filter.status === "ANSWERED") {
      where.status = { in: ["ANSWERED", "CLOSED"] };
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
        prisma.feedbackTicket.count({ where: { status: "OPEN" } }),
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
}

export const feedbackRepository = new FeedbackRepository();
