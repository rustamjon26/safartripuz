import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { api } from "@/lib/api";

export function useDriverLocation(
  isOnline: boolean,
  onLocationUpdate?: (coords: { lat: number; lng: number }) => void,
) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendLocation = useCallback(async (lat: number, lng: number) => {
    try {
      await api.patch("/api/taxi/driver/profile/location", { lat, lng });
    } catch {
      // silent — location update failure shouldn't crash the app
    }
  }, []);

  const fetchAndSend = useCallback(async () => {
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lng } = pos.coords;
      setCoords({ lat, lng });
      onLocationUpdate?.({ lat, lng });
      await sendLocation(lat, lng);
    } catch {
      // silent
    }
  }, [sendLocation, onLocationUpdate]);

  useEffect(() => {
    if (!isOnline) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    void Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted") return;
      void fetchAndSend();
      intervalRef.current = setInterval(() => void fetchAndSend(), 30_000);
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isOnline, fetchAndSend]);

  return { coords };
}
