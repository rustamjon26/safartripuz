"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock, ListChecks, Wallet } from "lucide-react";
import type { ElementType } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Listing = {
  id: string;
  status: string;
};

type Booking = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  guest: { first_name: string; last_name: string } | null;
  listing: { title: string } | null;
};

export default function GuidePartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [lRes, bRes] = await Promise.all([
          fetch("/api/guide/partner/listings"),
          fetch("/api/guide/partner/bookings?limit=200"),
        ]);
        const lData = await lRes.json();
        const bData = await bRes.json();
        setOnboarding(Boolean(lData?.onboarding || bData?.onboarding));
        if (lRes.ok && lData.success) setListings((lData.data?.data || []) as Listing[]);
        if (bRes.ok && bData.success) setBookings((bData.data?.data || []) as Booking[]);
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
    const now = new Date();
    const monthRevenue = bookings
      .filter((b) => {
        const d = new Date(b.date);
        return b.status === "COMPLETED" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);
    return { activeListings, pendingBookings, confirmedBookings, monthRevenue };
  }, [listings, bookings]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysSchedule = useMemo(
    () =>
      bookings
        .filter((b) => b.date.slice(0, 10) === todayIso)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings, todayIso],
  );

  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "CONFIRMED" && new Date(b.date).getTime() >= new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => {
          const da = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (da !== 0) return da;
          return a.startTime.localeCompare(b.startTime);
        })
        .slice(0, 5),
    [bookings],
  );

  const hasActiveListing = stats.activeListings > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Guide Dashboard</h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">Kundalik ish holati</p>
        </div>
        <Link href="/guide-partner/listings/new" className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-black rounded-xl">
          Yangi listing
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ListChecks} label="Active listings" value={stats.activeListings} />
        <StatCard icon={Clock} label="Pending bookings" value={stats.pendingBookings} />
        <StatCard icon={CalendarCheck} label="Confirmed bookings" value={stats.confirmedBookings} />
        <StatCard icon={Wallet} label="Revenue (month)" value={`${stats.monthRevenue.toLocaleString()} UZS`} />
      </div>

      {(onboarding || !hasActiveListing) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">Sizda active listing yo&apos;q. Avval listingni aktiv holatga olib chiqing.</p>
          <Link href="/guide-partner/listings/new" className="inline-block mt-3 text-sm font-black text-amber-700 underline">
            Listing yaratish
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Today's schedule">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : todaysSchedule.length === 0 ? (
            <EmptyState title="Bugun booking yo&apos;q" message="Yangi tasdiqlangan bookinglar shu yerda chiqadi." />
          ) : (
            <div className="space-y-2">
              {todaysSchedule.map((b) => (
                <div key={b.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{b.startTime} - {b.endTime}</p>
                    <p className="text-xs text-slate-500">{b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "Mijoz"} - {b.listing?.title ?? "-"}</p>
                  </div>
                  <span className="text-xs font-black px-2 py-1 rounded border bg-slate-100 border-slate-200">{b.status}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Upcoming confirmed (next 5)">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : upcoming.length === 0 ? (
            <EmptyState title="Upcoming booking yo&apos;q" message="Tasdiqlangan bookinglar bu yerda ko&apos;rinadi." />
          ) : (
            <div className="space-y-2">
              {upcoming.map((b) => (
                <div key={b.id} className="border border-slate-200 rounded-xl p-3">
                  <p className="font-bold text-sm">{new Date(b.date).toLocaleDateString()} - {b.startTime}</p>
                  <p className="text-xs text-slate-500">{b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "Mijoz"} - {b.listing?.title ?? "-"}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-extrabold text-[var(--primary)] text-[15px]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
          <Icon size={14} />
        </div>
      </div>
      <div className="text-2xl font-black text-[var(--primary)]">{value}</div>
    </div>
  );
}
