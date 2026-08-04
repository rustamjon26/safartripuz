"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback, type ReactNode, Suspense } from "react";
import { toast } from "sonner";
import "./admin.css";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MapPin,
  House,
  CreditCard,
  Building2,
  FileText,
  Settings,
  Menu,
  X,
  Compass,
  Bell,
  Percent,
  BookOpen,
  Shield,
  Search,
} from "lucide-react";
import { DirectionsCarIcon } from "@/components/admin/taxi/DirectionsCarIcon";
import { ExploreMapIcon } from "@/components/admin/guide/ExploreMapIcon";
import { AdminSidebarNav, type AdminNavItem } from "@/components/admin/AdminSidebarNav";

function TaxiSidebarIcon({ size = 18 }: { size?: number }) {
  return <DirectionsCarIcon size={size} />;
}

function GuideSidebarIcon({ size = 18 }: { size?: number }) {
  return <ExploreMapIcon size={size} />;
}

/** Primary order (1–8) per product spec; remaining items follow under Tizim. */
const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Bosh sahifa", icon: LayoutDashboard, section: "Asosiy" },
  { href: "/admin/users", label: "Foydalanuvchilar", icon: Users, section: "Boshqaruv" },
  { href: "/admin/hotels", label: "Mehmonxona", icon: Building2, section: "Kontent" },
  { href: "/admin/homestay", label: "Uy Mehmonxona", icon: House, section: "Kontent" },
  { href: "/admin/taxi", label: "Taxi", icon: TaxiSidebarIcon, section: "Kontent" },
  { href: "/admin/guide", label: "Ekskursiya", icon: GuideSidebarIcon, section: "Kontent" },
  { href: "/admin/knowledge", label: "Knowledge", icon: BookOpen, section: "Kontent" },
  { href: "/admin/payments", label: "To'lovlar", icon: CreditCard, section: "Moliya" },
  { href: "/admin/settings", label: "Sozlamalar", icon: Settings, section: "Tizim" },
  { href: "/admin/settings/commission", label: "Komissiya", icon: Percent, section: "Tizim" },
  { href: "/admin/settings/payments", label: "To'lov provayderlari", icon: CreditCard, section: "Tizim" },
  { href: "/admin/partners", label: "Hamkorlar", icon: CheckSquare, section: "Tizim", badgeKey: "pending" },
  { href: "/admin/tours", label: "Tur Paketlar", icon: Compass, section: "Tizim" },
  { href: "/admin/audit", label: "Audit Logs", icon: FileText, section: "Tizim" },
];

function groupNavItems(items: AdminNavItem[]) {
  const groups: Record<string, AdminNavItem[]> = {};
  for (const item of items) {
    const sec = item.section ?? "Boshqa";
    if (!groups[sec]) groups[sec] = [];
    groups[sec].push(item);
  }
  return groups;
}

interface AdminUser {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

type SidebarCountsPayload = {
  partnerPendingCount: number;
  taxiDisputeCount: number;
  guideDisputeCount: number;
  guidePendingListingCount: number;
  homestayPendingListingCount: number;
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifyDots, setNotifyDots] = useState({ taxi: false, guide: false, homestay: false });
  const sidebarCacheRef = useRef<{ fetchedAt: number; data: SidebarCountsPayload | null }>({
    fetchedAt: 0,
    data: null,
  });

  const applySidebarCounts = useCallback((d: SidebarCountsPayload) => {
    setPendingCount(Number(d.partnerPendingCount ?? 0));
    setNotifyDots({
      taxi: Number(d.taxiDisputeCount ?? 0) > 0,
      guide: Number(d.guideDisputeCount ?? 0) > 0 || Number(d.guidePendingListingCount ?? 0) > 0,
      homestay: Number(d.homestayPendingListingCount ?? 0) > 0,
    });
  }, []);

  const refreshSidebarCounts = useCallback(
    async (force: boolean) => {
      const now = Date.now();
      const cache = sidebarCacheRef.current;
      if (!force && cache.data && now - cache.fetchedAt < 60_000) {
        applySidebarCounts(cache.data);
        return;
      }
      try {
        const res = await fetch("/api/admin/sidebar-counts");
        if (!res.ok) return;
        const d = (await res.json()) as SidebarCountsPayload;
        sidebarCacheRef.current = { fetchedAt: Date.now(), data: d };
        applySidebarCounts(d);
      } catch {
        /* ignore */
      }
    },
    [applySidebarCounts],
  );

  const ensureAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.status === 401) {
        const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshRes.ok) {
          const retry = await fetch("/api/user/me");
          const data = await retry.json();
          if (data.user) {
            const r = data.user.role as string;
            if (r !== "admin" && r !== "super_admin") {
              router.replace("/dashboard");
              return;
            }
            setUser(data.user);
          }
        } else {
          router.push("/login?next=" + encodeURIComponent(pathname));
        }
      } else if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const r = data.user.role as string;
          if (r !== "admin" && r !== "super_admin") {
            router.replace("/dashboard");
            return;
          }
          setUser(data.user);
        }
      }
    } catch {
      /* offline */
    }
  }, [pathname, router]);

  useEffect(() => {
    queueMicrotask(() => {
      void ensureAuth();
      void refreshSidebarCounts(false);
    });
  }, [pathname, ensureAuth, refreshSidebarCounts]);

  useEffect(() => {
    queueMicrotask(() => setSidebarOpen(false));
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    toast.success("Tizimdan chiqildi");
    router.push("/login");
  }

  const grouped = groupNavItems(NAV_ITEMS);
  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "A";

  const pageItem = NAV_ITEMS.find((i) =>
    i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href),
  );

  const sidebarProps = {
    grouped,
    pathname,
    pendingCount,
    notifyDots,
    user,
    initials,
    onLogout: handleLogout,
  };

  return (
    <div className="admin-root bg-[#f4f6fb]">
      <aside className="adm-sidebar hidden lg:flex">
        <AdminSidebarNav {...sidebarProps} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#000917]/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[280px] bg-[#0d2137] shadow-2xl flex flex-col">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white/80 z-10"
            >
              <X size={18} />
            </button>
            <AdminSidebarNav {...sidebarProps} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="adm-main lg:ml-[280px] flex-1 min-w-0">
        <header className="adm-topbar sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-[#d8e3fb] px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl hover:bg-[#f0f3ff] text-[#64748B]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">
                SafarTrip Operator
              </p>
              <h1 className="adm-topbar-title text-[17px] font-display font-bold text-[#0d2137] tracking-tight truncate">
                {pageItem?.label ?? "Boshqaruv"}
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="search"
                placeholder="Qidiruv..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#f0f3ff] border-0 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] outline-none focus:ring-2 focus:ring-[#006781]/25"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = (e.target as HTMLInputElement).value.trim();
                    if (q) router.push(`/admin/partners?q=${encodeURIComponent(q)}`);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f0f3ff] text-[#64748B] text-[12px] font-[family-name:var(--font-sora)] font-semibold hover:text-[#0d2137] transition-colors"
            >
              <MapPin size={14} />
              Sayt
            </Link>

            <button
              type="button"
              className="relative p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B] hover:text-[#0d2137] hover:bg-[#f9f9ff]"
            >
              <Bell size={18} />
            </button>
            <Link
              href="/admin/audit"
              className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B] hover:text-[#0d2137] hover:bg-[#f9f9ff]"
              title="Xavfsizlik / Audit"
            >
              <Shield size={18} />
            </Link>
            <Link
              href="/admin/settings"
              className="p-2.5 rounded-xl bg-white border border-[#d8e3fb] text-[#64748B] hover:text-[#0d2137] hover:bg-[#f9f9ff]"
              title="Sozlamalar"
            >
              <Settings size={18} />
            </Link>

            <Link
              href="/admin/settings"
              className="hidden sm:flex items-center gap-2 pl-1 hover:opacity-90 transition-opacity"
              title="Sozlamalar / akkaunt"
              aria-label="Sozlamalar"
            >
              <div className="text-right leading-tight">
                <div className="text-[12px] font-semibold text-[#111c2d]">
                  {user ? `${user.first_name}` : "Admin"}
                </div>
                <div className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wide">
                  {user?.role === "super_admin" ? "Super Admin" : "Boshqaruvchi"}
                </div>
              </div>
              <div className="adm-user-avatar">{initials}</div>
            </Link>
          </div>
        </header>

        <main className="adm-content px-4 sm:px-6 py-6 sm:py-8 pb-20">
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center text-[#64748B] text-sm font-semibold">
                Yuklanmoqda…
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
