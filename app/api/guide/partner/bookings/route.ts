import { prisma } from "@/lib/prisma";
import { expireGuideBookings } from "@/lib/guide/expireBookings";
import { handleApiError, hasActiveListing, ok, onboardingResponse, requireGuidePartner } from "../_utils";
import type { GuideBookingStatus } from "@prisma/client";

const allowedStatuses: GuideBookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTE",
];

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  try {
    const actor = await requireGuidePartner();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    await expireGuideBookings();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const from = parseDate(url.searchParams.get("from"));
    const to = parseDate(url.searchParams.get("to"));
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where: {
      guideId: string;
      status?: GuideBookingStatus;
      date?: { gte?: Date; lte?: Date };
    } = { guideId: actor.id };

    if (status && status !== "ALL") {
      const typedStatus = allowedStatuses.find((item) => item === status);
      if (typedStatus) where.status = typedStatus;
    }
    if (from || to) {
      where.date = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const [items, total] = await Promise.all([
      prisma.guideBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          listing: { select: { id: true, title: true, category: true, region: true } },
          guest: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
          review: true,
        },
      }),
      prisma.guideBooking.count({ where }),
    ]);

    return ok({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
