import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { checkHomeStayAvailability } from "@/lib/homestay/checkAvailability";
import { HOMESTAY_ERRORS } from "@/lib/homestay/errors";
import { fail, handleApiError, ok } from "../host/_utils";

type CreateBookingInput = {
  listingId?: string;
  checkIn?: string;
  checkOut?: string;
  guestCount?: number;
  guestNote?: string;
  totalPrice?: number;
};

function calcNights(checkIn: Date, checkOut: Date) {
  const diff = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export async function GET() {
  try {
    const actor = await requireUser();
    const page = 1;
    const limit = 20;
    const where = { guestId: actor.id };
    const [bookings, total] = await Promise.all([
      prisma.homeStayBooking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              city: true,
              address: true,
              images: true,
              pricePerNight: true,
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

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const body = (await req.json()) as CreateBookingInput;

    if (!body.listingId || !body.checkIn || !body.checkOut || !body.guestCount) {
      return fail("listingId, checkIn, checkOut, guestCount are required", 400);
    }

    const checkIn = new Date(body.checkIn);
    const checkOut = new Date(body.checkOut);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return fail("Invalid check-in/check-out date", 400);
    }
    if (checkIn >= checkOut) {
      return fail("checkIn must be before checkOut", 400);
    }

    const listing = await prisma.homeStayListing.findFirst({
      where: { id: body.listingId, status: "ACTIVE" },
      select: {
        id: true,
        hostId: true,
        title: true,
        city: true,
        maxGuests: true,
        pricePerNight: true,
      },
    });
    if (!listing) return fail(HOMESTAY_ERRORS.LISTING_NOT_ACTIVE, 404);
    if (body.guestCount > listing.maxGuests) {
      return fail(HOMESTAY_ERRORS.GUEST_LIMIT, 400);
    }

    const availability = await checkHomeStayAvailability(listing.id, checkIn, checkOut);
    if (!availability.available) {
      return NextResponse.json(
        { success: false, error: HOMESTAY_ERRORS.DATES_UNAVAILABLE, conflicts: availability.conflicts },
        { status: 409 },
      );
    }

    const nights = calcNights(checkIn, checkOut);
    const snapshotPricePerNight = Number(listing.pricePerNight);
    const totalPrice = snapshotPricePerNight * nights;
    if (typeof body.totalPrice === "number" && Math.abs(body.totalPrice - totalPrice) > 1) {
      return fail("Narx hisobida nomuvofiqlik aniqlandi", 400);
    }
    const priceSnapshot: Prisma.InputJsonValue = {
      pricePerNight: snapshotPricePerNight,
      nights,
      calculatedAt: new Date().toISOString(),
    };

    const booking = await prisma.$transaction(async (tx) => {
      const existingPendingPlan = await tx.travelPlan.findFirst({
        where: {
          userId: actor.id,
          status: "PENDING_PAYMENT",
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      const travelPlanId = existingPendingPlan
        ? existingPendingPlan.id
        : (
            await tx.travelPlan.create({
              data: {
                userId: actor.id,
                destination: `${listing.city} - ${listing.title}`,
                startDate: checkIn,
                endDate: checkOut,
                pax: body.guestCount as number,
                status: "PENDING_PAYMENT",
                totalAmount: totalPrice,
                note: "Auto-created from HomeStay booking",
              },
              select: { id: true },
            })
          ).id;

      const created = await tx.homeStayBooking.create({
        data: {
          listingId: listing.id,
          travelPlanId,
          guestId: actor.id,
          checkIn,
          checkOut,
          nights,
          guestCount: body.guestCount as number,
          totalPrice,
          priceSnapshot,
          status: "PENDING",
          guestNote: body.guestNote ?? null,
        },
      });

      if (existingPendingPlan) {
        await tx.travelPlan.update({
          where: { id: travelPlanId },
          data: { totalAmount: { increment: totalPrice } },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOMESTAY_BOOKING_CREATED",
          entity: "HomeStayBooking",
          entityId: created.id,
          newData: {
            listingId: listing.id,
            travelPlanId,
            checkIn,
            checkOut,
            nights,
            totalPrice,
          },
        },
      });

      return created;
    });

    return ok(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
