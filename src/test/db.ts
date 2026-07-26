/**
 * Test DB helpers — use TEST_DATABASE_URL only; never touch production DATABASE_URL.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

export function requireTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is required for integration tests. See .env.test.example",
    );
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === url) {
    // Allow only when explicitly the same test URL was copied into DATABASE_URL for prisma.
  }
  return url;
}

/** Point Prisma at the test DB for this process. */
export function applyTestDatabaseEnv(): string {
  const url = requireTestDatabaseUrl();
  process.env.DATABASE_URL = url;
  return url;
}

/**
 * Reset schema against TEST_DATABASE_URL via migrate deploy (CI) or db push (local speed).
 * Prefer migrate in CI (RESET_TEST_DB_MODE=migrate).
 */
export function resetTestDb(mode?: "migrate" | "push"): void {
  const url = applyTestDatabaseEnv();
  const resolved =
    mode ??
    (process.env.RESET_TEST_DB_MODE === "push" ? "push" : "migrate");
  if (resolved === "push") {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
  } else {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
  }
}

export function createTestPrisma(): PrismaClient {
  applyTestDatabaseEnv();
  return new PrismaClient();
}

/**
 * Minimal hotel + room type + one physical room + inventory nights for concurrency tests.
 */
export async function seedMinimal(prisma: PrismaClient): Promise<{
  userId: string;
  partnerId: string;
  hotelId: string;
  roomTypeId: string;
}> {
  const suffix = `seed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      first_name: "Test",
      last_name: "Partner",
      email: `${suffix}@test.local`,
      phone: `+99890${String(Date.now()).slice(-7)}`,
      password: "x",
      role: "hotel_manager",
    },
  });

  const partner = await prisma.partner.create({
    data: {
      userId: user.id,
      type: "hotel",
      status: "approved",
      displayName: "Test Hotel Partner",
    },
  });

  const hotel = await prisma.hotel.create({
    data: {
      partnerId: partner.id,
      status: "active",
      name: "Test Hotel",
      totalRooms: 1,
    },
  });

  const roomType = await prisma.roomType.create({
    data: {
      hotelId: hotel.id,
      name: "Single",
      basePrice: 100000,
      capacityAdults: 2,
    },
  });

  await prisma.physicalRoom.create({
    data: {
      hotelId: hotel.id,
      roomTypeId: roomType.id,
      roomNumber: `T-${suffix.slice(-4)}`,
      isActive: true,
    },
  });

  return {
    userId: user.id,
    partnerId: partner.id,
    hotelId: hotel.id,
    roomTypeId: roomType.id,
  };
}
