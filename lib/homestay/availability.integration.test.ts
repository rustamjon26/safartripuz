/**
 * Homestay availability, in the shape of the hotel inventory concurrency test:
 * a hold has to take the dates out of circulation the moment it exists, not
 * once payment lands. Requires TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma } from "@/src/test/db";
import {
  assertHomeStayDatesFreeInTx,
  checkHomeStayAvailability,
  HomeStayDatesTakenError,
} from "./checkAvailability";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

const CHECK_IN = new Date("2031-04-10T00:00:00.000Z");
const CHECK_OUT = new Date("2031-04-13T00:00:00.000Z");
const HOLD_MS = 15 * 60 * 1000;

describe.skipIf(!hasDb)("homestay availability", () => {
  const prisma = createTestPrisma();
  let listingId = "";
  let hostId = "";
  let guestId = "";
  let usable = false;

  beforeAll(async () => {
    applyTestDatabaseEnv();
    const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    try {
      await prisma.homeStayListing.findFirst();
    } catch {
      return;
    }

    const host = await prisma.user.create({
      data: {
        first_name: "HS",
        last_name: "Host",
        email: `hs_host_${stamp}@test.local`,
        phone: `+99895${stamp.slice(-7)}`,
        password: "x",
        role: "home_stay_partner",
      },
    });
    hostId = host.id;

    const guest = await prisma.user.create({
      data: {
        first_name: "HS",
        last_name: "Guest",
        email: `hs_guest_${stamp}@test.local`,
        phone: `+99896${stamp.slice(-7)}`,
        password: "x",
        role: "user",
      },
    });
    guestId = guest.id;

    const listing = await prisma.homeStayListing.create({
      data: {
        hostId: host.id,
        title: "Availability spec",
        description: "spec",
        address: "Ko'cha 1",
        city: "Samarqand",
        region: "Samarqand",
        pricePerNight: 300000,
        maxGuests: 4,
        rooms: 2,
        beds: 2,
        bathrooms: 1,
        status: "ACTIVE",
      },
    });
    listingId = listing.id;
    usable = true;
  }, 120_000);

  beforeEach(async () => {
    if (!usable) return;
    await prisma.homeStayAvailability.deleteMany({ where: { listingId } });
    await prisma.homeStayBooking.deleteMany({ where: { listingId } });
  });

  afterAll(async () => {
    if (usable) {
      await prisma.homeStayAvailability.deleteMany({ where: { listingId } });
      await prisma.homeStayBooking.deleteMany({ where: { listingId } });
      await prisma.homeStayListing.deleteMany({ where: { id: listingId } });
      await prisma.user.deleteMany({
        where: { id: { in: [hostId, guestId] } },
      });
    }
    await prisma.$disconnect();
  });

  /** Mirrors what the booking route writes: booking + its availability row. */
  async function createHold(opts: {
    status?: "PENDING" | "CONFIRMED";
    holdExpiresAt?: Date | null;
    withAvailabilityRow?: boolean;
  }) {
    const booking = await prisma.homeStayBooking.create({
      data: {
        listingId,
        guestId,
        checkIn: CHECK_IN,
        checkOut: CHECK_OUT,
        nights: 3,
        guestCount: 2,
        totalPrice: 900000,
        priceSnapshot: {},
        status: opts.status ?? "PENDING",
        holdExpiresAt:
          opts.holdExpiresAt === undefined
            ? new Date(Date.now() + HOLD_MS)
            : opts.holdExpiresAt,
      },
    });
    if (opts.withAvailabilityRow !== false) {
      await prisma.homeStayAvailability.create({
        data: {
          listingId,
          bookingId: booking.id,
          startDate: CHECK_IN,
          endDate: CHECK_OUT,
          reason: "BOOKED",
        },
      });
    }
    return booking;
  }

  it("is free when nothing occupies the dates", async () => {
    if (!usable) return;
    const res = await checkHomeStayAvailability(listingId, CHECK_IN, CHECK_OUT);
    expect(res.available).toBe(true);
  });

  it("a live PENDING hold takes the dates immediately, before any payment", async () => {
    if (!usable) return;
    await createHold({ status: "PENDING" });

    const res = await checkHomeStayAvailability(listingId, CHECK_IN, CHECK_OUT);

    expect(res.available).toBe(false);
    expect(res.conflicts.map((c) => c.reason)).toContain("BOOKING_PENDING");
  });

  it("second attempt loses the race once the first is only HELD", async () => {
    if (!usable) return;

    // Guest A reaches the payment page: booking is PENDING, nothing is paid.
    await createHold({ status: "PENDING" });

    // Guest B arrives moments later and tries to take the same nights.
    const preflight = await checkHomeStayAvailability(
      listingId,
      CHECK_IN,
      CHECK_OUT,
    );
    expect(preflight.available).toBe(false);

    await expect(
      prisma.$transaction((tx) =>
        assertHomeStayDatesFreeInTx(tx, {
          listingId,
          checkIn: CHECK_IN,
          checkOut: CHECK_OUT,
        }),
      ),
    ).rejects.toBeInstanceOf(HomeStayDatesTakenError);
  });

  it("frees the dates again once the hold lapses, without waiting for the sweep", async () => {
    if (!usable) return;
    await createHold({
      status: "PENDING",
      holdExpiresAt: new Date(Date.now() - 60_000),
    });

    const res = await checkHomeStayAvailability(listingId, CHECK_IN, CHECK_OUT);

    expect(res.available).toBe(true);
    // The booking row and its availability row are both still there — the
    // expiry worker has not run yet.
    expect(await prisma.homeStayBooking.count({ where: { listingId } })).toBe(1);
    expect(
      await prisma.homeStayAvailability.count({ where: { listingId } }),
    ).toBe(1);

    await expect(
      prisma.$transaction((tx) =>
        assertHomeStayDatesFreeInTx(tx, {
          listingId,
          checkIn: CHECK_IN,
          checkOut: CHECK_OUT,
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("keeps blocking a legacy hold that carries no deadline", async () => {
    if (!usable) return;
    await createHold({ status: "PENDING", holdExpiresAt: null });

    const res = await checkHomeStayAvailability(listingId, CHECK_IN, CHECK_OUT);
    expect(res.available).toBe(false);
  });

  it("keeps blocking after payment confirms the booking", async () => {
    if (!usable) return;
    await createHold({ status: "CONFIRMED", holdExpiresAt: null });

    const res = await checkHomeStayAvailability(listingId, CHECK_IN, CHECK_OUT);
    expect(res.available).toBe(false);
    expect(res.conflicts.map((c) => c.reason)).toContain("BOOKING_CONFIRMED");
  });

  it("a cancelled booking releases the dates", async () => {
    if (!usable) return;
    const booking = await createHold({ status: "PENDING" });
    await prisma.homeStayBooking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", holdExpiresAt: null },
    });

    const res = await checkHomeStayAvailability(listingId, CHECK_IN, CHECK_OUT);
    expect(res.available).toBe(true);
  });

  it("a manual block with no booking always applies", async () => {
    if (!usable) return;
    await prisma.homeStayAvailability.create({
      data: {
        listingId,
        startDate: CHECK_IN,
        endDate: CHECK_OUT,
        reason: "HOST_BLOCKED",
      },
    });

    const res = await checkHomeStayAvailability(listingId, CHECK_IN, CHECK_OUT);
    expect(res.available).toBe(false);
    expect(res.conflicts.map((c) => c.reason)).toContain("HOST_BLOCKED");
  });

  it("leaves neighbouring dates alone", async () => {
    if (!usable) return;
    await createHold({ status: "PENDING" });

    const after = await checkHomeStayAvailability(
      listingId,
      new Date("2031-04-13T00:00:00.000Z"),
      new Date("2031-04-15T00:00:00.000Z"),
    );
    expect(after.available).toBe(true);
  });
});
