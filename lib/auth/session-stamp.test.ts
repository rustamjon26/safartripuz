import { describe, expect, it, vi } from "vitest";
import {
  accessTokenStillValid,
  revokeRefreshTokens,
  tokenVersionBump,
  type SessionStamp,
} from "./session-stamp";

const stamp = (over: Partial<SessionStamp> = {}): SessionStamp => ({
  role: "admin",
  isBlocked: false,
  tokenVersion: 2,
  ...over,
});

describe("accessTokenStillValid", () => {
  it("accepts a token minted at the current version", () => {
    expect(accessTokenStillValid(2, stamp())).toBe(true);
  });

  it("rejects a token from before a block or role change", () => {
    expect(accessTokenStillValid(1, stamp())).toBe(false);
  });

  it("rejects a blocked account even when the version still matches", () => {
    expect(accessTokenStillValid(2, stamp({ isBlocked: true }))).toBe(false);
  });

  it("rejects a deleted account", () => {
    expect(accessTokenStillValid(0, null)).toBe(false);
  });
});

describe("password session reset", () => {
  it("bumps the token version by one", () => {
    expect(tokenVersionBump()).toEqual({ tokenVersion: { increment: 1 } });
  });

  it("revokes every live refresh token for that user", async () => {
    const updateMany = vi.fn(async () => ({ count: 2 }));
    await revokeRefreshTokens({ refreshToken: { updateMany } }, "user-1");
    expect(updateMany).toHaveBeenCalledOnce();
    expect(updateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
