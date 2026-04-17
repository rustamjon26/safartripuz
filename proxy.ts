import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

type Role =
  | "super_admin"
  | "admin"
  | "user"
  | "taxi"
  | "hotel_manager"
  | "guide"
  | "restaurant_manager";

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
    return role as Role;
  } catch {
    return null;
  }
}

function isPathMatch(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const protectedAreas: Array<{
    prefix: string;
    allow: Role[];
    redirectTo: string;
  }> = [
    { prefix: "/admin", allow: ["admin", "super_admin"], redirectTo: "/login" },
    { prefix: "/hotel", allow: ["hotel_manager", "admin", "super_admin"], redirectTo: "/login" },
    { prefix: "/taxi", allow: ["taxi"], redirectTo: "/login" },
    { prefix: "/guide", allow: ["guide"], redirectTo: "/login" },
    { prefix: "/restaurant", allow: ["restaurant_manager"], redirectTo: "/login" },
  ];

  const area = protectedAreas.find((a) => isPathMatch(pathname, a.prefix));
  if (!area) return NextResponse.next();

  const token = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  // Case 1: No Access Token
  if (!token) {
    // If we have a refresh token, maybe we can let the request through to the client 
    // where it will call /api/auth/refresh? 
    // No, for HTML documents (SSR), we should probably redirect to login or a refresh page.
    // For now, redirect to login with 'next' param.
    const url = req.nextUrl.clone();
    url.pathname = area.redirectTo;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Case 2: Verify Token & Role
  const role = await getRoleFromAccessToken(token);
  
  if (!role || !area.allow.includes(role)) {
    // If token is invalid/expired but refresh exists, 
    // some systems might try to auto-refresh here, but Edge runtime limitations 
    // make internal API calls tricky. 
    // We'll redirect to login which can handle the state.
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
  ],
};
