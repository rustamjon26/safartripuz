import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import {
  assertHomeStayDatesFreeInTx,
  checkHomeStayAvailability,
  HomeStayDatesTakenError,
} from "@/lib/homestay/checkAvailability";
import { bookingService } from "@/src/modules/booking";
import {
  HOLD_TTL_MS,
  InsufficientInventoryError,
  InventoryLockError,
} from "@/src/modules/inventory";
import { ratesService } from "@/src/modules/rates";

const schema = z.object({
  destination: z.string().trim().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  pax: z.number().int().min(1).max(20),
  hotel: z
    .object({
      id: z.string(),
      roomTypeId: z.string(),
      title: z.string().optional(),
      roomCount: z.number().int().min(1).max(20),
    })
    .optional(),
  taxi: z
    .object({
      id: z.string(),
      title: z.string().optional(),
    })
    .optional(),
  guide: z
    .object({
      id: z.string(),
      title: z.string().optional(),
    })
    .optional(),
  homestay: z
    .object({
      id: z.string(),
      title: z.string().optional(),
    })
    .optional(),
  note: z.string().trim().max(500).optional(),
});

function daysBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export async function GET(req: Request) {
  try {
    const actor = await requireUser();
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("take") ?? 20), 100);
    const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

    const [items, total] = await Promise.all([
      prisma.travelPlan.findMany({
        where: { userId: actor.id },
        orderBy: { createdAt: "desc" },
        take,
        skip,
        select: {
          id: true,
          destination: true,
          startDate: true,
          endDate: true,
          pax: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              type: true,
              title: true,
              quantity: true,
              totalPrice: true,
            },
          },
          _count: {
            select: {
              homeStayBookings: true,
              taxiOrders: true,
              guideBookings: true,
            },
          },
        },
      }),
      prisma.travelPlan.count({ where: { userId: actor.id } }),
    ]);

    return NextResponse.json({ items, total }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    const json = await req.json();
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ message: "Validation error" }, { status: 400 });
    }

    const input = parsed.data;
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (!(endDate > startDate)) {
      return NextResponse.json(
        { message: "End date start date dan keyin bo‘lishi kerak" },
        { status: 400 },
      );
    }

    const days = daysBetween(startDate, endDate);
    let total = 0;
    let verifiedHotelTotal = 0;
    const items: Array<{
      type: "HOTEL" | "HOMESTAY" | "TAXI" | "GUIDE";
      title: string;
      providerId?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      details?: Record<string, unknown>;
    }> = [];
    let verifiedHomestayTotal = 0;
    let hotelPricingSnapshot: Record<string, unknown> | null = null;

    if (input.hotel) {
      const roomType = await prisma.roomType.findUnique({
        where: { id: input.hotel.roomTypeId },
        select: {
          basePrice: true,
          hotelId: true,
          name: true,
          isActive: true,
        },
      });

      if (!roomType || !roomType.isActive) {
        return NextResponse.json({ message: "Xona topilmadi" }, { status: 404 });
      }

      if (roomType.hotelId !== input.hotel.id) {
        return NextResponse.json(
          { message: "Xona ushbu mehmonxonaga tegishli emas" },
          { status: 400 },
        );
      }

      const hotel = await prisma.hotel.findFirst({
        where: {
          id: input.hotel.id,
          status: "active",
          partner: { status: "approved", type: "hotel" },
        },
        select: { id: true },
      });
      if (!hotel) {
        return NextResponse.json({ message: "Mehmonxona topilmadi" }, { status: 404 });
      }

      const hotelQuote = await ratesService.quoteHotel({
        roomTypeId: input.hotel.roomTypeId,
        checkIn: startDate,
        checkOut: endDate,
        roomCount: input.hotel.roomCount,
        adults: input.pax,
      });
      verifiedHotelTotal = hotelQuote.totalSom;
      hotelPricingSnapshot = hotelQuote.snapshot;
      const verifiedPrice =
        days > 0 ? verifiedHotelTotal / days / input.hotel.roomCount : verifiedHotelTotal;
      total += verifiedHotelTotal;

      items.push({
        type: "HOTEL",
        title: input.hotel.title ?? roomType.name,
        providerId: input.hotel.id,
        quantity: input.hotel.roomCount,
        unitPrice: verifiedPrice,
        totalPrice: verifiedHotelTotal,
        details: {
          days,
          roomCount: input.hotel.roomCount,
          roomTypeId: input.hotel.roomTypeId,
          pricingSnapshot: hotelQuote.snapshot,
        },
      });
    }

    if (input.taxi) {
      const taxiService = await prisma.taxiService.findFirst({
        where: {
          id: input.taxi.id,
          isActive: true,
          partner: { status: "approved", type: "taxi" },
        },
        select: { id: true, title: true, price: true },
      });
      if (!taxiService) {
        return NextResponse.json({ message: "Taxi xizmati topilmadi" }, { status: 404 });
      }

      const verifiedPrice = Number(taxiService.price);
      total += verifiedPrice;
      items.push({
        type: "TAXI",
        title: input.taxi.title ?? taxiService.title,
        providerId: taxiService.id,
        quantity: 1,
        unitPrice: verifiedPrice,
        totalPrice: verifiedPrice,
      });
    }

    if (input.homestay) {
      const listing = await prisma.homeStayListing.findFirst({
        where: { id: input.homestay.id, status: "ACTIVE" },
        select: {
          id: true,
          title: true,
          maxGuests: true,
          pricePerNight: true,
        },
      });
      if (!listing) {
        return NextResponse.json({ message: "HomeStay topilmadi" }, { status: 404 });
      }
      if (input.pax > listing.maxGuests) {
        return NextResponse.json(
          { message: `Mehmonlar soni ${listing.maxGuests} dan oshmasligi kerak` },
          { status: 400 },
        );
      }

      const availability = await checkHomeStayAvailability(listing.id, startDate, endDate);
      if (!availability.available) {
        return NextResponse.json(
          { message: "Tanlangan sanalar uchun HomeStay band" },
          { status: 409 },
        );
      }

      const hsQuote = await ratesService.quoteHomestay({
        pricePerNightSom: Number(listing.pricePerNight),
        checkIn: startDate,
        checkOut: endDate,
        adults: input.pax,
      });
      verifiedHomestayTotal = hsQuote.totalSom;
      const verifiedPricePerNight =
        days > 0 ? verifiedHomestayTotal / days : verifiedHomestayTotal;
      total += verifiedHomestayTotal;

      items.push({
        type: "HOMESTAY",
        title: input.homestay.title ?? listing.title,
        providerId: listing.id,
        quantity: days,
        unitPrice: verifiedPricePerNight,
        totalPrice: verifiedHomestayTotal,
        details: { days, guestCount: input.pax, pricingSnapshot: hsQuote.snapshot },
      });
    }

    if (input.guide) {
      const guideListing = await prisma.guideListing.findFirst({
        where: {
          id: input.guide.id,
          status: "ACTIVE",
          isActive: true,
          partner: { status: "approved", type: "guide" },
        },
        select: { id: true, title: true, pricePerDay: true },
      });
      if (!guideListing) {
        return NextResponse.json({ message: "Gid topilmadi" }, { status: 404 });
      }

      const guideQuote = ratesService.quoteGuideDaily({
        pricePerDaySom: Number(guideListing.pricePerDay),
        days,
      });
      const guideTotal = guideQuote.totalSom;
      const verifiedPricePerDay = days > 0 ? guideTotal / days : guideTotal;
      total += guideTotal;
      items.push({
        type: "GUIDE",
        title: input.guide.title ?? guideListing.title,
        providerId: guideListing.id,
        quantity: days,
        unitPrice: verifiedPricePerDay,
        totalPrice: guideTotal,
        details: { days, pricingSnapshot: guideQuote.snapshot },
      });
    }

    // Hotel hold first (inventory lock) — before travel plan commit
    let heldHotelBookingId: string | null = null;
    if (input.hotel) {
      const u = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { first_name: true, last_name: true, phone: true },
      });
      try {
        const held = await bookingService.createHeldHotelBooking({
          hotelId: input.hotel.id,
          roomTypeId: input.hotel.roomTypeId,
          guestName: `${u?.first_name ?? "Guest"} ${u?.last_name ?? ""}`.trim(),
          guestPhone: u?.phone ?? null,
          checkInDate: startDate,
          checkOutDate: endDate,
          roomCount: input.hotel.roomCount,
          totalAmount: verifiedHotelTotal,
          source: "SAFARTRIP",
          pricingSnapshot:
            (hotelPricingSnapshot as Prisma.InputJsonValue | null) ?? undefined,
        });
        heldHotelBookingId = held.id;
      } catch (err) {
        if (err instanceof InsufficientInventoryError) {
          return NextResponse.json(
            { message: "Hotel availability yetarli emas" },
            { status: 409 },
          );
        }
        if (err instanceof InventoryLockError) {
          return NextResponse.json(
            { message: "Vaqtinchalik bandlik; qayta urinib ko'ring" },
            { status: 503 },
          );
        }
        throw err;
      }
    }

    try {
      const plan = await prisma.$transaction(async (tx) => {
        const createdPlan = await tx.travelPlan.create({
          data: {
            userId: actor.id,
            destination: input.destination,
            startDate,
            endDate,
            pax: input.pax,
            status: "PENDING_PAYMENT",
            totalAmount: total,
            note: input.note ?? null,
          },
        });

        if (items.length) {
          await tx.travelPlanItem.createMany({
            data: items.map((i) => ({
              travelPlanId: createdPlan.id,
              type: i.type,
              title: i.title,
              providerId: i.providerId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
              details: (i.details ?? null) as Prisma.InputJsonValue,
            })),
          });
        }

        if (heldHotelBookingId) {
          await tx.hotelBooking.update({
            where: { id: heldHotelBookingId },
            data: {
              travelPlanId: createdPlan.id,
              note: `TravelPlan: ${createdPlan.id}`,
            },
          });
        }

        if (input.homestay) {
          const listing = await tx.homeStayListing.findFirst({
            where: { id: input.homestay!.id, status: "ACTIVE" },
            select: { id: true, pricePerNight: true },
          });
          if (!listing) {
            throw new Error("HomeStay topilmadi");
          }

          // The pre-flight check above ran outside this transaction.
          await assertHomeStayDatesFreeInTx(tx, {
            listingId: listing.id,
            checkIn: startDate,
            checkOut: endDate,
          });

          const snapshotPricePerNight = Number(listing.pricePerNight);
          const priceSnapshot: Prisma.InputJsonValue = {
            pricePerNight: snapshotPricePerNight,
            nights: days,
            calculatedAt: new Date().toISOString(),
            source: "trip-builder",
          };

          const holdExpiresAt = new Date(Date.now() + HOLD_TTL_MS);
          const hs = await tx.homeStayBooking.create({
            data: {
              listingId: listing.id,
              travelPlanId: createdPlan.id,
              guestId: actor.id,
              checkIn: startDate,
              checkOut: endDate,
              nights: days,
              guestCount: input.pax,
              totalPrice: verifiedHomestayTotal,
              priceSnapshot,
              status: "PENDING",
              holdExpiresAt,
              guestNote: `TravelPlan: ${createdPlan.id}`,
            },
          });

          await tx.homeStayAvailability.create({
            data: {
              listingId: listing.id,
              bookingId: hs.id,
              startDate,
              endDate,
              reason: "BOOKED",
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId: actor.id,
            action: "TRAVEL_PLAN_CREATED",
            entity: "TravelPlan",
            entityId: createdPlan.id,
            newData: {
              destination: createdPlan.destination,
              totalAmount: total,
              itemsCount: items.length,
            },
          },
        });

        return createdPlan;
      });

      return NextResponse.json({ planId: plan.id, totalAmount: total }, { status: 201 });
    } catch (err) {
      if (heldHotelBookingId) {
        try {
          await bookingService.cancelAndRelease(heldHotelBookingId, {
            actor: "SYSTEM",
            reason: "TRAVEL_PLAN_CREATE_FAILED",
          });
        } catch {
          /* best-effort release */
        }
      }
      throw err;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (e instanceof HomeStayDatesTakenError) {
      return NextResponse.json(
        { message: "Tanlangan sanalar uchun HomeStay band" },
        { status: 409 },
      );
    }
    if (e instanceof InsufficientInventoryError) {
      return NextResponse.json({ message: "Hotel availability yetarli emas" }, { status: 409 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}
