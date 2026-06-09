import { prisma } from "../lib/prisma";
import { buildPaymeCheckoutUrl } from "../lib/payme";

const TEST_BOOKING_ID = "test-booking-001";
const TEST_AMOUNT_TIYIN = 15_000_000;

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  const hotel = await prisma.hotel.findFirst({ orderBy: { createdAt: "asc" } });

  if (!user) {
    throw new Error("No users found in database. Run seed script first.");
  }

  if (!hotel) {
    throw new Error("No hotels found in database. Run seed script first.");
  }

  const checkInDate = new Date();
  const checkOutDate = new Date();
  checkOutDate.setDate(checkOutDate.getDate() + 2);

  const booking = await prisma.booking.upsert({
    where: { id: TEST_BOOKING_ID },
    create: {
      id: TEST_BOOKING_ID,
      userId: user.id,
      hotelId: hotel.id,
      amount: TEST_AMOUNT_TIYIN,
      status: "PENDING",
      checkInDate,
      checkOutDate,
    },
    update: {
      userId: user.id,
      hotelId: hotel.id,
      amount: TEST_AMOUNT_TIYIN,
      status: "PENDING",
      checkInDate,
      checkOutDate,
    },
    include: {
      hotel: { select: { name: true } },
    },
  });

  const checkoutUrl = buildPaymeCheckoutUrl({
    bookingId: booking.id,
    amount: booking.amount,
  });

  console.log("Test Payme booking ready:");
  console.log(`  Booking ID: ${booking.id}`);
  console.log(`  Hotel: ${booking.hotel.name}`);
  console.log(`  Amount: ${booking.amount} tiyin (${booking.amount / 100} UZS)`);
  console.log(`  Status: ${booking.status}`);
  console.log(`  Check-in: ${booking.checkInDate?.toISOString() ?? "—"}`);
  console.log(`  Check-out: ${booking.checkOutDate?.toISOString() ?? "—"}`);
  console.log("");
  console.log("Checkout URL (same as initiatePaymePayment redirect):");
  console.log(checkoutUrl);
  console.log("");
  console.log("Payme webhook URL for Shohjahon:");
  console.log("  https://safartrip.uz/api/payme");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
