import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type ActiveOrder = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | string;
  pickupAddress?: string;
  customer?: {
    name?: string;
  };
};

const ACTIVE_STATUSES = new Set([
  "PENDING",
  "ACCEPTED",
  "ARRIVED",
  "IN_PROGRESS",
]);

function extractOrder(payload: any): ActiveOrder | null {
  const source = payload?.data?.data ?? payload?.data ?? [];
  const list = Array.isArray(source) ? source : [source];
  return list.find((item) => ACTIVE_STATUSES.has(item?.status)) ?? null;
}

export function useActiveOrder() {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (mountedRef.current) setError(null);
    try {
      const response = await api.get("/api/taxi/driver/orders?status=active");
      if (!mountedRef.current) return;
      setActiveOrder(extractOrder(response));
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Faol buyurtma yuklanmadi");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    const timer = setInterval(() => {
      void refetch();
    }, 10000);

    return () => clearInterval(timer);
  }, [refetch]);

  return { activeOrder, isLoading, refetch, error };
}
