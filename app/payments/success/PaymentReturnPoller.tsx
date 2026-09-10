"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 2000;
const MAX_POLLS = 15;

/**
 * Click/Payme often redirect before Complete lands. Refresh the server
 * view until the payment leaves pending (or we give up).
 */
export function PaymentReturnPoller({ paymentId }: { paymentId: string }) {
  const router = useRouter();

  useEffect(() => {
    let polls = 0;
    let cancelled = false;

    async function tick() {
      polls += 1;
      try {
        const res = await fetch(
          `/api/payments/${encodeURIComponent(paymentId)}/status`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as { outcome?: string };
        if (cancelled) return;
        if (data.outcome && data.outcome !== "pending") {
          router.refresh();
          return;
        }
      } catch {
        /* keep polling */
      }
      if (polls >= MAX_POLLS) {
        router.refresh();
        return;
      }
      timer = setTimeout(() => {
        void tick();
      }, POLL_MS);
    }

    let timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      void tick();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [paymentId, router]);

  return null;
}
