"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AdminTaxiPageHeader } from "@/components/admin/taxi/PageHeader";
import { AdminGuideListingStatusBadge } from "@/components/admin/guide/AdminGuideListingStatusBadge";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatDate";

type Listing = {
  id: string;
  title: string;
  category: string;
  languages: string[];
  language: string;
  pricePerHour: unknown;
  status: string;
  createdAt: string;
  guideName: string;
  bookingCount: number;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const CATEGORIES = ["", "CITY_TOUR", "NATURE", "HISTORY", "ADVENTURE", "FOOD", "CUSTOM"] as const;

const TABS: { value: string; label: string }[] = [
  { value: "", label: "Barchasi" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "ACTIVE", label: "Aktiv" },
  { value: "INACTIVE", label: "Nofaol" },
  { value: "REJECTED", label: "Rad etilgan" },
  { value: "BLOCKED", label: "Bloklangan" },
];

export default function AdminGuideListingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

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
      if (category) params.set("category", category);
      const res = await fetch(`/api/admin/guide/listings?${params.toString()}`);
      const json = (await res.json()) as { data?: Listing[]; pagination?: Pagination };
      setItems(json?.data ?? []);
      if (json.pagination) setPagination(json.pagination);
    } finally {
      setLoading(false);
    }
  }, [page, status, category]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingIds = useMemo(
    () => selected.filter((id) => items.find((i) => i.id === id)?.status === "PENDING"),
    [selected, items],
  );

  const allPendingSelectable = useMemo(() => items.filter((i) => i.status === "PENDING").map((i) => i.id), [items]);

  const allPendingChecked =
    allPendingSelectable.length > 0 && allPendingSelectable.every((id) => selected.includes(id));

  function toggleOne(id: string) {
    const row = items.find((i) => i.id === id);
    if (row?.status !== "PENDING") return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAllPending() {
    if (allPendingChecked) {
      setSelected((prev) => prev.filter((id) => !allPendingSelectable.includes(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...allPendingSelectable])));
    }
  }

  async function bulkApprove() {
    if (pendingIds.length === 0) return;
    setProcessing(true);
    try {
      await Promise.all(
        pendingIds.map((id) =>
          fetch(`/api/admin/guide/listings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACTIVE", note: "Bulk tasdiq admin tomonidan" }),
          }),
        ),
      );
      toast.success("Tanlangan listinglar tasdiqlandi");
      setSelected([]);
      setBulkConfirmOpen(false);
      void load();
    } catch {
      toast.error("Bulk xatolik");
    } finally {
      setProcessing(false);
    }
  }

  function langLabel(row: Listing) {
    const set = new Set<string>([...(row.languages ?? []), row.language].filter(Boolean));
    return Array.from(set).join(", ");
  }

  const bulkSubject =
    pendingIds.length > 0
      ? `${pendingIds.length} ta listing (${items
          .filter((i) => pendingIds.includes(i.id))
          .map((i) => i.title)
          .slice(0, 3)
          .join(", ")}${pendingIds.length > 3 ? "…" : ""})`
      : "";

  return (
    <div className="space-y-6">
      <AdminTaxiPageHeader
        title="Barcha ekskursiya listinglari"
        subtitle={"Holat va kategoriya bo'yicha filtr"}
        actions={[
          { href: "/admin/guide", label: "Orqaga" },
          { href: "/admin/guide/bookings", label: "Bronlar", primary: true },
        ]}
      />

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
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
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={category}
              onChange={(e) => patchQuery({ category: e.target.value || undefined, page: undefined })}
              className="h-input min-w-[180px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c || "all"} value={c}>
                  {c === "" ? "Barcha kategoriyalar" : c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={processing || pendingIds.length === 0}
              className="adm-btn adm-btn-primary disabled:opacity-50"
            >
              Hammasini tasdiqlash ({pendingIds.length})
            </button>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8 w-10">
                  <input type="checkbox" checked={allPendingChecked} onChange={toggleAllPending} title="Faqat Kutilmoqda" />
                </th>
                <th>Guide</th>
                <th>Sarlavha</th>
                <th>Kategoriya</th>
                <th>Tillar</th>
                <th>Narx/soat</th>
                <th>Bronlar soni</th>
                <th>Holat</th>
                <th>Sana</th>
                <th className="pr-8 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={10} rows={10} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState variant="embedded" message="Listinglar topilmadi" />
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8">
                      {i.status === "PENDING" ? (
                        <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggleOne(i.id)} />
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">{i.guideName}</td>
                    <td className="py-4 text-sm font-bold text-slate-800">{i.title}</td>
                    <td className="py-4 text-xs font-black text-slate-500">{i.category}</td>
                    <td className="py-4 text-xs font-bold text-slate-500 max-w-[140px] truncate" title={langLabel(i)}>
                      {langLabel(i)}
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">
                      {Number(i.pricePerHour).toLocaleString()} {"so'm"}
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">{i.bookingCount}</td>
                    <td className="py-4">
                      <AdminGuideListingStatusBadge status={i.status} />
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-400 whitespace-nowrap">{formatDateTime(i.createdAt)}</td>
                    <td className="py-4 pr-8 text-right">
                      <Link href={`/admin/guide/listings/${i.id}`} className="adm-btn adm-btn-primary text-xs">
                        {"Ko'rish"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading ? <AdminPagination page={pagination.page} totalPages={pagination.totalPages} /> : null}
      </div>

      <ConfirmModal
        open={bulkConfirmOpen}
        title="Tanlangan listinglarni tasdiqlash"
        description="Quyidagi listinglar ACTIVE holatiga o'tkaziladi."
        subjectName={bulkSubject}
        confirmLoading={processing}
        onCancel={() => setBulkConfirmOpen(false)}
        onConfirm={() => void bulkApprove()}
      />
    </div>
  );
}
