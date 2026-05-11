import { prisma } from "../lib/prisma";

function displayName(firstName: string, lastName: string, email: string): string {
  const full = `${firstName} ${lastName}`.trim();
  return full || email;
}

async function ensureHotelPartnerAndHotel(user: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  partnerProfile: { id: string } | null;
}) {
  if (user.partnerProfile) return;
  const name = displayName(user.first_name, user.last_name, user.email);
  console.log(`Creating Partner+Hotel for: ${user.email}`);
  const partner = await prisma.partner.create({
    data: {
      userId: user.id,
      type: "hotel",
      status: "approved",
      displayName: name,
      contactEmail: user.email,
      contactPhone: user.phone,
    },
  });
  await prisma.hotel.create({
    data: {
      partnerId: partner.id,
      status: "active",
      name: `${name} Hotel`,
      totalRooms: 10,
      city: "",
      contactEmail: user.email,
      contactPhone: user.phone,
    },
  });
  console.log(`Fixed: ${user.email}`);
}

async function ensureGuidePartner(user: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  partnerProfile: { id: string } | null;
}) {
  if (user.partnerProfile) return;
  const name = displayName(user.first_name, user.last_name, user.email);
  console.log(`Creating Partner for guide: ${user.email}`);
  await prisma.partner.create({
    data: {
      userId: user.id,
      type: "guide",
      status: "approved",
      displayName: name,
      contactEmail: user.email,
      contactPhone: user.phone,
    },
  });
  console.log(`Fixed: ${user.email}`);
}

async function ensureTaxiPartner(user: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  partnerProfile: { id: string } | null;
}) {
  if (user.partnerProfile) return;
  const name = displayName(user.first_name, user.last_name, user.email);
  console.log(`Creating Partner for taxi user: ${user.email}`);
  await prisma.partner.create({
    data: {
      userId: user.id,
      type: "taxi",
      status: "approved",
      displayName: name,
      contactEmail: user.email,
      contactPhone: user.phone,
    },
  });
  console.log(`Fixed: ${user.email}`);
}

async function ensureHomeStayPartner(user: {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  partnerProfile: { id: string } | null;
}) {
  if (user.partnerProfile) return;
  const name = displayName(user.first_name, user.last_name, user.email);
  console.log(`Creating Partner for home_stay user: ${user.email}`);
  await prisma.partner.create({
    data: {
      userId: user.id,
      type: "hotel",
      status: "approved",
      displayName: name,
      contactEmail: user.email,
      contactPhone: user.phone,
    },
  });
  console.log(`Fixed: ${user.email}`);
}

async function fixMissingPartners() {
  console.log("Checking for users with missing Partner records...");

  const hotelManagers = await prisma.user.findMany({
    where: { role: "hotel_manager" },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      partnerProfile: { select: { id: true } },
    },
  });
  for (const user of hotelManagers) {
    await ensureHotelPartnerAndHotel(user);
  }

  const guides = await prisma.user.findMany({
    where: { role: "guide" },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      partnerProfile: { select: { id: true } },
    },
  });
  for (const user of guides) {
    await ensureGuidePartner(user);
  }

  const taxiUsers = await prisma.user.findMany({
    where: { role: { in: ["taxi", "taxi_partner"] } },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      partnerProfile: { select: { id: true } },
    },
  });
  for (const user of taxiUsers) {
    await ensureTaxiPartner(user);
  }

  const homeStayUsers = await prisma.user.findMany({
    where: { role: "home_stay_partner" },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
      partnerProfile: { select: { id: true } },
    },
  });
  for (const user of homeStayUsers) {
    await ensureHomeStayPartner(user);
  }

  console.log("Done!");
}

fixMissingPartners()
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
