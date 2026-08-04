"use client";

import { useEffect, useRef, useState } from "react";
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

export function useCurrentUser() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchMe(opts?: { redirectOn401?: boolean }) {
    const redirectOn401 = opts?.redirectOn401 !== false;
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) {
        setUser(null);
        if (redirectOn401) {
          const nextPath =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/";
          routerRef.current.replace(loginWithNext(nextPath || "/"));
        }
        return null;
      }
      const data = (await res.json()) as { user?: CurrentUser };
      const next = data.user ?? null;
      setUser(next);
      return next;
    } catch {
      setUser(null);
      if (redirectOn401) {
        const nextPath =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/";
        routerRef.current.replace(loginWithNext(nextPath || "/"));
      }
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (cancelled) return;
        if (res.status === 401) {
          setUser(null);
          const nextPath =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/";
          routerRef.current.replace(loginWithNext(nextPath || "/"));
          return;
        }
        const data = (await res.json()) as { user?: CurrentUser };
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) {
          setUser(null);
          const nextPath =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/";
          routerRef.current.replace(loginWithNext(nextPath || "/"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    user,
    loading,
    setUser,
    refetch: () => fetchMe({ redirectOn401: false }),
  };
}
