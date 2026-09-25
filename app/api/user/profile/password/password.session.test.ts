import { beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.hoisted(() => vi.fn(async () => ({})));
const updateMany = vi.hoisted(() => vi.fn(async () => ({ count: 1 })));
const findUnique = vi.hoisted(() =>
  vi.fn(async () => ({ password: "existing-hash" })),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique, update },
    refreshToken: { updateMany },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: { update },
        refreshToken: { updateMany },
      }),
  },
}));

vi.mock("@/lib/authz", () => ({
  requireUser: async () => ({ id: "user-1", role: "user" }),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: async () => true,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: async () => true,
    hash: async () => "new-hash",
  },
}));

import { PATCH } from "./route";

describe("PATCH /api/user/profile/password", () => {
  beforeEach(() => {
    update.mockClear();
    updateMany.mockClear();
  });

  it("bumps tokenVersion, revokes refresh tokens, and clears cookies", async () => {
    const res = await PATCH(
      new Request("https://safartrip.uz/api/user/profile/password", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "old-password",
          newPassword: "new-password-1",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "new-hash", tokenVersion: { increment: 1 } },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(res.cookies.get("access_token")?.value).toBe("");
    expect(res.cookies.get("refresh_token")?.value).toBe("");
  });
});
