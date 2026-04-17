"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Car, CheckCircle2, Clock3, Wallet } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [oRes, dRes] = await Promise.all([
        fetch("/api/admin/taxi/orders?limit=300"),
        fetch("/api/admin/taxi/drivers"),
      ]);
      const oJson = await oRes.json();
      const dJson = await dRes.json();
      setOrders(oJson?.data || []);
      setDrivers(dJson?.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      void load();
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const isToday = (value: string) => {
      const d = new Date(value);
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const today = orders.filter((o) => isToday(o.createdAt));
    const activeToday = today.filter((o) => ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(o.status)).length;
    const completedToday = today.filter((o) => o.status === "COMPLETED");
    const totalRevenueToday = completedToday.reduce((s, o) => s + Number(o.finalPrice ?? o.estimatedPrice), 0);
    const onlineDriversCount = drivers.filter((d) => d.isOnline).length;
    return { activeToday, completedToday: completedToday.length, totalRevenueToday, onlineDriversCount };
  }, [orders, drivers]);

  const liveActiveOrders = useMemo(
    () => orders.filter((o) => ["PENDING", "ACCEPTED", "ARRIVED", "IN_PROGRESS"].includes(o.status)).slice(0, 20),
    [orders],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Taxi Overview</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Platforma bo'yicha taxi monitoring</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/taxi/orders" className="adm-btn adm-btn-primary">Orders</Link>
          <Link href="/admin/taxi/drivers" className="adm-btn">Drivers</Link>
          <Link href="/admin/taxi/disputes" className="adm-btn">Disputes</Link>
        </div>
      </div>

      <div className="adm-kpi-grid">
        <Stat icon={Clock3} label="Active orders today" value={stats.activeToday} color="yellow" />
        <Stat icon={CheckCircle2} label="Completed today" value={stats.completedToday} color="green" />
        <Stat icon={Wallet} label="Revenue today" value={`${stats.totalRevenueToday.toLocaleString()} UZS`} color="teal" />
        <Stat icon={Car} label="Online drivers" value={stats.onlineDriversCount} color="blue" />
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Live active orders</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Order</th>
                <th>Customer</th>
                <th>Driver</th>
                <th>Status</th>
                <th>Route</th>
                <th className="pr-8">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-14 text-center text-slate-400 font-bold">Yuklanmoqda...</td></tr>
              ) : liveActiveOrders.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-slate-400 font-bold">Active order yo'q</td></tr>
              ) : (
                liveActiveOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">#{o.id.slice(-6)}</td>
                    <td className="py-4 text-sm font-bold text-slate-700">{o.customer ? `${o.customer.first_name} ${o.customer.last_name}` : "-"}</td>
                    <td className="py-4 text-sm font-bold text-slate-500">{o.driver ? `${o.driver.first_name} ${o.driver.last_name}` : "Tayinlanmagan"}</td>
                    <td className="py-4 text-xs font-black text-slate-600">{o.status}</td>
                    <td className="py-4 text-xs font-bold text-slate-500">{o.pickupAddress} → {o.dropoffAddress}</td>
                    <td className="py-4 pr-8 text-xs font-bold text-slate-400">{new Date(o.createdAt).toLocaleString()}</td>
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

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
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
