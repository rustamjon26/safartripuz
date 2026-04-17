"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

type DriverPayload = {
  driver: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    isBlocked: boolean;
    driverProfile: {
      licenseNumber: string;
      licenseExpiry: string;
      rating: number;
      totalTrips: number;
      isOnline: boolean;
    } | null;
    taxiVehicles: Array<{
      id: string;
      make: string;
      model: string;
      color: string;
      plateNumber: string;
      year: number;
      category: string;
      isActive: boolean;
    }>;
  };
  recentOrders: Array<{
    id: string;
    status: string;
    createdAt: string;
    pickupAddress: string;
    dropoffAddress: string;
    finalPrice: number | null;
    estimatedPrice: number;
  }>;
  earningsSummary: {
    totalGross: number;
    totalFee: number;
    totalNet: number;
  };
};

type Earning = {
  id: string;
  status: "PENDING" | "SETTLED";
  grossAmount: number;
  netAmount: number;
};

export default function AdminTaxiDriverDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DriverPayload | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [monthGross, setMonthGross] = useState(0);
  const [monthNet, setMonthNet] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const [dRes, eRes] = await Promise.all([
        fetch(`/api/admin/taxi/drivers/${params.id}`),
        fetch(`/api/admin/taxi/drivers/${params.id}/earnings?limit=500`),
      ]);
      const dJson = await dRes.json();
      const eJson = await eRes.json();
      if (dRes.ok) setData(dJson);
      if (eRes.ok) {
        const list = (eJson?.data || []) as Earning[];
        setEarnings(list);
      }

      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const monthRes = await fetch(`/api/admin/taxi/drivers/${params.id}/earnings?month=${month}&limit=500`);
      const monthJson = await monthRes.json();
      const monthItems = (monthJson?.data || []) as Earning[];
      setMonthGross(monthItems.reduce((sum, it) => sum + Number(it.grossAmount ?? 0), 0));
      setMonthNet(monthItems.reduce((sum, it) => sum + Number(it.netAmount ?? 0), 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) void load();
  }, [params.id]);

  const pendingIds = useMemo(
    () => earnings.filter((e) => e.status === "PENDING").map((e) => e.id),
    [earnings],
  );

  async function settlePending() {
    if (pendingIds.length === 0) return;
    try {
      const pendingRes = await fetch(`/api/admin/taxi/drivers/${params.id}/earnings?status=PENDING&limit=500`);
      const pendingJson = await pendingRes.json();
      const allPendingIds = ((pendingJson?.data || []) as Earning[]).map((e) => e.id);
      if (allPendingIds.length === 0) return;

      const res = await fetch(`/api/admin/taxi/drivers/${params.id}/earnings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ earningIds: allPendingIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Pending earnings settled");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold">Loading...</div>;
  if (!data) return <div className="p-10 text-center text-red-500 font-bold">Driver not found</div>;

  const profile = data.driver.driverProfile;
  const pendingCount = earnings.filter((e) => e.status === "PENDING").length;
  const settledCount = earnings.filter((e) => e.status === "SETTLED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Taxi Driver Detail</h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">
          {data.driver.first_name} {data.driver.last_name}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
        <p><b>Phone:</b> {data.driver.phone}</p>
        <p><b>Email:</b> {data.driver.email}</p>
        <p><b>License:</b> {profile?.licenseNumber ?? "-"}</p>
        <p><b>Expiry:</b> {profile?.licenseExpiry ? new Date(profile.licenseExpiry).toLocaleDateString() : "-"}</p>
        <p><b>Rating:</b> {profile?.rating?.toFixed(1) ?? "-"}</p>
        <p><b>Total trips:</b> {profile?.totalTrips ?? 0}</p>
        <p><b>Online:</b> {profile?.isOnline ? "Yes" : "No"}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-black text-slate-900 mb-3">Vehicles</h2>
        <div className="space-y-2">
          {data.driver.taxiVehicles.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold">Vehicle yo'q</p>
          ) : (
            data.driver.taxiVehicles.map((v) => (
              <div key={v.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <b>{v.make} {v.model}</b> ({v.year}) - {v.plateNumber} [{v.category}] {v.isActive ? "ACTIVE" : "INACTIVE"}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-black text-slate-900 mb-3">Recent orders</h2>
        <div className="space-y-2">
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-slate-500 font-semibold">Order yo'q</p>
          ) : (
            data.recentOrders.map((o) => (
              <div key={o.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <div className="font-bold">#{o.id.slice(-6)} • {o.status}</div>
                <div className="text-slate-500">{o.pickupAddress} → {o.dropoffAddress}</div>
                <div className="text-slate-500">{new Date(o.createdAt).toLocaleDateString()} • {Number(o.finalPrice ?? o.estimatedPrice).toLocaleString()} UZS</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-lg font-black text-slate-900">Earnings summary</h2>
        <p><b>This month gross/net:</b> {monthGross.toLocaleString()} / {monthNet.toLocaleString()} UZS</p>
        <p><b>Pending:</b> {pendingCount} • <b>Settled:</b> {settledCount}</p>
        <button onClick={() => void settlePending()} disabled={pendingIds.length === 0} className="adm-btn adm-btn-primary disabled:opacity-50">
          Settle pending earnings
        </button>
      </div>
    </div>
  );
}
