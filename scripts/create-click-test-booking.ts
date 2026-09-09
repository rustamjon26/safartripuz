/**
 * Create one real pending hotel hold + CLICK Payment for Shop API Prepare/Complete.
 *
 * Mirrors POST /api/hotels/bookings (quote → createHeldHotelBooking → travel
 * plan → Payment). Does not invent properties or skip inventory.
 *
 * Usage:
 *   npx tsx scripts/create-click-test-booking.ts
 *
 * Guest is always the dedicated TEST USER clicktest@safartrip.uz
 * (created on first run). Never attaches to a real customer.
 * Override: CLICK_TEST_USER_ID or CLICK_TEST_USER_EMAIL
 * (must be clicktest@ / clicktest+tag@ / click-test@safartrip.uz).
 *
 * Amount defaults to the live rates quote. For Click cabinet tests:
 *   CLICK_TEST_AMOUNT_SOM=1000 npx tsx scripts/create-click-test-booking.ts
 *   npx tsx scripts/create-click-test-booking.ts --amount=1000
 * That overrides Payment + TravelPlan + HotelBooking totals together so
 * Prepare matching and Complete/ledger stay on the same som figure.
 * Inventory hold is still a real room-night.
 *
 * Click merchant_trans_id = Payment.id (not HotelBooking.id).
 * Amount printed for the invoice is stored Payment.amount (Prepare matches that).
 *
 * The hotel hold auto-expires after 15 minutes via `safartrip-expire-holds`.
 */
import "../src/shared/boot";

import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { bookingService } from "../src/modules/booking";
import {
  HOLD_TTL_MS,
  InsufficientInventoryError,
  InventoryLockError,
  utcDateOnly,
} from "../src/modules/inventory";
import {
  appBaseUrl,
  getClickConfig,
  getPaymentProvidersConfig,
} from "../src/modules/payment";
import { ratesService } from "../src/modules/rates";
import { Money } from "../src/shared/money";

const TEST_NOTE_PREFIX = "CLICK_TEST";
const DATE_ATTEMPTS = 14;
/** Dedicated internal account — never a real customer mailbox. */
const DEFAULT_TEST_EMAIL = "clicktest@safartrip.uz";
const DEFAULT_TEST_PHONE = "+998900009809";
const TEST_EMAIL_RE = /^(clicktest(\+[a-z0-9._-]+)?|click-test)@safartrip\.uz$/i;

type EligibleRoomType = {
  id: string;
  name: string;
  basePrice: Prisma.Decimal;
  capacityAdults: number;
  capacityChildren: number;
  physicalRoomCount: number;
};

type EligibleHotel = {
  id: string;
  name: string;
  city: string | null;
  roomTypes: EligibleRoomType[];
};

function addUtcDays(date: Date, days: number): Date {
  const next = utcDateOnly(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function ymd(date: Date): string {
  return utcDateOnly(date).toISOString().slice(0, 10);
}

/**
 * Optional Click cabinet amount. CLI `--amount=` wins over CLICK_TEST_AMOUNT_SOM.
 * Ledger Complete posts HotelBooking.totalAmount, so the override is applied to
 * Payment + TravelPlan + HotelBooking together — Payment-only would break recon.
 */
function parseTestAmountOverride(): Money | null {
  const eq = process.argv.find((a) => a.startsWith("--amount="));
  let raw: string | undefined;
  if (eq) {
    raw = eq.slice("--amount=".length).trim();
  } else {
    const flagAt = process.argv.indexOf("--amount");
    if (flagAt >= 0) raw = process.argv[flagAt + 1]?.trim();
  }
  if (!raw) raw = process.env.CLICK_TEST_AMOUNT_SOM?.trim();
  if (!raw) return null;
  let money: Money;
  try {
    money = Money.fromSomNumber(raw);
  } catch {
    throw new Error(
      `Invalid test amount "${raw}". Use som with up to 2 decimals, e.g. 1000 or --amount=1000.`,
    );
  }
  if (money.isZero()) {
    throw new Error("CLICK_TEST_AMOUNT_SOM / --amount must be greater than 0.");
  }
  return money;
}

type TestGuest = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created: boolean;
};

function assertTestEmail(email: string): void {
  if (!TEST_EMAIL_RE.test(email)) {
    throw new Error(
      `Refusing to attach a Click test booking to ${email}. ` +
        `Guest must be ${DEFAULT_TEST_EMAIL} or click-test@safartrip.uz (plus-tags on clicktest@ allowed).`,
    );
  }
}

async function resolveClickTestGuest(): Promise<TestGuest> {
  const guestSelect = {
    id: true,
    first_name: true,
    last_name: true,
    email: true,
    phone: true,
    isBlocked: true,
  } as const;

  const explicitId = process.env.CLICK_TEST_USER_ID?.trim();
  if (explicitId) {
    const user = await prisma.user.findUnique({
      where: { id: explicitId },
      select: guestSelect,
    });
    if (!user) {
      throw new Error(
        `CLICK_TEST_USER_ID=${explicitId} not found. Refusing to fall back to a customer.`,
      );
    }
    assertTestEmail(user.email);
    if (user.isBlocked) {
      throw new Error(
        `Test user ${user.email} is blocked. Unblock it or unset CLICK_TEST_USER_ID.`,
      );
    }
    return { ...user, created: false };
  }

  const email = (
    process.env.CLICK_TEST_USER_EMAIL?.trim() || DEFAULT_TEST_EMAIL
  ).toLowerCase();
  assertTestEmail(email);

  const existing = await prisma.user.findUnique({
    where: { email },
    select: guestSelect,
  });
  if (existing) {
    if (existing.isBlocked) {
      throw new Error(
        `Test user ${email} is blocked. Unblock it before running this script.`,
      );
    }
    return { ...existing, created: false };
  }

  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const phone =
    process.env.CLICK_TEST_USER_PHONE?.trim() || DEFAULT_TEST_PHONE;

  try {
    const created = await prisma.user.create({
      data: {
        first_name: "Click",
        last_name: "Test",
        email,
        phone,
        password: passwordHash,
        role: "user",
        isBlocked: false,
      },
      select: guestSelect,
    });
    return { ...created, created: true };
  } catch {
    const raced = await prisma.user.findUnique({
      where: { email },
      select: guestSelect,
    });
    if (raced && !raced.isBlocked) {
      return { ...raced, created: false };
    }
    const phoneTaken = await prisma.user.findUnique({
      where: { phone },
      select: { email: true },
    });
    if (phoneTaken) {
      throw new Error(
        `Cannot create ${email}: phone ${phone} already belongs to ${phoneTaken.email}. ` +
          `Set CLICK_TEST_USER_PHONE to an unused number.`,
      );
    }
    throw new Error(`Cannot create dedicated test user ${email}.`);
  }
}

async function readOnlyInventoryCheck(): Promise<{
  hotel: EligibleHotel;
  roomType: EligibleRoomType;
}> {
  const hotels = await prisma.hotel.findMany({
    where: {
      status: "active",
      partner: { status: "approved", type: "hotel" },
      roomTypes: {
        some: {
          isActive: true,
          rooms: { some: { isActive: true } },
        },
      },
    },
    select: {
      id: true,
      name: true,
      city: true,
      roomTypes: {
        where: { isActive: true, rooms: { some: { isActive: true } } },
        select: {
          id: true,
          name: true,
          basePrice: true,
          capacityAdults: true,
          capacityChildren: true,
          rooms: { where: { isActive: true }, select: { id: true } },
        },
        orderBy: { basePrice: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const eligible: EligibleHotel[] = hotels
    .map((hotel) => ({
      id: hotel.id,
      name: hotel.name,
      city: hotel.city,
      roomTypes: hotel.roomTypes
        .filter((rt) => rt.rooms.length > 0)
        .map((rt) => ({
          id: rt.id,
          name: rt.name,
          basePrice: rt.basePrice,
          capacityAdults: rt.capacityAdults,
          capacityChildren: rt.capacityChildren,
          physicalRoomCount: rt.rooms.length,
        })),
    }))
    .filter((hotel) => hotel.roomTypes.length > 0);

  if (eligible.length === 0) {
    throw new Error(
      "No active approved hotel with an active room type and physical room. Refusing to insert.",
    );
  }

  const zomin = eligible.filter((h) => /zomin|zaamin/i.test(`${h.city ?? ""} ${h.name}`));
  const pool = zomin.length > 0 ? zomin : eligible;

  let hotel = pool[0];
  let roomType = hotel.roomTypes[0];
  for (const candidate of pool) {
    for (const rt of candidate.roomTypes) {
      if (Number(rt.basePrice) < Number(roomType.basePrice)) {
        hotel = candidate;
        roomType = rt;
      }
    }
  }

  console.log("[click-test] read-only check passed");
  console.log(`  hotels eligible: ${eligible.length} (zomin-named: ${zomin.length})`);
  console.log(`  picked hotel: ${hotel.name} (${hotel.city ?? "—"}) id=${hotel.id}`);
  console.log(
    `  picked room: ${roomType.name} basePrice=${roomType.basePrice.toString()} som, physicalRooms=${roomType.physicalRoomCount}`,
  );

  return { hotel, roomType };
}

async function main() {
  const amountOverride = parseTestAmountOverride();

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new Error(
      "Cannot reach MySQL at DATABASE_URL. Start the database, then re-run: npx tsx scripts/create-click-test-booking.ts",
    );
  }

  const { hotel, roomType } = await readOnlyInventoryCheck();
  const guest = await resolveClickTestGuest();
  assertTestEmail(guest.email);
  console.log(
    `  guest: ${guest.email}  [TEST USER]  id=${guest.id}` +
      (guest.created ? " (created now)" : " (reused)"),
  );

  const today = utcDateOnly(new Date());
  const guestName =
    `${guest.first_name} ${guest.last_name}`.trim() || "Click test guest";
  const guests = Math.min(1, Math.max(1, roomType.capacityAdults || 1));

  let booking: Awaited<ReturnType<typeof bookingService.createHeldHotelBooking>> | null =
    null;
  let checkIn = addUtcDays(today, 1);
  let checkOut = addUtcDays(today, 2);
  let quoteTotalSom = 0;
  let snapshot: Record<string, unknown> = {};

  for (let offset = 1; offset <= DATE_ATTEMPTS; offset++) {
    checkIn = addUtcDays(today, offset);
    checkOut = addUtcDays(today, offset + 1);
    const quote = await ratesService.quoteHotel({
      roomTypeId: roomType.id,
      checkIn,
      checkOut,
      roomCount: 1,
      adults: guests,
      children: 0,
    });
    quoteTotalSom = quote.totalSom;
    snapshot = quote.snapshot;

    try {
      booking = await bookingService.createHeldHotelBooking({
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        guestName,
        guestPhone: guest.phone,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        roomCount: 1,
        totalAmount: quoteTotalSom,
        source: "SAFARTRIP",
        note: TEST_NOTE_PREFIX,
        pricingSnapshot: snapshot as Prisma.InputJsonValue,
        guestUserId: guest.id,
        guests: [
          {
            firstName: guest.first_name,
            lastName: guest.last_name,
          },
        ],
      });
      break;
    } catch (err) {
      if (err instanceof InsufficientInventoryError) {
        console.log(
          `[click-test] ${ymd(checkIn)} → ${ymd(checkOut)} no inventory, trying next night`,
        );
        continue;
      }
      if (err instanceof InventoryLockError) {
        throw new Error("Inventory lock contention; retry the script in a moment.");
      }
      throw err;
    }
  }

  if (!booking) {
    throw new Error(
      `No available night in the next ${DATE_ATTEMPTS} days for ${roomType.name}. Refusing to insert a payment.`,
    );
  }

  const nights = 1;
  const destination = hotel.city?.trim() || hotel.name;
  const quoted = Money.fromSomNumber(quoteTotalSom);
  const clickMoney = amountOverride ?? quoted;
  const amountTiyin = clickMoney.toTiyin();
  const paymentSom = clickMoney.toSomString();

  try {
    const plan = await prisma.travelPlan.create({
      data: {
        userId: guest.id,
        destination,
        startDate: checkIn,
        endDate: checkOut,
        pax: guests,
        status: "PENDING_PAYMENT",
        totalAmount: paymentSom,
        note: TEST_NOTE_PREFIX,
      },
    });

    await prisma.travelPlanItem.create({
      data: {
        travelPlanId: plan.id,
        type: "HOTEL",
        title: `${hotel.name} — ${roomType.name}`,
        providerId: hotel.id,
        quantity: 1,
        unitPrice: paymentSom,
        totalPrice: paymentSom,
        details: { nights, roomTypeId: roomType.id, roomCount: 1, clickTest: true },
      },
    });

    await prisma.hotelBooking.update({
      where: { id: booking.id },
      data: {
        travelPlanId: plan.id,
        note: `TravelPlan: ${plan.id}`,
        ...(amountOverride ? { totalAmount: paymentSom } : {}),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        travelPlanId: plan.id,
        provider: "CLICK",
        status: "INITIATED",
        amount: paymentSom,
        amountTiyin,
        currency: "UZS",
        metadata: {
          source: TEST_NOTE_PREFIX,
          quotedSom: quoted.toSomString(),
          ...(amountOverride
            ? { amountOverrideSom: amountOverride.toSomString() }
            : {}),
        },
      },
    });

    const stored = await prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      select: { id: true, amount: true, amountTiyin: true, provider: true, status: true },
    });
    const prepareAmount = Money.fromSomNumber(String(stored.amount));
    if (prepareAmount.toTiyin() !== amountTiyin) {
      throw new Error("Stored Payment.amount does not match the intended Click amount — aborting.");
    }
    if (amountOverride && prepareAmount.toSomString() !== amountOverride.toSomString()) {
      throw new Error("CLICK_TEST_AMOUNT_SOM did not stick on Payment.amount — aborting.");
    }
    if (amountOverride) {
      const held = await prisma.hotelBooking.findUniqueOrThrow({
        where: { id: booking.id },
        select: { totalAmount: true },
      });
      const heldSom = Money.fromSomNumber(String(held.totalAmount)).toSomString();
      if (heldSom !== amountOverride.toSomString()) {
        throw new Error(
          `HotelBooking.totalAmount is ${heldSom} but Click override is ${amountOverride.toSomString()}. ` +
            "Complete/ledger would disagree with Prepare — aborting.",
        );
      }
    }

    const providers = await getPaymentProvidersConfig();
    const click = getClickConfig(providers);
    const baseUrl = appBaseUrl();
    const returnUrl = baseUrl
      ? `${baseUrl}/payments/success?paymentId=${stored.id}`
      : `/payments/success?paymentId=${stored.id}`;
    const amountSom = prepareAmount.toSomString();
    const clickUrl =
      click.serviceId && click.merchantId
        ? `https://my.click.uz/services/pay` +
          `?service_id=${click.serviceId}` +
          `&merchant_id=${click.merchantId}` +
          `&amount=${amountSom}` +
          `&transaction_param=${stored.id}` +
          `&merchant_trans_id=${stored.id}` +
          `&return_url=${encodeURIComponent(returnUrl)}`
        : null;

    const holdMins = Math.round(HOLD_TTL_MS / 60000);

    console.log("");
    console.log("Click test booking ready (same path as POST /api/hotels/bookings)");
    console.log(`  guest:              ${guest.email}  [TEST USER]`);
    console.log(`  hotelBookingId:     ${booking.id}`);
    console.log(`  travelPlanId:       ${plan.id}`);
    console.log(`  merchant_trans_id:  ${stored.id}`);
    console.log(`  quoted room (SOM):  ${quoted.toSomString()}`);
    console.log(
      `  amount (Click SOM): ${amountSom}` +
        (amountOverride ? "  [OVERRIDE CLICK_TEST_AMOUNT_SOM / --amount]" : "  [live quote]"),
    );
    console.log(`  amountTiyin:        ${stored.amountTiyin.toString()}`);
    console.log(`  payment.status:     ${stored.status}`);
    console.log(`  payment.provider:   ${stored.provider}`);
    console.log(`  stay:               ${ymd(checkIn)} → ${ymd(checkOut)} (1 night)`);
    console.log(`  holdExpiresAt:      ${booking.holdExpiresAt?.toISOString() ?? "—"}`);
    console.log(`  hold TTL:           ${holdMins} minutes (safartrip-expire-holds releases inventory)`);
    if (amountOverride) {
      console.log(
        `  warning:            amount override is aligned on Payment + TravelPlan + HotelBooking so ledger Complete matches Click. The hold is still a real room-night — if Complete succeeds the stay confirms at ${amountSom} som (quoted ${quoted.toSomString()}). Unpaid hold expires in ~${holdMins} min.`,
      );
    }
    if (!click.enabled) {
      console.log("  warning:            Click is disabled in payment_providers — Prepare will reject until enabled");
    }
    if (clickUrl) {
      console.log("");
      console.log("Click invoice URL:");
      console.log(`  ${clickUrl}`);
    } else {
      console.log("");
      console.log("Click invoice URL not printed — serviceId/merchantId missing (env or Admin → Payments).");
      console.log("Prepare still uses merchant_trans_id + amount above.");
    }
    console.log("");
    console.log("After testing: do not delete Payment/HotelBooking rows by hand.");
    console.log(`Unpaid HELD bookings expire automatically in ~${holdMins} min and inventory is restored.`);
    console.log("Leftover INITIATED Payment / PENDING_PAYMENT plan are unused and safe to ignore.");
  } catch (err) {
    try {
      await bookingService.cancelAndRelease(booking.id, {
        actor: "SYSTEM",
        reason: "PAYMENT_SETUP_FAILED",
      });
    } catch {
      /* best-effort, same as the HTTP route */
    }
    throw err;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
