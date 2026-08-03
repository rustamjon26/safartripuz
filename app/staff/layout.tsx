"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  UserRound,
} from "lucide-react";
import "./staff.css";

const MAIN_NAV = [
  { href: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/shifts", label: "Shifts", icon: CalendarDays },
  { href: "/staff/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/staff/messages", label: "Chat", icon: MessageSquare },
  { href: "/staff/profile", label: "Profile", icon: UserRound },
];

const ALLOWED = new Set([
  "cleaner",
  "receptionist",
  "waiter",
  "hotel_staff",
  "hotel_manager",
  "admin",
  "super_admin",
]);

export default function StaffLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          router.push("/login?next=/staff/dashboard");
          return;
        }
        const role = String(data?.user?.role ?? "");
        if (!ALLOWED.has(role)) {
          router.push("/");
          return;
        }
        setReady(true);
      } catch {
        router.push("/login?next=/staff/dashboard");
      }
    }
    void loadMe();
  }, [router]);

  function isActive(href: string) {
    if (href === "/staff/dashboard") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const hideBottom =
    pathname.startsWith("/staff/messages/") && pathname !== "/staff/messages";

  if (!ready) {
    return (
      <div className="st-root flex items-center justify-center min-h-screen text-[#64748B] text-sm font-semibold">
        Yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="st-root">
      <div className="st-phone">
        <main className="st-main">
          <Suspense
            fallback={
              <div className="py-20 text-center text-[#64748B] text-sm font-semibold">
                Yuklanmoqda…
              </div>
            }
          >
            {children}
          </Suspense>
        </main>

        {!hideBottom ? (
          <nav className="st-bottom" aria-label="Staff navigation">
            {MAIN_NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "active" : undefined}
                >
                  <item.icon size={20} strokeWidth={active ? 2.5 : 2} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
