"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight,
  Compass,
  Car,
  Bell,
} from "lucide-react";

type AdminNavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  section?: string;
  badgeKey?: string;
};

const NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "Asosiy" },
  { href: "/admin/users", label: "Foydalanuvchilar", icon: Users, section: "Boshqaruv" },
  { href: "/admin/partners", label: "Hamkorlar", icon: CheckSquare, section: "Boshqaruv", badgeKey: "pending" },
  { href: "/admin/tours", label: "Tur Paketlar", icon: Compass, section: "Kontent" },
  { href: "/admin/hotels", label: "Hotellar", icon: Building2, section: "Kontent" },
  { href: "/admin/homestay", label: "Uy Mehmonxona", icon: House, section: "Kontent" },
  { href: "/admin/taxi", label: "Taxi", icon: Car, section: "Kontent" },
  { href: "/admin/payments", label: "To'lovlar", icon: CreditCard, section: "Moliya" },
  { href: "/admin/audit", label: "Audit Logs", icon: FileText, section: "Tizim" },
  { href: "/admin/settings", label: "Sozlamalar", icon: Settings, section: "Tizim" },
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  async function ensureAuth() {
    try {
      const res = await fetch("/api/user/me");
      if (res.status === 401) {
        // Try refresh
        const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshRes.ok) {
          // Success! Try me again
          const retry = await fetch("/api/user/me");
          const data = await retry.json();
          if (data.user) setUser(data.user);
        } else {
          router.push("/login?next=" + encodeURIComponent(pathname));
        }
      } else if (res.ok) {
        const data = await res.json();
        if (data.user) setUser(data.user);
      } else {
        // Other errors
      }
    } catch {
      // Offline or network error
    }
  }

  useEffect(() => {
    void ensureAuth();
    
    fetch("/api/admin/partners?status=pending&limit=1")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.total) setPendingCount(d.total); })
      .catch(() => {});
  }, [pathname]); // Refresh on navigation to be safe

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    toast.success("Tizimdan chiqildi");
    router.push("/login");
  }

  const grouped = groupNavItems(NAV_ITEMS);
  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "A";

  const pageItem = NAV_ITEMS.find((i) =>
    i.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(i.href)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="adm-sidebar-brand">
        <div className="adm-sidebar-logo">
          <Shield size={20} />
        </div>
        <div>
          <div className="adm-sidebar-title">SafarTrip</div>
          <div className="adm-sidebar-subtitle">Super Admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="adm-nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div className="adm-nav-section" key={section}>
            <div className="adm-nav-section-label">{section}</div>
            {items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const badge = item.badgeKey === "pending" && pendingCount > 0 ? pendingCount : null;
              return (
                <Link key={item.href} href={item.href} className={`adm-nav-item ${isActive ? "active" : ""}`}>
                  <span className="adm-nav-icon">
                    <item.icon size={18} />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge && <span className="adm-nav-badge">{badge > 9 ? "9+" : badge}</span>}
                  {isActive && <ChevronRight size={14} className="opacity-50" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="adm-sidebar-footer">
        <div className="adm-user-card">
          <div className="adm-user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="adm-user-name">
              {user ? `${user.first_name} ${user.last_name}` : "Admin User"}
            </div>
            <div className="adm-user-role">{user?.role ?? "Super Admin"}</div>
          </div>
        </div>
        <button className="adm-logout-btn" onClick={() => void handleLogout()}>
          <LogOut size={16} />
          Chiqish
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-root bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="adm-sidebar hidden lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-white shadow-2xl flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 text-slate-500"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Container */}
      <div className="adm-main lg:ml-64 flex-1">
        {/* Topbar */}
        <header className="adm-topbar sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600" onClick={() => setSidebarOpen(true)}>
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
            
            <button className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-500 hover:bg-slate-50">
              <Bell size={20} />
            </button>

            <div className="adm-user-avatar shadow-lg shadow-slate-900/10">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="adm-content px-6 py-8 pb-20">
          {children}
        </main>
      </div>
    </div>
  );
}
