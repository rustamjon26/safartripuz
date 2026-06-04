import { useCallback, useEffect, useState } from "react";
import { api, AuthRedirectError } from "@/lib/api";

interface Coord {
  lat: number;
  lng: number;
}

interface DirectionsResult {
  polyline: Coord[];
  distance: { text: string; value: number } | null;
  duration: { text: string; value: number } | null;
  summary: string;
}

interface UseDirectionsOptions {
  origin: Coord | null;
  destination: Coord | null;
  enabled?: boolean;
}

export function useDirections({ origin, destination, enabled = true }: UseDirectionsOptions) {
  const [result, setResult] = useState<DirectionsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirections = useCallback(async () => {
    if (!origin || !destination || !enabled) return;

    if (origin.lat === destination.lat && origin.lng === destination.lng) return;

    setLoading(true);
    setError(null);

    try {
      const res = (await api.get(
        `/api/maps/directions?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${destination.lat}&destLng=${destination.lng}`,
      )) as DirectionsResult;

      setResult(res);
    } catch (e) {
      if (e instanceof AuthRedirectError) {
        setError(null);
        return;
      }
      setError("Yo'l ma'lumotlari yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, enabled]);

  useEffect(() => {
    void fetchDirections();
  }, [fetchDirections]);

  return { result, loading, error, refetch: fetchDirections };
}
