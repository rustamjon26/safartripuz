import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAccessToken, type AppRole } from "@/lib/auth";

async function resolveAccessToken() {
  const cookieToken = (await cookies()).get("access_token")?.value;
  if (cookieToken) return cookieToken;
  const authHeader = (await headers()).get("authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/**
 * Resolve the current actor from the request.
 *
 * The role is read **from the database**, not from the JWT payload, so that
 * admin-driven role changes take effect on the user's very next API call
 * (without waiting for token refresh). The same query also enforces
 * `isBlocked` — a blocked user is rejected as Unauthorized immediately.
 *
 * Adds one indexed lookup per protected request, which is the right trade-off
 * for an app where role/block changes must be authoritative across all
 * sessions.
 */
export async function requireUser(): Promise<{
  id: string;
  role: AppRole;
}> {
  const token = await resolveAccessToken();
  if (!token) throw new Error("UNAUTHORIZED");
  const { sub } = await verifyAccessToken(token);

  const u = await prisma.user.findUnique({
    where: { id: sub },
    select: { id: true, role: true, isBlocked: true },
  });
  if (!u || u.isBlocked) throw new Error("UNAUTHORIZED");
  return { id: u.id, role: u.role as AppRole };
}

/** Like `requireUser` but loads profile fields needed for guest matching / display. */
export async function requireUserWithProfile(): Promise<{
  id: string;
  role: AppRole;
  first_name: string;
  last_name: string | null;
  phone: string | null;
}> {
  const token = await resolveAccessToken();
  if (!token) throw new Error("UNAUTHORIZED");
  const { sub } = await verifyAccessToken(token);

  const u = await prisma.user.findUnique({
    where: { id: sub },
    select: {
      id: true,
      role: true,
      isBlocked: true,
      first_name: true,
      last_name: true,
      phone: true,
    },
  });
  if (!u || u.isBlocked) throw new Error("UNAUTHORIZED");
  return {
    id: u.id,
    role: u.role as AppRole,
    first_name: u.first_name,
    last_name: u.last_name,
    phone: u.phone,
  };
}

export async function requireRole(allowed: AppRole[]) {
  const { id, role } = await requireUser();
  if (!allowed.includes(role)) throw new Error("FORBIDDEN");
  return { id, role };
}

export async function getActorSnapshot(actorId: string) {
  return prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, email: true, role: true, first_name: true, last_name: true },
  });
}

