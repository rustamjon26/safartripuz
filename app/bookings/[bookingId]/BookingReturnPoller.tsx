"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh the server booking view until Payme Perform lands (or we stop). */
export function BookingReturnPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => {
      router.refresh();
    }, 2000);
    const stop = setTimeout(() => {
      clearInterval(tick);
    }, 30_000);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
  }, [active, router]);

  return null;
}
