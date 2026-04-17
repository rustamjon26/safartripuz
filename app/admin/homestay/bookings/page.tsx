"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

type Booking = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  createdAt: string;
  listing: { id: string; title: string; host?: { first_name: string; last_name: string } };
  guest: { id: string; first_name: string; last_name: string };
};

export default function AdminHomeStayBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Booking[]>([]);
  const [status, setStatus] = useState("");
  const [totals, setTotals] = useState<{ byStatus: Record<string, number>; totalRevenue: number } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}&limit=300` : "?limit=300";
      const res = await fetch(`/api/admin/homestay/bookings${qs}`);
      const data = await res.json();
      setItems(data?.data || []);
      setTotals(data?.totals || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  const confirmedRevenue = useMemo(
    () =>
      items
        .filter((b) => ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED"].includes(b.status))
        .reduce((sum, b) => sum + Number(b.totalPrice), 0),
    [items],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">HomeStay Bookings</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">Platformadagi barcha HomeStay bookinglar</p>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white">
        <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner w-full sm:w-fit overflow-x-auto">
          {["", "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "COMPLETED", "CANCELLED", "DISPUTE"].map((st) => (
            <button
              key={st || "all"}
              onClick={() => setStatus(st)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                status === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
              }`}
            >
              {st || "ALL"}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Guest</th>
                <th>Host</th>
                <th>Listing</th>
                <th>Dates</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="pr-8">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={7} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-300" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="py-20 text-center text-slate-400 font-bold">Bookinglar topilmadi</td></tr>
              ) : (
                items.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      <Link href={`/admin/homestay/bookings/${b.id}`} className="hover:underline">
                        {b.guest.first_name} {b.guest.last_name}
                      </Link>
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-500">{b.listing.host ? `${b.listing.host.first_name} ${b.listing.host.last_name}` : "-"}</td>
                    <td className="py-4 text-sm font-bold text-slate-700">{b.listing.title}</td>
                    <td className="py-4 text-xs font-bold text-slate-500">{new Date(b.checkIn).toLocaleDateString()} - {new Date(b.checkOut).toLocaleDateString()}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{Number(b.totalPrice).toLocaleString()}</td>
                    <td className="py-4 text-xs font-black text-slate-600">{b.status}</td>
                    <td className="py-4 pr-8 text-xs font-bold text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-100">
                <td colSpan={4} className="py-4 pl-8 text-sm font-black text-slate-700">Total confirmed revenue</td>
                <td className="py-4 text-sm font-black text-slate-900">{confirmedRevenue.toLocaleString()} UZS</td>
                <td colSpan={2} className="py-4 pr-8 text-right text-xs font-bold text-slate-400">
                  {totals ? `All revenue: ${Number(totals.totalRevenue || 0).toLocaleString()} UZS` : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
