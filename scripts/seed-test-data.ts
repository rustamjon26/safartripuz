/**
 * Seeds a full set of "happy path" test data for scripts/test-api.ts.
 *
 * Creates:
 *   - 1 admin user
 *   - 1 hotel partner (user role=hotel_manager + approved Partner + active Hotel)
 *   - 1 homestay host (user role=home_stay_partner + HomeSayPartner + 1 ACTIVE listing)
 *   - 1 taxi driver/partner (user role=taxi + approved Partner + 1 TaxiService)
 *   - 1 guide partner (user role=guide + approved Partner + 1 ACTIVE GuideListing
 *     + 7 weekly GuideAvailability rows so bookings can pass availability check)
 *   - 1 customer (user role=user)
 *
 * Run: npx tsx scripts/seed-test-data.ts
 */

import bcrypt from "bcryptjs";
import { PrismaClient, type Role, type PartnerType } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD = "Admin1234!";

type SeedUser = {
  key: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: Role;
};

const USERS: SeedUser[] = [
  {
    key: "admin",
    first_name: "Admin",
    last_name: "SafarTrip",
    email: "admin@safartrip.uz",
    phone: "+998900000101",
    role: "admin",
  },
  {
    key: "hotel",
    first_name: "Hotel",
    last_name: "Partner",
    email: "hotel-partner@safartrip.uz",
    phone: "+998900000102",
    role: "hotel_manager",
  },
  {
    key: "homestay",
    first_name: "Homestay",
    last_name: "Host",
    email: "homestay-host@safartrip.uz",
    phone: "+998900000103",
    role: "home_stay_partner",
  },
  {
    key: "taxi",
    first_name: "Taxi",
    last_name: "Partner",
    email: "taxi-partner@safartrip.uz",
    phone: "+998900000104",
    role: "taxi",
  },
  {
    key: "guide",
    first_name: "Guide",
    last_name: "Partner",
    email: "guide-partner@safartrip.uz",
    phone: "+998900000105",
    role: "guide",
  },
  {
    key: "customer",
    first_name: "Demo",
    last_name: "Customer",
    email: "customer@safartrip.uz",
    phone: "+998900000106",
    role: "user",
  },
];

const HOMESTAY_LISTING_ID = "seed-homestay-listing";
const TAXI_SERVICE_ID = "seed-taxi-service";
const GUIDE_LISTING_ID = "seed-guide-listing";

async function ensurePartner(
  userId: string,
  type: PartnerType,
  displayName: string,
) {
  return prisma.partner.upsert({
    where: { userId },
    update: { type, status: "approved", displayName },
    create: { userId, type, status: "approved", displayName },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const created: Record<string, { id: string; email: string; role: Role }> = {};

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        first_name: u.first_name,
        last_name: u.last_name,
        phone: u.phone,
        role: u.role,
        password: passwordHash,
        isBlocked: false,
      },
      create: {
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        password: passwordHash,
      },
      select: { id: true, email: true, role: true },
    });
    created[u.key] = user;
    console.log(`[user] ${u.role.padEnd(18)} ${u.email}  id=${user.id}`);
  }

  // Hotel partner + Hotel
  const hotelPartner = await ensurePartner(
    created.hotel.id,
    "hotel",
    "Safar Palace Hotel",
  );
  const hotel = await prisma.hotel.upsert({
    where: { partnerId: hotelPartner.id },
    update: {
      status: "active",
      name: "Safar Palace Hotel",
      city: "Toshkent",
      address: "Yunusobod tumani, 12",
      contactEmail: "hotel-partner@safartrip.uz",
      contactPhone: "+998900000102",
      totalRooms: 30,
    },
    create: {
      partnerId: hotelPartner.id,
      status: "active",
      name: "Safar Palace Hotel",
      city: "Toshkent",
      address: "Yunusobod tumani, 12",
      contactEmail: "hotel-partner@safartrip.uz",
      contactPhone: "+998900000102",
      totalRooms: 30,
    },
    select: { id: true, name: true },
  });
  console.log(`[hotel] ${hotel.name}  id=${hotel.id}`);

  // Homestay host + listing
  await prisma.homeSayPartner.upsert({
    where: { userId: created.homestay.id },
    update: {},
    create: { userId: created.homestay.id },
  });
  const homestay = await prisma.homeStayListing.upsert({
    where: { id: HOMESTAY_LISTING_ID },
    update: {
      hostId: created.homestay.id,
      status: "ACTIVE",
      title: "Uy-joy Toshkent markazida",
      description: "Qulay, toza va xavfsiz uy-joy. Markazda joylashgan.",
      address: "Amir Temur ko'chasi 1",
      city: "Toshkent",
      region: "Toshkent",
      pricePerNight: 250000,
      maxGuests: 4,
      rooms: 2,
      beds: 3,
      bathrooms: 1,
      amenities: ["wifi", "kitchen", "parking", "ac"],
      images: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
      ],
    },
    create: {
      id: HOMESTAY_LISTING_ID,
      hostId: created.homestay.id,
      status: "ACTIVE",
      title: "Uy-joy Toshkent markazida",
      description: "Qulay, toza va xavfsiz uy-joy. Markazda joylashgan.",
      address: "Amir Temur ko'chasi 1",
      city: "Toshkent",
      region: "Toshkent",
      pricePerNight: 250000,
      maxGuests: 4,
      rooms: 2,
      beds: 3,
      bathrooms: 1,
      amenities: ["wifi", "kitchen", "parking", "ac"],
      images: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2",
      ],
    },
    select: { id: true, title: true, status: true },
  });
  console.log(
    `[homestay-listing] ${homestay.title}  id=${homestay.id}  status=${homestay.status}`,
  );

  // Taxi partner + service
  const taxiPartner = await ensurePartner(
    created.taxi.id,
    "taxi",
    "Safar Taxi Group",
  );
  const taxiService = await prisma.taxiService.upsert({
    where: { id: TAXI_SERVICE_ID },
    update: {
      partnerId: taxiPartner.id,
      title: "Shahar ichi transfer",
      serviceType: "HOTEL_TRANSFER",
      price: 3500,
      isActive: true,
    },
    create: {
      id: TAXI_SERVICE_ID,
      partnerId: taxiPartner.id,
      title: "Shahar ichi transfer",
      serviceType: "HOTEL_TRANSFER",
      price: 3500,
      isActive: true,
    },
    select: { id: true, title: true, isActive: true },
  });
  console.log(
    `[taxi-service] ${taxiService.title}  id=${taxiService.id}  active=${taxiService.isActive}`,
  );

  // Guide partner + listing + weekly availability
  const guidePartner = await ensurePartner(
    created.guide.id,
    "guide",
    "Safar Guide Team",
  );
  const guideListing = await prisma.guideListing.upsert({
    where: { id: GUIDE_LISTING_ID },
    update: {
      partnerId: guidePartner.id,
      hostId: created.guide.id,
      status: "ACTIVE",
      isActive: true,
      title: "Toshkent walking tour",
      description: "Toshkent tarixiy markazi bo'ylab sayr.",
      meetingPoint: "Amir Temur hay'kali oldi",
      language: "uz",
      languages: ["uz", "ru", "en"],
      category: "CITY_TOUR",
      region: "Toshkent",
      duration: "4 soat",
      pricePerDay: 800000,
      pricePerHour: 100000,
      minHours: 2,
      maxHours: 8,
      maxGroupSize: 10,
      images: [
        "https://images.unsplash.com/photo-1519677100203-a0e668c92439",
      ],
    },
    create: {
      id: GUIDE_LISTING_ID,
      partnerId: guidePartner.id,
      hostId: created.guide.id,
      status: "ACTIVE",
      isActive: true,
      title: "Toshkent walking tour",
      description: "Toshkent tarixiy markazi bo'ylab sayr.",
      meetingPoint: "Amir Temur hay'kali oldi",
      language: "uz",
      languages: ["uz", "ru", "en"],
      category: "CITY_TOUR",
      region: "Toshkent",
      duration: "4 soat",
      pricePerDay: 800000,
      pricePerHour: 100000,
      minHours: 2,
      maxHours: 8,
      maxGroupSize: 10,
      images: [
        "https://images.unsplash.com/photo-1519677100203-a0e668c92439",
      ],
    },
    select: { id: true, title: true, status: true },
  });
  console.log(
    `[guide-listing] ${guideListing.title}  id=${guideListing.id}  status=${guideListing.status}`,
  );

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    await prisma.guideAvailability.upsert({
      where: {
        guideId_dayOfWeek: { guideId: created.guide.id, dayOfWeek },
      },
      update: {
        listingId: guideListing.id,
        startTime: "08:00",
        endTime: "20:00",
        isAvailable: true,
      },
      create: {
        listingId: guideListing.id,
        guideId: created.guide.id,
        dayOfWeek,
        startTime: "08:00",
        endTime: "20:00",
        isAvailable: true,
      },
    });
  }
  console.log(`[guide-availability] 7 rows (every day 08:00-20:00)`);

  console.log("\n--- SEED SUMMARY ---");
  console.log(`Password for all seeded users: ${PASSWORD}`);
  console.log(
    "Users:\n" +
      USERS.map((u) => `  ${u.role.padEnd(18)} ${u.email}`).join("\n"),
  );
  console.log(
    `IDs:\n  homestayListingId = ${homestay.id}\n  taxiServiceId     = ${taxiService.id}\n  guideListingId    = ${guideListing.id}`,
  );
}

main()
  .catch((e) => {
    console.error("[seed-test-data] FAILED", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
