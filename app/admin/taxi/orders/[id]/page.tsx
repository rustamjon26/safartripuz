"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AdminTaxiStatusBadge } from "@/components/admin/taxi/AdminTaxiStatusBadge";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { formatDateTime } from "@/lib/formatDate";

type Log = {
  id: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  note: string | null;
  createdAt: string;
  actor: { first_name: string; last_name: string; email: string } | null;
};

type Vehicle = {
  id: string;
  make: string;
  model: string;
  plateNumber: string;
  category: string;
  year: number;
} | null;

type Order = {
  id: string;
  status: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedPrice: number;
  finalPrice: number | null;
  distanceKm: number | null;
  customerNote: string | null;
  driverNote: string | null;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { first_name: string; last_name: string; email: string; phone: string } | null;
  driver: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    driverProfile?: { isOnline?: boolean } | null;
  } | null;
  vehicle: Vehicle;
  service: { name?: string } | null;
  logs: Log[];
};

function roleBadgeLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "system") return "Tizim";
  if (role === "customer" || role === "guest") return "Mijoz";
  if (role === "driver" || role === "taxi_partner") return "Haydovchi";
  return role;
}

export default function AdminTaxiOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [nextStatus, setNextStatus] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disputeResolution, setDisputeResolution] = useState<"REFUND" | "RELEASE" | "SPLIT">("REFUND");
  const [disputeNote, setDisputeNote] = useState("");
  const [disputeConfirmOpen, setDisputeConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/taxi/orders/${params.id}`);
      const json = await res.json();
      if (res.ok) {
        const o = json.order ?? null;
        setOrder(o);
        setNextStatus(o?.status ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) void load();
  }, [params.id, load]);

  const timelineLogs = useMemo(() => {
    if (!order?.logs) return [];
    return [...order.logs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [order?.logs]);

  async function forceChange() {
    if (!order || !nextStatus) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/taxi/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Holat yangilandi");
      setConfirmOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  async function resolveDispute() {
    if (!order) return;
    if (!disputeNote.trim()) {
      toast.error("Izoh majburiy");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/taxi/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: disputeResolution, note: disputeNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Nizo hal qilindi");
      setDisputeConfirmOpen(false);
      setDisputeNote("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-slate-400 font-bold bg-white">
        Yuklanmoqda...
      </div>
    );
  }
  if (!order) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-red-600 font-bold bg-white">
        Buyurtma topilmadi
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/taxi/orders"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label="Orqaga"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Buyurtma</h1>
            <p className="text-sm font-bold text-slate-400 mt-1">ID: {order.id}</p>
            <div className="mt-2">
              <AdminTaxiStatusBadge status={order.status} />
            </div>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">{"Asosiy ma'lumot"}</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Mijoz</div>
            <div className="font-bold text-slate-900 mt-1">
              {order.customer
                ? `${order.customer.first_name} ${order.customer.last_name}`
                : "—"}
            </div>
            <div className="text-slate-500 text-xs mt-1">{order.customer?.email}</div>
            <div className="text-slate-500 text-xs">{order.customer?.phone}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Haydovchi</div>
            <div className="font-bold text-slate-900 mt-1">
              {order.driver ? `${order.driver.first_name} ${order.driver.last_name}` : "Tayinlanmagan"}
            </div>
            {order.driver ? (
              <>
                <div className="text-slate-500 text-xs mt-1">{order.driver.email}</div>
                <div className="text-slate-500 text-xs">{order.driver.phone}</div>
              </>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-black text-slate-400 uppercase">Transport</div>
            <div className="font-bold text-slate-800 mt-1">
              {order.vehicle
                ? `${order.vehicle.make} ${order.vehicle.model} (${order.vehicle.year}) — ${order.vehicle.plateNumber} [${order.vehicle.category}]`
                : "—"}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-black text-slate-400 uppercase">{"Yo'nalish"}</div>
            <div className="font-bold text-slate-800 mt-1">{order.pickupAddress}</div>
            <div className="text-slate-400 text-xs my-1">↓</div>
            <div className="font-bold text-slate-800">{order.dropoffAddress}</div>
            {order.distanceKm != null ? (
              <div className="text-xs text-slate-500 mt-1">Masofa: {order.distanceKm} km</div>
            ) : null}
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Xizmat</div>
            <div className="font-bold text-slate-800 mt-1">{order.service?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Vaqt</div>
            <div className="text-xs font-bold text-slate-600 mt-1">
              Yaratilgan: {formatDateTime(order.createdAt)}
            </div>
            <div className="text-xs font-bold text-slate-600">
              Yangilangan: {formatDateTime(order.updatedAt)}
            </div>
            {order.scheduledAt ? (
              <div className="text-xs font-bold text-slate-600">
                Rejalashtirilgan: {formatDateTime(order.scheduledAt)}
              </div>
            ) : null}
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/60">
              <div className="text-xs font-black text-slate-400 uppercase">Mijoz eslatmasi</div>
              <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{order.customerNote || "—"}</div>
            </div>
            <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/60">
              <div className="text-xs font-black text-slate-400 uppercase">Haydovchi / tizim eslatmasi</div>
              <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{order.driverNote || "—"}</div>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-6">
            <div>
              <div className="text-xs font-black text-slate-400 uppercase">Taxminiy narx</div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {Number(order.estimatedPrice).toLocaleString()} {"so'm"}
              </div>
            </div>
            <div>
              <div className="text-xs font-black text-slate-400 uppercase">Yakuniy narx</div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {order.finalPrice != null ? (
                  <>
                    {Number(order.finalPrice).toLocaleString()} {"so'm"}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Holat jadvali (TaxiOrderLog)</span>
        </div>
        <div className="p-6 space-y-3">
          {timelineLogs.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">{"Loglar yo'q"}</p>
          ) : (
            timelineLogs.map((log) => (
              <div key={log.id} className="flex gap-3 border border-slate-100 rounded-xl p-4 bg-white">
                <div className="w-2 rounded-full bg-slate-900 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {roleBadgeLabel(log.actorRole)}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {log.fromStatus} → {log.toStatus}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ml-auto">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                  {log.note ? <p className="text-sm text-slate-600 mt-2">{log.note}</p> : null}
                  {log.actor ? (
                    <p className="text-xs text-slate-400 mt-1">
                      {log.actor.first_name} {log.actor.last_name}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {["COMPLETED", "CANCELLED"].includes(order.status) ? null : (
        <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <div className="adm-card-header bg-white border-b border-slate-50">
            <span className="text-lg font-black text-slate-900 tracking-tight">{"Majburiy holat o'zgarishi"}</span>
          </div>
          <div className="p-6 space-y-3">
            <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} className="h-input w-full max-w-md">
              {["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "DISPUTE"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-input min-h-[100px] w-full max-w-xl"
              placeholder="Sabab (ixtiyoriy)"
            />
            <button type="button" onClick={() => setConfirmOpen(true)} className="adm-btn adm-btn-primary">
              {"O'zgartirish"}
            </button>
          </div>
        </div>
      )}

      {order.status === "DISPUTE" ? (
        <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <div className="adm-card-header bg-white border-b border-slate-50">
            <span className="text-lg font-black text-slate-900 tracking-tight">Nizo hal qilish</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                className={`adm-btn flex-1 ${disputeResolution === "REFUND" ? "adm-btn-primary" : ""}`}
                onClick={() => setDisputeResolution("REFUND")}
              >
                Mijozga qaytarish
              </button>
              <button
                type="button"
                className={`adm-btn flex-1 ${disputeResolution === "RELEASE" ? "adm-btn-primary" : ""}`}
                onClick={() => setDisputeResolution("RELEASE")}
              >
                {"Haydovchiga o'tkazish"}
              </button>
              <button
                type="button"
                className={`adm-btn flex-1 ${disputeResolution === "SPLIT" ? "adm-btn-primary" : ""}`}
                onClick={() => setDisputeResolution("SPLIT")}
              >
                Taqsimlash
              </button>
            </div>
            <textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              className="h-input min-h-[120px] w-full"
              placeholder="Izoh (majburiy)"
            />
            <button type="button" onClick={() => setDisputeConfirmOpen(true)} className="adm-btn adm-btn-primary">
              Hal qilish
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmOpen}
        title="Majburiy holat o'zgarishi"
        description="Quyidagi taxi buyurtmasi holati admin tomonidan o'zgartiriladi."
        subjectName={`#${order.id.slice(-8)} — ${order.status} → ${nextStatus}`}
        confirmLoading={saving}
        confirmDanger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void forceChange()}
      />

      <ConfirmModal
        open={disputeConfirmOpen}
        title="Nizoni hal qilish"
        description="Tanlangan yechim va izoh bilan nizo yakuniy yopiladi."
        subjectName={`#${order.id.slice(-8)} — ${disputeResolution}`}
        confirmLoading={saving}
        confirmDanger
        onCancel={() => setDisputeConfirmOpen(false)}
        onConfirm={() => void resolveDispute()}
      />
    </div>
  );
}
