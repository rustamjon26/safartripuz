import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type UseOrdersParams = {
  status: string;
};

export type DriverOrder = {
  id: string;
  status: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  estimatedPrice?: number;
  createdAt?: string;
  date?: string;
};

const PAGE_LIMIT = 20;

export function useOrders({ status }: UseOrdersParams) {
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (pageToFetch: number, replace = false) => {
    if (!replace && !hasMore && pageToFetch !== 1) return;
    setError(null);
    try {
      const query = `/api/taxi/driver/orders?status=${encodeURIComponent(
        status,
      )}&page=${pageToFetch}&limit=${PAGE_LIMIT}`;
      const response = await api.get(query);
      const list = (response?.data?.data ?? response?.data ?? []) as DriverOrder[];
      const pagination = response?.pagination ?? response?.data?.pagination;
      const totalPages = Number(pagination?.totalPages ?? 1);

      setOrders((prev) => (replace ? list : [...prev, ...list]));
      setHasMore(pageToFetch < totalPages && list.length > 0);
      setPage(pageToFetch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Buyurtmalar yuklanmadi");
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, status]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setHasMore(true);
    await fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    await fetchPage(page + 1, false);
  }, [fetchPage, hasMore, isLoading, page]);

  useEffect(() => {
    setOrders([]);
    setPage(1);
    setHasMore(true);
    setIsLoading(true);
    void fetchPage(1, true);
  }, [fetchPage, status]);

  return { orders, isLoading, loadMore, refetch, hasMore, error };
}
