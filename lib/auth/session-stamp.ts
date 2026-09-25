import { prisma } from "@/lib/prisma";
import { type AppRole, isAppRole } from "@/src/shared/roles";

export type SessionStamp = {
  role: AppRole;
  isBlocked: boolean;
  tokenVersion: number;
};

/** Spread into a User update that changes `role`, `isBlocked`, or password. */
export function tokenVersionBump(): { tokenVersion: { increment: number } } {
  return { tokenVersion: { increment: 1 } };
}

type RefreshRevoker = {
  refreshToken: {
    updateMany(args: {
      where: { userId: string; revokedAt: null };
      data: { revokedAt: Date };
    }): Promise<unknown>;
  };
};

/** Kill every refresh session. Pair with `tokenVersionBump` on the user row. */
export async function revokeRefreshTokens(
  db: RefreshRevoker,
  userId: string,
): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** A missing user, a block, or a bumped version invalidates the access token. */
export function accessTokenStillValid(
  tokenVersion: number,
  stamp: SessionStamp | null,
): stamp is SessionStamp {
  return (
    stamp !== null && !stamp.isBlocked && stamp.tokenVersion === tokenVersion
  );
}

export async function readUserSessionStamp(
  userId: string,
): Promise<SessionStamp | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isBlocked: true, tokenVersion: true },
  });
  if (!row || !isAppRole(row.role)) return null;
  return {
    role: row.role,
    isBlocked: row.isBlocked,
    tokenVersion: row.tokenVersion,
  };
}
