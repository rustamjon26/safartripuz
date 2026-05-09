import { createHash } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export type AppRole =
  | "super_admin"
  | "admin"
  | "user"
  | "taxi"
  | "taxi_partner"
  | "hotel_manager"
  | "home_stay_partner"
  | "hotel_staff"
  | "cleaner"
  | "receptionist"
  | "waiter"
  | "guide"
  | "guide_partner"
  | "restaurant_manager";

export type AuthUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: AppRole;
};

function getSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET") {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return new TextEncoder().encode(v);
}

export async function signAccessToken(payload: {
  sub: string;
  role: AppRole;
}) {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecret("JWT_ACCESS_SECRET"));
}

export async function signRefreshToken(payload: { sub: string }) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret("JWT_REFRESH_SECRET"));
}

export async function verifyAccessToken(token: string): Promise<{
  sub: string;
  role: AppRole;
}> {
  const { payload } = await jwtVerify(token, getSecret("JWT_ACCESS_SECRET"));
  const role = payload.role;
  if (typeof payload.sub !== "string") throw new Error("Invalid token subject");
  if (typeof role !== "string") throw new Error("Invalid token role");
  return { sub: payload.sub, role: role as AppRole };
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getSecret("JWT_REFRESH_SECRET"));
  if (typeof payload.sub !== "string") throw new Error("Invalid token subject");
  return { sub: payload.sub };
}

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

