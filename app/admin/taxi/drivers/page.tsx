"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  vehicleCount: number;
  totalTrips: number;
  rating: number | null;
  isOnline: boolean;
  isBlocked: boolean;
};

export default function AdminTaxiDriversPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Driver[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/taxi/drivers");
      const json = await res.json();
      setItems(json?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(id: string, type: "block" | "unblock" | "verify") {
    try {
      const res = await fetch(`/api/admin/taxi/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Yangilandi");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Taxi Drivers</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">Driverlarni boshqarish</p>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Name</th>
                <th>Phone</th>
                <th>Vehicle count</th>
                <th>Total trips</th>
                <th>Rating</th>
                <th>Online</th>
                <th>Account</th>
                <th className="pr-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="py-20 text-center text-slate-400 font-bold">Yuklanmoqda...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-slate-400 font-bold">Driver topilmadi</td></tr>
              ) : (
                items.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      <Link href={`/admin/taxi/drivers/${d.id}`} className="hover:underline">
                        {d.first_name} {d.last_name}
                      </Link>
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-500">{d.phone}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{d.vehicleCount}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{d.totalTrips}</td>
                    <td className="py-4 text-sm font-black text-slate-900">{d.rating?.toFixed(1) ?? "-"}</td>
                    <td className="py-4 text-xs font-black">
                      <span className={`px-2 py-1 rounded border ${d.isOnline ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {d.isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-black">
                      <span className={`px-2 py-1 rounded border ${d.isBlocked ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                        {d.isBlocked ? "BLOCKED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-4 pr-8 text-right">
                      <div className="inline-flex gap-2">
                        {d.isBlocked ? (
                          <button onClick={() => void action(d.id, "unblock")} className="adm-btn text-xs">Unblock</button>
                        ) : (
                          <button onClick={() => void action(d.id, "block")} className="adm-btn text-xs">Block</button>
                        )}
                        <button onClick={() => void action(d.id, "verify")} className="adm-btn adm-btn-primary text-xs">Verify</button>
                      </div>
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
