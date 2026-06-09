"use client";

import { useState } from "react";
import { initiatePaymePayment } from "@/lib/payme";

type PaymeButtonProps = {
  bookingId: string;
  amount: number;
  hotelName: string;
};

function PaymeLogo() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <rect width="24" height="24" rx="6" fill="#00C853" />
      <path
        d="M7 8.5h3.2c1.8 0 3 1.1 3 2.7 0 1.1-.6 2-1.6 2.4l2.1 3.4h-2.4l-1.8-3H9.2v3H7V8.5zm2.2 1.7v2.1h1c.8 0 1.2-.4 1.2-1.05 0-.65-.4-1.05-1.2-1.05h-1z"
        fill="white"
      />
    </svg>
  );
}

export function PaymeButton({ bookingId, amount, hotelName }: PaymeButtonProps) {
  const [loading, setLoading] = useState(false);
  const disabled = loading || !bookingId.trim() || !Number.isInteger(amount) || amount <= 0;

  function handleClick() {
    if (disabled) return;

    setLoading(true);
    try {
      initiatePaymePayment(bookingId, amount);
    } catch (error) {
      setLoading(false);
      console.error("[PaymeButton]", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Payme orqali to'lash — ${hotelName}`}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00C853] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#00B248] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Payme ga yo&apos;naltirilmoqda...
        </>
      ) : (
        <>
          <PaymeLogo />
          Payme bilan to&apos;lash
        </>
      )}
    </button>
  );
}
