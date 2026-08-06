"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Car,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  UserCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import "./taxi-partner.css";

const NAV_ITEMS = [
  { href: "/taxi-partner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/taxi-partner/orders", label: "Safarlar", icon: ClipboardList },
  { href: "/taxi-partner/vehicles", label: "Avtomobillar", icon: Car },
  { href: "/taxi-partner/earnings", label: "Moliya", icon: CircleDollarSign },
  { href: "/taxi-partner/profile", label: "Sozlamalar", icon: UserCircle2 },
];

interface CurrentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export default function TaxiPartnerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          router.push("/login?next=/taxi-partner/dashboard");
          return;
        }
        const role = data?.user?.role as string | undefined;
        // Admin may assign either `taxi` (driver) or `taxi_partner` (fleet).
        // Middleware already allows both; the shell must match.
        if (role !== "taxi" && role !== "taxi_partner") {
          router.push("/");
          return;
        }
        setUser(data.user);
        setReady(true);
      } catch {
        router.push("/login?next=/taxi-partner/dashboard");
      }
    }
    void loadMe();
  }, [router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    toast.success("Tizimdan chiqildi");
    router.push("/login");
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "TX";

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const currentTitle =
    NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label ||
    "Taxi";

  const roleLabel =
    user?.role === "taxi_partner" ? "Fleet Partner" : "Taxi Hamkor";

  function renderSidebar(mobile = false) {
    return (
      <div className="flex flex-col h-full bg-[#0d2137] text-white">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 min-h-[64px]">
          <div className="w-9 h-9 rounded-xl bg-[#006781] flex items-center justify-center shrink-0 text-white shadow-[0_4px_12px_rgba(0,103,129,0.35)]">
            <Car size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-white text-[17px] leading-tight truncate">
              SafarTrip Partner
            </div>
            <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#8fdfff]">
              Fleet Management
            </div>
          </div>
          {mobile ? (
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 bg-white/10 rounded-lg text-white/80"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <nav className="tp-nav-scroll flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 p-2.5 rounded-xl transition-all text-[13px] font-[family-name:var(--font-sora)] font-semibold ${
                  active
                    ? "bg-[#006781]/25 text-[#8fdfff]"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active ? (
                  <span className="absolute left-0 top-[18%] bottom-[18%] w-[3px] rounded-r bg-[#8fdfff]" />
                ) : null}
                <item.icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-2 bg-black/15">
          <Link
            href="/taxi-partner/profile"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#006781] text-white text-[12px] font-[family-name:var(--font-sora)] font-semibold hover:bg-[#005a71]"
          >
            <Plus size={14} />
            Profil / Transport
          </Link>
          <Link
            href="/support-chat"
            className="flex items-center gap-3 p-2.5 rounded-xl text-[13px] font-[family-name:var(--font-sora)] font-semibold text-white/55 hover:bg-white/5 hover:text-white"
          >
            <LifeBuoy size={16} />
            Yordam
          </Link>
          <div className="flex items-center gap-3 px-1 pt-1">
            <Link
              href="/taxi-partner/profile"
              className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-90 transition-opacity"
              title="Profil"
            >
              <div className="w-9 h-9 rounded-full bg-[#006781] text-white font-bold flex items-center justify-center text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-white truncate">
                  {user ? `${user.first_name} ${user.last_name}` : "Driver"}
                </div>
                <div className="text-[10px] text-white/45 truncate">
                  {user?.email || "driver@safartrip.uz"}
                </div>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="p-2 text-white/45 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
              title="Chiqish"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nothing renders until the session check resolves — otherwise the shell and
  // its data are briefly visible to a signed-out visitor on a client navigation.
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-slate-500">
        Yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="tp-root">
      <aside className="tp-sidebar-desktop" aria-label="Taxi partner navigation">
        {renderSidebar()}
      </aside>
      <div className="tp-sidebar-spacer" aria-hidden />

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#000917]/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-[270px] bg-[#0d2137] h-full shadow-2xl flex flex-col z-10">
            {renderSidebar(true)}
          </aside>
        </div>
      ) : null}

      <div className="tp-main">
        <header className="tp-topbar">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 text-[#64748B] hover:bg-[#f0f3ff] rounded-lg shrink-0"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#94A3B8] leading-none mb-1">
                Taxi Partner
              </div>
              <div className="text-[15px] font-display font-bold text-[#0d2137] leading-none truncate">
                {currentTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              className="p-2 text-[#64748B] hover:text-[#0d2137] hover:bg-[#f0f3ff] rounded-full transition-colors"
              title="Bildirishnomalar"
              aria-label="Bildirishnomalar"
            >
              <Bell size={18} strokeWidth={2.5} />
            </button>

            <div className="w-px h-6 bg-[#d8e3fb] hidden sm:block" />

            <Link
              href="/taxi-partner/profile"
              className="flex items-center gap-2.5 pl-0.5 hover:opacity-90 transition-opacity"
              title="Profil"
              aria-label="Profil"
            >
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-[13px] font-semibold text-[#111c2d]">
                  {user?.first_name || "Driver"}
                </div>
                <div className="text-[11px] font-medium text-[#64748B]">
                  {roleLabel}
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#0d2137] text-white font-bold flex items-center justify-center text-sm">
                {initials}
              </div>
            </Link>
          </div>
        </header>

        <main className="tp-content">
          <div className="tp-content-inner">
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center text-[#64748B] text-sm font-semibold">
                  Yuklanmoqda…
                </div>
              }
            >
              {children}
            </Suspense>
          </div>
        </main>

        <nav className="tp-bottom-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-[family-name:var(--font-sora)] font-semibold ${
                  active ? "text-[#006781]" : "text-[#94A3B8]"
                }`}
              >
                <item.icon size={20} strokeWidth={active ? 2.5 : 2} className="mb-1" />
                <span>{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
