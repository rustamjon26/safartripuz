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
  ]);

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

  return (
    <div className="space-y-8">
      {/* Overview Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <LayoutDashboard size={18} className="text-slate-400" />
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tizim holati</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Statistika va Monitoring</h2>
        </div>
        <Link href="/admin/tours" className="adm-btn adm-btn-primary shadow-lg shadow-slate-900/20">
          <Compass size={16} />
          Yangi Tur Yaratish
        </Link>
      </div>

      {/* KPI Grid */}
      <div className="adm-kpi-grid">
        {kpiCards.map((card) => (
          <Link key={card.label} href={card.href} className="adm-kpi-card group no-underline">
              <div className={`adm-kpi-icon ${card.color} group-hover:scale-110 transition-transform`}>
                <card.icon size={22} />
              </div>
              <div className="adm-kpi-content flex-1">
                <div className="adm-kpi-label">{card.label}</div>
                <div className="adm-kpi-value">{card.value}</div>
                <div className="adm-kpi-change neutral">{card.change}</div>
              </div>
              <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
          </Link>
        ))}
      </div>

      <div className="adm-card border-none shadow-xl shadow-slate-200/50 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-amber-500" />
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Tezkor harakatlar</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/taxi/disputes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-800 hover:bg-white hover:border-slate-300 transition-colors"
          >
            <span>Taxi nizolari</span>
            <span className="adm-nav-badge">{stats.taxiDisputeCount}</span>
          </Link>
          <Link
            href="/admin/guide/bookings?status=DISPUTE"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-800 hover:bg-white hover:border-slate-300 transition-colors"
          >
            <span>Guide nizolari</span>
            <span className="adm-nav-badge">{stats.guideDisputeCount}</span>
          </Link>
          <Link
            href="/admin/guide/listings?status=PENDING"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-800 hover:bg-white hover:border-slate-300 transition-colors"
          >
            <span>{"Tasdiq kutilmoqda (Guide)"}</span>
            <span className="adm-nav-badge">{stats.guidePendingListingCount}</span>
          </Link>
          <Link
            href="/admin/taxi/drivers?verified=false"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-800 hover:bg-white hover:border-slate-300 transition-colors"
          >
            <span>{"Tasdiq kutilmoqda (Taxi haydovchi)"}</span>
            <span className="adm-nav-badge">{stats.unverifiedDriverCount}</span>
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
    </div>
  );
}
