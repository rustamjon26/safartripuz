"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { AdminTaxiPageHeader } from "@/components/admin/taxi/PageHeader";
import { AdminTaxiStatusBadge } from "@/components/admin/taxi/AdminTaxiStatusBadge";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatDate";

type Order = {
  id: string;
  status: string;
  createdAt: string;
  estimatedPrice: number;
  finalPrice: number | null;
  pickupAddress: string;
  dropoffAddress: string;
  customer: { first_name: string; last_name: string } | null;
  driver: { first_name: string; last_name: string } | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const TABS: { value: string; label: string }[] = [
  { value: "", label: "Barchasi" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "ACCEPTED", label: "Qabul qilindi" },
  { value: "ARRIVED", label: "Yetib keldi" },
  { value: "IN_PROGRESS", label: "Yo'lda" },
  { value: "COMPLETED", label: "Tugallandi" },
  { value: "CANCELLED", label: "Bekor" },
  { value: "DISPUTE", label: "Nizo" },
];

function downloadCsv(filename: string, rows: string[][]) {
  const bom = "\uFEFF";
  const content = bom + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminTaxiOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const status = searchParams.get("status") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [completedRevenue, setCompletedRevenue] = useState(0);

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
      const res = await fetch(`/api/admin/taxi/orders?${params.toString()}`);
      const json = (await res.json()) as {
        data?: Order[];
        pagination?: Pagination;
        totals?: { completedRevenue?: number };
      };
      setItems(json?.data ?? []);
      if (json.pagination) setPagination(json.pagination);
      setCompletedRevenue(Number(json?.totals?.completedRevenue ?? 0));
    } finally {
      setLoading(false);
    }
  }, [page, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportCsv() {
    const params = new URLSearchParams();
    params.set("limit", "500");
    params.set("page", "1");
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/admin/taxi/orders?${params.toString()}`);
    const json = (await res.json()) as { data?: Order[] };
    const rows = json?.data ?? [];
    const header = [
      "id",
      "mijoz",
      "haydovchi",
      "pickup",
      "dropoff",
      "taxminiy",
      "yakuniy",
      "holat",
      "sana",
    ];
    const dataRows = rows.map((o) => [
      o.id,
      o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "",
      o.driver ? `${o.driver.first_name} ${o.driver.last_name}` : "Tayinlanmagan",
      o.pickupAddress,
      o.dropoffAddress,
      String(o.estimatedPrice),
      o.finalPrice != null ? String(o.finalPrice) : "",
      o.status,
      new Date(o.createdAt).toISOString(),
    ]);
    downloadCsv(`taxi-orders-${status || "all"}.csv`, [header, ...dataRows]);
  }

  return (
    <div className="space-y-6">
      <AdminTaxiPageHeader
        title="Taxi buyurtmalari"
        subtitle={"Filtrlangan davr va holat bo'yicha barcha buyurtmalar"}
        actions={[
          { href: "/admin/taxi", label: "Orqaga", primary: false },
          { href: "/admin/taxi/drivers", label: "Haydovchilar" },
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
        <div className="flex justify-end">
          <button type="button" onClick={() => void exportCsv()} className="adm-btn inline-flex items-center gap-2 text-sm">
            <Download size={16} />
            CSV eksport
          </button>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Mijoz</th>
                <th>Haydovchi</th>
                <th>Pickup</th>
                <th>Dropoff</th>
                <th>Taxminiy narx</th>
                <th>Yakuniy narx</th>
                <th>Holat</th>
                <th className="pr-8">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={8} rows={10} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState variant="embedded" message="Hech qanday buyurtma topilmadi" />
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/taxi/orders/${o.id}`)}
                  >
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      <Link href={`/admin/taxi/orders/${o.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        {o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "-"}
                      </Link>
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-500">
                      {o.driver ? `${o.driver.first_name} ${o.driver.last_name}` : "Tayinlanmagan"}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500 max-w-[140px] truncate" title={o.pickupAddress}>
                      {o.pickupAddress}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500 max-w-[140px] truncate" title={o.dropoffAddress}>
                      {o.dropoffAddress}
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">{Number(o.estimatedPrice).toLocaleString()}</td>
                    <td className="py-4 text-sm font-black text-slate-900">
                      {o.finalPrice != null ? Number(o.finalPrice).toLocaleString() : "—"}
                    </td>
                    <td className="py-4">
                      <AdminTaxiStatusBadge status={o.status} />
                    </td>
                    <td className="py-4 pr-8 text-xs font-bold text-slate-400 whitespace-nowrap">
                      {formatDateTime(o.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-100">
                <td colSpan={4} className="py-4 pl-8 text-sm font-black text-slate-700">
                  Filtrlangan davr: tugallangan buyurtmalar daromadi (yakuniy narx)
                </td>
                <td colSpan={4} className="py-4 pr-8 text-right text-sm font-black text-slate-900">
                  {completedRevenue.toLocaleString()} {"so'm"}
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
