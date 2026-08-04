"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bell,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  SmilePlus,
  Headphones,
  X,
} from "lucide-react";
import { toast } from "sonner";
import "./support.css";

const NAV_ITEMS = [
  { href: "/support/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/support/sentiment", label: "Sentiment", icon: SmilePlus },
  { href: "/support/feed", label: "Feedback Feed", icon: MessageSquareText },
  { href: "/support/categories", label: "Categories", icon: FolderKanban },
  { href: "/support/reports", label: "Reports", icon: BarChart3 },
];

const ALLOWED_ROLES = new Set(["support", "admin", "super_admin"]);

interface CurrentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export default function SupportLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          router.push("/login?next=/support/dashboard");
          return;
        }
        const role = String(data?.user?.role ?? "");
        if (!ALLOWED_ROLES.has(role)) {
          router.push("/");
          return;
        }
        setUser(data.user);
      } catch {
        router.push("/login?next=/support/dashboard");
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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
    : "SP";

  const currentTitle =
    NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
      ?.label || "Support";

  function renderSidebar(mobile = false) {
    return (
      <div className="flex flex-col h-full bg-[#0d2137] text-white">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 min-h-[64px]">
          <div className="w-9 h-9 rounded-xl bg-[#b9eaff] text-[#001f29] flex items-center justify-center shrink-0">
            <Headphones size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-white text-[17px] leading-tight truncate">
              SafarTrip Partner
            </div>
            <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#8fdfff]">
              Feedback & Support
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

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 p-2.5 rounded-xl transition-all text-[13px] font-[family-name:var(--font-sora)] font-semibold ${
                  active
                    ? "bg-[#b9eaff] text-[#001f29]"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={18} strokeWidth={active ? 2.5 : 2} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-2 bg-black/15">
          <div className="px-2 py-2 rounded-xl bg-white/5 text-[11px] text-[#8fdfff] font-[family-name:var(--font-sora)] leading-snug">
            Frontend demo — API/backend keyinchalik ulanadi.
          </div>
          <div className="flex items-center gap-3 px-1 pt-1">
            <div className="w-9 h-9 rounded-full bg-[#006781] text-white font-bold flex items-center justify-center text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate">
                {user ? `${user.first_name} ${user.last_name}` : "Support"}
              </div>
              <div className="text-[10px] text-white/45 truncate uppercase tracking-wide">
                {user?.role === "support" ? "Support Agent" : user?.role || "Preview"}
              </div>
            </div>
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

  return (
    <div className="sp-root flex h-screen overflow-hidden">
      <aside className="hidden lg:flex w-[250px] bg-[#0d2137] shrink-0 shadow-[2px_0_16px_rgba(0,9,23,0.18)]">
        {renderSidebar()}
      </aside>

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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[64px] border-b border-[#d8e3fb] bg-white/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 text-[#64748B] hover:bg-[#f0f3ff] rounded-lg"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] font-[family-name:var(--font-sora)] font-semibold uppercase tracking-[0.14em] text-[#94A3B8] leading-none mb-1">
                Feedback Portal
              </div>
              <div className="text-[15px] font-display font-bold text-[#0d2137] leading-none truncate">
                {currentTitle}
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const q = search.trim();
                  if (!q) return;
                  router.push(`/support/feed?q=${encodeURIComponent(q)}`);
                }}
                placeholder="Sharh yoki mijoz qidirish..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#f0f3ff] border-0 text-[12px] font-[family-name:var(--font-sora)] font-semibold text-[#111c2d] outline-none focus:ring-2 focus:ring-[#006781]/25"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link href="/support/feed" className="sp-btn sp-btn-navy hidden sm:inline-flex">
              Hozir javob berish
            </Link>
            <button
              type="button"
              className="relative p-2.5 rounded-xl border border-[#d8e3fb] text-[#64748B] hover:bg-[#f9f9ff]"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-[#F43F5E] rounded-full border border-white" />
            </button>
            <button
              type="button"
              className="hidden sm:inline-flex p-2.5 rounded-xl border border-[#d8e3fb] text-[#64748B] hover:bg-[#f9f9ff]"
            >
              <HelpCircle size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-1">
              <div className="text-right leading-tight">
                <div className="text-[12px] font-semibold text-[#111c2d]">
                  {user?.first_name || "Support"}
                </div>
                <div className="text-[10px] font-medium text-[#94A3B8] uppercase tracking-wide">
                  Agent
                </div>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#0d2137] text-white font-bold flex items-center justify-center text-sm">
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-[1400px] mx-auto pb-20 lg:pb-0">
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

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#d8e3fb] px-2 py-2 flex items-center justify-around z-40 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          {NAV_ITEMS.map((item) => {
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
