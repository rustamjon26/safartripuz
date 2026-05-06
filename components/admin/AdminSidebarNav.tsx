"use client";

import type { ElementType } from "react";
import Link from "next/link";
import { ChevronRight, LogOut, Shield } from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: ElementType;
  section?: string;
  badgeKey?: string;
};

type AdminUser = {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
};

type NotifyDots = {
  taxi: boolean;
  guide: boolean;
  homestay: boolean;
};

export function AdminSidebarNav({
  grouped,
  pathname,
  pendingCount,
  notifyDots,
  user,
  initials,
  onLogout,
  onNavigate,
}: {
  grouped: Record<string, AdminNavItem[]>;
  pathname: string;
  pendingCount: number;
  notifyDots: NotifyDots;
  user: AdminUser | null;
  initials: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  function showNotifyDot(href: string) {
    if (href === "/admin/taxi") return notifyDots.taxi;
    if (href === "/admin/guide") return notifyDots.guide;
    if (href === "/admin/homestay") return notifyDots.homestay;
    return false;
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="adm-sidebar-brand">
        <div className="adm-sidebar-logo">
          <Shield size={20} />
        </div>
        <div>
          <div className="adm-sidebar-title">SafarTrip</div>
          <div className="adm-sidebar-subtitle">Super Admin</div>
        </div>
      </div>

      <nav className="adm-nav">
        {Object.entries(grouped).map(([section, items]) => (
          <div className="adm-nav-section" key={section}>
            <div className="adm-nav-section-label">{section}</div>
            {items.map((item) => {
              const isActive =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              const badge = item.badgeKey === "pending" && pendingCount > 0 ? pendingCount : null;
              const dot = showNotifyDot(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onNavigate?.()}
                  className={`adm-nav-item ${isActive ? "active" : ""}`}
                >
                  <span className="adm-nav-icon">
                    {dot ? <span className="adm-nav-notify-dot" aria-hidden /> : null}
                    <item.icon size={18} />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge ? <span className="adm-nav-badge">{badge > 9 ? "9+" : badge}</span> : null}
                  {isActive ? <ChevronRight size={14} className="opacity-50" /> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

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
        <button type="button" className="adm-logout-btn" onClick={() => void onLogout()}>
          <LogOut size={16} />
          Chiqish
        </button>
      </div>
    </div>
  );
}
