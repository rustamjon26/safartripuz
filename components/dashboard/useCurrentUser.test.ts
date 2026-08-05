/**
 * A network failure used to run the same branch as a 401: clear the user and
 * replace the route with /login. Losing wifi for a moment therefore signed the
 * user out and lost their place.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { meOutcomeFor } from "./useCurrentUser";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("meOutcomeFor", () => {
  it("treats only a 401 as a logout", () => {
    expect(meOutcomeFor(401)).toBe("unauthenticated");
  });

  it("treats a thrown fetch as unreachable, not a logout", () => {
    expect(meOutcomeFor(null)).toBe("unreachable");
  });

  it("treats server errors as unreachable, not a logout", () => {
    for (const status of [500, 502, 503, 504]) {
      expect(meOutcomeFor(status), `status ${status}`).toBe("unreachable");
    }
  });

  it("accepts any 2xx as authenticated", () => {
    for (const status of [200, 204, 299]) {
      expect(meOutcomeFor(status), `status ${status}`).toBe("authenticated");
    }
  });

  it("does not sign the user out on other 4xx responses", () => {
    for (const status of [400, 403, 404, 429]) {
      expect(meOutcomeFor(status), `status ${status}`).not.toBe("unauthenticated");
    }
  });
});

describe("useCurrentUser wiring", () => {
  const source = readFileSync(path.join(here, "useCurrentUser.ts"), "utf8");

  it("redirects to /login only on the unauthenticated branch", () => {
    expect([...source.matchAll(/loginWithNext\(/g)]).toHaveLength(1);

    const unauth = source.indexOf('case "unauthenticated":');
    const unreachable = source.indexOf('case "unreachable":');
    const call = source.indexOf("routerRef.current.replace(loginWithNext(");
    expect(call).toBeGreaterThan(unauth);
    expect(call).toBeLessThan(unreachable);
  });

  it("exposes the connection failure so callers can offer a retry", () => {
    expect(source).toContain("networkError");
    expect(source).toContain("retry:");
  });

  it("does not clear the user when the server is unreachable", () => {
    const start = source.indexOf('case "unreachable":');
    const end = source.indexOf('case "authenticated":');
    expect(source.slice(start, end)).not.toContain("setUser(null)");
  });
});

describe("DashboardShell", () => {
  const source = readFileSync(path.join(here, "DashboardShell.tsx"), "utf8");

  it("shows a retry state rather than assuming a logout", () => {
    expect(source).toContain("networkError");
    expect(source).toContain("Qayta urinish");
  });
});
