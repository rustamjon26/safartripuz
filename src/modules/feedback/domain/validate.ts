import { z } from "zod";

export const feedbackChannelSchema = z.enum([
  "hotel",
  "guide",
  "taxi",
  "homestay",
  "direct",
]);

export const feedbackStatusSchema = z.enum([
  "OPEN",
  "ANSWERED",
  "ESCALATED",
  "CLOSED",
]);

export const listFeedbackQuerySchema = z.object({
  /**
   * Inbox expansions (see feedback.repository buildWhere):
   *   ANSWERED → ANSWERED|CLOSED  (“javob berilgan”)
   *   OPEN     → OPEN|ESCALATED   (“javob berilmagan”)
   */
  status: z
    .enum(["all", "OPEN", "ANSWERED", "ESCALATED", "CLOSED"])
    .default("all"),
  channel: z
    .enum(["all", "hotel", "guide", "taxi", "homestay", "direct"])
    .default("all"),
  rating: z.enum(["all", "5", "4", "low"]).default("all"),
  q: z.string().trim().max(200).optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const replyBodySchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const ingestFeedbackSchema = z.object({
  channel: feedbackChannelSchema,
  sourceType: z.enum([
    "GuideReview",
    "TaxiReview",
    "HomeStayReview",
    "GuestFeedback",
    "Direct",
  ]),
  sourceId: z.string().min(1).max(191),
  authorUserId: z.string().min(1).max(191).nullable().optional(),
  authorName: z.string().trim().min(1).max(191),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(1).max(8000),
  serviceLabel: z.string().trim().max(191).nullable().optional(),
  subjectId: z.string().trim().max(191).nullable().optional(),
  category: z.string().trim().max(191).nullable().optional(),
});

export const patchTicketSchema = z.object({
  status: feedbackStatusSchema.optional(),
  assignedToId: z.string().min(1).max(191).nullable().optional(),
  category: z.string().trim().max(191).nullable().optional(),
});

export const reportsQuerySchema = z.object({
  /** Lookback window in days (default 90). */
  days: z.coerce.number().int().min(7).max(365).default(90),
});

export const dashboardQuerySchema = z.object({
  /** Lookback window in days (default 30). */
  days: z.coerce.number().int().min(7).max(365).default(30),
});
