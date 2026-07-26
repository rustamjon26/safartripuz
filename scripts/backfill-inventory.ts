/**
 * Initial Inventory backfill from PhysicalRoom + HotelBooking.
 * Horizon: today (UTC) → today+540 days.
 * Safe to re-run (upsert). Do NOT run after live decrements without a maintenance window.
 *
 * Usage: npx tsx scripts/backfill-inventory.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HORIZON_DAYS = 540;
const HOLDING_EXCLUDE = ["CANCELLED", "NO_SHOW", "EXPIRED", "REFUNDED"] as const;

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

async function main() {
  const today = utcDateOnly(new Date());
  const end = addDays(today, HORIZON_DAYS);

  const roomTypes = await prisma.roomType.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let inserted = 0;
  let oversell = 0;

  for (const rt of roomTypes) {
    const totalRooms = await prisma.physicalRoom.count({
      where: { roomTypeId: rt.id, isActive: true },
    });
    if (totalRooms <= 0) {
      console.log(`[skip] ${rt.id} ${rt.name} — no active physical rooms`);
      continue;
    }

    const bookings = await prisma.hotelBooking.findMany({
      where: {
        roomTypeId: rt.id,
        status: { notIn: [...HOLDING_EXCLUDE] },
        checkInDate: { lt: end },
        checkOutDate: { gt: today },
      },
      select: { checkInDate: true, checkOutDate: true, roomCount: true, status: true },
    });

    for (let d = new Date(today); d.getTime() < end.getTime(); d = addDays(d, 1)) {
      let sold = 0;
      for (const b of bookings) {
        const cin = utcDateOnly(b.checkInDate);
        const cout = utcDateOnly(b.checkOutDate);
        if (cin.getTime() <= d.getTime() && d.getTime() < cout.getTime()) {
          sold += b.roomCount;
        }
      }
      if (sold > totalRooms) {
        oversell += 1;
        console.warn(
          `[oversell] roomType=${rt.id} date=${d.toISOString().slice(0, 10)} sold=${sold} total=${totalRooms}`,
        );
      }
      const availableRooms = Math.max(0, totalRooms - sold);
      await prisma.inventory.upsert({
        where: { roomTypeId_date: { roomTypeId: rt.id, date: d } },
        create: {
          roomTypeId: rt.id,
          date: d,
          totalRooms,
          availableRooms,
        },
        update: {
          totalRooms,
          availableRooms,
        },
      });
      inserted += 1;
    }
    console.log(`[ok] ${rt.name} (${rt.id}) totalRooms=${totalRooms}`);
  }

  console.log(`Done. Upserted ${inserted} rows. Oversell nights logged: ${oversell}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
