"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { hotelFetch } from "@/app/hotel/_lib/hotelFetch";
import "./hotel.css";
import {
  LayoutDashboard, Building2, BedDouble, CalendarCheck, CalendarDays,
  LogOut, Menu, X, Bell, ChevronLeft, ChevronRight,
  Users, Brush, Receipt, TrendingUp, UserCog, Utensils, Package, Megaphone, Settings, BarChart2,
  LifeBuoy, Plus, FileText,
} from "lucide-react";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import { normalizeHotelNavRole } from "./nav-role";

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
      { href: "/hotel/calendar",      label: t("nav.calendar"), icon: CalendarDays, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/rooms",         label: t("nav.rooms"),    icon: BedDouble, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/housekeeping",  label: t("nav.housekeeping"), icon: Brush, roles: ["hotel_manager", "admin", "receptionist", "cleaner"] },
    ]
  },
  {
    label: t("nav.crm"),
    items: [
      { href: "/hotel/guests",        label: t("nav.guests"), icon: Users, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/finance",       label: t("nav.finance"),       icon: Receipt, roles: ["hotel_manager", "admin", "receptionist"] },
      { href: "/hotel/invoices/new",  label: "Invoys",               icon: FileText, roles: ["hotel_manager", "admin", "receptionist"] },
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
      { href: "/hotel/reports",       label: t("nav.reports"),       icon: BarChart2, roles: ["hotel_manager", "admin"] },
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
  const [ready,      setReady]      = useState(false);

  async function ensureAuth() {
    try {
      // hotelFetch already refreshes once and retries on 401, so a 401 here
      // means the refresh token is gone too — not just an expired access token.
      const res = await hotelFetch("/api/user/me");
      if (res.status === 401) {
        router.push("/login?next=" + encodeURIComponent(pathname));
        return;
      }
      if (res.ok) {
        const d = await res.json();
        if (d.user) {
          setUser(d.user);
          setReady(true);
        }
      }
    } catch { /* offline — keep the shell gated, the next request will retry */ }
  }

  // Auth once on mount — re-fetching on every pathname remounted the sidebar tree.
  useEffect(() => {
    void ensureAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* noop */ }
    toast.success(t("common.toasts.logged_out"));
    router.push("/login");
  }

  const initials    = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() : "H";
  const sideW = collapsed ? 80 : 250;

  // HotelStaff jobs are UPPERCASE; nav `roles` arrays are lowercase platform keys.
  const effectiveRole = normalizeHotelNavRole(
    user?.hotelStaff?.role,
    user?.role,
  );
  const isOwner = user?.role === "hotel_manager" || user?.role === "admin";
  const isCleaner = effectiveRole === "cleaner";
  const isReceptionist = effectiveRole === "receptionist";
  const isWaiter = effectiveRole === "waiter";
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

  // Render helpers (not components) — avoids remounting the tree on every parent render.
  function renderSidebar(forMobile = false) {
    const showText = forMobile || !collapsed;
    
    // Determine which groups to show
    const visibleGroups = NAV_GROUPS.map(group => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(effectiveRole))
    })).filter(g => g.items.length > 0);

    return (
      <div className="flex flex-col h-full bg-[#0d2137] text-white">
        {/* Brand — Silk Road Partner HMS */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 min-h-[64px]">
          <div className="w-9 h-9 rounded-xl bg-[#006781] flex items-center justify-center shrink-0 text-white shadow-[0_4px_12px_rgba(0,103,129,0.35)]">
            <Building2 size={20} />
          </div>
          {showText && (
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-white text-[17px] leading-tight truncate">
                SafarTrip Partner
              </div>
              <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#8fdfff]">
                Property Management
              </div>
            </div>
          )}
          {!forMobile && !isStaff && (
            <button
              className="w-7 h-7 shrink-0 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 flex items-center justify-center transition-colors ml-auto"
              onClick={() => setCollapsed((p) => !p)}
              type="button"
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </div>

        {/* Nav with Groups */}
        <nav className="hl-nav-scroll flex-1 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group, idx) => (
            <div key={idx} className="mb-5">
              {showText && (
                <div className="text-[10px] uppercase font-[family-name:var(--font-sora)] font-semibold tracking-widest text-white/35 mb-2 px-3">
                  {group.label}
                </div>
              )}
              {!showText && idx !== 0 && (
                <div className="h-px bg-white/10 w-8 mx-auto my-3" />
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={!showText ? item.label : undefined}
                      className={`relative flex items-center gap-3 p-2.5 rounded-xl transition-all text-[13px] font-[family-name:var(--font-sora)] font-semibold ${
                        active
                          ? "bg-[#006781]/25 text-[#8fdfff]"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }${!showText ? " justify-center" : ""}`}
                    >
                      {active ? (
                        <span className="absolute left-0 top-[18%] bottom-[18%] w-[3px] rounded-r bg-[#8fdfff]" />
                      ) : null}
                      <item.icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                      {showText && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings + Support + user */}
        <div className="border-t border-white/10 p-3 space-y-1 bg-black/15">
          <Link
            href="/hotel/settings"
            className={`flex items-center gap-3 p-2.5 rounded-xl text-[13px] font-[family-name:var(--font-sora)] font-semibold transition-all ${
              isActive("/hotel/settings")
                ? "bg-[#006781]/25 text-[#8fdfff]"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }${!showText ? " justify-center" : ""}`}
          >
            <Settings size={18} className="shrink-0" />
            {showText && <span>Settings</span>}
          </Link>
          <Link
            href="/hotel/help"
            className={`flex items-center gap-3 p-2.5 rounded-xl text-[13px] font-[family-name:var(--font-sora)] font-semibold transition-all ${
              isActive("/hotel/help")
                ? "bg-[#006781]/25 text-[#8fdfff]"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }${!showText ? " justify-center" : ""}`}
          >
            <LifeBuoy size={18} className="shrink-0" />
            {showText && <span>Yordam</span>}
          </Link>

          <div
            className={`pt-2 ${showText ? "flex items-center justify-between" : "flex flex-col items-center gap-3"}`}
          >
            {showText ? (
              <>
                <Link
                  href="/hotel/profile"
                  className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity"
                  title="Profil"
                >
                  <div className="w-9 h-9 rounded-full bg-[#006781] text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-white truncate">
                      {user ? `${user.first_name} ${user.last_name}` : "Manager"}
                    </div>
                    <div className="text-[10px] text-white/45 truncate">
                      {user?.email || "hotel@safartrip.uz"}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="p-2 text-white/45 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                >
                  <LogOut size={16} strokeWidth={2.5} />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/hotel/profile"
                  className="w-9 h-9 rounded-full bg-[#006781] text-white font-bold flex items-center justify-center text-sm hover:brightness-110"
                  title="Profil"
                  aria-label="Profil"
                >
                  {initials}
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="p-2 text-white/45 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Chiqish"
                >
                  <LogOut size={16} strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Specialized Bottom Navigation for Staff
  function renderBottomNav() {
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

  // Hotel data must not paint before the session check lands.
  if (!ready) {
    return (
      <div className="hl-root flex h-screen items-center justify-center bg-[#f9f9ff] text-sm font-semibold text-[#64748B]">
        Yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="hl-root flex h-screen bg-[#f9f9ff] overflow-hidden text-[#111c2d]">

      {/* ━━━ DESKTOP SIDEBAR ━━━ */}
      {!isStaff && (
        <aside
          className="border-r border-[#0d2137] bg-[#0d2137] shadow-[2px_0_16px_rgba(0,9,23,0.18)] transition-all shrink-0 z-20 flex-col hidden lg:flex"
          style={{ width: sideW }}
        >
          {renderSidebar()}
        </aside>
      )}

      {/* ━━━ MOBILE DRAWER ━━━ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-[#000917]/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-[260px] bg-[#0d2137] h-full shadow-2xl flex flex-col pt-12">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 bg-white/10 text-white/80 rounded-lg z-50"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={18} />
            </button>
            {renderSidebar(true)}
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

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center bg-[#f0f3ff] rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setLanguage("uz")}
                className={`px-3 py-1 text-[10px] font-[family-name:var(--font-sora)] font-semibold rounded-md transition-all ${language === "uz" ? "bg-white text-[#006781] shadow-sm" : "text-[#64748B] hover:text-[#111c2d]"}`}
              >
                UZ
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-3 py-1 text-[10px] font-[family-name:var(--font-sora)] font-semibold rounded-md transition-all ${language === "en" ? "bg-white text-[#006781] shadow-sm" : "text-[#64748B] hover:text-[#111c2d]"}`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              className="relative p-2 text-[#64748B] hover:text-[#0d2137] hover:bg-[#f0f3ff] rounded-full transition-colors"
            >
              <Bell size={18} strokeWidth={2.5} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#F43F5E] rounded-full border border-white" />
            </button>

            {(isOwner || isReceptionist) && (
              <Link
                href="/hotel/check-in"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#006781] hover:bg-[#005a71] text-white text-[12px] font-[family-name:var(--font-sora)] font-semibold transition-colors"
              >
                <Plus size={14} strokeWidth={2.5} />
                Check-in
              </Link>
            )}

            {!isStaff && (
              <>
                <div className="w-px h-6 bg-[#d8e3fb] hidden sm:block" />
                <div className="hidden sm:flex items-center gap-3 pr-1">
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-[#111c2d]">
                      {user?.first_name || t("common.manager")}
                    </div>
                    <div className="text-[11px] font-medium text-[#64748B]">
                      {user?.hotelStaff?.role
                        ? t(`common.roles.${user.hotelStaff.role.toLowerCase()}`)
                        : user?.role === "admin"
                          ? t("common.roles.admin")
                          : t("common.roles.owner")}
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
           {renderBottomNav()}
        </div>
      </div>
    </div>
  );
}
