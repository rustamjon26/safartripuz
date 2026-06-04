"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  PlusCircle,
  List,
  UserCircle,
} from "lucide-react";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Bronlar",
      icon: <LayoutDashboard size={20} />,
      href: "/bookings",
      isActive: (p: string) => p === "/bookings" || p === "/user/bookings",
    },
    {
      label: "Kashf",
      icon: <Compass size={20} />,
      href: "/tours",
      isActive: (p: string) => p === "/tours" || p.startsWith("/tours/"),
    },
    {
      label: "Safar",
      icon: <PlusCircle size={26} />,
      href: "/trip-builder",
      isCentral: true,
      isActive: (p: string) => p === "/trip-builder",
    },
    {
      label: "Buyurtma",
      icon: <List size={20} />,
      href: "/user/orders/taxi",
      isActive: (p: string) =>
        p.startsWith("/user/orders") || p.startsWith("/user/bookings/"),
    },
    {
      label: "Profil",
      icon: <UserCircle size={20} />,
      href: "/profile",
      isActive: (p: string) => p === "/profile",
    },
  ];

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.container}>
        {navItems.map((item) => {
          const isActive = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.active : ""} ${item.isCentral ? styles.central : ""}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              {!item.isCentral && <span className={styles.label}>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
