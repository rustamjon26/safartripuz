"use client";

import { useEffect } from "react";
import Link from "next/link";

export type RouteErrorProps = {
  error: Error & { digest?: string };
  /**
   * Next 16.2 renamed the recovery prop: `unstable_retry` re-fetches and
   * re-renders the segment, while `reset` only clears the boundary state.
   * Both are accepted so this component keeps working across the rename.
   */
  unstable_retry?: () => void;
  reset?: () => void;
};

/**
 * Shared fallback for every `error.tsx`. Before this existed a render error
 * produced a blank white page — no message, no way back, and nothing in the
 * logs tying the user's report to the server-side stack.
 */
export function ErrorFallback({
  error,
  unstable_retry,
  reset,
  title = "Nimadir noto'g'ri ketdi",
  homeHref = "/",
}: RouteErrorProps & { title?: string; homeHref?: string }) {
  useEffect(() => {
    // Server Component errors reach the client with a generic message; the
    // digest is the only handle back to the real stack in the server log.
    console.error("[render-error]", { digest: error.digest, message: error.message });
  }, [error]);

  const retry = unstable_retry ?? reset;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
        ⚠️
      </div>
      <div className="space-y-1.5">
        <h1 className="text-[19px] font-black text-slate-900">{title}</h1>
        <p className="max-w-md text-[13px] font-semibold leading-relaxed text-slate-500">
          Sahifani yuklashda kutilmagan xatolik yuz berdi. Qayta urinib
          ko&apos;ring — muammo takrorlansa, qo&apos;llab-quvvatlash xizmatiga
          murojaat qiling.
        </p>
        {error.digest ? (
          <p className="pt-1 text-[11px] font-bold uppercase tracking-widest text-slate-300">
            Xato kodi: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {retry ? (
          <button
            type="button"
            onClick={() => retry()}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-slate-800"
          >
            Qayta urinish
          </button>
        ) : null}
        <Link
          href={homeHref}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          Bosh sahifa
        </Link>
      </div>
    </div>
  );
}

export default ErrorFallback;
