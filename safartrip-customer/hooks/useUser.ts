import { useCallback, useEffect, useState } from "react";
import { api, AuthRedirectError } from "@/lib/api";
import { saveUser } from "@/lib/storage";

export type MeUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  hotelStaff?: { role: string }[];
};

export type UserStats = {
  travelPlans: number;
  bookings: number;
  totalSpent: number;
};

type MeResponse = {
  user: MeUser;
  pendingBookingsCount?: number;
  stats?: UserStats;
};

export function useUser() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [stats, setStats] = useState<UserStats | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = (await api.get("/api/user/me")) as MeResponse;
      setUser(data.user);
      setPendingBookingsCount(Number(data.pendingBookingsCount ?? 0));
      setStats(
        data.stats ?? {
          travelPlans: 0,
          bookings: 0,
          totalSpent: 0,
        },
      );
      await saveUser(data.user);
    } catch (e) {
      if (e instanceof AuthRedirectError) {
        setUser(null);
        setPendingBookingsCount(0);
        setStats(null);
        setError(null);
      } else {
        const msg = e instanceof Error ? e.message : "Xato";
        setError(msg);
        setUser(null);
        setPendingBookingsCount(0);
        setStats(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { user, isLoading, error, refetch, pendingBookingsCount, stats };
}
