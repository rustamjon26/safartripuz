"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithNext } from "@/lib/authLinks";

export type CurrentUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
};

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}` || "/";
}

export type MeOutcome = "authenticated" | "unauthenticated" | "unreachable";

/**
 * What a /api/auth/me attempt means. `status` is null when the request threw,
 * i.e. the server was never reached.
 *
 * Only a 401 is a logout: the server answered and said this session is not
 * valid. A thrown fetch or a 5xx says nothing about the session, and treating
 * those as a logout is what turned a flaky connection into a forced sign-out.
 */
export function meOutcomeFor(status: number | null): MeOutcome {
  if (status === null) return "unreachable";
  if (status === 401) return "unauthenticated";
  if (status >= 200 && status < 300) return "authenticated";
  return "unreachable";
}

export function useCurrentUser() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * Set when /api/auth/me could not be reached at all. Distinct from `user ===
   * null`, which means the server answered and said "not signed in": a dropped
   * connection previously cleared the session and redirected to /login, so
   * losing wifi for a second looked exactly like being logged out.
   */
  const [networkError, setNetworkError] = useState(false);

  const fetchMe = useCallback(
    async (opts?: { redirectOn401?: boolean }): Promise<CurrentUser | null> => {
      const redirectOn401 = opts?.redirectOn401 !== false;

      let res: Response | null = null;
      try {
        res = await fetch("/api/auth/me", { credentials: "include" });
      } catch {
        res = null;
      }

      switch (meOutcomeFor(res?.status ?? null)) {
        case "unauthenticated":
          setNetworkError(false);
          setUser(null);
          if (redirectOn401) {
            routerRef.current.replace(loginWithNext(currentPath()));
          }
          return null;

        case "unreachable":
          // Keep whatever user we already have; the session is not known to be over.
          setNetworkError(true);
          return null;

        case "authenticated": {
          setNetworkError(false);
          const data = (await res!.json().catch(() => ({}))) as {
            user?: CurrentUser;
          };
          const next = data.user ?? null;
          setUser(next);
          return next;
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await fetchMe();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMe]);

  return {
    user,
    loading,
    /** True when the last attempt failed to reach the server. */
    networkError,
    setUser,
    retry: () => fetchMe(),
    refetch: () => fetchMe({ redirectOn401: false }),
  };
}
