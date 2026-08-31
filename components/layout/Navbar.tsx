"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { loginWithNext } from "@/lib/authLinks";
import styles from "./Navbar.module.css";

function useHash() {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () =>
      setHash(typeof window !== "undefined" ? window.location.hash : "");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return hash;
}

export default function Navbar() {
  const pathname = usePathname();
  const hash = useHash();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    first_name: string;
    last_name: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setUser(data.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  const navClass = `${styles.navbar} ${isScrolled ? styles.solid : styles.transparent}`;

  const linkClass = useCallback(
    (key: string) => {
      let active = false;
      if (key.startsWith("#")) {
        active = pathname === "/" && hash === key;
      } else {
        active = pathname === key.split("?")[0];
      }
      return `${styles.link} ${active ? styles.linkActive : ""}`;
    },
    [hash, pathname],
  );

  const mobileLinkClass = useCallback(
    (key: string) => {
      let active = false;
      if (key.startsWith("#")) {
        active = pathname === "/" && hash === key;
      } else {
        active = pathname === key.split("?")[0];
      }
      return `${styles.mobileLink} ${active ? styles.mobileLinkActive : ""}`;
    },
    [hash, pathname],
  );

  return (
    <>
      <nav className={navClass}>
        <Link href="/" className={styles.logo}>
          SafarTrip
        </Link>

        <div className={styles.navLinks}>
          <Link href="/#destinations" className={linkClass("#destinations")}>
            Manzillar
          </Link>
          <Link href="/tours" className={linkClass("/tours")}>
            Tajribalar
          </Link>
          <Link href="/hotels" className={linkClass("/hotels")}>
            Mehmonxonalar
          </Link>
          <Link href="/taxi" className={linkClass("/taxi")}>
            Transport
          </Link>
        </div>

        <div className={styles.actions}>
          <Link href="/partner/hotel" className={styles.partnerLink}>
            Hamkor kabineti
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="font-ui text-sm font-semibold">
                {user.first_name} {user.last_name}
              </span>
              <button
                type="button"
                onClick={() => {
                  fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                  }).then(() => {
                    setUser(null);
                    window.location.href = "/";
                  });
                }}
                className="font-ui text-sm text-gray-500 hover:text-red-500"
              >
                Chiqish
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.loginBtn}>
              Kirish
            </Link>
          )}
          <Link href={loginWithNext("/trip-builder")} className={styles.ctaBtn}>
            Safar tuzish
          </Link>
        </div>

        <button
          type="button"
          className={styles.menuBtn}
          aria-label={isMenuOpen ? "Menyuni yopish" : "Menyuni ochish"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((v) => !v)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {isMenuOpen ? (
        <div className={styles.mobileOverlay} role="dialog" aria-modal="true">
          <button
            type="button"
            className={styles.mobileBackdrop}
            aria-label="Menyuni yopish"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className={styles.mobilePanel}>
            <div className={styles.mobileHeader}>
              <div className={styles.mobileBrand}>SafarTrip</div>
              <button
                type="button"
                className={styles.mobileClose}
                aria-label="Yopish"
                onClick={() => setIsMenuOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <div className={styles.mobileLinks}>
              <Link
                href="/#destinations"
                className={mobileLinkClass("#destinations")}
                onClick={() => setIsMenuOpen(false)}
              >
                Manzillar
              </Link>
              <Link
                href="/tours"
                className={mobileLinkClass("/tours")}
                onClick={() => setIsMenuOpen(false)}
              >
                Tajribalar
              </Link>
              <Link
                href="/hotels"
                className={mobileLinkClass("/hotels")}
                onClick={() => setIsMenuOpen(false)}
              >
                Mehmonxonalar
              </Link>
              <Link
                href="/taxi"
                className={mobileLinkClass("/taxi")}
                onClick={() => setIsMenuOpen(false)}
              >
                Transport
              </Link>
              <Link
                href="/partner/hotel"
                className={mobileLinkClass("/partner/hotel")}
                onClick={() => setIsMenuOpen(false)}
              >
                Hamkor kabineti
              </Link>
            </div>

            <div className={styles.mobileActions}>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    fetch("/api/auth/logout", {
                      method: "POST",
                      credentials: "include",
                    }).then(() => {
                      setUser(null);
                      setIsMenuOpen(false);
                      window.location.href = "/";
                    });
                  }}
                  className={styles.mobileLogin}
                >
                  Chiqish
                </button>
              ) : (
                <Link
                  href="/login"
                  className={styles.mobileLogin}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Kirish
                </Link>
              )}
              <Link
                href={loginWithNext("/trip-builder")}
                className={styles.mobileCta}
                onClick={() => setIsMenuOpen(false)}
              >
                Safar tuzish
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
