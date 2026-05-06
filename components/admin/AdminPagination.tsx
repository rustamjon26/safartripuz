"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AdminPagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (totalPages <= 1) return null;

  function go(nextPage: number) {
    const p = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) p.delete("page");
    else p.set("page", String(nextPage));
    const q = p.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs font-bold text-slate-500">
        Sahifa {page} / {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="adm-btn text-xs disabled:opacity-40"
        >
          Oldingi
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          className="adm-btn text-xs disabled:opacity-40"
        >
          Keyingi
        </button>
      </div>
    </div>
  );
}
