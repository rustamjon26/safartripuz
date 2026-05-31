import { requireUserWithProfile } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { fail, handleApiError, ok } from "../_utils";

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

async function availableRoomCount(
  hotelId: string,
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<number> {
  const total = await prisma.physicalRoom.count({
    where: { hotelId, roomTypeId, isActive: true },
  });
  const busy = await prisma.hotelBooking.findMany({
    where: {
      hotelId,
      roomTypeId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      checkInDate: { lt: checkOut },
      checkOutDate: { gt: checkIn },
    },
    select: { roomCount: true },
  });
  const used = busy.reduce((s, b) => s + b.roomCount, 0);
  return Math.max(0, total - used);
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
      select: { id: true, basePrice: true, hotelId: true, name: true, capacityAdults: true, capacityChildren: true },
    });
    if (!roomType) return fail("Xona turi topilmadi", 404);
    if (roomType.hotelId !== body.hotelId) return fail("Xona turi bu mehmonxonaga tegishli emas", 400);

    const capacity = roomType.capacityAdults + roomType.capacityChildren;
    if (guestCount > capacity * roomCount) {
      return fail("Mehmonlar soni xona sig'imidan oshmasligi kerak", 400);
    }

    const avail = await availableRoomCount(hotel.id, roomType.id, checkIn, checkOut);
    if (avail < roomCount) {
      return fail("Tanlangan sanalarda bo'sh xonalar yetarli emas", 409);
    }

    const nights = calcNights(checkIn, checkOut);
    const unit = Number(roomType.basePrice);
    const totalAmount = unit * nights * roomCount;

    const guestName =
      body.guestName?.trim() ||
      `${actor.first_name} ${actor.last_name}`.trim() ||
      "Mehmon";

    const destination = hotel.city?.trim() || hotel.name;

    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.travelPlan.create({
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

      await tx.travelPlanItem.create({
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

      const booking = await tx.hotelBooking.create({
        data: {
          hotelId: hotel.id,
          roomTypeId: roomType.id,
          guestName,
          guestPhone: body.guestPhone?.trim() || actor.phone || null,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          roomCount,
          totalAmount,
          paidAmount: 0,
          status: "PENDING",
          source: "SAFARTRIP",
          note: `TravelPlan: ${plan.id}`,
          guests: {
            create: [
              {
                firstName: actor.first_name,
                lastName: actor.last_name,
              },
            ],
          },
        },
      });

      const payment = await tx.payment.create({
        data: {
          travelPlanId: plan.id,
          provider,
          status: "INITIATED",
          amount: totalAmount,
          currency: "UZS",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "HOTEL_BOOKING_CREATED",
          entity: "HotelBooking",
          entityId: booking.id,
          newData: {
            planId: plan.id,
            paymentId: payment.id,
            totalAmount,
          },
        },
      });

      return { plan, booking, payment };
    });

    const paymentUrl =
      provider === "MOCK"
        ? `/payments/mock/${result.payment.id}`
        : provider === "MANUAL"
          ? `/payments/manual/${result.payment.id}`
          : `/payments/checkout/${result.plan.id}`;

    return ok(
      {
        bookingId: result.booking.id,
        planId: result.plan.id,
        paymentId: result.payment.id,
        totalAmount,
        paymentUrl,
        status: "PENDING_PAYMENT",
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
