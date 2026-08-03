import type { Prisma } from "@prisma/client";
import { requireUserWithProfile } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { fail, handleApiError, ok } from "../_utils";
import { bookingService } from "@/src/modules/booking";
import {
  InsufficientInventoryError,
  InventoryLockError,
} from "@/src/modules/inventory";
import { ratesService } from "@/src/modules/rates";

type Body = {
  hotelId?: string;
  roomTypeId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  roomCount?: number;
  guestName?: string;
  guestPhone?: string;
  note?: string;
  provider?: "MOCK" | "CLICK" | "PAYME" | "UZUM" | "MANUAL";
};

function calcNights(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export async function POST(req: Request) {
  try {
    const actor = await requireUserWithProfile();
    const body = (await req.json()) as Body;

    if (!body.hotelId || !body.roomTypeId || !body.checkIn || !body.checkOut) {
      return fail("hotelId, roomTypeId, checkIn, checkOut majburiy", 400);
    }

    const checkIn = new Date(body.checkIn);
    const checkOut = new Date(body.checkOut);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      return fail("Noto'g'ri sana", 400);
    }
    if (checkIn >= checkOut) return fail("checkOut checkIn dan keyin bo'lishi kerak", 400);

    const roomCount = Math.max(1, Math.min(20, Number(body.roomCount ?? 1)));
    const guestCount = Math.max(1, Math.min(20, Number(body.guests ?? 1)));
    const provider = body.provider ?? "MOCK";

    const hotel = await prisma.hotel.findFirst({
      where: {
        id: body.hotelId,
        status: "active",
        partner: { status: "approved", type: "hotel" },
      },
      select: { id: true, name: true, city: true },
    });
    if (!hotel) return fail("Mehmonxona topilmadi", 404);

    const roomType = await prisma.roomType.findFirst({
      where: { id: body.roomTypeId, hotelId: body.hotelId, isActive: true },
      select: {
        id: true,
        basePrice: true,
        hotelId: true,
        name: true,
        capacityAdults: true,
        capacityChildren: true,
      },
    });
    if (!roomType) return fail("Xona turi topilmadi", 404);
    if (roomType.hotelId !== body.hotelId) return fail("Xona turi bu mehmonxonaga tegishli emas", 400);

    const capacity = roomType.capacityAdults + roomType.capacityChildren;
    if (guestCount > capacity * roomCount) {
      return fail("Mehmonlar soni xona sig'imidan oshmasligi kerak", 400);
    }

    const nights = calcNights(checkIn, checkOut);
    const quote = await ratesService.quoteHotel({
      roomTypeId: roomType.id,
      checkIn,
      checkOut,
      roomCount,
      adults: guestCount,
      children: 0,
    });
    const totalAmount = quote.totalSom;
    const unit = nights > 0 ? totalAmount / nights / roomCount : totalAmount;

    const guestName =
      body.guestName?.trim() ||
      `${actor.first_name} ${actor.last_name}`.trim() ||
      "Mehmon";

    const destination = hotel.city?.trim() || hotel.name;

    // Critical section: inventory lock + HELD booking (no payment network calls).
    // Payme auto-cancels unconfirmed txs after 12h; our hold is 15 minutes.
    let booking;
    try {
      booking = await bookingService.createHeldHotelBooking({
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        guestName,
        guestPhone: body.guestPhone?.trim() || actor.phone || null,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        roomCount,
        totalAmount,
        source: "SAFARTRIP",
        note: body.note?.trim() || null,
        pricingSnapshot: quote.snapshot as Prisma.InputJsonValue,
        guests: [
          {
            firstName: actor.first_name,
            lastName: actor.last_name,
          },
        ],
      });
      const { setMoneyPathContext } = await import(
        "@/src/shared/observability/sentry"
      );
      setMoneyPathContext({ bookingId: booking.id });
    } catch (err) {
      if (err instanceof InsufficientInventoryError) {
        return fail("Tanlangan sanalarda bo'sh xonalar yetarli emas", 409);
      }
      if (err instanceof InventoryLockError) {
        return fail("Vaqtinchalik bandlik; qayta urinib ko'ring", 503);
      }
      throw err;
    }

    // Payment / travel plan OUTSIDE the inventory transaction
    try {
      const plan = await prisma.travelPlan.create({
        data: {
          userId: actor.id,
          destination,
          startDate: checkIn,
          endDate: checkOut,
          pax: guestCount,
          status: "PENDING_PAYMENT",
          totalAmount,
          note: body.note?.trim() || null,
        },
      });

      await prisma.travelPlanItem.create({
        data: {
          travelPlanId: plan.id,
          type: "HOTEL",
          title: `${hotel.name} — ${roomType.name}`,
          providerId: hotel.id,
          quantity: roomCount,
          unitPrice: unit,
          totalPrice: totalAmount,
          details: { nights, roomTypeId: roomType.id, roomCount },
        },
      });

      await prisma.hotelBooking.update({
        where: { id: booking.id },
        data: { travelPlanId: plan.id, note: `TravelPlan: ${plan.id}` },
      });

      const payment = await prisma.payment.create({
        data: {
          travelPlanId: plan.id,
          provider,
          status: "INITIATED",
          amount: totalAmount,
          currency: "UZS",
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOTEL_BOOKING_CREATED",
          entity: "HotelBooking",
          entityId: booking.id,
          newData: {
            planId: plan.id,
            paymentId: payment.id,
            totalAmount,
            status: "HELD",
          },
        },
      });

      const paymentUrl =
        provider === "MOCK"
          ? `/payments/mock/${payment.id}`
          : provider === "MANUAL"
            ? `/payments/manual/${payment.id}`
            : `/payments/checkout/${plan.id}`;

      return ok(
        {
          bookingId: booking.id,
          planId: plan.id,
          paymentId: payment.id,
          totalAmount,
          paymentUrl,
          status: "PENDING_PAYMENT",
        },
        201,
      );
    } catch (err) {
      try {
        await bookingService.cancelAndRelease(booking.id, {
          actor: "SYSTEM",
          reason: "PAYMENT_SETUP_FAILED",
        });
      } catch {
        /* best-effort */
      }
      throw err;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
