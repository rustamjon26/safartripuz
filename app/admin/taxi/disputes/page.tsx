"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AdminTaxiPageHeader } from "@/components/admin/taxi/PageHeader";
import { AdminModal } from "@/components/admin/taxi/AdminModal";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatDate";

type Order = {
  id: string;
  createdAt: string;
  updatedAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  customer: { first_name: string; last_name: string } | null;
  driver: { first_name: string; last_name: string } | null;
  logs?: { createdAt: string }[];
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

export default function AdminTaxiDisputesPage() {
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [target, setTarget] = useState<Order | null>(null);
  const [resolution, setResolution] = useState<"REFUND" | "RELEASE" | "SPLIT">("REFUND");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [finalConfirmOpen, setFinalConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("page", String(page));
      const res = await fetch(`/api/admin/taxi/disputes?${params.toString()}`);
      const json = (await res.json()) as { data?: Order[]; pagination?: Pagination };
      setItems(json?.data ?? []);
      if (json.pagination) setPagination(json.pagination);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  function disputeAt(o: Order) {
    return o.logs?.[0]?.createdAt ?? o.updatedAt ?? o.createdAt;
  }

  async function resolve() {
    if (!target) return;
    if (!note.trim()) {
      toast.error("Izoh majburiy");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/taxi/orders/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, note }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Nizo hal qilindi");
      setTarget(null);
      setNote("");
      setFinalConfirmOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  const targetLabel = target
    ? `${target.customer ? `${target.customer.first_name} ${target.customer.last_name}` : "Buyurtma"} — #${target.id.slice(-8)}`
    : "";

  return (
    <div className="space-y-6">
      <AdminTaxiPageHeader
        title="Taxi nizolari"
        subtitle="DISPUTE holatidagi buyurtmalar va hal qilish"
        actions={[
          { href: "/admin/taxi", label: "Taxi bosh sahifa" },
          { href: "/admin/taxi/orders", label: "Buyurtmalar", primary: true },
        ]}
      />

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Mijoz</th>
                <th>Haydovchi</th>
                <th>{"Yo'nalish"}</th>
                <th>Taxminiy narx</th>
                <th>Nizo sanasi</th>
                <th className="pr-8 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={6} rows={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState variant="embedded" message={"Nizo yo'q — zo'r!"} />
                  </td>
                </tr>
              ) : (
                items.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      {o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "—"}
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-500">
                      {o.driver ? `${o.driver.first_name} ${o.driver.last_name}` : "Tayinlanmagan"}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500 max-w-[200px] truncate" title={`${o.pickupAddress} → ${o.dropoffAddress}`}>
                      {o.pickupAddress} → {o.dropoffAddress}
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">
                      {Number(o.estimatedPrice).toLocaleString()} {"so'm"}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-400 whitespace-nowrap">
                      {formatDateTime(disputeAt(o))}
                    </td>
                    <td className="py-4 pr-8 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setFinalConfirmOpen(false);
                          setTarget(o);
                        }}
                        className="adm-btn text-xs"
                      >
                        Hal qilish
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading ? <AdminPagination page={pagination.page} totalPages={pagination.totalPages} /> : null}
      </div>

      <AdminModal
        open={!!target && !finalConfirmOpen}
        title="Nizoni hal qilish"
        onClose={() => {
          setTarget(null);
          setNote("");
        }}
        footer={
          <>
            <button
              type="button"
              className="adm-btn"
              onClick={() => {
                setTarget(null);
                setNote("");
              }}
            >
              Bekor qilish
            </button>
            <button type="button" className="adm-btn adm-btn-primary" onClick={() => setFinalConfirmOpen(true)}>
              Keyingi qadam
            </button>
          </>
        }
      >
        {target ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
              <div className="font-black text-slate-900">#{target.id.slice(-8)}</div>
              <div className="text-xs text-slate-500 mt-1">
                {target.pickupAddress} → {target.dropoffAddress}
              </div>
              <div className="text-xs font-bold text-slate-600 mt-2">
                Taxminiy: {Number(target.estimatedPrice).toLocaleString()} {"so'm"}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                <input type="radio" name="res" checked={resolution === "REFUND"} onChange={() => setResolution("REFUND")} />
                Mijozga qaytarish (bekor)
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                <input type="radio" name="res" checked={resolution === "RELEASE"} onChange={() => setResolution("RELEASE")} />
                {"Haydovchiga o'tkazish (tugallandi)"}
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                <input type="radio" name="res" checked={resolution === "SPLIT"} onChange={() => setResolution("SPLIT")} />
                Taqsimlash (bekor)
              </label>
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase">Izoh (majburiy)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="h-input min-h-[110px] w-full mt-1" />
            </div>
          </div>
        ) : null}
      </AdminModal>

      <ConfirmModal
        open={finalConfirmOpen && !!target}
        title="Nizoni yakuniy tasdiqlash"
        description="Quyidagi buyurtma bo'yicha nizo hal qilinadi. Bu amalni qaytarib bo'lmaydi."
        subjectName={targetLabel}
        confirmLoading={saving}
        confirmDanger
        confirmLabel="Hal qilish"
        onCancel={() => setFinalConfirmOpen(false)}
        onConfirm={() => void resolve()}
      />
    </div>
  );
}
