/**
 * Upsert platform taxi partner + default catalog services so /taxi works.
 *
 * Safe to re-run (idempotent). Use on Contabo when customer taxi shows empty:
 *   cd /var/www/safar && npx tsx scripts/seed-taxi-catalog.ts
 *
 * Login for taxi partner panel: taxi-partner@safartrip.uz / Admin1234!
 * (password only set on first create; existing users keep their hash)
 */

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TAXI_EMAIL = "taxi-partner@safartrip.uz";
const TAXI_PHONE = "+998900000104";
const DEFAULT_PASSWORD = "Admin1234!";

const SERVICES: Array<{
  id: string;
  title: string;
  serviceType: "INTERCITY_TRANSFER" | "HOTEL_TRANSFER" | "TOUR_DAILY_TRANSPORT";
  /** Price per km in SOM (estimate = km × price). */
  price: number;
}> = [
  {
    id: "catalog-taxi-city",
    title: "Shahar ichi transfer",
    serviceType: "HOTEL_TRANSFER",
    price: 3500,
  },
  {
    id: "catalog-taxi-intercity",
    title: "Viloyatlararo transfer",
    serviceType: "INTERCITY_TRANSFER",
    price: 4500,
  },
  {
    id: "catalog-taxi-tour",
    title: "Kunlik sayohat transporti",
    serviceType: "TOUR_DAILY_TRANSPORT",
    price: 5000,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: TAXI_EMAIL },
    update: { role: "taxi", isBlocked: false },
    create: {
      first_name: "Safar",
      last_name: "Taxi",
      email: TAXI_EMAIL,
      phone: TAXI_PHONE,
      password: passwordHash,
      role: "taxi",
    },
    select: { id: true, email: true },
  });

  const partner = await prisma.partner.upsert({
    where: { userId: user.id },
    update: {
      type: "taxi",
      status: "approved",
      displayName: "SafarTrip Taxi",
      contactEmail: TAXI_EMAIL,
      contactPhone: TAXI_PHONE,
    },
    create: {
      userId: user.id,
      type: "taxi",
      status: "approved",
      displayName: "SafarTrip Taxi",
      contactEmail: TAXI_EMAIL,
      contactPhone: TAXI_PHONE,
    },
    select: { id: true, status: true },
  });

  for (const s of SERVICES) {
    await prisma.taxiService.upsert({
      where: { id: s.id },
      update: {
        partnerId: partner.id,
        title: s.title,
        serviceType: s.serviceType,
        price: s.price,
        isActive: true,
      },
      create: {
        id: s.id,
        partnerId: partner.id,
        title: s.title,
        serviceType: s.serviceType,
        price: s.price,
        isActive: true,
      },
    });
    console.log(`[taxi-service] ${s.id} → ${s.title} (${s.price} so'm/km)`);
  }

  const active = await prisma.taxiService.count({
    where: { isActive: true, partner: { status: "approved", type: "taxi" } },
  });
  console.log(
    `\nDone. Approved-partner active services: ${active}\nPartner user: ${user.email} (status=${partner.status})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
