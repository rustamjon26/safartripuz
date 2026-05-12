"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Plus, Wallet, Home, Clock } from "lucide-react";
import type { ElementType } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Booking = {
  id: string;
  guest: { first_name: string; last_name: string } | null;
  listing: { title: string } | null;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  createdAt: string;
};

type Listing = {
  id: string;
  title: string;
  status?: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" | "BLOCKED";
};

export default function HomeStayPartnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [bRes, lRes] = await Promise.all([
          fetch("/api/homestay/host/bookings"),
          fetch("/api/homestay/host/listings"),
        ]);
        const bData = await bRes.json();
        const lData = await lRes.json();
        setOnboarding(Boolean(bData?.onboarding || lData?.onboarding));
        setBookings((bData?.data?.data || []) as Booking[]);
        setListings((lData?.data?.data || []) as Listing[]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === "PENDING").length;
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const monthRevenue = bookings
      .filter((b) => {
        const d = new Date(b.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);
    return {
      totalListings: listings.length,
      pendingBookings: pending,
      confirmedBookings: confirmed,
      monthRevenue,
    };
  }, [bookings, listings]);

  const listingsAwaitingApproval = useMemo(
    () => listings.filter((l) => l.status === "PENDING").length,
    [listings],
  );
  const hasAnyActiveListing = useMemo(
    () => listings.some((l) => l.status === "ACTIVE"),
    [listings],
  );

  const recent = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 5),
    [bookings],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">
            Home Stay Dashboard
          </h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">Host panel overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/homestay-partner/listings/new" className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white text-[13px] font-black rounded-xl">
            <Plus size={16} />
            Add listing
          </Link>
          <Link href="/homestay-partner/bookings" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-[13px] font-black rounded-xl">
            <CalendarCheck size={16} />
            View bookings
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Home} label="Total listings" value={stats.totalListings} />
        <StatCard icon={Clock} label="Pending bookings" value={stats.pendingBookings} />
        <StatCard icon={CalendarCheck} label="Confirmed bookings" value={stats.confirmedBookings} />
        <StatCard icon={Wallet} label="Revenue (month)" value={`${stats.monthRevenue.toLocaleString()} UZS`} />
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">
            Sizda hali listing yo'q. Davom etish uchun yangi listing yarating.
          </p>
          <Link href="/homestay-partner/listings/new" className="inline-block mt-3 text-sm font-black text-amber-700 underline">
            Listing yaratish
          </Link>
        </div>
      ) : !hasAnyActiveListing && listingsAwaitingApproval > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">
            {listingsAwaitingApproval === 1
              ? "Listingingiz admin tasdig'ini kutmoqda. Tasdiqlanganidan keyin u mehmonlarga ko'rinadi."
              : `${listingsAwaitingApproval} ta listingingiz admin tasdig'ini kutmoqda.`}
          </p>
          <Link href="/homestay-partner/listings" className="inline-block mt-3 text-sm font-black text-amber-700 underline">
            Listinglarni ko'rish
          </Link>
        </div>
      ) : null}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-extrabold text-[var(--primary)] text-[15px]">Recent bookings</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : onboarding ? (
          <div className="p-6">
            <EmptyState
              title="Onboarding tugallanmagan"
              message="Dashboardda buyurtmalar ko'rinishi uchun avval bitta listing yarating."
              ctaHref="/homestay-partner/listings/new"
              ctaLabel="Listing yaratish"
            />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Guest</th>
                <th className="py-3 px-5">Listing</th>
                <th className="py-3 px-5">Dates</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center font-semibold text-slate-400">
                    No bookings yet
                  </td>
                </tr>
              ) : (
                recent.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-5 font-bold text-slate-700">
                      {b.guest ? `${b.guest.first_name} ${b.guest.last_name}` : "-"}
                    </td>
                    <td className="py-3 px-5">{b.listing?.title || "-"}</td>
                    <td className="py-3 px-5 text-slate-500 font-semibold">
                      {new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-5">
                      <span className="px-2 py-1 rounded border text-[10px] font-black uppercase bg-slate-100 text-slate-600 border-slate-200">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right font-black">{Number(b.totalPrice).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
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
