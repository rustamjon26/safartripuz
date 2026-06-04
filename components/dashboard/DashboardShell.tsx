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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dashboard-root">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-gray-500 font-medium text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <Link
        href="/"
        className="flex items-center gap-3 px-6 py-5 border-b border-gray-100"
      >
        <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center">
          <Palmtree size={18} className="text-white" />
        </div>
        <span className="font-black text-gray-900 tracking-tight text-base">SafarTrip</span>
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
              className={`flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all duration-300 border-l-4 ${
                isActive
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <item.icon
                size={18}
                className={isActive ? "text-amber-600" : "text-gray-400"}
              />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}

        {showServices && (
          <>
            <p className="px-4 pt-5 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Xizmatlar
            </p>
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
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-all duration-300 border-l-4 ${
                    isActive
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <svc.icon size={16} className={isActive ? "text-amber-600" : "text-gray-400"} />
                  {svc.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-sm font-black shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-sm truncate">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-xs text-gray-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Chiqish
        </button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-root min-h-screen bg-gray-50 flex">
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-gray-200 flex-col fixed top-0 left-0 h-full z-30">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-label="Yopish"
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
            <div className="flex justify-end p-3 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen bg-gray-50 w-full max-w-[100vw] overflow-x-hidden">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4 flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden p-2.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 border border-gray-200 transition-all"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>

            <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 hidden sm:flex">
              <PageIcon size={18} className="text-amber-500" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs font-medium text-gray-500 truncate hidden sm:block">
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
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
                }`}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
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

              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-sm font-black shadow-md shadow-amber-500/20">
                {initials}
              </div>
            </div>
          </div>

          {pathname === "/bookings" && user && (
            <div className="px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0 self-center mr-1 hidden sm:inline">
                Tez qidirish
              </span>
              {SERVICE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-all whitespace-nowrap"
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
