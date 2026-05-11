"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Car,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCircle2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import "../hotel/hotel.css";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/taxi-partner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/taxi-partner/orders", label: "Orders", icon: ClipboardList },
  { href: "/taxi-partner/vehicles", label: "Vehicles", icon: Car },
  { href: "/taxi-partner/earnings", label: "Earnings", icon: CircleDollarSign },
  { href: "/taxi-partner/profile", label: "Profile", icon: UserCircle2 },
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

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          router.push("/login?next=/taxi-partner/dashboard");
          return;
        }
        if (data?.user?.role !== "taxi_partner") {
          router.push("/");
          return;
        }
        setUser(data.user);
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

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/80 min-h-[64px]">
        <div className="w-9 h-9 rounded-xl bg-[var(--bg-light-blue)] flex items-center justify-center shrink-0 border border-slate-100 text-[var(--accent)]">
          <Wrench size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-[var(--primary)] text-lg leading-tight truncate">
            Taxi CRM
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]">
            Driver Panel
          </div>
        </div>
        {mobile && (
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all text-[14px] font-bold ${
                active
                  ? "bg-[var(--bg-light-blue)] text-[var(--accent)]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <item.icon size={18} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/80 p-4 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white font-black flex items-center justify-center text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-slate-900 truncate">
              {user ? `${user.first_name} ${user.last_name}` : "Driver"}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 truncate">
              {user?.email || "driver@safartrip.uz"}
            </div>
          </div>
        </div>
        <button
          onClick={() => void handleLogout()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm font-bold"
        >
          <LogOut size={16} />
          Chiqish
        </button>
      </div>
    </div>
  );

  const currentTitle =
    NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label ||
    "Taxi";

  return (
    <div className="hl-root flex h-screen bg-slate-50 overflow-hidden text-slate-900">
      <aside className="hidden lg:flex w-[250px] border-r border-slate-200/80 bg-white shrink-0">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-[260px] bg-white h-full shadow-2xl flex flex-col">
            <Sidebar mobile />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[64px] border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setDrawerOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none mb-1">
                Taxi Driver
              </div>
              <div className="text-[15px] font-extrabold text-[var(--primary)] leading-none font-display">
                {currentTitle}
              </div>
            </div>
          </div>
          <Link
            href="/taxi-partner/orders"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--secondary)]"
          >
            <ClipboardList size={14} />
            Orders
          </Link>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
          <div className="max-w-[1400px] mx-auto pb-16 lg:pb-0">{children}</div>
        </main>

        <div className="lg:hidden border-t border-slate-200 bg-white px-2 py-2 flex items-center justify-around">
          <Link href="/taxi-partner/dashboard" className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-black ${isActive("/taxi-partner/dashboard") ? "text-[var(--accent)]" : "text-slate-400"}`}>
            <LayoutDashboard size={20} />
            <span>Home</span>
          </Link>
          <Link href="/taxi-partner/orders" className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-black ${isActive("/taxi-partner/orders") ? "text-[var(--accent)]" : "text-slate-400"}`}>
            <ClipboardList size={20} />
            <span>Orders</span>
          </Link>
          <Link href="/taxi-partner/vehicles" className={`flex flex-col items-center p-1 rounded-xl text-[10px] font-black ${isActive("/taxi-partner/vehicles") ? "text-[var(--accent)]" : "text-slate-400"}`}>
            <Car size={20} />
            <span>Cars</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
