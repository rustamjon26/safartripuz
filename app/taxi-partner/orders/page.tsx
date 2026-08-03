"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

function statusBadge(status: string): string {
  if (status === "COMPLETED") return "tp-badge tp-badge-ok";
  if (status === "CANCELLED" || status === "DISPUTE") return "tp-badge tp-badge-cancel";
  if (status === "PENDING") return "tp-badge tp-badge-wait";
  if (["ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(status)) return "tp-badge tp-badge-info";
  return "tp-badge tp-badge-muted";
}

type Order = {
  id: string;
  createdAt: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedPrice: number;
  finalPrice: number | null;
  status: "PENDING" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  customer: { first_name: string; last_name: string } | null;
  review?: { rating: number } | null;
};

const tabs = ["ACTIVE", "HISTORY"] as const;

export default function TaxiOrdersPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [items, setItems] = useState<Order[]>([]);
  const [completeTarget, setCompleteTarget] = useState<Order | null>(null);
  const [completeData, setCompleteData] = useState({ finalPrice: "", distanceKm: "" });
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl != null) setQ(fromUrl);
  }, [searchParams]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/taxi/driver/orders?limit=100");
      const json = await res.json();
      if (res.ok && json.success) setItems(json.data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeStatuses = new Set(["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"]);
  const filtered = useMemo(() => {
    const byTab = items.filter((o) =>
      tab === "ACTIVE" ? activeStatuses.has(o.status) : ["COMPLETED", "CANCELLED"].includes(o.status),
    );
    const query = q.trim().toLowerCase();
    if (!query) return byTab;
    return byTab.filter((o) =>
      `${o.pickupAddress} ${o.dropoffAddress} ${o.id} ${o.customer?.first_name ?? ""} ${o.customer?.last_name ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [items, tab, q]);

  async function runAction(order: Order, status: string, extra?: Record<string, unknown>) {
    setSaving(order.id);
    try {
      const payload = { status, ...(extra ?? {}) };
      if (status === "ACCEPTED") {
        const profileRes = await fetch("/api/taxi/driver/profile");
        const profileJson = await profileRes.json();
        const vehicleId = profileJson?.data?.vehicles?.find((v: { isActive: boolean }) => v.isActive)?.id;
        if (!vehicleId) throw new Error("Active vehicle topilmadi");
        Object.assign(payload, { vehicleId });
      }
      const res = await fetch(`/api/taxi/driver/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success("Status yangilandi");
      setCompleteTarget(null);
      setCompleteData({ finalPrice: "", distanceKm: "" });
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
          Safarlar
        </h1>
        <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
          Aktiv buyurtmalar va tarix
        </p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-[family-name:var(--font-sora)] font-semibold border ${
              tab === t
                ? "bg-[#006781]/10 text-[#006781] border-[#006781]/25"
                : "bg-white text-[#64748B] border-[#d8e3fb]"
            }`}
          >
            {t === "ACTIVE" ? "Faol" : "Tarix"}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-[#f0f3ff] text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-5">{tab === "ACTIVE" ? "Mijoz" : "Sana"}</th>
                  <th className="py-3 px-5">Qayerdan</th>
                  <th className="py-3 px-5">Qayerga</th>
                  <th className="py-3 px-5">{tab === "ACTIVE" ? "Taxminiy" : "Yakuniy"}</th>
                  <th className="py-3 px-5">{tab === "ACTIVE" ? "Holat" : "Reyting"}</th>
                  <th className="py-3 px-5 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="text-[13px] divide-y divide-[#d8e3fb]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 px-5">
                      <EmptyState
                        title={tab === "ACTIVE" ? "Aktiv buyurtmalar yo'q" : "Tarix bo'sh"}
                        message={
                          tab === "ACTIVE"
                            ? "Yangi buyurtmalar kelishini kuting."
                            : "Hozircha yakunlangan yoki bekor qilingan buyurtmalar yo'q."
                        }
                        ctaHref="/taxi-partner/dashboard"
                        ctaLabel="Dashboardga o'tish"
                      />
                    </td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-[#f9f9ff]">
                      <td className="py-3 px-5 font-bold text-[#111c2d]">
                        {tab === "ACTIVE"
                          ? o.customer
                            ? `${o.customer.first_name} ${o.customer.last_name}`
                            : "-"
                          : new Date(o.createdAt).toLocaleDateString("uz-UZ")}
                      </td>
                      <td className="py-3 px-5 text-[#64748B]">{o.pickupAddress}</td>
                      <td className="py-3 px-5 text-[#64748B]">{o.dropoffAddress}</td>
                      <td className="py-3 px-5 font-bold tabular-nums">
                        {Number(
                          tab === "ACTIVE" ? o.estimatedPrice : (o.finalPrice ?? o.estimatedPrice),
                        ).toLocaleString("uz-UZ")}
                      </td>
                      <td className="py-3 px-5">
                        {tab === "ACTIVE" ? (
                          <span className={statusBadge(o.status)}>{o.status}</span>
                        ) : o.review?.rating ? (
                          `${o.review.rating}★`
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="inline-flex gap-2 items-center">
                          {tab === "ACTIVE" ? (
                            <>
                              {o.status === "PENDING" && (
                                <button
                                  type="button"
                                  disabled={saving === o.id}
                                  onClick={() => void runAction(o, "ACCEPTED")}
                                  className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg bg-emerald-600 text-white"
                                >
                                  Qabul qilish
                                </button>
                              )}
                              {o.status === "ACCEPTED" && (
                                <button
                                  type="button"
                                  disabled={saving === o.id}
                                  onClick={() => void runAction(o, "ARRIVED")}
                                  className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg bg-amber-500 text-white"
                                >
                                  Yetib keldim
                                </button>
                              )}
                              {o.status === "ARRIVED" && (
                                <button
                                  type="button"
                                  disabled={saving === o.id}
                                  onClick={() => void runAction(o, "IN_PROGRESS")}
                                  className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg bg-[#006781] text-white"
                                >
                                  Yo&apos;lga chiqdik
                                </button>
                              )}
                              {o.status === "IN_PROGRESS" && (
                                <button
                                  type="button"
                                  disabled={saving === o.id}
                                  onClick={() => {
                                    setCompleteTarget(o);
                                    setCompleteData({
                                      finalPrice: String(Number(o.estimatedPrice)),
                                      distanceKm: "",
                                    });
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg bg-[#0d2137] text-white"
                                >
                                  Yetkazib berdim
                                </button>
                              )}
                            </>
                          ) : null}
                          <Link
                            href={`/taxi-partner/orders/${o.id}`}
                            className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg border border-[#d8e3fb] text-[#64748B]"
                          >
                            Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {completeTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000917]/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#d8e3fb] shadow-xl p-5 space-y-4">
            <h3 className="text-lg font-display font-semibold text-[#0d2137]">Safarni yakunlash</h3>
            <div>
              <label className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 block">
                Yakuniy narx
              </label>
              <input
                className="tp-input"
                type="number"
                value={completeData.finalPrice}
                onChange={(e) => setCompleteData((p) => ({ ...p, finalPrice: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 block">
                Masofa (km)
              </label>
              <input
                className="tp-input"
                type="number"
                value={completeData.distanceKm}
                onChange={(e) => setCompleteData((p) => ({ ...p, distanceKm: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCompleteTarget(null)} className="tp-btn tp-btn-ghost">
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() =>
                  void runAction(completeTarget, "COMPLETED", {
                    finalPrice: Number(completeData.finalPrice),
                    distanceKm: Number(completeData.distanceKm),
                  })
                }
                className="tp-btn tp-btn-primary"
              >
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
