import { useCallback, useEffect, useState } from "react";
import { api, AuthRedirectError } from "@/lib/api";

/** GET /api/travel-plans/:id — serverdan kelgan sayohat rejasi */
export function useTravelPlan(id: string | undefined) {
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setPlan(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = (await api.get(`/api/travel-plans/${id}`)) as Record<string, unknown>;
      setPlan(data);
    } catch (e) {
      if (e instanceof AuthRedirectError) {
        setError(null);
        setPlan(null);
      } else {
        setError(e instanceof Error ? e.message : "Xatolik");
        setPlan(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { plan, loading, error, reload: load };
}
