"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Clock, CreditCard, ListChecks } from "lucide-react";

type Listing = {
  id: string;
  status: string;
};

type Booking = {
  id: string;
  status: string;
  totalPrice: number;
  createdAt: string;
};

export default function AdminHomeStayOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [lRes, bRes] = await Promise.all([
          fetch("/api/admin/homestay/listings?limit=200"),
          fetch("/api/admin/homestay/bookings?limit=500"),
        ]);
        const lData = await lRes.json();
        const bData = await bRes.json();
        setListings(lData?.items || []);
        setBookings(bData?.items || []);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const bookingsThisMonth = bookings.filter((b) => {
      const d = new Date(b.createdAt);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const revenueThisMonth = bookingsThisMonth
      .filter((b) => ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"].includes(b.status))
      .reduce((sum, b) => sum + Number(b.totalPrice), 0);
    return {
      totalListings: listings.length,
      pendingVerification: listings.filter((l) => l.status === "PENDING").length,
      bookingsThisMonth: bookingsThisMonth.length,
      revenueThisMonth,
    };
  }, [listings, bookings]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Uy Mehmonxona</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Platforma bo'yicha HomeStay monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/homestay/listings" className="adm-btn adm-btn-primary">Listings</Link>
          <Link href="/admin/homestay/bookings" className="adm-btn">Bookings</Link>
          <Link href="/admin/homestay/partners" className="adm-btn">Partners</Link>
        </div>
      </div>

      <div className="adm-kpi-grid">
        <StatCard icon={Building2} label="Total listings" value={stats.totalListings} color="blue" />
        <StatCard icon={Clock} label="Pending verification" value={stats.pendingVerification} color="yellow" />
        <StatCard icon={ListChecks} label="Bookings this month" value={stats.bookingsThisMonth} color="teal" />
        <StatCard icon={CreditCard} label="Revenue this month" value={`${stats.revenueThisMonth.toLocaleString()} UZS`} color="green" />
      </div>

      {loading ? (
        <div className="adm-card p-10 text-center text-slate-400 font-bold">Yuklanmoqda...</div>
      ) : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="adm-kpi-card border-none shadow-xl shadow-slate-200/50 bg-white">
      <div className={`adm-kpi-icon ${color}`}>
        <Icon size={22} />
      </div>
      <div className="adm-kpi-content">
        <div className="adm-kpi-label">{label}</div>
        <div className="adm-kpi-value">{value}</div>
      </div>
    </div>
  );
}
