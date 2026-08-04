/**
 * Seed Zomin hotel + HomeStay so trip-builder / catalog are not empty.
 *
 * Idempotent. Run on Contabo when Zomin shows "takliflar yo'q":
 *   cd /var/www/safar && npx tsx scripts/seed-zomin-lodging.ts
 *
 * Hotel partner login: hotel-zomin@safartrip.uz / Admin1234!
 * Homestay host login:  host-zomin@safartrip.uz / Admin1234!
 * (password only set on first create)
 */

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOTEL_EMAIL = "hotel-zomin@safartrip.uz";
const HOTEL_PHONE = "+998900000201";
const HOST_EMAIL = "host-zomin@safartrip.uz";
const HOST_PHONE = "+998900000202";
const DEFAULT_PASSWORD = "Admin1234!";

const HOTEL_NAME = "SafarTrip Zomin Resort";
const HOMESTAY_TITLE = "Zomin tog' uyi";

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const hotelUser = await prisma.user.upsert({
    where: { email: HOTEL_EMAIL },
    update: { role: "hotel_manager", isBlocked: false },
    create: {
      first_name: "Zomin",
      last_name: "Hotel",
      email: HOTEL_EMAIL,
      phone: HOTEL_PHONE,
      password: passwordHash,
      role: "hotel_manager",
    },
    select: { id: true },
  });

  const hotelPartner = await prisma.partner.upsert({
    where: { userId: hotelUser.id },
    update: {
      type: "hotel",
      status: "approved",
      displayName: HOTEL_NAME,
      contactEmail: HOTEL_EMAIL,
      contactPhone: HOTEL_PHONE,
      meta: { city: "Zomin", address: "Zaamin milliy bog'", starRating: 4 },
    },
    create: {
      userId: hotelUser.id,
      type: "hotel",
      status: "approved",
      displayName: HOTEL_NAME,
      contactEmail: HOTEL_EMAIL,
      contactPhone: HOTEL_PHONE,
      meta: { city: "Zomin", address: "Zaamin milliy bog'", starRating: 4 },
    },
    select: { id: true },
  });

  let hotel = await prisma.hotel.findUnique({
    where: { partnerId: hotelPartner.id },
    select: { id: true },
  });

  if (!hotel) {
    hotel = await prisma.hotel.create({
      data: {
        partnerId: hotelPartner.id,
        status: "active",
        name: HOTEL_NAME,
        city: "Zomin",
        address: "Zaamin milliy bog'i, Zomin",
        totalRooms: 12,
        contactEmail: HOTEL_EMAIL,
        contactPhone: HOTEL_PHONE,
        latitude: 39.9606,
        longitude: 68.3956,
      },
      select: { id: true },
    });
  } else {
    await prisma.hotel.update({
      where: { id: hotel.id },
      data: {
        status: "active",
        name: HOTEL_NAME,
        city: "Zomin",
        address: "Zaamin milliy bog'i, Zomin",
      },
    });
  }

  const existingRoom = await prisma.roomType.findFirst({
    where: { hotelId: hotel.id, name: "Standard" },
    select: { id: true },
  });
  if (!existingRoom) {
    await prisma.roomType.create({
      data: {
        hotelId: hotel.id,
        name: "Standard",
        description: "Zomin manzarali standard xona",
        capacityAdults: 2,
        capacityChildren: 1,
        basePrice: 450_000,
        isActive: true,
        images: [],
        amenities: ["wifi", "breakfast"],
      },
    });
  } else {
    await prisma.roomType.update({
      where: { id: existingRoom.id },
      data: { isActive: true, basePrice: 450_000 },
    });
  }

  const hostUser = await prisma.user.upsert({
    where: { email: HOST_EMAIL },
    update: { role: "home_stay_partner", isBlocked: false },
    create: {
      first_name: "Zomin",
      last_name: "Host",
      email: HOST_EMAIL,
      phone: HOST_PHONE,
      password: passwordHash,
      role: "home_stay_partner",
    },
    select: { id: true },
  });

  const hsPartner = await prisma.homeSayPartner.upsert({
    where: { userId: hostUser.id },
    update: {},
    create: { userId: hostUser.id },
    select: { id: true },
  });

  const existingHs = await prisma.homeStayListing.findFirst({
    where: { hostId: hostUser.id, title: HOMESTAY_TITLE },
    select: { id: true },
  });

  if (!existingHs) {
    await prisma.homeStayListing.create({
      data: {
        hostId: hostUser.id,
        partnerId: hsPartner.id,
        title: HOMESTAY_TITLE,
        description:
          "Zomin tog'larida oilaviy uy mehmonxonasi. Toza havo, oshxona, wi‑fi.",
        address: "Qizilsoy yo'li, Zomin",
        city: "Zomin",
        region: "Jizzax",
        latitude: 39.965,
        longitude: 68.39,
        pricePerNight: 280_000,
        maxGuests: 6,
        rooms: 3,
        beds: 4,
        bathrooms: 1,
        amenities: ["wifi", "kitchen", "parking"],
        images: [],
        status: "ACTIVE",
      },
    });
  } else {
    await prisma.homeStayListing.update({
      where: { id: existingHs.id },
      data: {
        status: "ACTIVE",
        city: "Zomin",
        region: "Jizzax",
        partnerId: hsPartner.id,
      },
    });
  }

  // Also promote any Zaamin-spelled ACTIVE-ready rows that were stuck PENDING
  const promoted = await prisma.homeStayListing.updateMany({
    where: {
      status: "PENDING",
      OR: [
        { city: { contains: "zomin" } },
        { city: { contains: "zaamin" } },
        { region: { contains: "zomin" } },
        { region: { contains: "zaamin" } },
      ],
    },
    data: { status: "ACTIVE" },
  });

  console.log("OK: Zomin lodging seeded");
  console.log(`  hotel: ${HOTEL_NAME} (${HOTEL_EMAIL})`);
  console.log(`  homestay: ${HOMESTAY_TITLE} (${HOST_EMAIL})`);
  if (promoted.count) {
    console.log(`  promoted PENDING→ACTIVE: ${promoted.count}`);
  }
  console.log(`  password (new users only): ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
