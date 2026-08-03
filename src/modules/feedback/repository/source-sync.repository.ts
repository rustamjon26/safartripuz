/**
 * Read-only adapters to existing review tables for inbox backfill.
 * Writes always go through FeedbackRepository (idempotent ingest).
 */
import { prisma } from "@/src/shared/db/prisma";
import type { IngestFeedbackInput } from "../domain/types";

function authorLabel(first: string, last: string | null | undefined): string {
  return `${first}${last ? ` ${last}` : ""}`.trim();
}

export class SourceSyncRepository {
  async loadRecentGuideReviews(limit: number): Promise<IngestFeedbackInput[]> {
    const rows = await prisma.guideReview.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        guest: { select: { first_name: true, last_name: true } },
        listing: { select: { title: true } },
      },
    });
    return rows.map((r) => ({
      channel: "guide" as const,
      sourceType: "GuideReview" as const,
      sourceId: r.id,
      authorUserId: r.guestId,
      authorName: authorLabel(r.guest.first_name, r.guest.last_name),
      rating: r.rating,
      body: (r.comment ?? "").trim() || `(Reyting: ${r.rating})`,
      serviceLabel: r.listing.title,
      subjectId: r.listingId,
      createdAt: r.createdAt,
    }));
  }

  async loadRecentTaxiReviews(limit: number): Promise<IngestFeedbackInput[]> {
    const rows = await prisma.taxiReview.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: { select: { first_name: true, last_name: true } },
      },
    });
    return rows.map((r) => ({
      channel: "taxi" as const,
      sourceType: "TaxiReview" as const,
      sourceId: r.id,
      authorUserId: r.customerId,
      authorName: authorLabel(r.customer.first_name, r.customer.last_name),
      rating: r.rating,
      body: (r.comment ?? "").trim() || `(Reyting: ${r.rating})`,
      serviceLabel: "Transport",
      subjectId: r.driverId,
      createdAt: r.createdAt,
    }));
  }

  async loadRecentHomeStayReviews(limit: number): Promise<IngestFeedbackInput[]> {
    const rows = await prisma.homeStayReview.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        guest: { select: { first_name: true, last_name: true } },
        listing: { select: { title: true } },
      },
    });
    return rows.map((r) => ({
      channel: "homestay" as const,
      sourceType: "HomeStayReview" as const,
      sourceId: r.id,
      authorUserId: r.guestId,
      authorName: authorLabel(r.guest.first_name, r.guest.last_name),
      rating: r.rating,
      body: (r.comment ?? "").trim() || `(Reyting: ${r.rating})`,
      serviceLabel: r.listing.title,
      subjectId: r.listingId,
      createdAt: r.createdAt,
    }));
  }

  async loadRecentGuestFeedback(limit: number): Promise<IngestFeedbackInput[]> {
    const rows = await prisma.guestFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { hotel: { select: { name: true } } },
    });
    return rows.map((r) => ({
      channel: "hotel" as const,
      sourceType: "GuestFeedback" as const,
      sourceId: r.id,
      authorUserId: null,
      authorName: r.guestName || "Mehmon",
      rating: r.rating,
      body: (r.comment ?? "").trim() || `(Reyting: ${r.rating})`,
      serviceLabel: r.hotel.name,
      subjectId: r.hotelId,
      createdAt: r.createdAt,
    }));
  }
}

export const sourceSyncRepository = new SourceSyncRepository();
