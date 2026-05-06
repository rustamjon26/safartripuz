"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, Clock3, Wallet } from "lucide-react";
import { AdminTaxiPageHeader } from "@/components/admin/taxi/PageHeader";
import { AdminTaxiStatusBadge } from "@/components/admin/taxi/AdminTaxiStatusBadge";
import { AdminKpiGridSkeleton } from "@/components/admin/AdminKpiGridSkeleton";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatDate";

type Order = {
  id: string;
  status: string;
  createdAt: string;
  estimatedPrice: number;
  finalPrice: number | null;
  pickupAddress: string;
  dropoffAddress: string;
  customer: { first_name: string; last_name: string } | null;
  driver: { first_name: string; last_name: string } | null;
};

type Driver = {
  isOnline: boolean;
};

export default function AdminTaxiOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [oRes, dRes] = await Promise.all([
        fetch("/api/admin/taxi/orders?limit=500&page=1"),
        fetch("/api/admin/taxi/drivers?limit=500&page=1"),
      ]);
      const oJson = (await oRes.json()) as { data?: Order[] };
      const dJson = (await dRes.json()) as { data?: Driver[] };
      setOrders(oJson?.data ?? []);
      setDrivers(dJson?.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const isToday = (value: string) => {
      const d = new Date(value);
      return (
        d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    };
    const todayOrders = orders.filter((o) => isToday(o.createdAt));
    const activeToday = todayOrders.filter((o) => ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(o.status)).length;
    const completedToday = todayOrders.filter((o) => o.status === "COMPLETED");
    const revenueToday = completedToday.reduce((s, o) => s + Number(o.finalPrice ?? o.estimatedPrice ?? 0), 0);
    const onlineDriversCount = drivers.filter((d) => d.isOnline).length;
    return {
      activeToday,
      completedToday: completedToday.length,
      revenueToday,
      onlineDriversCount,
    };
  }, [orders, drivers]);

  const liveActiveOrders = useMemo(
    () =>
      orders
        .filter((o) => ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(o.status))
        .slice(0, 30),
    [orders],
  );

  return (
    <div className="space-y-8">
      <AdminTaxiPageHeader
        title="Taxi"
        subtitle={"Platforma bo'yicha taxi monitoring va jonli buyurtmalar"}
        actions={[
          { href: "/admin/taxi/orders", label: "Buyurtmalar", primary: true },
          { href: "/admin/taxi/drivers", label: "Haydovchilar" },
          { href: "/admin/taxi/disputes", label: "Nizolar" },
        ]}
      />

      {loading ? (
        <AdminKpiGridSkeleton count={4} />
      ) : (
        <div className="adm-kpi-grid">
          <Stat icon={Clock3} label="Bugungi faol buyurtmalar" value={stats.activeToday} color="yellow" />
          <Stat icon={CheckCircle2} label="Bugungi tugallangan" value={stats.completedToday} color="green" />
          <Stat
            icon={Wallet}
            label="Bugungi daromad"
            value={`${stats.revenueToday.toLocaleString()} ${"so'm"}`}
            color="teal"
          />
          <Stat icon={Car} label="Onlayn haydovchilar" value={stats.onlineDriversCount} color="blue" />
        </div>
      )}

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50 flex items-center justify-between">
          <span className="text-lg font-black text-slate-900 tracking-tight">Jonli faol buyurtmalar</span>
          <span className="text-xs font-bold text-slate-400">30 soniyada yangilanadi</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Buyurtma ID</th>
                <th>Mijoz</th>
                <th>Haydovchi</th>
                <th>Holat</th>
                <th>{"Yo'nalish"}</th>
                <th className="pr-8">Vaqt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={6} rows={6} />
              ) : liveActiveOrders.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState variant="embedded" message="Hech qanday buyurtma topilmadi" />
                  </td>
                </tr>
              ) : (
                liveActiveOrders.map((o) => (
                  <tr
                    key={o.id}
                    role="link"
                    tabIndex={0}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/taxi/orders/${o.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/admin/taxi/orders/${o.id}`);
                    }}
                  >
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      <Link href={`/admin/taxi/orders/${o.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                        #{o.id.slice(-8)}
                      </Link>
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-700">
                      {o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "-"}
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-500">
                      {o.driver ? `${o.driver.first_name} ${o.driver.last_name}` : "Tayinlanmagan"}
                    </td>
                    <td className="py-4">
                      <AdminTaxiStatusBadge status={o.status} />
                    </td>
                    <td
                      className="py-4 text-xs font-bold text-slate-500 max-w-[220px] truncate"
                      title={`${o.pickupAddress} → ${o.dropoffAddress}`}
                    >
                      {o.pickupAddress} → {o.dropoffAddress}
                    </td>
                    <td className="py-4 pr-8 text-xs font-bold text-slate-400 whitespace-nowrap">
                      {formatDateTime(o.createdAt)}
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

function Stat({
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
