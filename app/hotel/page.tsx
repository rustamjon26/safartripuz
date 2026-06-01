"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  BedDouble,
  Building2,
  CalendarDays,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
  Box,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import StatsCard from "@/components/hotel/dashboard/StatsCard";
import RecentBookings from "@/components/hotel/dashboard/RecentBookings";
import OccupancyChart from "@/components/hotel/dashboard/OccupancyChart";
import type { HotelDashboardStats } from "@/lib/hotel/getHotelDashboardStats";

interface HotelData {
  id: string;
  name: string;
  status: string;
  city: string | null;
}

interface HotelMeResponse {
  hotel: HotelData;
  staffRecord?: { role: string } | null;
}

function shareHint(total: number, count: number, t: (path: string, params?: Record<string, string | number>) => string) {
  if (total <= 0) return undefined;
  const pct = Math.round((count / total) * 1000) / 10;
  return t("dashboard.share_total", { pct });
}

function formatMoney(value: number) {
  return `${value.toLocaleString("uz-UZ")} so'm`;
}

export default function HotelDashboard() {
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [staffRecord, setStaffRecord] = useState<{ role: string } | null>(null);
  const [stats, setStats] = useState<HotelDashboardStats | null>(null);
  const [hotelLoading, setHotelLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [hotelError, setHotelError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [cleaningBulkLoading, setCleaningBulkLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const QUICK_LINKS = [
    { href: "/hotel/rooms", label: t("nav.rooms"), desc: t("dashboard.new_booking"), icon: Box, color: "#0E7490", bg: "rgba(14, 116, 144, 0.08)" },
    { href: "/hotel/bookings", label: t("nav.reception"), desc: t("dashboard.recent_activity"), icon: CalendarDays, color: "#1A4B7A", bg: "rgba(26, 75, 122, 0.08)" },
    { href: "/hotel/settings", label: t("nav.settings"), desc: t("nav.finance"), icon: Settings, color: "#0D2137", bg: "rgba(13, 33, 55, 0.08)" },
  ];

  const loadStats = useCallback(async (hotelId: string) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch(`/api/hotels/${hotelId}/stats`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("dashboard.stats_load_error"));
      setStats(data);
    } catch {
      setStatsError(t("dashboard.stats_load_error"));
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [t]);

  const loadHotel = useCallback(async () => {
    setHotelLoading(true);
    setHotelError(null);
    try {
      const res = await fetch("/api/hotel/me");
      const data = (await res.json()) as HotelMeResponse;
      if (!res.ok) throw new Error((data as { message?: string }).message || t("common.error"));
      setHotel(data.hotel);
      setStaffRecord(data.staffRecord ?? null);
      if (data.hotel?.id) await loadStats(data.hotel.id);
    } catch (e) {
      setHotelError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setHotelLoading(false);
    }
  }, [loadStats, t]);

  const markAllCleaningAvailable = useCallback(async () => {
    if (!hotel?.id) return;
    const cleaningCount = stats?.rooms.cleaning ?? 0;
    if (cleaningCount <= 0) return;

    if (!confirm(t("dashboard.cleaning_bulk_confirm", { count: cleaningCount }))) return;

    setCleaningBulkLoading(true);
    try {
      const listRes = await fetch(
        `/api/hotels/${hotel.id}/rooms?status=CLEANING&fields=id,roomNumber`,
      );
      const listData = await listRes.json();
      if (!listRes.ok) throw new Error(listData.error || t("common.toasts.error"));

      const roomIds = (listData.items as Array<{ id: string }>).map((r) => r.id);
      if (roomIds.length === 0) {
        toast.error(t("dashboard.cleaning_bulk_empty"));
        return;
      }

      const patchRes = await fetch(`/api/hotels/${hotel.id}/rooms/bulk-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_ids: roomIds, status: "AVAILABLE" }),
      });
      const patchData = await patchRes.json();

      if (!patchRes.ok) {
        if (patchData.blocked_rooms?.length) {
          toast.error(`${patchData.error}: ${patchData.blocked_rooms.join(", ")}`);
        } else {
          toast.error(patchData.error || t("common.toasts.error"));
        }
        return;
      }

      toast.success(
        t("dashboard.cleaning_bulk_success", { count: patchData.updated_count }),
      );
      await loadStats(hotel.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.toasts.error"));
    } finally {
      setCleaningBulkLoading(false);
    }
  }, [hotel?.id, stats?.rooms.cleaning, loadStats, t]);

  useEffect(() => {
    void loadHotel();
  }, [loadHotel]);

  useEffect(() => {
    if (hotel && !hotelLoading) {
      if (staffRecord?.role === "CLEANER") router.push("/hotel/housekeeping");
    }
  }, [hotel, hotelLoading, staffRecord, router]);

  if (hotelLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 size={24} className="animate-spin text-slate-400 mb-3" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("common.loading")}</p>
      </div>
    );
  }

  if (hotelError) {
    return (
      <div className="bg-white border border-red-100 rounded-xl max-w-md mx-auto mt-20 p-8 text-center shadow-sm">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-black text-slate-900 mb-2">{t("dashboard.system_error")}</h2>
        <p className="text-slate-500 font-medium text-sm mb-6">{hotelError}</p>
        <button
          type="button"
          onClick={() => void loadHotel()}
          className="px-5 py-2 bg-slate-100 font-bold text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
        >
          {t("dashboard.try_again")}
        </button>
      </div>
    );
  }

  const rooms = stats?.rooms;
  const totalRooms = rooms?.total ?? 0;

  const roomCards = [
    {
      key: "available",
      value: rooms?.available ?? 0,
      label: t("dashboard.room_available"),
      accentClass: "text-green-600",
      barClass: "bg-green-500",
      icon: BedDouble,
      viewLink: "/hotel/rooms?status=available",
    },
    {
      key: "occupied",
      value: rooms?.occupied ?? 0,
      label: t("dashboard.room_occupied"),
      accentClass: "text-blue-600",
      barClass: "bg-blue-500",
      icon: Building2,
      viewLink: "/hotel/rooms?status=occupied",
    },
    {
      key: "cleaning",
      value: rooms?.cleaning ?? 0,
      label: t("dashboard.room_cleaning"),
      accentClass: "text-amber-500",
      barClass: "bg-amber-500",
      icon: Sparkles,
      viewLink: "/hotel/rooms?status=cleaning",
      bulkAction: {
        label: t("dashboard.cleaning_bulk_action"),
        onClick: () => void markAllCleaningAvailable(),
        loading: cleaningBulkLoading,
        accentClass:
          "text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100",
      },
    },
    {
      key: "maintenance",
      value: rooms?.maintenance ?? 0,
      label: t("dashboard.room_maintenance"),
      accentClass: "text-orange-500",
      barClass: "bg-orange-500",
      icon: Wrench,
      viewLink: "/hotel/rooms?status=maintenance",
    },
    {
      key: "blocked",
      value: rooms?.blocked ?? 0,
      label: t("dashboard.room_blocked"),
      accentClass: "text-gray-400",
      barClass: "bg-gray-400",
      icon: Ban,
    },
  ];

  const tableLabels = {
    guest: t("dashboard.col_guest"),
    room: t("dashboard.col_room"),
    type: t("dashboard.col_type"),
    checkIn: t("dashboard.col_check_in"),
    checkOut: t("dashboard.col_check_out"),
    status: t("dashboard.col_status"),
    price: t("dashboard.col_price"),
  };

  return (
    <div className="space-y-8 pb-10 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-[var(--bg-light-blue)] flex items-center justify-center shadow-inner border border-slate-100">
              <Building2 className="text-[var(--primary)]" size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight leading-none">
                  {hotel?.name || t("dashboard.hotel_fallback")}
                </h1>
                {hotel?.status === "approved" ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 text-green-600 uppercase border border-green-100">
                    <ShieldCheck size={12} /> {t("common.approved")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600 uppercase border border-amber-100">
                    <Clock size={12} /> {t("common.pending")}
                  </span>
                )}
              </div>
              <p className="text-[13px] font-semibold text-slate-500">
                {hotel?.city ? `${hotel.city} ${t("common.city")}.` : ""} {t("dashboard.metrics_active")}
                {!statsLoading && stats ? (
                  <span className="ml-2 text-blue-600 font-bold">
                    · {t("dashboard.occupancy_rate")}: {stats.occupancy_rate}%
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => hotel?.id && void loadStats(hotel.id)}
              className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw size={18} className={statsLoading ? "animate-spin" : ""} />
            </button>
            <Link
              href="/hotel/bookings"
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm"
            >
              <Plus size={16} /> {t("dashboard.new_booking")}
            </Link>
          </div>
        </div>
      </div>

      {/* Room status cards + occupancy chart */}
      <section>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">
          {t("dashboard.room_status")}
        </h2>
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
          <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-3 gap-4">
            {roomCards.map((card) => (
              <StatsCard
                key={card.key}
                value={card.value}
                label={card.label}
                hint={rooms ? shareHint(totalRooms, card.value as number, t) : undefined}
                accentClass={card.accentClass}
                barClass={card.barClass}
                icon={card.icon}
                loading={statsLoading}
                viewLink={card.viewLink}
                viewLinkLabel={
                  card.viewLink
                    ? t("dashboard.view_rooms_link", { count: card.value })
                    : undefined
                }
                bulkAction={card.bulkAction}
              />
            ))}
          </div>
          <OccupancyChart
            rooms={rooms}
            occupancyRate={stats?.occupancy_rate ?? 0}
            loading={statsLoading}
            labels={{
              available: t("dashboard.room_available"),
              occupied: t("dashboard.room_occupied"),
              cleaning: t("dashboard.room_cleaning"),
              maintenance: t("dashboard.room_maintenance"),
              blocked: t("dashboard.room_blocked"),
              centerLabel: t("dashboard.occupied_short"),
            }}
          />
        </div>
      </section>

      {/* Today's activity */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            value={stats?.today.check_ins ?? 0}
            label={t("dashboard.check_ins_today")}
            accentClass="text-green-600"
            barClass="bg-green-500"
            icon={Plus}
            loading={statsLoading}
          />
          <StatsCard
            value={stats?.today.check_outs ?? 0}
            label={t("dashboard.check_outs_today")}
            accentClass="text-amber-500"
            barClass="bg-amber-500"
            icon={CalendarDays}
            loading={statsLoading}
          />
          <StatsCard
            value={stats?.today.new_bookings ?? 0}
            label={t("dashboard.new_bookings_today")}
            accentClass="text-blue-600"
            barClass="bg-blue-500"
            icon={TrendingUp}
            loading={statsLoading}
          />
        </div>
      </section>

      {/* Revenue */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statsLoading ? (
            <>
              <StatsCard value={0} label="" accentClass="" barClass="" icon={TrendingUp} loading />
              <StatsCard value={0} label="" accentClass="" barClass="" icon={TrendingUp} loading />
            </>
          ) : statsError ? (
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-600 mb-4">{statsError}</p>
              <button
                type="button"
                onClick={() => hotel?.id && void loadStats(hotel.id)}
                className="px-5 py-2 bg-slate-100 font-bold text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm"
              >
                {t("dashboard.try_again")}
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {t("dashboard.revenue_today")}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-[var(--primary)] tabular-nums">
                  {formatMoney(stats?.revenue.today ?? 0)}
                </p>
                <div className="h-1 w-full rounded-full mt-4 bg-emerald-500" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {t("dashboard.revenue_month")}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-[var(--primary)] tabular-nums">
                  {formatMoney(stats?.revenue.this_month ?? 0)}
                </p>
                <div className="h-1 w-full rounded-full mt-4 bg-blue-500" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Bottom: table + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentBookings
            bookings={stats?.recent_bookings ?? []}
            loading={statsLoading}
            error={statsError}
            onRetry={() => hotel?.id && void loadStats(hotel.id)}
            title={t("dashboard.recent_bookings")}
            viewAllLabel={t("dashboard.view_all")}
            emptyLabel={t("dashboard.no_data_desc")}
            retryLabel={t("dashboard.try_again")}
            labels={tableLabels}
          />
        </div>

        <div className="space-y-6">
          <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-5 shadow-sm">
            <h3 className="font-extrabold text-[var(--primary)] text-[14px] mb-4">{t("dashboard.quick_links")}</h3>
            <div className="space-y-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all group shadow-sm"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: link.bg, color: link.color }}
                  >
                    <link.icon size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-[13px]">{link.label}</div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate">{link.desc}</div>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-[var(--primary)] transition-colors shrink-0 mr-1" />
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-[var(--primary)] rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck size={100} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">{t("dashboard.pms_prefix")}</p>
            <h4 className="text-xl font-black mb-3 leading-tight tracking-tight">{t("dashboard.pms_ad_title")}</h4>
            <p className="text-[12px] font-medium text-slate-300 mb-6 leading-relaxed">{t("dashboard.pms_ad_desc")}</p>
            <Link
              href="/hotel/help"
              className="inline-block bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-[11px] font-black uppercase shadow-md hover:bg-[#D4A017] transition-all text-center"
            >
              {t("dashboard.view_docs")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
