import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PASSWORD = "Test12345!";

const users = [
  {
    key: "super_admin",
    first_name: "Super",
    last_name: "Admin",
    email: "superadmin@safartrip.uz",
    phone: "+998900000001",
    role: "super_admin",
  },
  {
    key: "admin",
    first_name: "Main",
    last_name: "Admin",
    email: "admin@safartrip.uz",
    phone: "+998900000002",
    role: "admin",
  },
  {
    key: "user",
    first_name: "Test",
    last_name: "User",
    email: "user@safartrip.uz",
    phone: "+998900000003",
    role: "user",
  },
  {
    key: "hotel_manager",
    first_name: "Hotel",
    last_name: "Manager",
    email: "hotel@safartrip.uz",
    phone: "+998900000004",
    role: "hotel_manager",
  },
  {
    key: "taxi",
    first_name: "Taxi",
    last_name: "Driver",
    email: "taxi@safartrip.uz",
    phone: "+998900000005",
    role: "taxi",
  },
  {
    key: "guide",
    first_name: "Travel",
    last_name: "Guide",
    email: "guide@safartrip.uz",
    phone: "+998900000006",
    role: "guide",
  },
  {
    key: "restaurant_manager",
    first_name: "Restaurant",
    last_name: "Manager",
    email: "restaurant@safartrip.uz",
    phone: "+998900000007",
    role: "restaurant_manager",
  },
];

async function ensurePartner(userId, type, displayName, meta = null) {
  return prisma.partner.upsert({
    where: { userId },
    update: {
      type,
      status: "approved",
      displayName,
      meta,
    },
    create: {
      userId,
      type,
      status: "approved",
      displayName,
      meta,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const created = {};

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        first_name: u.first_name,
        last_name: u.last_name,
        phone: u.phone,
        role: u.role,
        password: passwordHash,
      },
      create: {
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        password: passwordHash,
      },
    });
    created[u.key] = user;
  }

  const hotelPartner = await ensurePartner(
    created.hotel_manager.id,
    "hotel",
    "Safar Palace Hotel",
    { city: "Toshkent", address: "Yunusobod tumani" },
  );
  await prisma.hotel.upsert({
    where: { partnerId: hotelPartner.id },
    update: {
      status: "active",
      name: "Safar Palace Hotel",
      city: "Toshkent",
      address: "Yunusobod tumani",
      contactEmail: "hotel@safartrip.uz",
      contactPhone: "+998900000004",
      totalRooms: 40,
    },
    create: {
      partnerId: hotelPartner.id,
      status: "active",
      name: "Safar Palace Hotel",
      city: "Toshkent",
      address: "Yunusobod tumani",
      contactEmail: "hotel@safartrip.uz",
      contactPhone: "+998900000004",
      totalRooms: 40,
    },
  });

  const taxiPartner = await ensurePartner(created.taxi.id, "taxi", "Safar Taxi Group");
  const guidePartner = await ensurePartner(created.guide.id, "guide", "Safar Guide Team");
  await ensurePartner(
    created.restaurant_manager.id,
    "restaurant",
    "Safar Restaurant Hub",
  );

  await prisma.taxiService.upsert({
    where: { id: "seed-taxi-intercity" },
    update: {
      partnerId: taxiPartner.id,
      title: "Toshkent - Samarqand transfer",
      serviceType: "INTERCITY_TRANSFER",
      price: 450000,
      isActive: true,
    },
    create: {
      id: "seed-taxi-intercity",
      partnerId: taxiPartner.id,
      title: "Toshkent - Samarqand transfer",
      serviceType: "INTERCITY_TRANSFER",
      price: 450000,
      isActive: true,
    },
  });

  await prisma.guideListing.upsert({
    where: { id: "seed-guide-city-tour" },
    update: {
      partnerId: guidePartner.id,
      title: "Samarqand city walking tour",
      language: "uz",
      region: "Samarqand",
      duration: "6 soat",
      pricePerDay: 350000,
      isActive: true,
    },
    create: {
      id: "seed-guide-city-tour",
      partnerId: guidePartner.id,
      title: "Samarqand city walking tour",
      language: "uz",
      region: "Samarqand",
      duration: "6 soat",
      pricePerDay: 350000,
      isActive: true,
    },
  });

  console.log("Seed completed.");
  console.log(JSON.stringify({
    password: PASSWORD,
    users: users.map((u) => ({ email: u.email, role: u.role })),
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
