"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Clock, CreditCard, ListChecks } from "lucide-react";

type Listing = {
  id: string;
  title?: string;
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
          fetch("/api/admin/homestay/listings?limit=200", { credentials: "include" }),
          fetch("/api/admin/homestay/bookings?limit=500", { credentials: "include" }),
        ]);
        const lJson = await lRes.json();
        const bJson = await bRes.json();
        setListings(
          Array.isArray(lJson?.data)
            ? lJson.data
            : Array.isArray(lJson?.items)
              ? lJson.items
              : [],
        );
        setBookings(
          Array.isArray(bJson?.data)
            ? bJson.data
            : Array.isArray(bJson?.items)
              ? bJson.items
              : [],
        );
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Uy Mehmonxona</h1>
        <Link
          href="/admin/homestay/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          + Yangi qo'shish
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/homestay/listings" className="adm-btn adm-btn-primary">Listings</Link>
        <Link href="/admin/homestay/bookings" className="adm-btn">Bookings</Link>
        <Link href="/admin/homestay/partners" className="adm-btn">Partners</Link>
      </div>

      <div className="adm-kpi-grid">
        <StatCard icon={Building2} label="Total listings" value={stats.totalListings} color="blue" />
        <StatCard icon={Clock} label="Pending verification" value={stats.pendingVerification} color="yellow" />
        <StatCard icon={ListChecks} label="Bookings this month" value={stats.bookingsThisMonth} color="teal" />
        <StatCard icon={CreditCard} label="Revenue this month" value={`${stats.revenueThisMonth.toLocaleString()} UZS`} color="green" />
      </div>

      {!loading ? (
        <div className="adm-card p-4">
          <h2 className="text-lg font-semibold mb-3">Listinglar</h2>
          {listings.length === 0 ? (
            <div className="text-sm text-slate-500">Listing topilmadi</div>
          ) : (
            <div className="space-y-2">
              {listings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <div className="font-medium text-slate-800">
                    {listing.title || `Listing #${listing.id.slice(0, 8)}`}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      listing.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : listing.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {listing.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

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
