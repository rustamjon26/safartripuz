"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Partner = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  isBlocked: boolean;
  createdAt: string;
  listingCount: number;
  totalBookingRevenue: number;
};

export default function AdminHomeStayPartnersPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Partner[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homestay/partners?limit=300");
      const data = await res.json();
      setItems(data?.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleBlock(partner: Partner) {
    setBusy(partner.id);
    try {
      const action = partner.isBlocked ? "unblock" : "block";
      const res = await fetch(`/api/admin/homestay/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Xatolik");
      toast.success(action === "block" ? "Partner blocked" : "Partner unblocked");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Server xatosi");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">HomeStay Host Partners</h1>
        <p className="text-sm font-bold text-slate-400 mt-1">home_stay_partner roldagi foydalanuvchilar</p>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Listing count</th>
                <th>Total revenue</th>
                <th>Joined</th>
                <th>Status</th>
                <th className="pr-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={8} className="py-20 text-center"><Loader2 size={32} className="animate-spin mx-auto text-slate-300" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-slate-400 font-bold">Partnerlar topilmadi</td></tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">{p.first_name} {p.last_name}</td>
                    <td className="py-4 text-sm font-bold text-slate-500">{p.email}</td>
                    <td className="py-4 text-sm font-bold text-slate-500">{p.phone}</td>
                    <td className="py-4 text-sm font-black text-slate-700">{p.listingCount}</td>
                    <td className="py-4 text-sm font-black text-slate-700">{Number(p.totalBookingRevenue).toLocaleString()}</td>
                    <td className="py-4 text-xs font-bold text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="py-4">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 ${p.isBlocked ? "bg-rose-50 text-rose-700 ring-rose-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"}`}>
                        {p.isBlocked ? "BLOCKED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="py-4 pr-8 text-right">
                      <button onClick={() => void toggleBlock(p)} disabled={busy === p.id} className="adm-btn text-xs disabled:opacity-50">
                        {busy === p.id ? "..." : p.isBlocked ? "Unblock" : "Block"}
                      </button>
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
