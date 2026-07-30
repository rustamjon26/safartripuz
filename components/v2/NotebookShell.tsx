import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import styles from "./notebook.module.css";
import {
  IconDescription,
  IconFolderOpen,
  IconHistoryEdu,
  IconMap,
  IconSettings,
} from "./icons";

type NavItem = {
  href: string;
  label: string;
  active?: boolean;
};

type NotebookShellProps = {
  children: ReactNode;
  navItems: NavItem[];
  primaryCta: { href: string; label: string };
  railLabel?: string;
  pageMark?: string;
  footer?: ReactNode;
  footerLayout?: "row" | "stack";
  showHistoryIcon?: boolean;
};

export function CoffeeRing({ className }: { className?: string }): ReactElement {
  return <div className={`${styles.coffeeRing}${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}

export function NotebookShell({
  children,
  navItems,
  primaryCta,
  railLabel = "SFT/AD-2026 • O'ZBEKISTON",
  pageMark = "PAGE [ 01 / 01 ]",
  footer,
  footerLayout = "row",
  showHistoryIcon = false,
}: NotebookShellProps): ReactElement {
  return (
    <div className={styles.notebook}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/v2" className={styles.brand}>
            SafarTrip
          </Link>
          <span className={`${styles.labelSm} ${styles.muted} ${styles.versionTag}`}>v.1.0.2</span>
        </div>
        <nav className={styles.navDesktop} aria-label="Asosiy">
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`${styles.navLink}${item.active ? ` ${styles.navLinkActive}` : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href={primaryCta.href} className={styles.btnPrimary}>
          {primaryCta.label}
        </Link>
      </header>

      <aside className={styles.sideRail} aria-hidden="true">
        <div className={styles.sideRailLabel}>{railLabel}</div>
        <div className={styles.sideRailIcons}>
          {showHistoryIcon ? <IconHistoryEdu size={22} /> : null}
          <IconFolderOpen size={22} />
          <IconMap size={22} />
          <IconDescription size={22} />
          <IconSettings size={22} />
        </div>
      </aside>

      <main className={styles.main}>{children}</main>

      {footer ? (
        <footer className={styles.footer}>
          {footerLayout === "row" ? <div className={styles.footerRow}>{footer}</div> : footer}
        </footer>
      ) : null}
      {pageMark ? <div className={styles.pageMark}>{pageMark}</div> : null}
    </div>
  );
}
