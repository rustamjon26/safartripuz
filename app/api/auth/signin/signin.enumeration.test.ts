/**
 * A login endpoint must not tell an attacker which emails exist — not through
 * the response, and not through how long it takes to answer.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const findUnique = vi.hoisted(() =>
  vi.fn(async (_args: unknown): Promise<unknown> => null),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique },
    refreshToken: { create: vi.fn(async () => ({})) },
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: () => true,
}));

import { POST } from "./route";

const KNOWN_EMAIL = "known@test.local";
const REAL_PASSWORD = "correct horse battery staple";
let realHash = "";

function signinRequest(email: string, password: string) {
  return new Request("https://safartrip.uz/api/auth/signin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    // NextRequest is a Request subclass; the handler only reads headers/json.
  }) as unknown as Parameters<typeof POST>[0];
}

async function attempt(
  email: string,
  password: string,
): Promise<{ status: number; body: unknown; ms: number }> {
  const started = performance.now();
  const res = await POST(signinRequest(email, password));
  const body = await res.json();
  return { status: res.status, body, ms: performance.now() - started };
}

function existingUser(over: Record<string, unknown> = {}) {
  return {
    id: "u1",
    first_name: "K",
    last_name: "Nown",
    email: KNOWN_EMAIL,
    phone: "+998900000000",
    password: realHash,
    role: "user",
    isBlocked: false,
    ...over,
  };
}

beforeAll(async () => {
  // Same cost factor registration uses.
  realHash = await bcrypt.hash(REAL_PASSWORD, 12);
}, 60_000);

beforeEach(() => {
  findUnique.mockReset();
});

describe("signin failures are indistinguishable", () => {
  it("returns the same status and body for unknown email and wrong password", async () => {
    findUnique.mockResolvedValueOnce(null);
    const unknownEmail = await attempt("nobody@test.local", "whatever");

    findUnique.mockResolvedValueOnce(existingUser());
    const wrongPassword = await attempt(KNOWN_EMAIL, "not-the-password");

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    // And the wording gives nothing away.
    expect(JSON.stringify(unknownEmail.body)).not.toMatch(/topilmadi|not found/i);
  });

  it("treats a Google-only account (empty password hash) the same way", async () => {
    findUnique.mockResolvedValueOnce(existingUser({ password: "" }));
    const noPasswordSet = await attempt(KNOWN_EMAIL, "anything");

    findUnique.mockResolvedValueOnce(null);
    const unknownEmail = await attempt("nobody@test.local", "anything");

    expect(noPasswordSet.status).toBe(401);
    expect(noPasswordSet.body).toEqual(unknownEmail.body);
  });

  it("still lets the real credentials through", async () => {
    findUnique.mockResolvedValueOnce(existingUser());
    const ok = await attempt(KNOWN_EMAIL, REAL_PASSWORD);
    expect(ok.status).toBe(200);
  });

  it("only reveals a block to someone who has the password", async () => {
    findUnique.mockResolvedValueOnce(existingUser({ isBlocked: true }));
    const wrongPassword = await attempt(KNOWN_EMAIL, "not-the-password");
    expect(wrongPassword.status).toBe(401);
    expect(JSON.stringify(wrongPassword.body)).not.toMatch(/blok/i);

    findUnique.mockResolvedValueOnce(existingUser({ isBlocked: true }));
    const rightPassword = await attempt(KNOWN_EMAIL, REAL_PASSWORD);
    expect(rightPassword.status).toBe(403);
  });
});

describe("signin failures take comparable time", () => {
  it("unknown email is not an order of magnitude faster than a wrong password", async () => {
    const ROUNDS = 3;
    const unknown: number[] = [];
    const wrong: number[] = [];

    for (let i = 0; i < ROUNDS; i++) {
      findUnique.mockResolvedValueOnce(null);
      unknown.push((await attempt("nobody@test.local", "whatever")).ms);

      findUnique.mockResolvedValueOnce(existingUser());
      wrong.push((await attempt(KNOWN_EMAIL, "not-the-password")).ms);
    }

    const median = (xs: number[]) =>
      [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    const a = median(unknown);
    const b = median(wrong);

    // Both must actually run bcrypt; a short-circuit would be near-instant.
    expect(a).toBeGreaterThan(10);
    expect(b).toBeGreaterThan(10);

    const ratio = Math.max(a, b) / Math.min(a, b);
    expect(ratio).toBeLessThan(10);
  }, 60_000);
});
