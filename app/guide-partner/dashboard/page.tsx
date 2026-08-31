"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  ListChecks,
  Plus,
  Wallet,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Listing = {
  id: string;
  status: string;
  title?: string;
};

type Booking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  groupSize?: number;
  guest: { first_name: string; last_name: string } | null;
  listing: { title: string } | null;
};

type EarningsSummary = {
  totalNet: number;
  pendingNet: number;
  totalCommission: number;
};

function statusBadge(status: string): string {
  if (status === "COMPLETED" || status === "CONFIRMED" || status === "ACTIVE") {
    return "gp-badge gp-badge-ok";
  }
  if (status === "PENDING") return "gp-badge gp-badge-wait";
  if (status === "IN_PROGRESS") return "gp-badge gp-badge-info";
  if (status === "CANCELLED" || status === "DISPUTE" || status === "REJECTED") {
    return "gp-badge gp-badge-cancel";
  }
  return "gp-badge gp-badge-muted";
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Kutilmoqda";
    case "CONFIRMED":
      return "Tasdiqlangan";
    case "IN_PROGRESS":
      return "Faol";
    case "COMPLETED":
      return "Yakunlandi";
    case "CANCELLED":
      return "Bekor";
    default:
      return status;
  }
}

export default function GuidePartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [onboarding, setOnboarding] = useState(false);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [lRes, bRes, eRes] = await Promise.all([
          fetch("/api/guide/partner/listings"),
          fetch("/api/guide/partner/bookings?limit=200"),
          fetch("/api/guide/earnings"),
        ]);
        const lData = await lRes.json();
        const bData = await bRes.json();
        const eData = await eRes.json();
        setOnboarding(Boolean(lData?.onboarding || bData?.onboarding || eData?.onboarding));
        if (lRes.ok && lData.success) setListings((lData.data?.data || []) as Listing[]);
        if (bRes.ok && bData.success) setBookings((bData.data?.data || []) as Booking[]);
        if (eRes.ok && eData?.summary) {
          setEarnings({
            totalNet: Number(eData.summary.totalNet ?? 0),
            pendingNet: Number(eData.summary.pendingNet ?? 0),
            totalCommission: Number(eData.summary.totalCommission ?? 0),
          });
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const stats = useMemo(() => {
    const activeListings = listings.filter((l) => l.status === "ACTIVE").length;
    const pendingBookings = bookings.filter((b) => b.status === "PENDING").length;
    const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED").length;
    const upcomingWeek = bookings.filter((b) => {
      if (!["CONFIRMED", "IN_PROGRESS"].includes(b.status)) return false;
      const d = new Date(b.date);
      const now = new Date();
      const week = new Date(now);
      week.setDate(now.getDate() + 7);
      return d >= new Date(now.setHours(0, 0, 0, 0)) && d <= week;
    }).length;
    return {
      totalBookings: bookings.length,
      activeListings,
      pendingBookings,
      confirmedBookings,
      upcomingWeek,
      totalNet: earnings?.totalNet ?? 0,
    };
  }, [listings, bookings, earnings]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysSchedule = useMemo(
    () =>
      bookings
        .filter((b) => b.date.slice(0, 10) === todayIso)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, todayIso],
  );

  const pendingRequests = useMemo(
    () => bookings.filter((b) => b.status === "PENDING").slice(0, 5),
    [bookings],
  );

  const popular = useMemo(() => {
    const map = new Map<string, { title: string; count: number; revenue: number }>();
    for (const b of bookings) {
      if (b.status === "CANCELLED") continue;
      const title = b.listing?.title || "Noma'lum";
      const prev = map.get(title) ?? { title, count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += Number(b.totalPrice || 0);
      map.set(title, prev);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [bookings]);

  const hasActiveListing = stats.activeListings > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-display font-bold text-[#0d2137] tracking-tight">
            Guide Dashboard
          </h1>
          <p className="text-[13px] font-medium text-[#64748B] mt-1.5">
            Bugungi jadval, so&apos;rovlar va daromadlar
          </p>
        </div>
        <Link href="/guide-partner/listings/new" className="gp-btn gp-btn-primary">
          <Plus size={14} />
          Tur qo&apos;shish
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={CalendarCheck} label="Jami bandlovlar" value={stats.totalBookings} hint={`${stats.confirmedBookings} tasdiqlangan`} />
        <StatCard icon={Clock} label="Kelgusi turlar" value={stats.upcomingWeek} hint={`Kutilmoqda: ${stats.pendingBookings}`} />
        <StatCard icon={ListChecks} label="Faol tajribalar" value={stats.activeListings} hint={`${listings.length} jami`} />
        <StatCard
          icon={Wallet}
          label="Daromad (net)"
          value={`${stats.totalNet.toLocaleString("uz-UZ")} UZS`}
          hint="Ledger payable"
        />
      </div>

      {(onboarding || !hasActiveListing) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">
            Sizda active listing yo&apos;q. Avval listingni aktiv holatga olib chiqing.
          </p>
          <Link
            href="/guide-partner/listings/new"
            className="inline-flex items-center gap-1 mt-3 text-sm font-[family-name:var(--font-sora)] font-semibold text-amber-700"
          >
            Listing yaratish <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
        <div className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#d8e3fb] flex items-center justify-between gap-3">
            <h3 className="font-display font-semibold text-[#0d2137] text-[16px]">Bugungi jadval</h3>
            <div className="flex items-center gap-2">
              <Link href="/guide-partner/bookings" className="gp-btn gp-btn-ghost !py-1.5 !px-3 text-[11px]">
                Tarix
              </Link>
              <Link href="/guide-partner/listings/new" className="gp-btn gp-btn-primary !py-1.5 !px-3 text-[11px]">
                <Plus size={12} /> Tur
              </Link>
            </div>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : todaysSchedule.length === 0 ? (
              <EmptyState
                title="Bugun booking yo'q"
                message="Yangi tasdiqlangan bookinglar shu yerda chiqadi."
              />
            ) : (
              <div className="space-y-2">
                {todaysSchedule.map((b) => (
                  <Link
                    key={b.id}
                    href={`/guide-partner/bookings/${b.id}`}
                    className="border border-[#d8e3fb] rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-[#f9f9ff] no-underline"
                  >
                    <div className="min-w-0">
                      <p className="font-[family-name:var(--font-sora)] font-semibold text-[13px] text-[#0d2137]">
                        {b.startTime} – {b.endTime}
                      </p>
                      <p className="text-[12px] text-[#64748B] mt-0.5 truncate">
                        {b.listing?.title ?? "-"} ·{" "}
                        {b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "Mijoz"}
                        {b.groupSize ? ` · ${b.groupSize} kishi` : ""}
                      </p>
                    </div>
                    <span className={statusBadge(b.status)}>{statusLabel(b.status)}</span>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/guide-partner/bookings"
              className="inline-flex items-center gap-1 mt-4 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#006781]"
            >
              Barcha turlarni ko&apos;rish <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#d8e3fb] flex items-center justify-between">
            <h3 className="font-display font-semibold text-[#0d2137] text-[16px]">Yangi so&apos;rovlar</h3>
            {stats.pendingBookings > 0 ? (
              <span className="gp-badge gp-badge-cancel">{stats.pendingBookings} yangi</span>
            ) : null}
          </div>
          <div className="p-5 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : pendingRequests.length === 0 ? (
              <p className="text-xs font-semibold text-[#94A3B8] py-8 text-center">Yangi so&apos;rov yo&apos;q</p>
            ) : (
              pendingRequests.map((b) => (
                <Link
                  key={b.id}
                  href={`/guide-partner/bookings/${b.id}`}
                  className="block p-3 rounded-xl border border-[#d8e3fb] hover:bg-[#f9f9ff] no-underline"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#111c2d]">
                      {b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "Mijoz"}
                    </p>
                    <span className="text-[10px] text-[#94A3B8]">
                      {new Date(b.date).toLocaleDateString("uz-UZ")}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#64748B] mt-1 truncate">
                    {b.listing?.title ?? "Tajriba"} · {b.startTime}
                  </p>
                </Link>
              ))
            )}
            <Link href="/guide-partner/bookings?status=PENDING" className="gp-btn gp-btn-soft w-full">
              Barchasiga javob berish
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#d8e3fb] rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-[#0d2137] text-[16px]">
            Mashhur tajribalar
          </h3>
          <span className="text-[11px] font-semibold text-[#94A3B8]">Oxirgi ma&apos;lumotlar</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : popular.length === 0 ? (
          <p className="text-sm text-[#94A3B8] font-semibold py-6 text-center">Hali ma&apos;lumot yo&apos;q</p>
        ) : (
          <div className="space-y-3">
            {popular.map((p, idx) => (
              <div
                key={p.title}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#d8e3fb]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-[#f0f3ff] text-[#0d2137] font-bold text-sm flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13px] text-[#111c2d] truncate">{p.title}</p>
                    <p className="text-[11px] text-[#64748B]">{p.count} bandlov</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[13px] text-[#006781] tabular-nums">
                    {p.revenue.toLocaleString("uz-UZ")}
                  </p>
                  <p className="text-[10px] text-[#94A3B8]">UZS</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link
        href="/guide-partner/listings/new"
        className="fixed bottom-20 right-5 lg:bottom-8 z-30 w-14 h-14 rounded-full bg-[#006781] text-white shadow-[0_8px_24px_rgba(0,103,129,0.35)] flex items-center justify-center hover:bg-[#005a71] xl:hidden"
        aria-label="Yangi tajriba"
      >
        <Plus size={24} strokeWidth={2.5} />
      </Link>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-[#d8e3fb] rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <p className="text-[11px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-wider">
          {label}
        </p>
        <div className="p-2 bg-[#f0f3ff] rounded-xl text-[#006781]">
          <Icon size={16} />
        </div>
      </div>
      <div className="text-[22px] sm:text-[26px] font-display font-bold text-[#0d2137] leading-none">
        {value}
      </div>
      {hint ? <p className="text-[11px] font-medium text-[#64748B] mt-2">{hint}</p> : null}
    </div>
  );
}
