/**
 * Refresh is the choke point for blocked / demoted sessions: the Edge middleware
 * only sees JWT claims, so this endpoint is what stops a blocked user from
 * renewing access forever. Requires TEST_DATABASE_URL.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { applyTestDatabaseEnv, createTestPrisma } from "@/src/test/db";

const refreshCookie = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "refresh_token" && refreshCookie.value !== undefined
        ? { name, value: refreshCookie.value }
        : undefined,
  }),
}));

import { hashToken, signRefreshToken, verifyAccessToken } from "@/lib/auth";
import { POST } from "./route";

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)("POST /api/auth/refresh", () => {
  const prisma = createTestPrisma();
  const suffix = `refresh_${Date.now()}`;
  let userId = "";

  /** Fresh refresh token + DB row, and point the mocked cookie jar at it. */
  async function issueRefreshToken(): Promise<string> {
    const token = await signRefreshToken({ sub: userId });
    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    refreshCookie.value = token;
    return token;
  }

  beforeAll(async () => {
    applyTestDatabaseEnv();
    process.env.JWT_ACCESS_SECRET ??= "test_access_secret_for_refresh_specs";
    process.env.JWT_REFRESH_SECRET ??= "test_refresh_secret_for_refresh_specs";

    try {
      await prisma.user.findFirst();
    } catch {
      return;
    }

    const user = await prisma.user.create({
      data: {
        first_name: "Refresh",
        last_name: "Spec",
        email: `${suffix}@test.local`,
        phone: `+99893${String(Date.now()).slice(-7)}`,
        password: "x",
        role: "user",
      },
    });
    userId = user.id;
  }, 120_000);

  afterAll(async () => {
    if (userId) {
      await prisma.refreshToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("refuses to mint an access token for a user blocked mid-session", async () => {
    if (!userId) return;
    await issueRefreshToken();
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });

    const res = await POST();

    expect(res.status).toBe(401);
    // Cleared, not reissued — an empty cookie the browser drops.
    expect(res.cookies.get("access_token")?.value).toBe("");
    expect(res.cookies.get("refresh_token")?.value).toBe("");
  });

  it("carries the current DB role, not the role from before the change", async () => {
    if (!userId) return;
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false, role: "user" },
    });
    await issueRefreshToken();

    // Admin promotes the account after the session started.
    await prisma.user.update({
      where: { id: userId },
      data: { role: "hotel_manager" },
    });

    const res = await POST();
    expect(res.status).toBe(200);

    const issued = res.cookies.get("access_token")?.value;
    expect(issued).toBeTruthy();
    const claims = await verifyAccessToken(issued as string);
    expect(claims.sub).toBe(userId);
    expect(claims.role).toBe("hotel_manager");
  });

  it("rejects a refresh token that was already rotated away", async () => {
    if (!userId) return;
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
    });
    const token = await issueRefreshToken();
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { revokedAt: new Date() },
    });

    const res = await POST();

    expect(res.status).toBe(401);
    expect(res.cookies.get("access_token")?.value).toBe("");
  });

  it("rejects a request with no refresh cookie", async () => {
    if (!userId) return;
    refreshCookie.value = undefined;

    const res = await POST();

    expect(res.status).toBe(401);
    expect(res.cookies.get("refresh_token")?.value).toBe("");
  });
});
