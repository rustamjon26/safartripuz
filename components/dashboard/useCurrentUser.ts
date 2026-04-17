"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = (await res.json()) as { user?: CurrentUser };
        setUser(data.user ?? null);
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    void fetchMe();
  }, [router]);

  return { user, loading };
}
