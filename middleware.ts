import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/** JWT ichidagi `role` — to'liq ro'yxat `lib/auth.ts` dagi AppRole bilan mos kelishi kerak */
type Role = string;

function getSecret() {
  const v = process.env.JWT_ACCESS_SECRET;
  if (!v) throw new Error("JWT_ACCESS_SECRET is not set");
  return new TextEncoder().encode(v);
}

async function getRoleFromAccessToken(token: string): Promise<Role | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role = payload.role;
    if (typeof role !== "string") return null;
    return role;
  } catch {
    return null;
  }
}

function isPathMatch(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedAreas: Array<{
    prefix: string;
    allow: Role[];
    redirectTo: string;
  }> = [
    { prefix: "/admin", allow: ["admin", "super_admin"], redirectTo: "/login" },
    {
      prefix: "/hotel",
      allow: ["hotel_manager", "admin", "super_admin"],
      redirectTo: "/login",
    },
    { prefix: "/taxi", allow: ["taxi"], redirectTo: "/login" },
    { prefix: "/guide", allow: ["guide"], redirectTo: "/login" },
    {
      prefix: "/restaurant",
      allow: ["restaurant_manager"],
      redirectTo: "/login",
    },
    { prefix: "/user", allow: ["user", "admin", "super_admin"], redirectTo: "/login" },
  ];

  const area = protectedAreas.find((a) => isPathMatch(pathname, a.prefix));
  if (!area) return NextResponse.next();

  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = area.redirectTo;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const role = await getRoleFromAccessToken(token);

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = area.redirectTo;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!area.allow.includes(role)) {
    if (area.prefix === "/admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const url = req.nextUrl.clone();
    url.pathname = area.redirectTo;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/hotel/:path*",
    "/taxi/:path*",
    "/guide/:path*",
    "/restaurant/:path*",
    "/user",
    "/user/:path*",
  ],
};
