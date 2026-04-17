import { prisma } from "@/lib/prisma";
import { handleApiError, hasActiveListing, ok, onboardingResponse, requireHomeStayHost } from "../_utils";
import { completePastCheckedOutBookings } from "@/lib/homestay/completeBookings";

const allowedStatuses = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "COMPLETED",
  "CANCELLED",
  "DISPUTE",
] as const;

export async function GET(req: Request) {
  try {
    const actor = await requireHomeStayHost();
    const active = await hasActiveListing(actor.id);
    if (!active) return onboardingResponse();
    await completePastCheckedOutBookings();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Math.max(Number(url.searchParams.get("page") ?? 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where: {
      listing: { hostId: string };
      status?: (typeof allowedStatuses)[number];
      checkIn?: { gte?: Date; lte?: Date };
      checkOut?: { gte?: Date; lte?: Date };
    } = {
      listing: { hostId: actor.id },
    };

    if (status && status !== "ALL") {
      const typedStatus = allowedStatuses.find((item) => item === status);
      if (typedStatus) where.status = typedStatus;
    }

    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        where.checkIn = { ...(where.checkIn || {}), gte: fromDate };
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        where.checkOut = { ...(where.checkOut || {}), lte: toDate };
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.homeStayBooking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              city: true,
            },
          },
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
      prisma.homeStayBooking.count({ where }),
    ]);
    return ok({
      data: bookings,
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
