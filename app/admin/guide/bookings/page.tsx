"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdminTaxiPageHeader } from "@/components/admin/taxi/PageHeader";
import { AdminGuideBookingStatusBadge } from "@/components/admin/guide/AdminGuideBookingStatusBadge";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatDate";

type Booking = {
  id: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  groupSize: number;
  totalPrice: unknown;
  guest: { first_name: string; last_name: string } | null;
  guide: { first_name: string; last_name: string } | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const TABS: { value: string; label: string }[] = [
  { value: "", label: "Barchasi" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "CONFIRMED", label: "Tasdiqlandi" },
  { value: "IN_PROGRESS", label: "Jarayonda" },
  { value: "COMPLETED", label: "Tugallandi" },
  { value: "CANCELLED", label: "Bekor" },
  { value: "DISPUTE", label: "Nizo" },
];

export default function AdminGuideBookingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const status = searchParams.get("status") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [pipelineRevenue, setPipelineRevenue] = useState(0);

  const patchQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") p.delete(k);
        else p.set(k, v);
      }
      if (!("page" in patch)) p.delete("page");
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("page", String(page));
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/guide/bookings?${params.toString()}`);
      const json = (await res.json()) as {
        data?: Booking[];
        pagination?: Pagination;
        totals?: { pipelineRevenue?: number };
      };
      setItems(json?.data ?? []);
      if (json.pagination) setPagination(json.pagination);
      setPipelineRevenue(Number(json?.totals?.pipelineRevenue ?? 0));
    } finally {
      setLoading(false);
    }
  }, [page, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const emptyMessage = status === "DISPUTE" ? "Nizo yo'q — zo'r!" : "Bronlar topilmadi";

  return (
    <div className="space-y-6">
      <AdminTaxiPageHeader
        title="Barcha bronlar"
        subtitle={"Holat va sana bo'yicha filtr"}
        actions={[
          { href: "/admin/guide", label: "Orqaga" },
          { href: "/admin/guide/listings", label: "Listings", primary: true },
        ]}
      />

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white space-y-4">
        <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner w-full overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.value || "all"}
              type="button"
              onClick={() => patchQuery({ status: t.value || undefined, page: undefined })}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                status === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Dan</label>
            <input
              type="date"
              value={from}
              onChange={(e) => patchQuery({ from: e.target.value || undefined, page: undefined })}
              className="h-input mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase tracking-wide">Gacha</label>
            <input
              type="date"
              value={to}
              onChange={(e) => patchQuery({ to: e.target.value || undefined, page: undefined })}
              className="h-input mt-1 w-full"
            />
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Mijoz</th>
                <th>Guide</th>
                <th>Sana</th>
                <th>Vaqt</th>
                <th>Soatlar</th>
                <th>Guruh</th>
                <th>Jami</th>
                <th>Holat</th>
                <th className="pr-8 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={9} rows={10} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState variant="embedded" message={emptyMessage} />
                  </td>
                </tr>
              ) : (
                items.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      {b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "—"}
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-600">
                      {b.guide ? `${b.guide.first_name} ${b.guide.last_name}` : "—"}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500 whitespace-nowrap">{formatDateTime(b.date)}</td>
                    <td className="py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                      {b.startTime}–{b.endTime}
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">{b.hours}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{b.groupSize}</td>
                    <td className="py-4 text-sm font-black text-slate-900">
                      {Number(b.totalPrice).toLocaleString()} {"so'm"}
                    </td>
                    <td className="py-4">
                      <AdminGuideBookingStatusBadge status={b.status} />
                    </td>
                    <td className="py-4 pr-8 text-right">
                      <Link href={`/admin/guide/bookings/${b.id}`} className="adm-btn adm-btn-primary text-xs">
                        Batafsil
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-100">
                <td colSpan={4} className="py-4 pl-8 text-sm font-black text-slate-700">
                  Filtrlangan davr: tasdiqlangan oqim daromadi (CONFIRMED+IN_PROGRESS+COMPLETED)
                </td>
                <td colSpan={5} className="py-4 pr-8 text-right text-sm font-black text-slate-900">
                  {pipelineRevenue.toLocaleString()} {"so'm"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!loading ? <AdminPagination page={pagination.page} totalPages={pagination.totalPages} /> : null}
      </div>
    </div>
  );
}
