"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { AdminTaxiPageHeader } from "@/components/admin/taxi/PageHeader";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EmptyState } from "@/components/ui/EmptyState";

type GuideRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  isBlocked: boolean;
  partnerStatus: string | null;
  listingCount: number;
  totalBookings: number;
  avgRating: number | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

type PendingAction = { id: string; type: "block" | "unblock" | "verify" } | null;

function accountLabel(g: GuideRow) {
  if (g.isBlocked) return "Bloklangan";
  if (g.partnerStatus === "approved") return "Tasdiqlangan";
  if (g.partnerStatus === "pending") return "Kutilmoqda";
  if (g.partnerStatus === "rejected") return "Rad etilgan";
  return g.partnerStatus ?? "—";
}

export default function AdminGuidePartnersPage() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GuideRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [pending, setPending] = useState<PendingAction>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("page", String(page));
      const res = await fetch(`/api/admin/guide/guides?${params.toString()}`);
      const json = (await res.json()) as { data?: GuideRow[]; pagination?: Pagination };
      setItems(json?.data ?? []);
      if (json.pagination) setPagination(json.pagination);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingGuide = useMemo(
    () => (pending ? items.find((g) => g.id === pending.id) : undefined),
    [items, pending],
  );
  const subjectName = pendingGuide
    ? `${pendingGuide.first_name} ${pendingGuide.last_name}`.trim()
    : pending?.id ?? "";

  async function runAction(id: string, type: "block" | "unblock" | "verify") {
    try {
      const res = await fetch(`/api/admin/guide/guides/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Yangilandi");
      setPending(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  const confirmTitle =
    pending?.type === "block"
      ? "Guideni bloklash"
      : pending?.type === "unblock"
        ? "Blokdan chiqarish"
        : pending?.type === "verify"
          ? "Guideni tasdiqlash"
          : "";

  const confirmDescription =
    pending?.type === "block"
      ? "Quyidagi ekskursiyachi bloklanadi va tizimga kira olmaydi."
      : pending?.type === "unblock"
        ? "Guide blokdan chiqariladi va yana tizimga kira oladi."
        : pending?.type === "verify"
          ? "Hamkor profili tasdiqlangan deb belgilanadi (Partner approved)."
          : "";

  return (
    <div className="space-y-6">
      <AdminTaxiPageHeader
        title="Ekskursiya hamkorlari"
        subtitle="Guide akkauntlari va tasdiqlash"
        actions={[
          { href: "/admin/guide", label: "Orqaga" },
          { href: "/admin/guide/listings", label: "Listings", primary: true },
        ]}
      />

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Ism</th>
                <th>Email</th>
                <th>Listing soni</th>
                <th>Jami bronlar</th>
                <th>Reyting</th>
                <th>Akkaunt holati</th>
                <th className="pr-8 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={7} rows={10} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState variant="embedded" message="Ekskursiyachilar topilmadi" />
                  </td>
                </tr>
              ) : (
                items.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      <Link href={`/admin/guide/guides/${g.id}`} className="hover:underline">
                        {g.first_name} {g.last_name}
                      </Link>
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-500">{g.email}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{g.listingCount}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{g.totalBookings}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{g.avgRating != null ? g.avgRating.toFixed(1) : "—"}</td>
                    <td className="py-4 text-xs font-black text-slate-600">{accountLabel(g)}</td>
                    <td className="py-4 pr-8 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Link href={`/admin/guide/guides/${g.id}`} className="adm-btn text-xs inline-flex items-center gap-1">
                          <Eye size={14} />
                          {"Ko'rish"}
                        </Link>
                        {g.isBlocked ? (
                          <button type="button" onClick={() => setPending({ id: g.id, type: "unblock" })} className="adm-btn text-xs">
                            Blokdan chiqarish
                          </button>
                        ) : (
                          <button type="button" onClick={() => setPending({ id: g.id, type: "block" })} className="adm-btn text-xs">
                            Bloklash
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPending({ id: g.id, type: "verify" })}
                          className="adm-btn adm-btn-primary text-xs"
                        >
                          Tasdiqlash
                        </button>
                      </div>
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
        open={!!pending}
        title={confirmTitle}
        description={confirmDescription}
        subjectName={subjectName}
        confirmDanger={pending?.type === "block"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void runAction(pending.id, pending.type);
        }}
      />
    </div>
  );
}
