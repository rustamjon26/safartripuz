export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  CheckSquare,
  CreditCard,
  Compass,
  Building2,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Shield,
  LayoutDashboard,
  Car,
  MapPinned,
  House,
  Zap,
} from "lucide-react";
import { formatDateTime } from "@/lib/formatDate";
import { EmptyState } from "@/components/ui/EmptyState";

async function getStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const [
    totalUsers,
    pendingPartners,
    totalPayments,
    successPayments,
    totalTours,
    totalHotels,
    recentAudit,
    recentPayments,
    homeStayPendingListings,
    homeStayActiveListings,
    taxiOrdersToday,
    onlineDrivers,
    guideBookingsThisMonth,
    guideActiveListings,
    taxiDisputeCount,
    guideDisputeCount,
    guidePendingListingCount,
    unverifiedDriverCount,
    hotelBookingsToday,
    hotelCheckoutsToday,
    totalActiveRooms,
    occupiedRooms,
    hotelRevenueThisMonth,
    pendingHotelApprovals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.partner.count({ where: { status: "pending" } }),
    prisma.payment.count(),
    prisma.payment.aggregate({
      where: { status: "SUCCESS" },
      _sum: { amount: true },
    }),
    prisma.tourPackage.count(),
    prisma.hotel.count(),
    prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { first_name: true, last_name: true, role: true } } },
    }),
    prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { travelPlan: { select: { destination: true } } },
    }),
    prisma.homeStayListing.count({ where: { status: "PENDING" } }),
    prisma.homeStayListing.count({ where: { status: "ACTIVE" } }),
    prisma.taxiOrder.count({
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
    }),
    prisma.driverProfile.count({ where: { isOnline: true } }),
    prisma.guideBooking.count({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.guideListing.count({ where: { status: "ACTIVE" } }),
    prisma.taxiOrder.count({ where: { status: "DISPUTE" } }),
    prisma.guideBooking.count({ where: { status: "DISPUTE" } }),
    prisma.guideListing.count({ where: { status: "PENDING" } }),
    prisma.user.count({
      where: {
        role: "taxi_partner",
        OR: [{ driverProfile: null }, { driverProfile: { isVerified: false } }],
      },
    }),
    prisma.hotelBooking.count({
      where: {
        checkInDate: { gte: startOfDay, lte: endOfDay },
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    }),
    prisma.hotelBooking.count({
      where: {
        checkOutDate: { gte: startOfDay, lte: endOfDay },
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    }),
    prisma.physicalRoom.count({ where: { isActive: true } }),
    prisma.physicalRoom.count({ where: { isActive: true, status: "OCCUPIED" } }),
    prisma.hotelBooking.aggregate({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { totalAmount: true },
    }),
    prisma.hotel.count({ where: { status: "draft" } }),
  ]);

  const hotelOccupancyRate =
    totalActiveRooms > 0
      ? Math.round((occupiedRooms / totalActiveRooms) * 1000) / 10
      : 0;

  return {
    totalUsers,
    pendingPartners,
    totalPayments,
    totalRevenue: Number(successPayments._sum.amount ?? 0),
    totalTours,
    totalHotels,
    recentAudit,
    recentPayments,
    homeStayPendingListings,
    homeStayActiveListings,
    taxiOrdersToday,
    onlineDrivers,
    guideBookingsThisMonth,
    guideActiveListings,
    taxiDisputeCount,
    guideDisputeCount,
    guidePendingListingCount,
    unverifiedDriverCount,
    hotelBookingsToday,
    hotelCheckoutsToday,
    totalActiveRooms,
    occupiedRooms,
    hotelOccupancyRate,
    hotelRevenueThisMonth: Number(hotelRevenueThisMonth._sum.totalAmount ?? 0),
    pendingHotelApprovals,
  };
}

function fmtMoney(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M UZS`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K UZS`;
  return `${amount} UZS`;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  SUCCESS: { label: "Muvaffaqiyatli", cls: "adm-badge green" },
  PENDING: { label: "Kutilmoqda", cls: "adm-badge yellow" },
  FAILED: { label: "Xato", cls: "adm-badge red" },
  INITIATED: { label: "Boshlangan", cls: "adm-badge blue" },
  CANCELLED: { label: "Bekor", cls: "adm-badge gray" },
};

export default async function AdminDashboard() {
  const stats = await getStats();

  const kpiCards = [
    {
      label: "Foydalanuvchilar",
      value: stats.totalUsers,
      icon: Users,
      color: "blue",
      href: "/admin/users",
      change: "Barcha ro'yxatdan o'tganlar",
    },
    {
      label: "Pending Hamkorlar",
      value: stats.pendingPartners,
      icon: CheckSquare,
      color: "yellow",
      href: "/admin/partners",
      change: "Tasdiqlash kerak",
    },
    {
      label: "Jami Daromad",
      value: fmtMoney(stats.totalRevenue),
      icon: CreditCard,
      color: "green",
      href: "/admin/payments",
      change: `${stats.totalPayments} ta to'lov`,
    },
    {
      label: "Tur Paketlar",
      value: stats.totalTours,
      icon: Compass,
      color: "purple",
      href: "/admin/tours",
      change: "Aktiv turlar",
    },
    {
      label: "Hotellar",
      value: stats.totalHotels,
      icon: Building2,
      color: "teal",
      href: "/admin/hotels",
      change: "Ro'yxatdagi hotellar",
    },
    {
      label: "Hotel Check-in (bugun)",
      value: stats.hotelBookingsToday,
      icon: Building2,
      color: "teal",
      href: "/admin/hotels",
      change: `${stats.hotelCheckoutsToday} ta check-out`,
    },
    {
      label: "Uy Mehmonxona",
      value: stats.homeStayActiveListings,
      icon: House,
      color: "teal",
      href: "/admin/homestay",
      change: `${stats.homeStayPendingListings} kutilmoqda`,
    },
    {
      label: "Taxi",
      value: stats.taxiOrdersToday,
      icon: Car,
      color: "orange",
      href: "/admin/taxi",
      change: `${stats.onlineDrivers} onlayn haydovchi`,
    },
    {
      label: "Ekskursiya (Guide)",
      value: stats.guideBookingsThisMonth,
      icon: MapPinned,
      color: "purple",
      href: "/admin/guide",
      change: `${stats.guideActiveListings} aktiv listing`,
    },
    {
      label: "Jami Tranzaksiyalar",
      value: stats.totalPayments,
      icon: TrendingUp,
      color: "orange",
      href: "/admin/payments",
      change: "Barcha to'lovlar",
    },
  ];

  const alertItems = [
    {
      href: "/admin/partners",
      title: "Hamkor tasdiqlash navbati",
      detail: `${stats.pendingPartners} ta kutilmoqda`,
      tone: stats.pendingPartners > 0 ? "warn" : "ok",
    },
    {
      href: "/admin/taxi/disputes",
      title: "Taxi nizolari",
      detail: `${stats.taxiDisputeCount} ta ochiq`,
      tone: stats.taxiDisputeCount > 0 ? "danger" : "ok",
    },
    {
      href: "/admin/guide/bookings?status=DISPUTE",
      title: "Guide nizolari",
      detail: `${stats.guideDisputeCount} ta ochiq`,
      tone: stats.guideDisputeCount > 0 ? "danger" : "ok",
    },
    {
      href: "/admin/audit",
      title: "Audit jurnali",
      detail: "Oxirgi operator harakatlari",
      tone: "info",
    },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Overview — Global Nazorat Paneli */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <LayoutDashboard size={16} className="text-[#006781]" />
            <span className="text-[10px] font-[family-name:var(--font-sora)] font-semibold text-[#94A3B8] uppercase tracking-[0.14em]">
              Tizim holati · Faol
            </span>
          </div>
          <h2 className="text-[28px] sm:text-[32px] font-display font-bold text-[#0d2137] tracking-tight leading-tight">
            Global Nazorat Paneli
          </h2>
          <p className="text-[13px] font-medium text-[#64748B] mt-1.5 max-w-xl">
            SafarTrip ekotizimining real vaqtdagi ko&apos;rsatkichlari va hamkorlik holati.
          </p>
        </div>
        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0d2137] text-white text-[13px] font-[family-name:var(--font-sora)] font-semibold hover:bg-[#16324f] transition-colors"
        >
          <TrendingUp size={16} />
          Iqtisodiyot
        </Link>
      </div>

      {/* Hero KPIs (Stitch-style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link
          href="/admin/payments"
          className="bg-white border border-[#d8e3fb] rounded-2xl p-5 no-underline hover:border-[#006781]/30 transition-colors"
        >
          <div className="flex items-start justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#fff4e8] text-[#b45309] flex items-center justify-center">
              <CreditCard size={18} />
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {stats.totalPayments} trx
            </span>
          </div>
          <p className="mt-4 text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Umumiy tranzaksiya
          </p>
          <p className="text-[26px] font-display font-bold text-[#111c2d] leading-none mt-1">
            {fmtMoney(stats.totalRevenue)}
          </p>
          <p className="text-[11px] font-medium text-[#64748B] mt-2">Muvaffaqiyatli to&apos;lovlar summasi</p>
        </Link>

        <Link
          href="/admin/users"
          className="bg-white border border-[#d8e3fb] rounded-2xl p-5 no-underline hover:border-[#006781]/30 transition-colors"
        >
          <div className="flex items-start justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
              <Users size={18} />
            </span>
            <span className="text-[11px] font-semibold text-[#006781]">Faol</span>
          </div>
          <p className="mt-4 text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Foydalanuvchilar
          </p>
          <p className="text-[26px] font-display font-bold text-[#111c2d] leading-none mt-1">
            {stats.totalUsers.toLocaleString("uz-UZ")}
          </p>
          <p className="text-[11px] font-medium text-[#64748B] mt-2">Barcha ro&apos;yxatdan o&apos;tganlar</p>
        </Link>

        <Link
          href="/admin/partners"
          className="bg-white border border-[#d8e3fb] rounded-2xl p-5 no-underline hover:border-[#006781]/30 transition-colors"
        >
          <div className="flex items-start justify-between">
            <span className="w-10 h-10 rounded-xl bg-[#f0f3ff] text-[#0d2137] flex items-center justify-center">
              <CheckSquare size={18} />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </span>
          </div>
          <p className="mt-4 text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Hamkorlar (H/T/G)
          </p>
          <p className="text-[26px] font-display font-bold text-[#111c2d] leading-none mt-1">
            {stats.totalHotels + stats.guideActiveListings + stats.homeStayActiveListings}
          </p>
          <p className="text-[11px] font-medium text-[#64748B] mt-2">
            {stats.pendingPartners} ta tasdiqlash navbatida
          </p>
        </Link>

        <div className="bg-[#0d2137] rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="flex items-start justify-between relative z-10">
            <span className="w-10 h-10 rounded-xl bg-white/10 text-[#f5d1b0] flex items-center justify-center">
              <Shield size={18} />
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Faol
            </span>
          </div>
          <p className="mt-4 text-[11px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-wider text-white/45 relative z-10">
            Tizim holati
          </p>
          <p className="text-[26px] font-display font-bold leading-none mt-1 relative z-10">
            {stats.hotelOccupancyRate}%
          </p>
          <p className="text-[11px] font-medium text-white/55 mt-2 relative z-10">
            Hotel bandlik · {stats.occupiedRooms}/{stats.totalActiveRooms} xona
          </p>
        </div>
      </div>

      {/* Secondary KPI grid */}
      <div className="adm-kpi-grid !mb-0">
        {kpiCards.map((card) => (
          <Link key={card.label} href={card.href} className="adm-kpi-card group no-underline">
            <div className={`adm-kpi-icon ${card.color} group-hover:scale-105 transition-transform`}>
              <card.icon size={22} />
            </div>
            <div className="adm-kpi-content flex-1">
              <div className="adm-kpi-label">{card.label}</div>
              <div className="adm-kpi-value !text-[24px]">{card.value}</div>
              <div className="text-[11px] font-semibold text-[#94A3B8] mt-1">{card.change}</div>
            </div>
            <ArrowUpRight size={14} className="text-[#cbd5e1] group-hover:text-[#0d2137] transition-colors" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="adm-card border border-[#d8e3fb] shadow-sm bg-white p-5 sm:p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-[#f59e0b]" />
            <h3 className="text-[16px] font-display font-semibold text-[#0d2137]">Tezkor harakatlar</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/taxi/disputes"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] text-[13px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] hover:bg-white transition-colors"
            >
              <span>Taxi nizolari</span>
              <span className="adm-nav-badge">{stats.taxiDisputeCount}</span>
            </Link>
            <Link
              href="/admin/guide/bookings?status=DISPUTE"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] text-[13px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] hover:bg-white transition-colors"
            >
              <span>Guide nizolari</span>
              <span className="adm-nav-badge">{stats.guideDisputeCount}</span>
            </Link>
            <Link
              href="/admin/guide/listings?status=PENDING"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] text-[13px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] hover:bg-white transition-colors"
            >
              <span>Tasdiq kutilmoqda (Guide)</span>
              <span className="adm-nav-badge">{stats.guidePendingListingCount}</span>
            </Link>
            <Link
              href="/admin/taxi/drivers?verified=false"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] text-[13px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] hover:bg-white transition-colors"
            >
              <span>Tasdiq kutilmoqda (Taxi)</span>
              <span className="adm-nav-badge">{stats.unverifiedDriverCount}</span>
            </Link>
            {stats.pendingHotelApprovals > 0 && (
              <Link
                href="/admin/hotels?status=draft"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#d8e3fb] bg-[#f9f9ff] text-[13px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] hover:bg-white transition-colors"
              >
                <span>Tasdiqlash kutilmoqda (Hotel)</span>
                <span className="adm-nav-badge">{stats.pendingHotelApprovals}</span>
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#d8e3fb] rounded-2xl p-5 shadow-sm">
          <h3 className="text-[15px] font-display font-semibold text-[#0d2137] mb-4">
            Tizim ogohlantirishlari
          </h3>
          <div className="space-y-3">
            {alertItems.map((a) => (
              <Link
                key={a.href + a.title}
                href={a.href}
                className="flex gap-3 p-3 rounded-xl border border-[#d8e3fb] hover:bg-[#f9f9ff] transition-colors no-underline"
              >
                <span
                  className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                    a.tone === "danger"
                      ? "bg-[#F43F5E]"
                      : a.tone === "warn"
                        ? "bg-amber-500"
                        : a.tone === "ok"
                          ? "bg-emerald-500"
                          : "bg-sky-500"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#111c2d]">{a.title}</p>
                  <p className="text-[11px] font-medium text-[#64748B] mt-0.5">{a.detail}</p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href="/admin/audit"
            className="mt-4 block w-full text-center py-2.5 rounded-xl border border-[#d8e3fb] text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#0d2137] hover:bg-[#f0f3ff]"
          >
            Barcha bildirishnomalar
          </Link>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Payments */}
        <div className="adm-card border-none shadow-xl shadow-slate-200/50">
          <div className="adm-card-header bg-white border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CreditCard size={18} />
              </div>
              <span className="text-lg font-black text-slate-900 tracking-tight">So&apos;nggi To&apos;lovlar</span>
            </div>
            <Link href="/admin/payments" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">
              Hammasi
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentPayments.length === 0 ? (
              <EmptyState variant="embedded" message="Hech qanday to'lov topilmadi" />
            ) : (
              stats.recentPayments.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? { label: p.status, cls: "adm-badge gray" };
                return (
                  <div key={p.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                        {p.provider?.[0]}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{p.travelPlan?.destination ?? "Noma'lum"}</div>
                        <div className="text-xs font-bold text-slate-400 mt-0.5">{formatDateTime(p.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">{fmtMoney(Number(p.amount))}</div>
                      <span className={`${badge.cls} mt-1`} style={{ fontSize: '10px' }}>{badge.label}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Audit */}
        <div className="adm-card border-none shadow-xl shadow-slate-200/50">
          <div className="adm-card-header bg-white border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Clock size={18} />
              </div>
              <span className="text-lg font-black text-slate-900 tracking-tight">Tizim Harakatlari</span>
            </div>
            <Link href="/admin/audit" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">
              Hammasi
            </Link>
          </div>
          <div className="p-6 space-y-6">
            {stats.recentAudit.length === 0 ? (
              <EmptyState variant="embedded" title="Audit" message="Harakatlar mavjud emas" />
            ) : (
              stats.recentAudit.map((log) => (
                <div key={log.id} className="flex gap-4 group">
                  <div className="relative flex flex-col items-center">
                     <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-100 mt-1.5" />
                     <div className="w-px flex-1 bg-slate-100 my-2 group-last:hidden" />
                  </div>
                  <div className="pb-6 group-last:pb-0">
                    <div className="text-sm font-black text-slate-900">{log.action}</div>
                    <div className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2">
                       <Shield size={12} className="text-slate-300" />
                       {log.actor ? `${log.actor.first_name} ${log.actor.last_name}` : "Tizim"}
                       <span className="text-slate-200">•</span>
                       {formatDateTime(log.createdAt)}
                    </div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-wider mt-2 bg-slate-50 inline-block px-2 py-0.5 rounded-md">
                       {log.entity} #{log.entityId?.slice(-6)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Hotel PMS Summary */}
      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
            <Building2 size={18} />
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Hotel PMS Xulosa</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Bugungi check-in
            </p>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.hotelBookingsToday}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Bugungi check-out
            </p>
            <p className="text-2xl font-black text-slate-900 mt-2">{stats.hotelCheckoutsToday}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Umumiy bandlik
            </p>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {stats.occupiedRooms}/{stats.totalActiveRooms}{" "}
              <span className="text-base text-teal-600">({stats.hotelOccupancyRate}%)</span>
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Oylik daromad
            </p>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {fmtMoney(stats.hotelRevenueThisMonth)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
