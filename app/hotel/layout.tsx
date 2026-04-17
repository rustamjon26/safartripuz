"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import "./hotel.css";
import {
  LayoutDashboard, Building2, BedDouble, CalendarCheck,
  LogOut, Menu, X, Hotel, Bell, ChevronLeft, ChevronRight,
  Users, Brush, Receipt, TrendingUp, UserCog, Utensils, Package, Megaphone, Settings, BarChart3, Globe
} from "lucide-react";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";

interface HotelUser { 
  first_name: string; 
  last_name: string; 
  email: string; 
  role: string; 
  hotelStaff?: { role: string };
}

const GET_NAV_GROUPS = (t: any) => [
  {
    label: t("nav.front"),
    items: [
      { href: "/hotel",               label: t("nav.dashboard"), icon: LayoutDashboard, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/bookings",      label: t("nav.reception"), icon: CalendarCheck, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/rooms",         label: t("nav.rooms"),    icon: BedDouble, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/housekeeping",  label: t("nav.housekeeping"), icon: Brush, roles: ["hotel_manager", "admin", "receptionist", "cleaner"] },
    ]
  },
  {
    label: t("nav.crm"),
    items: [
      { href: "/hotel/guests",        label: t("nav.guests"), icon: Users, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/finance",       label: t("nav.finance"),       icon: Receipt, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/revenue",       label: t("nav.revenue"),       icon: TrendingUp, roles: ["hotel_manager", "admin"] },
    ]
  },
  {
    label: t("nav.hr_moddiy"),
    items: [
      { href: "/hotel/hr",            label: t("nav.hr"),    icon: UserCog, roles: ["hotel_manager", "admin"] },
      { href: "/hotel/services/rest", label: t("nav.restaurant"),   icon: Utensils, roles: ["hotel_manager", "admin", "receptionist", "waiter"] },
      { href: "/hotel/services/inv",  label: t("nav.inventory"),  icon: Package, roles: ["hotel_manager", "admin", "receptionist"] },
    ]
  },
  {
    label: t("nav.quality"),
    items: [
      { href: "/hotel/marketing",     label: t("nav.marketing"), icon: Megaphone, roles: ["hotel_manager", "admin"] },
      { href: "/hotel/reports",       label: t("nav.reports"),       icon: BarChart3, roles: ["hotel_manager", "admin"] },
      { href: "/hotel/settings",      label: t("nav.settings"),icon: Settings, roles: ["hotel_manager", "admin", "receptionist", "waiter", "cleaner"] },
    ]
  }
];

// Helper to get flat NAV_ITEMS for mobile bottom bar
export default function HotelLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
       <HotelLayoutContent>{children}</HotelLayoutContent>
    </LanguageProvider>
  );
}

function HotelLayoutContent({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage } = useLanguage();
  const NAV_GROUPS = GET_NAV_GROUPS(t);
  const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);
  
  const pathname = usePathname();
  const router   = useRouter();

  const [collapsed,  setCollapsed]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user,       setUser]       = useState<HotelUser | null>(null);

  async function ensureAuth() {
    try {
      const res = await fetch("/api/user/me");
      if (res.status === 401) {
        const r = await fetch("/api/auth/refresh", { method: "POST" });
        if (r.ok) { const d = await (await fetch("/api/user/me")).json(); if (d.user) setUser(d.user); }
        else router.push("/login?next=" + encodeURIComponent(pathname));
      } else if (res.ok) { const d = await res.json(); if (d.user) setUser(d.user); }
    } catch { /* suppress */ }
  }

  useEffect(() => { void ensureAuth(); }, [pathname]);
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* noop */ }
    toast.success(t("common.toasts.logged_out"));
    router.push("/login");
  }

  const initials    = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "H";
  const sideW = collapsed ? 80 : 250;

  // 1. Role-based helpers
  const effectiveRole = user?.hotelStaff?.role || user?.role || "user";
  const isOwner = user?.role === "hotel_manager" || user?.role === "admin";
  const isCleaner = effectiveRole === "CLEANER" || user?.role === "cleaner";
  const isReceptionist = effectiveRole === "RECEPTION" || user?.role === "receptionist";
  const isWaiter = effectiveRole === "WAITER" || user?.role === "waiter";
  const isStaff = isCleaner || isReceptionist || isWaiter;

  // Dashboard Redirection for specialized staff
  useEffect(() => {
    if (user && pathname === "/hotel") {
      if (isCleaner) router.push("/hotel/housekeeping");
      else if (isReceptionist) router.push("/hotel/bookings");
      else if (isWaiter) router.push("/hotel/services/rest");
    }
  }, [user, pathname, isCleaner, isReceptionist, isWaiter, router]);

  function isActive(href: string) {
    if (href === "/hotel") return pathname === "/hotel";
    return pathname.startsWith(href);
  }

  const currentItem = ALL_ITEMS.find(i => isActive(i.href));

  function SidebarContent({ forMobile = false }: { forMobile?: boolean }) {
    const showText = forMobile || !collapsed;
    
    // Determine which groups to show
    const visibleGroups = NAV_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => (item.roles as any).includes(effectiveRole))
    })).filter(g => g.items.length > 0);

    return (
      <div className="flex flex-col h-full bg-white">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/80 min-h-[64px]">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-light-blue)] flex items-center justify-center shrink-0 border border-slate-100 text-[var(--accent)]"><Building2 size={20} /></div>
          {showText && (
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[var(--primary)] text-lg leading-tight truncate">Safar PMS</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">Enterprise</div>
            </div>
          )}
          {!forMobile && !isStaff && (
            <button className="w-7 h-7 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors ml-auto" onClick={() => setCollapsed(p => !p)}>
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </div>

        {/* Role Switcher (Simulation - ONLY for Real Managers) */}
        {isOwner && !user?.hotelStaff && !collapsed && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest pl-1">{t("common.roles.view_auth_sim")}</label>
            <select 
              value={user.role} 
              onChange={(e) => setUser({ ...user, role: e.target.value as any })}
              className="w-full text-[11px] font-bold py-1.5 px-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-[var(--accent)]"
            >
              <option value="hotel_manager">{t("common.roles.hotel_manager")}</option>
              <option value="RECEPTION">{t("common.roles.receptionist")}</option>
              <option value="CLEANER">{t("common.roles.cleaner")}</option>
              <option value="WAITER">{t("common.roles.waiter")}</option>
            </select>
          </div>
        )}

        {/* Nav with Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          {visibleGroups.map((group, idx) => (
            <div key={idx} className="mb-6">
              {showText && <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2 px-3">{group.label}</div>}
              {(!showText && idx !== 0) && <div className="h-px bg-slate-200/60 w-8 mx-auto my-3" />}
              
              <div className="space-y-1">
                {group.items.map(item => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} title={!showText ? (item as any).label : undefined}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-all text-[14px] font-bold ${active ? "bg-[var(--bg-light-blue)] text-[var(--accent)]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}${!showText ? " justify-center" : ""}`}
                    >
                      <item.icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                      {showText && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className={`border-t border-slate-200/80 p-4 ${showText ? "flex items-center justify-between" : "flex flex-col items-center gap-4"} bg-slate-50/50`}>
          {showText ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white font-black flex items-center justify-center text-sm shrink-0 shadow-sm">{initials}</div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-slate-900 truncate">{user ? `${user.first_name} ${user.last_name}` : "Manager"}</div>
                  <div className="text-[11px] font-semibold text-slate-500 truncate">{user?.email || "hotel@safartrip.uz"}</div>
                </div>
              </div>
              <button onClick={() => void handleLogout()} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                 <LogOut size={16} strokeWidth={2.5} />
              </button>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white font-black flex items-center justify-center text-sm shrink-0 shadow-sm" title="Profil">{initials}</div>
              <button onClick={() => void handleLogout()} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Chiqish">
                <LogOut size={16} strokeWidth={2.5}/>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Specialized Bottom Navigation for Staff
  function BottomNav() {
    if (isCleaner) {
      const items = [
        { href: "/hotel/housekeeping", label: t("common.bottom_nav.tasks"), icon: Brush },
        { href: "/hotel/settings",      label: t("common.bottom_nav.profile"),    icon: UserCog },
      ];
      return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          {items.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center p-1 rounded-xl text-[11px] font-black uppercase tracking-tighter ${active ? 'text-[var(--accent)]' : 'text-slate-400'}`}>
                <item.icon size={22} strokeWidth={active ? 3 : 2} className="mb-1" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      );
    }

    if (isReceptionist) {
      const items = [
        { href: "/hotel/bookings",     label: t("common.bottom_nav.bookings"), icon: CalendarCheck },
        { href: "/hotel/rooms",        label: t("common.bottom_nav.rooms"),     icon: BedDouble },
        { href: "/hotel/guests",       label: t("common.bottom_nav.guests"),   icon: Users },
        { href: "/hotel/housekeeping", label: t("common.bottom_nav.cleaning"),    icon: Brush },
      ];
      return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-3 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
           {items.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-black uppercase tracking-tighter ${active ? 'text-[var(--accent)]' : 'text-slate-400'}`}>
                <item.icon size={20} strokeWidth={active ? 3 : 2} className="mb-1" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      );
    }

    if (isWaiter) {
      const items = [
        { href: "/hotel/services/rest", label: t("common.bottom_nav.restaurant"), icon: Utensils },
        { href: "/hotel/settings",       label: t("common.bottom_nav.profile"),   icon: UserCog },
      ];
      return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
           {items.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex flex-col items-center p-1 rounded-xl text-[11px] font-black uppercase tracking-tighter ${active ? 'text-[var(--accent)]' : 'text-slate-400'}`}>
                <item.icon size={22} strokeWidth={active ? 3 : 2} className="mb-1" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      );
    }

    // Default Manager Bottom Nav
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-2 py-2 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        {ALL_ITEMS.slice(0, 5).map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center p-2 rounded-xl text-[10px] font-bold ${active ? 'text-[var(--accent)]' : 'text-slate-400'}`}>
              <item.icon size={20} strokeWidth={active ? 2.5 : 2} className="mb-1" />
              <span className="truncate w-16 text-center">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="hl-root flex h-screen bg-slate-50 overflow-hidden text-slate-900">

      {/* ━━━ DESKTOP SIDEBAR ━━━ */}
      {!isStaff && (
        <aside className="border-r border-slate-200/80 bg-white shadow-[2px_0_12px_rgba(0,0,0,0.02)] transition-all shrink-0 z-20 flex-col hidden lg:flex" style={{ width: sideW }}>
          <SidebarContent />
        </aside>
      )}

      {/* ━━━ MOBILE DRAWER ━━━ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-[260px] bg-white h-full shadow-2xl flex flex-col pt-12">
            <button className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 rounded-lg z-50" onClick={() => setDrawerOpen(false)}>
              <X size={18} />
            </button>
            <SidebarContent forMobile />
          </aside>
        </div>
      )}

      {/* ━━━ MAIN AREA ━━━ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-[64px] border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            {!isStaff && (
              <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setDrawerOpen(true)}>
                <Menu size={20} />
              </button>
            )}
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none mb-1">
                 {isStaff ? t("dashboard.staff_panel") : t("dashboard.pms_center")}
              </div>
              <div className="text-[15px] font-extrabold text-[var(--primary)] leading-none font-display">{currentItem?.label || t("dashboard.system")}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 mr-2">
               <button 
                  onClick={() => setLanguage("uz")}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${language === 'uz' ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                  UZ
               </button>
               <button 
                  onClick={() => setLanguage("en")}
                  className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${language === 'en' ? 'bg-white text-[var(--accent)] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                  EN
               </button>
            </div>

            <button className="relative p-2 text-slate-400 hover:text-[var(--primary)] hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={18} strokeWidth={2.5} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white" />
            </button>
            {!isStaff && (
              <>
                <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-3 pr-2">
                  <div className="text-right">
                    <div className="text-[13px] font-bold text-slate-900">{user?.first_name || t("common.manager")}</div>
                    <div className="text-[11px] font-semibold text-slate-400">
                       {user?.hotelStaff?.role ? t(`common.roles.${user.hotelStaff.role.toLowerCase()}`) : (user?.role === "admin" ? t("common.roles.admin") : t("common.roles.owner"))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
          <div className="max-w-[1400px] mx-auto pb-16 lg:pb-0">
             {children}
          </div>
        </main>

        {/* ━━━ BOTTOM NAV ━━━ */}
        <div className="lg:hidden">
           <BottomNav />
        </div>
      </div>
    </div>
  );
}
