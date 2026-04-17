"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "./useCurrentUser";
import {
  LayoutDashboard,
  ShoppingBag,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Car,
  Map,
  ChevronRight,
  Palmtree,
  Bell,
  Compass,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import BottomNav from "@/components/layout/BottomNav";
import NotificationPopover from "./NotificationPopover";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  readAt: string | null;
  createdAt: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/bookings", label: "Mening Sayohatlarim", icon: LayoutDashboard, roles: ["user"] },
  { href: "/trip-builder", label: "Yangi Safar (AI)", icon: ShoppingBag, roles: ["user"] },
  { href: "/tours", label: "Tayyor Turlar", icon: Compass, roles: ["user", "admin", "super_admin"] },
  { href: "/hotel", label: "Hotel Boshqaruvi", icon: Home, roles: ["hotel"] },
  { href: "/guide", label: "Gid Paneli", icon: Map, roles: ["guide"] },
  { href: "/taxi/home", label: "Taxi Paneli", icon: Car, roles: ["taxi"] },
  { href: "/profile", label: "Mening Profilim", icon: User },
];

interface DashboardShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardShell({ children, title, subtitle }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error("Failed to fetch notifications");
    }
  }

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  // Close sidebar and notifications on route change
  useEffect(() => {
    setSidebarOpen(false);
    setShowNotif(false);
  }, [pathname]);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  async function handleMarkRead(id: string | "all") {
    try {
      if (id === "all") {
        await fetch("/api/notifications", { method: "PUT" });
        setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
      } else {
        await fetch(`/api/notifications/${id}`, { method: "PATCH" });
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
      }
    } catch (e) {
      toast.error("Xatolik");
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    toast.success("Tizimdan chiqildi");
    router.push("/login");
  }

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || !user?.role || item.roles.includes(user.role.toLowerCase())
  );

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
          <p className="text-slate-500 font-medium text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-3 px-6 py-5 border-b border-slate-100"
      >
        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center">
          <Palmtree size={18} className="text-white" />
        </div>
        <span className="font-black text-slate-900 tracking-tight text-base">SafarTrip</span>
      </Link>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group ${
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <item.icon
                size={18}
                className={isActive ? "text-white" : "text-slate-400 group-hover:text-slate-700"}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={14} className="text-slate-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 mb-2">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 text-sm truncate">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={() => void handleLogout()}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Chiqish
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-100 flex-col fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 sm:px-6 py-4 flex items-center gap-4">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs font-medium text-slate-500 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            <button 
              onClick={() => setShowNotif(!showNotif)}
              className={`p-2.5 rounded-xl transition-all relative ${showNotif ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-100"}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white ring-2 ring-transparent">
                   {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            
            {showNotif && (
              <NotificationPopover 
                notifications={notifications} 
                onMarkRead={handleMarkRead} 
                onClose={() => setShowNotif(false)} 
              />
            )}

            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-slate-900/10">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
