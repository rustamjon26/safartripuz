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
  { href: "/admin/payments", label: "To'lovlar", icon: CreditCard, section: "Moliya" },
  { href: "/admin/settings", label: "Sozlamalar", icon: Settings, section: "Tizim" },
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
    <div className="admin-root bg-slate-50">
      <aside className="adm-sidebar hidden lg:flex">
        <AdminSidebarNav {...sidebarProps} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-white shadow-2xl flex flex-col">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 text-slate-500"
            >
              <X size={18} />
            </button>
            <AdminSidebarNav {...sidebarProps} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="adm-main lg:ml-64 flex-1">
        <header className="adm-topbar sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div>
              <h1 className="adm-topbar-title text-xl font-black text-slate-900 tracking-tight">
                {pageItem?.label ?? "Boshqaruv"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-all"
            >
              <MapPin size={14} />
              Sayt
            </Link>

            <button type="button" className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50">
              <Bell size={20} />
            </button>

            <div className="adm-user-avatar shadow-lg shadow-slate-900/10">{initials}</div>
          </div>
        </header>

        <main className="adm-content px-6 py-8 pb-20">
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center text-slate-500 text-sm font-semibold">
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
