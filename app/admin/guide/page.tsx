"use client";

import { useCallback, useEffect, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { ListChecks, MapPin, Clock3, Wallet } from "lucide-react";
import { AdminTaxiPageHeader } from "@/components/admin/taxi/PageHeader";
import { AdminKpiGridSkeleton } from "@/components/admin/AdminKpiGridSkeleton";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatDate";

type Stats = {
  activeListings: number;
  pendingListings: number;
  bookingsThisMonth: number;
  revenueThisMonth: number;
};

type PendingRow = {
  id: string;
  title: string;
  category: string;
  pricePerHour: unknown;
  createdAt: string;
  guideName: string;
};

export default function AdminGuideOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<PendingRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/admin/guide/stats"),
        fetch("/api/admin/guide/listings?status=PENDING&limit=50&page=1"),
      ]);
      const sJson = (await sRes.json()) as Stats;
      const pJson = (await pRes.json()) as { data?: PendingRow[] };
      if (sRes.ok) setStats(sJson);
      setPending(pJson?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <AdminTaxiPageHeader
        title="Ekskursiya"
        subtitle={"Qo'llanmalar, bronlar va ekskursiya hamkorlari monitoringi"}
        actions={[
          { href: "/admin/guide/listings", label: "Listinglar", primary: true },
          { href: "/admin/guide/bookings", label: "Bronlar" },
          { href: "/admin/guide/guides", label: "Hamkorlar" },
        ]}
      />

      {loading ? (
        <AdminKpiGridSkeleton count={4} />
      ) : (
        <div className="adm-kpi-grid">
          <StatCard icon={MapPin} label="Jami aktiv listinglar" value={stats?.activeListings ?? "—"} color="blue" />
          <StatCard icon={Clock3} label="Tasdiqlash kutilmoqda" value={stats?.pendingListings ?? "—"} color="yellow" />
          <StatCard icon={ListChecks} label={"Bu oylik bronlar"} value={stats?.bookingsThisMonth ?? "—"} color="teal" />
          <StatCard
            icon={Wallet}
            label={"Bu oylik daromad (tugallangan)"}
            value={stats != null ? `${stats.revenueThisMonth.toLocaleString()} so'm` : "—"}
            color="green"
          />
        </div>
      )}

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Tasdiq kutilayotgan listinglar</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Guide ismi</th>
                <th>Sarlavha</th>
                <th>Kategoriya</th>
                <th>Narx/soat</th>
                <th>Yaratilgan sana</th>
                <th className="pr-8 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={6} rows={6} />
              ) : pending.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState variant="embedded" message="Listinglar topilmadi" />
                  </td>
                </tr>
              ) : (
                pending.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">{row.guideName}</td>
                    <td className="py-4 text-sm font-bold text-slate-800">{row.title}</td>
                    <td className="py-4 text-xs font-black text-slate-500">{row.category}</td>
                    <td className="py-4 text-sm font-black text-slate-900">
                      {Number(row.pricePerHour).toLocaleString()} {"so'm"}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-400 whitespace-nowrap">{formatDateTime(row.createdAt)}</td>
                    <td className="py-4 pr-8 text-right">
                      <Link href={`/admin/guide/listings/${row.id}`} className="adm-btn adm-btn-primary text-xs">
                        {"Ko'rish"}
                      </Link>
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

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
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
