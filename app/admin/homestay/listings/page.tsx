"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Listing = {
  id: string;
  hostName: string;
  title: string;
  city: string;
  pricePerNight: number;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" | "BLOCKED";
  bookingCount: number;
  createdAt: string;
};

const statusClass: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-100",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-100",
  BLOCKED: "bg-rose-50 text-rose-700 ring-rose-100",
};

export default function AdminHomeStayListingsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Listing[]>([]);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const qs = status ? `?status=${status}&limit=200` : "?limit=200";
      const res = await fetch(`/api/admin/homestay/listings${qs}`);
      const data = await res.json();
      setItems(data?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  const allChecked = useMemo(() => items.length > 0 && selected.length === items.length, [items, selected]);

  function toggleOne(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    if (allChecked) setSelected([]);
    else setSelected(items.map((i) => i.id));
  }

  async function bulkUpdate(targetStatus: "ACTIVE" | "REJECTED") {
    if (selected.length === 0) return;
    setProcessing(true);
    try {
      await Promise.all(
        selected.map((id) =>
          fetch(`/api/admin/homestay/listings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetStatus, note: `Bulk ${targetStatus.toLowerCase()} by admin` }),
          }),
        ),
      );
      toast.success(`Selected listings set to ${targetStatus}`);
      setSelected([]);
      void load();
    } catch {
      toast.error("Bulk action xatolik");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">HomeStay Listings</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Listinglarni moderation qilish</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void bulkUpdate("ACTIVE")} disabled={processing || selected.length === 0} className="adm-btn adm-btn-primary disabled:opacity-50">
            Approve all
          </button>
          <button onClick={() => void bulkUpdate("REJECTED")} disabled={processing || selected.length === 0} className="adm-btn disabled:opacity-50">
            Reject all
          </button>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white">
        <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner w-full sm:w-fit">
          {["", "PENDING", "ACTIVE", "INACTIVE", "REJECTED", "BLOCKED"].map((st) => (
            <button
              key={st || "all"}
              onClick={() => setStatus(st)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
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
                <th className="pl-8"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th>Host</th>
                <th>Title</th>
                <th>City</th>
                <th>Price/night</th>
                <th>Status</th>
                <th>Bookings</th>
                <th>Created</th>
                <th className="pr-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={9} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-300" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="py-20 text-center text-slate-400 font-bold">Listinglar topilmadi</td></tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 pl-8">
                      <input type="checkbox" checked={selected.includes(i.id)} onChange={() => toggleOne(i.id)} />
                    </td>
                    <td className="py-5 text-sm font-black text-slate-900">{i.hostName}</td>
                    <td className="py-5 text-sm font-black text-slate-900">{i.title}</td>
                    <td className="py-5 text-sm font-bold text-slate-500">{i.city}</td>
                    <td className="py-5 text-sm font-black text-slate-900">{Number(i.pricePerNight).toLocaleString()}</td>
                    <td className="py-5">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ${statusClass[i.status] || statusClass.INACTIVE}`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="py-5 text-sm font-black text-slate-700">{i.bookingCount}</td>
                    <td className="py-5 text-xs font-bold text-slate-400">{new Date(i.createdAt).toLocaleDateString()}</td>
                    <td className="py-5 pr-8 text-right">
                      <Link href={`/admin/homestay/listings/${i.id}`} className="adm-btn text-xs">Review</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
