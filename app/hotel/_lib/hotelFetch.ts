/**
 * Hotel panel fetch: cookies + one 401 → refresh → retry.
 * Access JWT is 15m; without this, long-open tabs fail with Unauthorized.
 */

/**
 * POST /api/auth/refresh rotates the refresh token and revokes the old one, so
 * two tabs-worth of concurrent 401s would race: the second request presents an
 * already-revoked token, the route answers 401 and clears BOTH cookies, and the
 * user is logged out mid-session. Every caller shares one refresh instead.
 *
 * Module-scoped rather than per-call because pages fire several requests in
 * parallel (`Promise.all([...])`), which is exactly the racing case.
 */
let inFlightRefresh: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        return res.ok;
      } catch {
        // Network failure is not an expired session — let the caller keep its
        // original response rather than treating this as a logout.
        return false;
      } finally {
        // Callers already hold the promise, so clearing here only affects the
        // next 401 and keeps a failed refresh from being cached forever.
        inFlightRefresh = null;
      }
    })();
  }
  return inFlightRefresh;
}

/** Test seam — resets the shared refresh so cases do not leak into each other. */
export function resetRefreshStateForTests(): void {
  inFlightRefresh = null;
}

export async function hotelFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const opts: RequestInit = {
    ...init,
    credentials: "include",
  };

  const first = await fetch(input, opts);
  if (first.status !== 401) return first;

  const refreshed = await refreshSession();
  if (!refreshed) return first;

  // Retried once only: a second 401 after a successful refresh is a real
  // authorization failure, not an expired token.
  return fetch(input, opts);
}

export function hotelApiErrorMessage(
  status: number,
  error?: string,
): string {
  if (
    status === 401 ||
    error === "Unauthorized" ||
    error === "Seans muddati tugagan. Qayta kiring."
  ) {
    return "Seans muddati tugagan. Qayta kiring.";
  }
  if (
    status === 403 ||
    error === "Forbidden" ||
    error === "Bu amal uchun ruxsat yo'q."
  ) {
    return "Bu amal uchun ruxsat yo'q.";
  }
  return error?.trim() || "Xatolik yuz berdi";
}
