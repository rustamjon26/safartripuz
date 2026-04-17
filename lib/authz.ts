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

export async function requireUser(): Promise<{
  id: string;
  role: AppRole;
}> {
  const token = await resolveAccessToken();
  if (!token) throw new Error("UNAUTHORIZED");
  const { sub, role } = await verifyAccessToken(token);
  return { id: sub, role };
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

