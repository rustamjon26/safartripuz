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
  Home,
  Car,
  Map,
  Palmtree,
  Bell,
  Compass,
  Loader2,
  Building2,
  Tent,
  X,
  List,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import BottomNav from "@/components/layout/BottomNav";
import NotificationPopover from "./NotificationPopover";
import "@/app/dashboard.css";

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

const SERVICE_LINKS = [
  { href: "/hotels", label: "Mehmonxona", emoji: "🏨" },
  { href: "/homestay", label: "HomeStay", emoji: "🛖" },
  { href: "/taxi", label: "Taxi", emoji: "🚖" },
  { href: "/guide", label: "Gid", emoji: "🧭" },
  { href: "/tours", label: "Turlar", emoji: "📦" },
] as const;

const PAGE_ICONS: Record<string, React.ElementType> = {
  "/bookings": LayoutDashboard,
  "/trip-builder": ShoppingBag,
  "/profile": User,
  "/tours": Compass,
};

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
    } catch {
      console.error("Failed to fetch notifications");
    }
  }

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  useEffect(() => {
    setSidebarOpen(false);
    setShowNotif(false);
  }, [pathname]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function handleMarkRead(id: string | "all") {
    try {
      if (id === "all") {
        await fetch("/api/notifications", { method: "PUT" });
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
        );
      } else {
        await fetch(`/api/notifications/${id}`, { method: "PATCH" });
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
      }
    } catch {
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
    (item) =>
      !item.roles ||
      !user?.role ||
      item.roles.includes(user.role.toLowerCase()),
  );

  const showServices =
    user?.role?.toLowerCase() === "user" ||
    !user?.role ||
    visibleNavItems.some((i) => i.href === "/bookings");

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const roleBadge: Record<string, string> = {
    user: "Sayohatchi",
    hotel: "Hotel",
    guide: "Gid",
    taxi: "Taxi",
    admin: "Admin",
  };

  const PageIcon =
    PAGE_ICONS[pathname] ??
    (pathname.startsWith("/user/") ? List : LayoutDashboard);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 dashboard-root">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-slate-400 font-medium text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-900/95">
      <Link
        href="/"
        className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50 bg-slate-800/50"
      >
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Palmtree size={18} className="text-amber-400" />
        </div>
        <span className="font-black text-base gradient-text tracking-tight">SafarTrip</span>
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all duration-300 border-l-2 ${
                isActive
                  ? "border-amber-500 bg-slate-700/60 text-white"
                  : "border-transparent text-slate-400 hover:border-amber-500/50 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon
                size={18}
                className={isActive ? "text-amber-400" : "text-slate-500"}
              />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}

        {showServices && (
          <>
            <div className="px-4 pt-5 pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                Xizmatlar
              </span>
            </div>
            {[
              { href: "/hotels", label: "Mehmonxonalar", icon: Building2 },
              { href: "/homestay", label: "HomeStay", icon: Tent },
              { href: "/guide", label: "Gidlar", icon: Map },
              { href: "/taxi", label: "Taxi", icon: Car },
            ].map((svc) => {
              const isActive = pathname === svc.href || pathname.startsWith(`${svc.href}/`);
              return (
                <Link
                  key={svc.href}
                  href={svc.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all duration-300 border-l-2 ${
                    isActive
                      ? "border-amber-500 bg-slate-700/60 text-white"
                      : "border-transparent text-slate-500 hover:border-amber-500/40 hover:bg-slate-800 hover:text-slate-300"
                  }`}
                >
                  <svc.icon size={16} className={isActive ? "text-amber-400" : ""} />
                  {svc.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700/50 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-blue-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-lg shadow-amber-500/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm truncate">
              {user?.first_name} {user?.last_name}
            </div>
            <span className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {user?.role ? (roleBadge[user.role.toLowerCase()] ?? user.role) : "—"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={16} />
          Chiqish
        </button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-root min-h-screen bg-slate-900 flex">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-900/95 flex-col fixed top-0 left-0 h-full z-30 shadow-sm shadow-slate-900/20">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Yopish"
          />
          <aside className="absolute left-0 top-0 h-full w-72 shadow-2xl flex flex-col">
            <div className="flex justify-end p-3 bg-slate-900 border-b border-slate-700/50">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden">
        <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50">
          <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden p-2.5 rounded-xl bg-slate-800 border border-slate-700/50 text-slate-300 hover:border-amber-500/30 hover:text-amber-400 transition-all"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div className="w-9 h-9 rounded-xl bg-slate-700/50 border border-slate-700/50 flex items-center justify-center shrink-0 hidden sm:flex">
              <PageIcon size={18} className="text-amber-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
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
                type="button"
                onClick={() => setShowNotif(!showNotif)}
                className={`p-2.5 rounded-xl transition-all relative border ${
                  showNotif
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                    : "bg-slate-800 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-500"
                }`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-900">
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

              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-blue-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-amber-500/15">
                {initials}
              </div>
            </div>
          </div>

          {pathname === "/bookings" && user && (
            <div className="px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 shrink-0 self-center mr-1 hidden sm:inline">
                Tez qidirish
              </span>
              {SERVICE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700/50 text-slate-400 hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/10 transition-all whitespace-nowrap"
                >
                  {link.emoji} {link.label}
                </Link>
              ))}
            </div>
          )}
        </header>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">{children}</main>

        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
