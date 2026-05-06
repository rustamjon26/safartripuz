"use client";

import { useEffect, useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Filter, TrendingUp, DollarSign, AlertCircle, CheckCircle, ArrowUpRight, Calendar, MapPin } from "lucide-react";
import { RevenueReportSection } from "./RevenueReportSection";
import { AdminKpiGridSkeleton } from "@/components/admin/AdminKpiGridSkeleton";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatDate";

type Payment = {
  id: string;
  amount: string;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  turTags: string[];
  travelPlan: {
    destination: string;
    user: { first_name: string; last_name: string; email: string };
    turTags?: string[];
  } | null;
};

type GroupedStat = {
  status: string;
  _count: { id: number };
  _sum: { amount: string | null };
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: LucideIcon }> = {
  SUCCESS: { label: "Muvaffaqiyatli", cls: "bg-emerald-50 text-emerald-600 ring-emerald-100", icon: CheckCircle },
  PENDING: { label: "Kutilmoqda", cls: "bg-amber-50 text-amber-600 ring-amber-100", icon: TrendingUp },
  FAILED: { label: "Xato", cls: "bg-rose-50 text-rose-600 ring-rose-100", icon: AlertCircle },
  INITIATED: { label: "Boshlangan", cls: "bg-blue-50 text-blue-600 ring-blue-100", icon: TrendingUp },
  CANCELLED: { label: "Bekor", cls: "bg-slate-100 text-slate-400 ring-slate-200", icon: AlertCircle },
};

const PROVIDER_CONFIG: Record<string, string> = {
  CLICK: "bg-blue-50 text-blue-600",
  PAYME: "bg-indigo-50 text-indigo-600",
  UZUM: "bg-teal-50 text-teal-600",
  MANUAL: "bg-amber-50 text-amber-600",
  MOCK: "bg-slate-100 text-slate-500",
};

const TUR_LABEL: Record<string, string> = {
  hotel: "Hotel",
  homestay: "Uy Mehmonxona",
  taxi: "Taxi",
  guide: "Guide",
};

const TUR_BADGE: Record<string, string> = {
  hotel: "bg-sky-50 text-sky-800 ring-sky-100",
  homestay: "bg-amber-50 text-amber-900 ring-amber-100",
  taxi: "bg-orange-50 text-orange-900 ring-orange-100",
  guide: "bg-violet-50 text-violet-900 ring-violet-100",
};

function fmtMoney(v: string | number) {
  const n = Number(v);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const status = searchParams.get("status") ?? "";
  const provider = searchParams.get("provider") ?? "";
  const tur = searchParams.get("tur") ?? "";

  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<GroupedStat[]>([]);
  const [loading, setLoading] = useState(true);

  const patchQuery = useCallback(
    (patch: Record<string, string | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") p.delete(k);
        else p.set(k, v);
      }
      if (!("page" in patch)) p.delete("page");
      const q = p.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20", page: String(page) });
      if (status) params.set("status", status);
      if (provider) params.set("provider", provider);
      if (tur) params.set("tur", tur);
      const res = await fetch(`/api/admin/payments?${params}`);
      const data = (await res.json()) as {
        items: Payment[];
        total: number;
        totalPages?: number;
        page: number;
        limit: number;
        stats?: GroupedStat[];
        message?: string;
      };
      if (!res.ok) throw new Error(data.message);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages ?? Math.max(Math.ceil(data.total / data.limit), 1));
      setStats(data.stats ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [page, status, provider, tur]);

  useEffect(() => {
    void load();
  }, [load]);

  const successStat = stats.find((s) => s.status === "SUCCESS");
  const pendingStat = stats.find((s) => s.status === "PENDING");
  const totalRev = stats.reduce((acc, s) => acc + (s.status === "SUCCESS" ? Number(s._sum.amount ?? 0) : 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Moliyaviy To&apos;lovlar</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Barcha tranzaksiyalarni monitoring qilish va statistikani ko&apos;rish</p>
        </div>
      </div>

      {loading ? (
        <AdminKpiGridSkeleton count={3} />
      ) : (
        <div className="adm-kpi-grid">
          <div className="adm-kpi-card border-none shadow-xl shadow-slate-200/50 bg-white">
            <div className="adm-kpi-icon green shadow-lg shadow-emerald-100">
              <DollarSign size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Haqiqiy Daromad</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{fmtMoney(totalRev)} UZS</div>
              <div className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1">
                <CheckCircle size={10} />
                {successStat?._count.id ?? 0} muvaffaqiyatli
              </div>
            </div>
            <ArrowUpRight size={14} className="text-slate-300" />
          </div>

          <div className="adm-kpi-card border-none shadow-xl shadow-slate-200/50 bg-white">
            <div className="adm-kpi-icon orange shadow-lg shadow-amber-100">
              <TrendingUp size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kutilmoqda (Arizalar)</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{pendingStat?._count.id ?? 0} ta</div>
              <div className="text-[10px] font-bold text-amber-500 mt-2 flex items-center gap-1">
                <AlertCircle size={10} />
                {fmtMoney(pendingStat?._sum.amount ?? 0)} UZS potentsial
              </div>
            </div>
            <ArrowUpRight size={14} className="text-slate-300" />
          </div>

          <div className="adm-kpi-card border-none shadow-xl shadow-slate-200/50 bg-white">
            <div className="adm-kpi-icon blue shadow-lg shadow-blue-100">
              <CreditCard size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jami Tranzaksiyalar</div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{total} ta</div>
              <div className="text-[10px] font-bold text-blue-500 mt-2 flex items-center gap-1">
                <Filter size={10} />
                Barcha tizimlar bo&apos;yicha
              </div>
            </div>
            <ArrowUpRight size={14} className="text-slate-300" />
          </div>
        </div>
      )}

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 p-6 bg-white overflow-visible">
        <div className="flex flex-col xl:flex-row gap-6 items-center">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="relative">
              <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <select
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none"
                value={status}
                onChange={(e) => patchQuery({ status: e.target.value || undefined, page: undefined })}
              >
                <option value="">Barcha Statuslar</option>
                <option value="SUCCESS">Muvaffaqiyatli</option>
                <option value="PENDING">Kutilmoqda</option>
                <option value="FAILED">Xato / Rad etilgan</option>
                <option value="CANCELLED">Bekor qilingan</option>
              </select>
            </div>
            <div className="relative">
              <CreditCard size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <select
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none"
                value={provider}
                onChange={(e) => patchQuery({ provider: e.target.value || undefined, page: undefined })}
              >
                <option value="">Barcha Providerlar</option>
                <option value="CLICK">Click</option>
                <option value="PAYME">Payme</option>
                <option value="UZUM">Uzum</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div className="relative">
              <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <select
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none"
                value={tur}
                onChange={(e) => patchQuery({ tur: e.target.value || undefined, page: undefined })}
              >
                <option value="">Barchasi (tur)</option>
                <option value="hotel">Hotel</option>
                <option value="homestay">Uy Mehmonxona</option>
                <option value="taxi">Taxi</option>
                <option value="guide">Ekskursiya</option>
              </select>
            </div>
          </div>
          <button
            className="w-full xl:w-auto px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
            onClick={() => void load()}
          >
            Yangilash
          </button>
        </div>
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th className="pl-8">Mijoz va Manzil</th>
                <th>Tur</th>
                <th>Tizim</th>
                <th>Miqdor</th>
                <th>Status</th>
                <th>Sana</th>
                <th className="pr-8">Batafsil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton columns={7} rows={8} />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState variant="embedded" message="Hech qanday to'lov topilmadi" />
                  </td>
                </tr>
              ) : (
                items.map((pay) => {
                  const S = STATUS_CONFIG[pay.status] || STATUS_CONFIG.CANCELLED;
                  const tags = pay.turTags?.length ? pay.turTags : pay.travelPlan?.turTags ?? [];
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-6 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                            {pay.travelPlan?.user.first_name?.[0]}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900">
                              {pay.travelPlan?.user.first_name} {pay.travelPlan?.user.last_name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              <MapPin size={10} className="text-slate-300" />
                              {pay.travelPlan?.destination ?? "Noma'lum"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="flex flex-wrap gap-1">
                          {tags.length === 0 ? (
                            <span className="text-[10px] font-bold text-slate-300">—</span>
                          ) : (
                            tags.map((t) => (
                              <span
                                key={t}
                                className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase ring-1 ${
                                  TUR_BADGE[t] ?? "bg-slate-50 text-slate-600 ring-slate-200"
                                }`}
                              >
                                {TUR_LABEL[t] ?? t}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-6">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            PROVIDER_CONFIG[pay.provider] || "bg-slate-50"
                          }`}
                        >
                          {pay.provider}
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="text-sm font-black text-slate-900">
                          {fmtMoney(pay.amount)} {pay.currency}
                        </div>
                      </td>
                      <td className="py-6">
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ring-1 shadow-sm ${S.cls}`}
                        >
                          <S.icon size={10} />
                          {S.label}
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <Calendar size={12} className="text-slate-200" />
                          {formatDateTime(pay.createdAt)}
                        </div>
                      </td>
                      <td className="py-6 pr-8 text-right">
                        <Link
                          href={`/admin/payments/${pay.id}`}
                          className="adm-btn adm-btn-primary text-xs inline-flex items-center gap-1"
                        >
                          <ArrowUpRight size={14} />
                          Ochish
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading ? <AdminPagination page={page} totalPages={totalPages} /> : null}
      </div>

      <RevenueReportSection />
    </div>
  );
}
