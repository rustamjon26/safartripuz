"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  PlusCircle, 
  UserCircle 
} from "lucide-react";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { 
      label: "Asosiy", 
      icon: <LayoutDashboard size={20} />, 
      href: "/bookings" 
    },
    { 
      label: "Safar", 
      icon: <PlusCircle size={24} />, 
      href: "/trip-builder",
      isCentral: true
    },
    { 
      label: "Profil", 
      icon: <UserCircle size={20} />, 
      href: "/profile" 
    },
  ];

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.container}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
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
