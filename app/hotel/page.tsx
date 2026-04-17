"use client";

import { useEffect, useState } from "react";
import {
  BedDouble, CalendarCheck, Users, ShieldCheck, AlertCircle, Loader2,
  Plus, CalendarDays, Settings, ArrowRight, Clock, Box, Building2,
  MoveUp, MoveDown, Package, Bell, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface StatsData {
  metrics: {
    arrivals: number;
    departures: number;
    currentGuests: number;
    lowStockCount: number;
    roomStatuses: {
      AVAILABLE: number;
      OCCUPIED: number;
      CLEANING: number;
      MAINTENANCE: number;
      BLOCKED: number;
    };
  };
  recentActivity: any[];
}

interface HotelData {
  id: string;
  name: string;
  status: string;
  city: string | null;
  _count: { roomTypes: number; bookings: number };
}

export default function HotelDashboard() {
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  const QUICK_LINKS = [
    { href: "/hotel/rooms",    label: t("nav.rooms"),        desc: t("dashboard.new_booking"), icon: Box,           color: "#0E7490", bg: "rgba(14, 116, 144, 0.08)" },
    { href: "/hotel/bookings", label: t("nav.reception"),  desc: t("dashboard.recent_activity"), icon: CalendarDays,"color": "#1A4B7A", bg: "rgba(26, 75, 122, 0.08)" },
    { href: "/hotel/settings", label: t("nav.settings"),  desc: t("nav.finance"),   icon: Settings,      color: "#0D2137", bg: "rgba(13, 33, 55, 0.08)" },
  ];

  async function load() {
    try {
      const [hRes, sRes] = await Promise.all([
        fetch("/api/hotel/me"),
        fetch("/api/hotel/stats")
      ]);
      const hData = await hRes.json();
      const sData = await sRes.json();

      if (!hRes.ok) throw new Error(hData.message || t("common.error"));
      setHotel(hData.hotel);
      setStats(sData);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    async function init() {
      await load();
    }
    void init(); 
  }, []);

  // Role-based redirection for specialized staff
  useEffect(() => {
    if (hotel && !loading) {
      // Check if user is staff and has a specialized role
      // Note: We need to check the hotelStaff role from /api/hotel/me
      const staffRole = (hotel as any).staffRecord?.role;
      if (staffRole === "CLEANER") {
        router.push("/hotel/housekeeping");
      }
    }
  }, [hotel, loading, router]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <Loader2 size={24} className="animate-spin text-slate-400 mb-3" />
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("common.loading")}</p>
    </div>
  );

  if (error) return (
    <div className="bg-white border border-red-100 rounded-xl max-w-md mx-auto mt-20 p-8 text-center shadow-sm">
      <AlertCircle size={32} className="text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-black text-slate-900 mb-2">{t("dashboard.system_error")}</h2>
      <p className="text-slate-500 font-medium text-sm mb-6">{error}</p>
      <button onClick={() => window.location.reload()} className="px-5 py-2 bg-slate-100 font-bold text-slate-700 rounded-lg hover:bg-slate-200 transition-all">
        {t("dashboard.try_again")}
      </button>
    </div>
  );

  const roomStatusItems = [
    { label: t("dashboard.room_available"), count: stats?.metrics?.roomStatuses?.AVAILABLE || 0, color: "text-green-600", bg: "bg-green-50" },
    { label: t("dashboard.room_occupied"),  count: stats?.metrics?.roomStatuses?.OCCUPIED || 0,  color: "text-blue-600", bg: "bg-blue-50" },
    { label: t("dashboard.room_cleaning"), count: stats?.metrics?.roomStatuses?.CLEANING || 0, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-10 pb-10 max-w-[1600px] mx-auto">

      {/* CRM Minimal Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 rounded-xl bg-[var(--bg-light-blue)] flex items-center justify-center shadow-inner border border-slate-100">
                  <Building2 className="text-[var(--primary)]" size={30}/>
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <h1 className="text-2xl font-black text-[var(--primary)] font-display tracking-tight leading-none">{hotel?.name || t("dashboard.hotel_fallback")}</h1>
                     {hotel?.status === "approved" 
                         ? <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-green-50 text-green-600 uppercase border border-green-100"><ShieldCheck size={12}/> {t("common.approved")}</span>
                         : <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600 uppercase border border-amber-100"><Clock size={12}/> {t("common.pending")}</span>
                     }
                  </div>
                  <p className="text-[13px] font-semibold text-slate-500">{hotel?.city ? `${hotel.city} ${t("common.city")}.` : ""} {t("dashboard.metrics_active")}</p>
               </div>
            </div>
            
            <div className="flex items-center gap-3">
               <button onClick={() => void load()} className="p-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
               </button>
               <Link href="/hotel/bookings" className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white text-[13px] font-bold rounded-lg hover:bg-[var(--secondary)] transition-colors shadow-sm">
                 <Plus size={16} /> {t("dashboard.new_booking")}
               </Link>
            </div>
         </div>
      </div>

      {/* Operational Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group">
           <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("dashboard.arrivals_today")}</p>
              <div className="p-1.5 bg-green-50 rounded-lg text-green-600"><MoveDown size={14}/></div>
           </div>
           <div className="text-3xl font-black text-[var(--primary)]">{stats?.metrics.arrivals ?? 0}</div>
           <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">{t("common.guest")}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group">
           <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("dashboard.departures_today")}</p>
              <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600"><MoveUp size={14}/></div>
           </div>
           <div className="text-3xl font-black text-[var(--primary)]">{stats?.metrics.departures ?? 0}</div>
           <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase">{t("common.guest")}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group">
           <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("dashboard.room_status")}</p>
              <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><BedDouble size={14}/></div>
           </div>
           <div className="flex items-center gap-2 mt-1">
              {roomStatusItems.map(item => (
                <div key={item.label} className="text-center flex-1">
                   <div className={`text-sm font-black ${item.color}`}>{item.count}</div>
                   <div className="text-[9px] font-bold text-slate-400 uppercase">{item.label}</div>
                </div>
              ))}
           </div>
        </div>

        <div className={`border rounded-xl p-5 shadow-sm group transition-all ${stats?.metrics.lowStockCount ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
           <div className="flex justify-between items-start mb-2">
              <p className={`text-[10px] font-black uppercase tracking-widest ${stats?.metrics.lowStockCount ? 'text-red-500' : 'text-slate-400'}`}>{t("dashboard.inventory_alerts")}</p>
              <div className={`p-1.5 rounded-lg ${stats?.metrics.lowStockCount ? 'bg-white text-red-500 shadow-sm' : 'bg-slate-50 text-slate-400'}`}><Package size={14}/></div>
           </div>
           <div className={`text-3xl font-black ${stats?.metrics.lowStockCount ? 'text-red-600' : 'text-[var(--primary)]'}`}>{stats?.metrics.lowStockCount ?? 0}</div>
           <p className={`text-[11px] font-bold mt-1 uppercase ${stats?.metrics.lowStockCount ? 'text-red-400' : 'text-slate-400'}`}>{t("dashboard.low_stock")}</p>
        </div>
      </div>

      {/* Main Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl h-full flex flex-col shadow-sm min-h-[400px]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-[var(--primary)] text-[15px] flex items-center gap-2">
                 <Bell size={18} className="text-amber-500"/> {t("dashboard.recent_activity")}
              </h3>
              <Link href="/hotel/bookings" className="text-[11px] font-bold text-[var(--accent)] bg-[var(--bg-light-blue)] px-2.5 py-1 rounded-md uppercase tracking-wider">{t("dashboard.view_all")}</Link>
            </div>
            
            <div className="flex-1 overflow-y-auto">
               {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                 <div className="divide-y divide-slate-50">
                    {stats.recentActivity.map((act) => (
                      <div key={act.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[12px] border ${
                               act.status === 'CANCELLED' ? 'bg-red-50 text-red-500 border-red-100' : 
                               act.status === 'CONFIRMED' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                               {act.guestName[0]}
                            </div>
                            <div>
                               <div className="font-bold text-slate-800 text-[14px]">{act.guestName}</div>
                               <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                                  {new Date(act.createdAt).toLocaleDateString()} • {t("reception.status." + act.status)}
                               </div>
                            </div>
                         </div>
                         <div className="text-right">
                            <div className="text-[13px] font-black text-slate-700">{Number(act.totalAmount).toLocaleString()} {t("common.currency")}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">{t("common.amount")}</div>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                    <CalendarDays size={28} className="text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-700 text-[14px]">{t("dashboard.no_data")}</p>
                    <p className="text-[12px] font-semibold text-slate-400 mt-1">{t("dashboard.no_data_desc")}</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
           {/* Quick Actions */}
           <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-5 shadow-sm">
             <h3 className="font-extrabold text-[var(--primary)] text-[14px] mb-4">{t("dashboard.quick_links")}</h3>
             <div className="space-y-2">
               {QUICK_LINKS.map(link => (
                 <Link key={link.href} href={link.href}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all group shadow-sm"
                 >
                   <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                     style={{ background: link.bg, color: link.color }}>
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

           {/* Feedback Ad */}
           <div className="bg-[var(--primary)] rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={100}/></div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">{t("dashboard.pms_prefix")}</p>
              <h4 className="text-xl font-black mb-3 leading-tight tracking-tight">{t("dashboard.pms_ad_title")}</h4>
              <p className="text-[12px] font-medium text-slate-300 mb-6 leading-relaxed">{t("dashboard.pms_ad_desc")}</p>
              <Link href="/hotel/help" className="inline-block bg-[var(--accent)] text-white px-4 py-2 rounded-lg text-[11px] font-black uppercase shadow-md hover:bg-[#D4A017] transition-all text-center">
                 {t("dashboard.view_docs")}
              </Link>
           </div>
        </div>
      </div>

    </div>
  );
}
