"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Edit3, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Listing = {
  id: string;
  title: string;
  category: string;
  pricePerHour: number;
  languages: string[];
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" | "BLOCKED";
  bookingCount?: number;
  totalBookings?: number;
};

const statusClass: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  BLOCKED: "bg-red-50 text-red-700 border-red-200",
};

export default function GuidePartnerListingsPage() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/guide/partner/listings");
        const data = await res.json();
        if (res.ok && data.success) setItems((data.data?.data || []) as Listing[]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight">Guide Listings</h1>
          <p className="text-[13px] font-semibold text-slate-500 mt-1">Barcha listinglaringiz</p>
        </div>
        <Link href="/guide-partner/listings/new" className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white text-[13px] font-black rounded-xl">
          <Plus size={16} />
          Yangi listing
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Listing yo&apos;q"
              message="Yangi listing yarating."
              ctaHref="/guide-partner/listings/new"
              ctaLabel="Yangi listing"
            />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-5">Title</th>
                <th className="py-3 px-5">Category</th>
                <th className="py-3 px-5">Price/hour</th>
                <th className="py-3 px-5">Languages</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Total bookings</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="py-3 px-5 font-bold text-[var(--primary)]">{item.title}</td>
                  <td className="py-3 px-5">{item.category}</td>
                  <td className="py-3 px-5 font-black">{Number(item.pricePerHour).toLocaleString()}</td>
                  <td className="py-3 px-5">{item.languages?.join(", ") || "-"}</td>
                  <td className="py-3 px-5">
                    <span className={`px-2 py-1 rounded border text-[10px] font-black uppercase ${statusClass[item.status] || statusClass.INACTIVE}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-5">{item.bookingCount ?? item.totalBookings ?? 0}</td>
                  <td className="py-3 px-5 text-right">
                    <div className="inline-flex gap-1">
                      <Link href={`/guide-partner/listings/${item.id}/edit`} className="p-1.5 rounded-md text-slate-400 hover:text-[var(--accent)] hover:bg-slate-100">
                        <Edit3 size={15} />
                      </Link>
                      <Link href={`/guide-partner/listings/${item.id}/calendar`} className="p-1.5 rounded-md text-slate-400 hover:text-[var(--accent)] hover:bg-slate-100">
                        <CalendarDays size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
