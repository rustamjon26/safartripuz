/**
 * `guide_partner` end to end: the DB column accepts it, middleware lets it into
 * /guide-partner, and the guide partner API resolves it to a partner context.
 * Requires TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { applyTestDatabaseEnv, createTestPrisma } from "@/src/test/db";

const accessToken = { value: "" };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "access_token" && accessToken.value
        ? { name, value: accessToken.value }
        : undefined,
  }),
  headers: async () => new Headers(),
}));

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("guide_partner role", () => {
  const prisma = createTestPrisma();
  const suffix = `gp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  let ready = false;
  let userId = "";

  beforeAll(async () => {
    applyTestDatabaseEnv();
    process.env.JWT_ACCESS_SECRET ??= "test_access_secret";
    try {
      await prisma.user.findFirst();
    } catch {
      return;
    }

    const user = await prisma.user.create({
      data: {
        first_name: "Gulnora",
        last_name: "Guide",
        email: `${suffix}@test.local`,
        phone: `+9989${String(Date.now()).slice(-8)}`,
        password: "x",
        // The point of the migration: this value could not be stored before.
        role: "guide_partner",
      },
    });
    userId = user.id;

    const { signAccessToken } = await import("@/lib/auth");
    accessToken.value = await signAccessToken({
      sub: user.id,
      role: "guide_partner",
    });
    ready = true;
  }, 120_000);

  afterAll(async () => {
    if (ready) {
      await prisma.partner.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("stores guide_partner as a real Role enum value", async () => {
    if (!ready) return;
    const row = await prisma.user.findUnique({ where: { id: userId } });
    expect(row?.role).toBe("guide_partner");
  });

  it("lets the guide partner API resolve a partner context", async () => {
    if (!ready) return;
    const { requireGuidePartner } = await import("./_utils");
    const actor = await requireGuidePartner();
    expect(actor.id).toBe(userId);
    expect(actor.partnerId).toBeTruthy();

    const partner = await prisma.partner.findUnique({ where: { userId } });
    expect(partner?.type).toBe("guide");
    expect(partner?.status).toBe("approved");
  });

  it("lets middleware through to /guide-partner", async () => {
    if (!ready) return;
    const { middleware } = await import("@/middleware");
    const req = new NextRequest("https://safartrip.uz/guide-partner/dashboard");
    req.cookies.set("access_token", accessToken.value);

    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("rejects a token carrying a role the platform does not know", async () => {
    if (!ready) return;
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
    const bogus = await new SignJWT({ role: "guide_partner_v2" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(secret);

    const { middleware } = await import("@/middleware");
    const req = new NextRequest("https://safartrip.uz/guide-partner/dashboard");
    req.cookies.set("access_token", bogus);

    const res = await middleware(req);
    expect(res.headers.get("location")).toContain("/login");
  });
});
