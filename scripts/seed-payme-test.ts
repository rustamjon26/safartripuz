import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const hotel = await prisma.hotel.findFirst();

  if (!user || !hotel) {
    console.error("No user or hotel found in DB!");
    process.exit(1);
  }

  const now = new Date();
  const d = (n: number) => new Date(now.getTime() + n * 86400000);

  const bookings = [
    { id: "payme-test-001", amount: 15000000, checkIn: d(1), checkOut: d(3) },
    { id: "payme-test-002", amount: 50000000, checkIn: d(5), checkOut: d(7) },
    { id: "payme-test-003", amount: 120000000, checkIn: d(10), checkOut: d(14) },
  ];

  for (const b of bookings) {
    await prisma.booking.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        userId: user.id,
        hotelId: hotel.id,
        amount: b.amount,
        status: "PENDING",
        checkInDate: b.checkIn,
        checkOutDate: b.checkOut,
      },
    });
    console.log(`✓ ${b.id} | ${b.amount / 100} UZS`);
  }

  console.log("\nShohjahonga yubor:");
  console.log("payme-test-001 | 150,000 UZS");
  console.log("payme-test-002 | 500,000 UZS");
  console.log("payme-test-003 | 1,200,000 UZS");
}

main().catch(console.error).finally(() => prisma.$disconnect());
