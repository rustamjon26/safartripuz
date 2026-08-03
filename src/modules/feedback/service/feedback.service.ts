import { sentimentFromRating, sentimentIndex, responseRate } from "../domain/sentiment";
import { assertTransition, FeedbackStatusError, statusAfterReply } from "../domain/status";
import { ingestFeedbackSchema } from "../domain/validate";
import type {
  FeedbackOverview,
  FeedbackTicketView,
  IngestFeedbackInput,
  ListFeedbackFilter,
} from "../domain/types";
import { feedbackRepository } from "../repository/feedback.repository";
import { sourceSyncRepository } from "../repository/source-sync.repository";

export class FeedbackNotFoundError extends Error {
  constructor() {
    super("Feedback ticket topilmadi");
    this.name = "FeedbackNotFoundError";
  }
}

export class FeedbackService {
  /** Idempotent ingest — safe to call twice from review write paths. */
  async ingest(raw: IngestFeedbackInput): Promise<{
    ticket: FeedbackTicketView;
    created: boolean;
  }> {
    const parsed = ingestFeedbackSchema.safeParse({
      ...raw,
      body: raw.body?.trim() ? raw.body : `(Reyting: ${raw.rating})`,
    });
    if (!parsed.success) {
      throw new Error(`Invalid feedback ingest: ${parsed.error.message}`);
    }

    const data = parsed.data;
    return feedbackRepository.ingestIdempotent({
      channel: data.channel,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      authorUserId: data.authorUserId,
      authorName: data.authorName,
      rating: data.rating,
      body: data.body,
      serviceLabel: data.serviceLabel,
      subjectId: data.subjectId,
      category: data.category,
      createdAt: raw.createdAt,
    });
  }

  /** Fire-and-forget safe wrapper for review routes (never fails the review). */
  async ingestSafe(raw: IngestFeedbackInput): Promise<void> {
    try {
      await this.ingest(raw);
    } catch (err) {
      console.error("[feedback.ingestSafe]", err);
    }
  }

  async list(filter: ListFeedbackFilter) {
    return feedbackRepository.list(filter);
  }

  async get(id: string): Promise<FeedbackTicketView> {
    const ticket = await feedbackRepository.getById(id);
    if (!ticket) throw new FeedbackNotFoundError();
    return ticket;
  }

  async reply(input: {
    ticketId: string;
    authorUserId: string;
    body: string;
  }): Promise<FeedbackTicketView> {
    const ticket = await this.get(input.ticketId);
    const next = statusAfterReply(ticket.status);
    assertTransition(ticket.status, next);

    return feedbackRepository.addReply({
      ticketId: input.ticketId,
      authorUserId: input.authorUserId,
      body: input.body.trim(),
      nextStatus: "ANSWERED",
    });
  }

  async patch(
    id: string,
    patch: {
      status?: "OPEN" | "ANSWERED" | "ESCALATED" | "CLOSED";
      assignedToId?: string | null;
      category?: string | null;
    },
  ): Promise<FeedbackTicketView> {
    const ticket = await this.get(id);
    if (patch.status) {
      assertTransition(ticket.status, patch.status);
    }
    return feedbackRepository.updateTicket(id, patch);
  }

  async overview(): Promise<FeedbackOverview> {
    const raw = await feedbackRepository.overview();
    const bySentiment = {
      positive: raw.positive,
      neutral: raw.neutral,
      negative: raw.negative,
    };
    return {
      total: raw.total,
      open: raw.open,
      answered: raw.answeredLike,
      avgRating: raw.avgRating,
      responseRate: responseRate(raw.total, raw.answeredLike),
      sentimentIndex: sentimentIndex(bySentiment),
      bySentiment,
    };
  }

  /** Backfill inbox from existing review tables (idempotent). */
  async syncFromSources(limitPerSource = 100): Promise<{
    scanned: number;
    created: number;
  }> {
    const batches = await Promise.all([
      sourceSyncRepository.loadRecentGuideReviews(limitPerSource),
      sourceSyncRepository.loadRecentTaxiReviews(limitPerSource),
      sourceSyncRepository.loadRecentHomeStayReviews(limitPerSource),
      sourceSyncRepository.loadRecentGuestFeedback(limitPerSource),
    ]);

    let scanned = 0;
    let created = 0;
    for (const batch of batches) {
      for (const item of batch) {
        scanned += 1;
        const result = await this.ingest(item);
        if (result.created) created += 1;
      }
    }
    return { scanned, created };
  }
}

export const feedbackService = new FeedbackService();

export { FeedbackStatusError, sentimentFromRating };
