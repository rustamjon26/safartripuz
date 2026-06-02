import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type DriverProfile = {
  isOnline?: boolean;
  totalTrips?: number;
  rating?: number;
  licenseNumber?: string;
  licenseExpiry?: string;
  isVerified?: boolean;
};

type Vehicle = {
  id: string;
  make?: string;
  model?: string;
  plateNumber?: string;
  category?: string;
  isActive?: boolean;
};

type DriverUser = {
  name?: string;
  email?: string;
  phone?: string;
};

type DriverResponse = {
  id?: string;
  onboarding?: boolean;
  todayTrips?: number;
  todayEarnings?: number;
  driverProfile?: DriverProfile;
  user?: DriverUser;
  vehicles?: Vehicle[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProfile(payload: any): DriverResponse | null {
  const raw = payload?.data ?? payload ?? null;
  if (!raw) return null;
  return raw as DriverResponse;
}

export function useDriver() {
  const [profile, setProfile] = useState<DriverResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnline = useMemo(
    () => Boolean(profile?.driverProfile?.isOnline),
    [profile?.driverProfile?.isOnline],
  );

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/taxi/driver/profile");
      setProfile(normalizeProfile(response));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Profilni olishda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleOnline = useCallback(async () => {
    setIsToggling(true);
    setError(null);
    try {
      const nextOnline = !profile?.driverProfile?.isOnline;
      const response = await api.patch("/api/taxi/driver/profile/online", { isOnline: nextOnline });
      const updated = normalizeProfile(response);
      if (updated) {
        setProfile(updated);
      } else {
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            driverProfile: {
              ...prev.driverProfile,
              isOnline: nextOnline,
            },
          };
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Holatni yangilashda xatolik");
    } finally {
      setIsToggling(false);
    }
  }, [profile?.driverProfile?.isOnline]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { profile, isLoading, error, refetch, isOnline, toggleOnline, isToggling };
}
