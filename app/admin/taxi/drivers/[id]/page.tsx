"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";
import { AdminTaxiStatusBadge } from "@/components/admin/taxi/AdminTaxiStatusBadge";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { AdminKpiGridSkeleton } from "@/components/admin/AdminKpiGridSkeleton";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { formatDate, formatDateTime } from "@/lib/formatDate";

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
  platformFee: number;
  netAmount: number;
};

type ActionKind = "block" | "unblock" | "verify" | "settle" | null;

export default function AdminTaxiDriverDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DriverPayload | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [monthGross, setMonthGross] = useState(0);
  const [monthFee, setMonthFee] = useState(0);
  const [monthNet, setMonthNet] = useState(0);
  const [action, setAction] = useState<ActionKind>(null);

  const load = useCallback(async () => {
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
      setMonthFee(monthItems.reduce((sum, it) => sum + Number(it.platformFee ?? 0), 0));
      setMonthNet(monthItems.reduce((sum, it) => sum + Number(it.netAmount ?? 0), 0));
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) void load();
  }, [params.id, load]);

  const pendingList = useMemo(() => earnings.filter((e) => e.status === "PENDING"), [earnings]);
  const settledCount = useMemo(() => earnings.filter((e) => e.status === "SETTLED").length, [earnings]);
  const pendingTotal = useMemo(
    () => pendingList.reduce((s, e) => s + Number(e.grossAmount ?? 0), 0),
    [pendingList],
  );

  async function runDriverAction(type: "block" | "unblock" | "verify") {
    if (!params.id) return;
    try {
      const res = await fetch(`/api/admin/taxi/drivers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Yangilandi");
      setAction(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  async function settlePending() {
    if (!params.id || pendingList.length === 0) return;
    try {
      const res = await fetch(`/api/admin/taxi/drivers/${params.id}/earnings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ earningIds: pendingList.map((e) => e.id) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Xatolik");
      toast.success("Daromadlar hisoblandi");
      setAction(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server xatosi");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="adm-card border-none shadow-xl p-6 bg-white">
          <div className="flex gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-slate-100 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <AdminKpiGridSkeleton count={2} />
        </div>
        <div className="adm-card border-none shadow-xl bg-white overflow-hidden">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th className="pl-8">Marka</th>
                  <th>Raqam</th>
                  <th>Kategoriya</th>
                  <th className="pr-8">Holat</th>
                </tr>
              </thead>
              <tbody>
                <TableSkeleton columns={4} rows={4} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="adm-card border-none shadow-xl p-10 text-center text-red-600 font-bold bg-white">
        Haydovchi topilmadi
      </div>
    );
  }

  const profile = data.driver.driverProfile;
  const rating = Number(profile?.rating ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/taxi/drivers"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0"
            aria-label="Orqaga"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {data.driver.first_name} {data.driver.last_name}
            </h1>
            <p className="text-sm font-bold text-slate-400 mt-1">{data.driver.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-black text-slate-700">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${profile?.isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
                />
                {profile?.isOnline ? "Onlayn" : "Offlayn"}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                  data.driver.isBlocked ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                {data.driver.isBlocked ? "Bloklangan" : "Faol akkaunt"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.driver.isBlocked ? (
            <button type="button" className="adm-btn" onClick={() => setAction("unblock")}>
              Blokdan chiqarish
            </button>
          ) : (
            <button type="button" className="adm-btn" onClick={() => setAction("block")}>
              Bloklash
            </button>
          )}
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => setAction("verify")}>
            Tasdiqlash
          </button>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Profil</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Telefon</div>
            <div className="font-bold text-slate-900 mt-1">{data.driver.phone}</div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Guvohnoma</div>
            <div className="font-bold text-slate-900 mt-1">{profile?.licenseNumber ?? "—"}</div>
            <div className="text-xs text-slate-500 mt-1">
              Muddat: {profile?.licenseExpiry ? formatDate(profile.licenseExpiry) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Reyting</div>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={18} className={rating >= n ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
              ))}
              <span className="ml-2 font-black text-slate-900">{rating.toFixed(1)} / 5</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-black text-slate-400 uppercase">Jami reyslar</div>
            <div className="font-black text-slate-900 text-xl mt-1">{profile?.totalTrips ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Transportlar</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Marka / Model</th>
                <th>Davlat raqami</th>
                <th>Kategoriya</th>
                <th className="pr-8">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.driver.taxiVehicles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                    {"Transport yo'q"}
                  </td>
                </tr>
              ) : (
                data.driver.taxiVehicles.map((v) => (
                  <tr key={v.id}>
                    <td className="py-4 pl-8 text-sm font-black text-slate-900">
                      {v.make} {v.model}{" "}
                      <span className="text-slate-400 font-bold">({v.year})</span>
                    </td>
                    <td className="py-4 text-sm font-bold text-slate-600">{v.plateNumber}</td>
                    <td className="py-4 text-xs font-black text-slate-500">{v.category}</td>
                    <td className="py-4 pr-8 text-xs font-black">
                      {v.isActive ? (
                        <span className="text-emerald-700">Faol</span>
                      ) : (
                        <span className="text-slate-400">Nofaol</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50 flex items-center justify-between">
          <span className="text-lg font-black text-slate-900 tracking-tight">{"So'nggi buyurtmalar (10)"}</span>
          <Link href="/admin/taxi/orders" className="adm-btn text-xs">
            Barcha buyurtmalar
          </Link>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">ID</th>
                <th>Holat</th>
                <th>Narx</th>
                <th className="pr-8">Sana</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400 font-bold">
                    {"Buyurtma yo'q"}
                  </td>
                </tr>
              ) : (
                data.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-4 pl-8">
                      <Link href={`/admin/taxi/orders/${o.id}`} className="text-sm font-black text-slate-900 hover:underline">
                        #{o.id.slice(-8)}
                      </Link>
                    </td>
                    <td className="py-4">
                      <AdminTaxiStatusBadge status={o.status} />
                    </td>
                    <td className="py-4 text-sm font-black text-slate-900">
                      {Number(o.finalPrice ?? o.estimatedPrice).toLocaleString()} {"so'm"}
                    </td>
                    <td className="py-4 pr-8 text-xs font-bold text-slate-400">
                      {formatDateTime(o.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-card-header bg-white border-b border-slate-50">
          <span className="text-lg font-black text-slate-900 tracking-tight">Daromad (shu oy)</span>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/60">
            <div className="text-xs font-black text-slate-400 uppercase">Jami tushum</div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {monthGross.toLocaleString()} {"so'm"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/60">
            <div className="text-xs font-black text-slate-400 uppercase">Platforma ulushi</div>
            <div className="text-xl font-black text-slate-700 mt-1">
              {monthFee.toLocaleString()} {"so'm"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/60">
            <div className="text-xs font-black text-slate-400 uppercase">Sof daromad</div>
            <div className="text-xl font-black text-emerald-800 mt-1">
              {monthNet.toLocaleString()} {"so'm"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 p-4 bg-slate-50/60">
            <div className="text-xs font-black text-slate-400 uppercase">Umumiy (barcha vaqt)</div>
            <div className="text-xs text-slate-600 mt-1">
              Gross {Number(data.earningsSummary.totalGross).toLocaleString()} / Fee{" "}
              {Number(data.earningsSummary.totalFee).toLocaleString()} / Net{" "}
              {Number(data.earningsSummary.totalNet).toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-500 mt-2">
              Kutilmoqda: {pendingList.length} • Hisoblangan: {settledCount}
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            type="button"
            disabled={pendingList.length === 0}
            onClick={() => setAction("settle")}
            className="adm-btn adm-btn-primary disabled:opacity-50"
          >
            Barcha daromadlarni hisoblash
          </button>
        </div>
      </div>

      <ConfirmModal
        open={action === "block" || action === "unblock" || action === "verify"}
        title={
          action === "block"
            ? "Haydovchini bloklash"
            : action === "unblock"
              ? "Blokdan chiqarish"
              : action === "verify"
                ? "Haydovchini tasdiqlash"
                : ""
        }
        description={
          action === "block"
            ? "Quyidagi haydovchi bloklanadi va tizimga kira olmaydi."
            : action === "unblock"
              ? "Haydovchi blokdan chiqariladi va yana tizimga kira oladi."
              : action === "verify"
                ? "Haydovchi profili tasdiqlangan deb belgilanadi."
                : ""
        }
        subjectName={`${data.driver.first_name} ${data.driver.last_name}`.trim()}
        confirmDanger={action === "block"}
        onCancel={() => setAction(null)}
        onConfirm={() => {
          if (action === "block") void runDriverAction("block");
          if (action === "unblock") void runDriverAction("unblock");
          if (action === "verify") void runDriverAction("verify");
        }}
      />

      <ConfirmModal
        open={action === "settle"}
        title="Daromadlarni hisoblash"
        description="Kutilayotgan barcha daromad yozuvlari hisoblangan (SETTLED) holatiga o'tkaziladi."
        subjectName={`${pendingList.length} ta yozuv, jami ${pendingTotal.toLocaleString()} so'm (tushum)`}
        confirmDanger
        onCancel={() => setAction(null)}
        onConfirm={() => void settlePending()}
      />
    </div>
  );
}
