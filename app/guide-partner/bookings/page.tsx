"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Booking = {
  id: string;
  guest: { first_name: string; last_name: string } | null;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  groupSize: number;
  totalPrice: number;
  meetingPoint: string | null;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTE";
  listing?: { title: string } | null;
};

const tabs = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

function statusBadge(status: string): string {
  if (status === "COMPLETED" || status === "CONFIRMED") return "gp-badge gp-badge-ok";
  if (status === "PENDING") return "gp-badge gp-badge-wait";
  if (status === "IN_PROGRESS") return "gp-badge gp-badge-info";
  if (status === "CANCELLED" || status === "DISPUTE") return "gp-badge gp-badge-cancel";
  return "gp-badge gp-badge-muted";
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Kutilmoqda";
    case "CONFIRMED":
      return "Tasdiqlangan";
    case "IN_PROGRESS":
      return "Jarayonda";
    case "COMPLETED":
      return "Yakunlandi";
    case "CANCELLED":
      return "Bekor";
    default:
      return status;
  }
}

function guestInitials(guest: Booking["guest"]): string {
  if (!guest) return "?";
  return `${guest.first_name?.[0] ?? ""}${guest.last_name?.[0] ?? ""}`.toUpperCase() || "?";
}

export default function GuidePartnerBookingsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Booking[]>([]);
  const [allForStats, setAllForStats] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const initialStatus = (searchParams.get("status") as (typeof tabs)[number] | null) ?? "PENDING";
  const [status, setStatus] = useState<(typeof tabs)[number]>(
    tabs.includes(initialStatus as (typeof tabs)[number]) ? initialStatus : "PENDING",
  );
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl != null) setQ(fromUrl);
    const st = searchParams.get("status") as (typeof tabs)[number] | null;
    if (st && tabs.includes(st)) setStatus(st);
  }, [searchParams]);

  async function load() {
    setLoading(true);
    try {
      const [res, allRes] = await Promise.all([
        fetch(`/api/guide/partner/bookings?status=${status}`),
        fetch("/api/guide/partner/bookings?limit=200"),
      ]);
      const data = await res.json();
      const allData = await allRes.json();
      if (res.ok && data.success) setItems((data.data?.data || []) as Booking[]);
      if (allRes.ok && allData.success) setAllForStats((allData.data?.data || []) as Booking[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((b) =>
      `${b.guest?.first_name ?? ""} ${b.guest?.last_name ?? ""} ${b.listing?.title ?? ""} ${b.id}`
        .toLowerCase()
        .includes(query),
    );
  }, [items, q]);

  const stats = useMemo(() => {
    const confirmed = allForStats.filter((b) => b.status === "CONFIRMED").length;
    const pending = allForStats.filter((b) => b.status === "PENDING").length;
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const monthly = allForStats
      .filter((b) => {
        const d = new Date(b.date);
        return d.getMonth() === month && d.getFullYear() === year && b.status !== "CANCELLED";
      })
      .reduce((s, b) => s + Number(b.totalPrice || 0), 0);
    return {
      total: allForStats.length,
      confirmed,
      pending,
      monthly,
    };
  }, [allForStats]);

  async function act(booking: Booking, action: "confirm" | "reject" | "start" | "complete") {
    const confirmText = {
      confirm: "Bookingni tasdiqlaysizmi?",
      reject: "Bookingni bekor qilasizmi?",
      start: "Safarni boshlaysizmi?",
      complete: "Safarni yakunlaysizmi?",
    }[action];
    if (!window.confirm(confirmText)) return;

    const payloadByAction: Record<typeof action, Record<string, unknown>> = {
      confirm: { status: "CONFIRMED", meetingPoint: booking.meetingPoint || "To be shared by guide" },
      reject: { status: "CANCELLED", cancellationReason: "Rejected by guide" },
      start: { status: "IN_PROGRESS" },
      complete: { status: "COMPLETED" },
    };

    try {
      const res = await fetch(`/api/guide/partner/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadByAction[action]),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || "Xatolik");
      toast.success("Status yangilandi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
          Portal / Bandlovlar
        </p>
        <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight mt-1">
          Bandlovlarni boshqarish
        </h1>
        <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
          Status bo&apos;yicha qabul, rad etish va yakunlash
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Jami bandlovlar
          </p>
          <p className="text-[26px] font-display font-bold text-[#0d2137] mt-2">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Tasdiqlangan
          </p>
          <p className="text-[26px] font-display font-bold text-[#0d2137] mt-2">{stats.confirmed}</p>
          <div className="mt-2 h-1 rounded-full bg-[#f0f3ff] overflow-hidden">
            <div
              className="h-full bg-[#006781] rounded-full"
              style={{
                width: `${stats.total ? Math.min(100, (stats.confirmed / stats.total) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Kutilmoqda
          </p>
          <p className="text-[26px] font-display font-bold text-amber-600 mt-2">{stats.pending}</p>
        </div>
        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4">
          <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Oylik tushum
          </p>
          <p className="text-[22px] font-display font-bold text-[#006781] mt-2 tabular-nums">
            {stats.monthly.toLocaleString("uz-UZ")}
          </p>
          <p className="text-[11px] text-[#94A3B8] mt-1">UZS</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatus(tab)}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-[family-name:var(--font-sora)] font-semibold border ${
              status === tab
                ? "bg-[#0d2137] text-white border-[#0d2137]"
                : "bg-white text-[#64748B] border-[#d8e3fb]"
            }`}
          >
            {statusLabel(tab)}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Booking yo'q"
              message="Bu statusda booking topilmadi."
              ctaHref="/guide-partner/dashboard"
              ctaLabel="Dashboard"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="bg-[#f0f3ff] text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#64748B] uppercase tracking-wider">
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-5">Mehmon</th>
                  <th className="py-3 px-5">Sayohat</th>
                  <th className="py-3 px-5">Sana / vaqt</th>
                  <th className="py-3 px-5">Guruh</th>
                  <th className="py-3 px-5">Summa</th>
                  <th className="py-3 px-5">Holat</th>
                  <th className="py-3 px-5 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="text-[13px] divide-y divide-[#d8e3fb]">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-[#f9f9ff]">
                    <td className="py-3 px-5 font-[family-name:var(--font-sora)] font-semibold text-[#0d2137]">
                      #{b.id.slice(-6)}
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#006781] text-white text-[10px] font-bold flex items-center justify-center">
                          {guestInitials(b.guest)}
                        </div>
                        <span className="font-semibold text-[#111c2d]">
                          {b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "-"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-[#64748B] max-w-[180px] truncate">
                      {b.listing?.title || "—"}
                    </td>
                    <td className="py-3 px-5 text-[#64748B] whitespace-nowrap">
                      {new Date(b.date).toLocaleDateString("uz-UZ")} · {b.startTime}
                    </td>
                    <td className="py-3 px-5">
                      <span className="inline-flex px-2 py-1 rounded-lg bg-[#f0f3ff] text-[11px] font-semibold text-[#006781]">
                        {b.groupSize} kishi
                      </span>
                    </td>
                    <td className="py-3 px-5 font-bold tabular-nums">
                      {Number(b.totalPrice).toLocaleString("uz-UZ")}
                    </td>
                    <td className="py-3 px-5">
                      <span className={statusBadge(b.status)}>{statusLabel(b.status)}</span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        {b.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => void act(b, "confirm")}
                              className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg bg-[#006781] text-white"
                            >
                              Qabul qilish
                            </button>
                            <button
                              type="button"
                              onClick={() => void act(b, "reject")}
                              className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg bg-rose-50 text-rose-600"
                            >
                              Rad
                            </button>
                          </>
                        )}
                        {b.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() => void act(b, "start")}
                            className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg bg-amber-500 text-white"
                          >
                            Boshlash
                          </button>
                        )}
                        {b.status === "IN_PROGRESS" && (
                          <button
                            type="button"
                            onClick={() => void act(b, "complete")}
                            className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg bg-[#0d2137] text-white"
                          >
                            Yakunlash
                          </button>
                        )}
                        <Link
                          href={`/guide-partner/bookings/${b.id}`}
                          className="px-2.5 py-1 text-[11px] font-[family-name:var(--font-sora)] font-semibold rounded-lg border border-[#d8e3fb] text-[#64748B]"
                        >
                          Detail
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
