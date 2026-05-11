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

  useEffect(() => {
    let cancelled = false;

    function redirectToLogin() {
      const nextPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/";
      routerRef.current.replace(loginWithNext(nextPath || "/"));
    }

    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (cancelled) return;

        if (res.status === 401) {
          setUser(null);
          redirectToLogin();
          return;
        }

        const data = (await res.json()) as { user?: CurrentUser };
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) {
          setUser(null);
          redirectToLogin();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchMe();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading };
}
