import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";

function getSecret() {
  const v = process.env.JWT_ACCESS_SECRET;
  if (!v) throw new Error("JWT_ACCESS_SECRET is not set");
  return new TextEncoder().encode(v);
}

const ROLE_HOME: Record<string, string> = {
  super_admin: "/admin",
  admin: "/admin",
  hotel_manager: "/hotel",
  home_stay_partner: "/homestay-partner",
  guide: "/guide-partner",
  guide_partner: "/guide-partner",
  taxi: "/taxi-partner",
  taxi_partner: "/taxi-partner",
  restaurant_manager: "/restaurant",
  user: "/",
};

export default async function DashboardRedirectPage() {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) redirect("/login");

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = typeof payload.role === "string" ? payload.role : null;
    redirect(role ? (ROLE_HOME[role] ?? "/") : "/");
  } catch {
    redirect("/login");
  }
}
