import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";

export function useLocation() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status === "granted" ? "granted" : "denied");
      if (status !== "granted") {
        setError("Joylashuv ruxsati berilmagan");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      setError("Joylashuvni aniqlashda xato");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLocation();
  }, [fetchLocation]);

  return { coords, permissionStatus, loading, error, refetch: fetchLocation };
}
