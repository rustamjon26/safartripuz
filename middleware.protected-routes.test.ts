/**
 * /bookings, /profile and /trip-builder used to render for anyone: they were
 * absent from the middleware matcher, so a signed-out visitor got the page and
 * only the client-side check bounced them — after the content had painted.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";
import { middleware, config } from "./middleware";

const CUSTOMER_ROUTES = ["/bookings", "/profile", "/trip-builder"] as const;

function request(pathname: string, token?: string): NextRequest {
  const req = new NextRequest(`https://safartrip.uz${pathname}`);
  if (token) req.cookies.set("access_token", token);
  return req;
}

async function signAccess(role: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user_1")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

describe("middleware customer route protection", () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET ??= "test_access_secret_for_middleware";
  });

  for (const route of CUSTOMER_ROUTES) {
    describe(route, () => {
      it("is covered by the matcher", () => {
        expect(config.matcher).toContain(route);
        expect(config.matcher).toContain(`${route}/:path*`);
      });

      it("redirects an anonymous visitor to /login with a next param", async () => {
        const res = await middleware(request(route));
        const location = res.headers.get("location");
        expect(location).toBeTruthy();
        const url = new URL(location!);
        expect(url.pathname).toBe("/login");
        expect(url.searchParams.get("next")).toBe(route);
      });

      it("redirects a forged or expired token instead of rendering", async () => {
        const res = await middleware(request(route, "not-a-jwt"));
        expect(res.headers.get("location")).toContain("/login");
      });

      it("lets any signed-in role through", async () => {
        for (const role of ["user", "hotel_manager", "guide", "support"]) {
          const res = await middleware(request(route, await signAccess(role)));
          expect(res.headers.get("location"), `${role} on ${route}`).toBeNull();
          expect(res.status).toBe(200);
        }
      });

      it("also protects nested paths", async () => {
        const res = await middleware(request(`${route}/abc123`));
        expect(res.headers.get("location")).toContain("/login");
      });
    });
  }

  it("still enforces role-restricted areas", async () => {
    const customer = await signAccess("user");
    const res = await middleware(request("/admin", customer));
    expect(res.headers.get("location")).toContain("/dashboard");

    const admin = await signAccess("admin");
    expect((await middleware(request("/admin", admin))).status).toBe(200);
  });

  it("leaves public routes untouched", async () => {
    const res = await middleware(request("/"));
    expect(res.headers.get("location")).toBeNull();
  });
});
