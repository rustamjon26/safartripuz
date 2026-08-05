import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { createRequestId } from "@/src/shared/observability/requestId";
import { type AppRole, isAppRole } from "@/src/shared/roles";

function getSecret() {
  const v = process.env.JWT_ACCESS_SECRET;
  if (!v) throw new Error("JWT_ACCESS_SECRET is not set");
  return new TextEncoder().encode(v);
}

/** A JWT carrying a role the platform no longer knows is treated as no session. */
async function getRoleFromAccessToken(token: string): Promise<AppRole | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return isAppRole(payload.role) ? payload.role : null;
  } catch {
    return null;
  }
}

function isPathMatch(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

function withRequestIdHeaders(req: NextRequest, requestId: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);
  return requestHeaders;
}

function attachRequestId(res: NextResponse, requestId: string): NextResponse {
  res.headers.set("x-request-id", requestId);
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = createRequestId(req.headers.get("x-request-id"));
  const requestHeaders = withRequestIdHeaders(req, requestId);

  const protectedAreas: Array<{
    prefix: string;
    allow: AppRole[];
    redirectTo: string;
    wrongRoleRedirect?: string;
  }> = [
    {
      prefix: "/admin",
      allow: ["admin", "super_admin"],
      redirectTo: "/login",
      wrongRoleRedirect: "/dashboard",
    },
    {
      prefix: "/hotel",
      allow: ["hotel_manager", "admin", "super_admin"],
      redirectTo: "/login",
    },
    {
      prefix: "/taxi-partner",
      allow: ["taxi", "taxi_partner", "admin", "super_admin"],
      redirectTo: "/login",
      wrongRoleRedirect: "/dashboard",
    },
    {
      prefix: "/guide-partner",
      allow: ["guide", "guide_partner", "admin", "super_admin"],
      redirectTo: "/login",
      wrongRoleRedirect: "/dashboard",
    },
    {
      prefix: "/support",
      allow: ["support", "admin", "super_admin"],
      redirectTo: "/login",
      wrongRoleRedirect: "/dashboard",
    },
    {
      /** Universal support inbox — hotel / homestay / taxi / guide / customer */
      prefix: "/support-chat",
      allow: [
        "user",
        "taxi",
        "taxi_partner",
        "hotel_manager",
        "home_stay_partner",
        "hotel_staff",
        "cleaner",
        "receptionist",
        "waiter",
        "guide",
        "guide_partner",
        "restaurant_manager",
        "support",
        "admin",
        "super_admin",
      ],
      redirectTo: "/login",
    },
    {
      prefix: "/staff",
      allow: [
        "cleaner",
        "receptionist",
        "waiter",
        "hotel_staff",
        "hotel_manager",
        "admin",
        "super_admin",
      ],
      redirectTo: "/login",
      wrongRoleRedirect: "/dashboard",
    },
    {
      prefix: "/homestay-partner",
      allow: ["home_stay_partner", "admin", "super_admin"],
      redirectTo: "/login",
      wrongRoleRedirect: "/dashboard",
    },
    {
      prefix: "/restaurant",
      allow: ["restaurant_manager"],
      redirectTo: "/login",
    },
    {
      prefix: "/user",
      allow: ["user", "admin", "super_admin"],
      redirectTo: "/login",
    },
  ];

  const area = protectedAreas.find((a) => isPathMatch(pathname, a.prefix));
  if (!area) {
    return attachRequestId(
      NextResponse.next({ request: { headers: requestHeaders } }),
      requestId,
    );
  }

  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = area.redirectTo;
    url.searchParams.set("next", pathname);
    return attachRequestId(NextResponse.redirect(url), requestId);
  }

  const role = await getRoleFromAccessToken(token);

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = area.redirectTo;
    url.searchParams.set("next", pathname);
    return attachRequestId(NextResponse.redirect(url), requestId);
  }

  if (!area.allow.includes(role)) {
    if (area.wrongRoleRedirect) {
      return attachRequestId(
        NextResponse.redirect(new URL(area.wrongRoleRedirect, req.url)),
        requestId,
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = area.redirectTo;
    return attachRequestId(NextResponse.redirect(url), requestId);
  }

  return attachRequestId(
    NextResponse.next({ request: { headers: requestHeaders } }),
    requestId,
  );
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/hotel/:path*",
    "/taxi-partner/:path*",
    "/guide-partner/:path*",
    "/support/:path*",
    "/support-chat",
    "/support-chat/:path*",
    "/staff/:path*",
    "/homestay-partner/:path*",
    "/restaurant/:path*",
    "/user",
    "/user/:path*",
    "/api/payments/:path*",
    "/api/payme",
    "/api/payme/:path*",
    "/api/hotels/:path*",
    "/api/user/hotel-bookings/:path*",
    "/api/cron/:path*",
  ],
};
