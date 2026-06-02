import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api } from "@/lib/api";

type ActiveOrder = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | string;
  pickupAddress?: string;
  customer?: {
    name?: string;
  };
};

/** Comma-separated statuses accepted by GET /api/taxi/driver/orders */
export const ACTIVE_DRIVER_ORDER_STATUSES = "PENDING,ACCEPTED,ARRIVED,IN_PROGRESS";

function extractFirstOrder(payload: unknown): ActiveOrder | null {
  const raw = payload as { data?: { data?: ActiveOrder[] } | ActiveOrder[] } | null;
  const source = raw?.data && typeof raw.data === "object" && "data" in raw.data
    ? raw.data.data
    : raw?.data;
  const list = Array.isArray(source) ? source : [];
  return list[0] ?? null;
}

export function useActiveOrder() {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const refetch = useCallback(async () => {
    if (mountedRef.current) setError(null);
    try {
      const statusQuery = encodeURIComponent(ACTIVE_DRIVER_ORDER_STATUSES);
      const response = await api.get(
        `/api/taxi/driver/orders?status=${statusQuery}&page=1&limit=1`,
      );
      if (!mountedRef.current) return;
      setActiveOrder(extractFirstOrder(response));
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Faol buyurtma yuklanmadi");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const startPollInterval = useCallback(() => {
    clearPollInterval();
    pollIntervalRef.current = setInterval(() => {
      void refetch();
    }, 10000);
  }, [clearPollInterval, refetch]);

  useEffect(() => {
    void refetch();

    if (AppState.currentState === "active") {
      startPollInterval();
    }

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refetch();
        startPollInterval();
      } else {
        clearPollInterval();
      }
    });

    return () => {
      sub.remove();
      clearPollInterval();
    };
  }, [refetch, startPollInterval, clearPollInterval]);

  return { activeOrder, isLoading, refetch, error };
}
