import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const schema = z.object({
  destination: z.string().trim().min(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  pax: z.number().int().min(1).max(20),
  hotel: z
    .object({
      id: z.string(),
      title: z.string(),
      roomCount: z.number().int().min(1).max(20),
      nightlyPrice: z.number().nonnegative(),
    })
    .optional(),
  taxi: z
    .object({
      id: z.string(),
      title: z.string(),
      price: z.number().nonnegative(),
    })
    .optional(),
  guide: z
    .object({
      id: z.string(),
      title: z.string(),
      pricePerDay: z.number().nonnegative(),
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
    const items: Array<{
      type: "HOTEL" | "TAXI" | "GUIDE";
      title: string;
      providerId?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      details?: Record<string, unknown>;
    }> = [];

    if (input.hotel) {
      // Availability re-check before plan creation
      const overlaps = await prisma.hotelBooking.findMany({
        where: {
          hotelId: input.hotel.id,
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
          checkInDate: { lt: endDate },
          checkOutDate: { gt: startDate },
        },
        select: { roomCount: true, hotel: { select: { totalRooms: true } } },
      });

      const totalRooms = overlaps[0]?.hotel.totalRooms ?? (await prisma.hotel.findUnique({
        where: { id: input.hotel.id },
        select: { totalRooms: true },
      }))?.totalRooms ?? 0;
      const usedRooms = overlaps.reduce((sum, b) => sum + b.roomCount, 0);
      const availableRooms = totalRooms - usedRooms;
      if (input.hotel.roomCount > availableRooms) {
        return NextResponse.json(
          {
            message: `Hotel availability yetarli emas. Mavjud: ${Math.max(availableRooms, 0)} xona`,
          },
          { status: 409 },
        );
      }

      const hotelTotal = input.hotel.nightlyPrice * days * input.hotel.roomCount;
      total += hotelTotal;
      items.push({
        type: "HOTEL",
        title: input.hotel.title,
        providerId: input.hotel.id,
        quantity: input.hotel.roomCount,
        unitPrice: input.hotel.nightlyPrice,
        totalPrice: hotelTotal,
        details: { days, roomCount: input.hotel.roomCount },
      });
    }

    if (input.taxi) {
      total += input.taxi.price;
      items.push({
        type: "TAXI",
        title: input.taxi.title,
        providerId: input.taxi.id,
        quantity: 1,
        unitPrice: input.taxi.price,
        totalPrice: input.taxi.price,
      });
    }

    if (input.guide) {
      const guideTotal = input.guide.pricePerDay * days;
      total += guideTotal;
      items.push({
        type: "GUIDE",
        title: input.guide.title,
        providerId: input.guide.id,
        quantity: days,
        unitPrice: input.guide.pricePerDay,
        totalPrice: guideTotal,
        details: { days },
      });
    }

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

      // Optional: create pending hotel booking record if hotel selected
      if (input.hotel) {
        const u = await tx.user.findUnique({
          where: { id: actor.id },
          select: { first_name: true, last_name: true, phone: true },
        });
        await tx.hotelBooking.create({
          data: {
            hotelId: input.hotel.id,
            guestName: `${u?.first_name ?? "Guest"} ${u?.last_name ?? ""}`.trim(),
            guestPhone: u?.phone ?? null,
            checkInDate: startDate,
            checkOutDate: endDate,
            roomCount: input.hotel.roomCount,
            totalAmount: input.hotel.nightlyPrice * days * input.hotel.roomCount,
            paidAmount: 0,
            source: "SAFARTRIP",
            status: "PENDING",
            note: `TravelPlan: ${createdPlan.id}`,
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server xatosi";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ message: "Server xatosi" }, { status: 500 });
  }
}

