'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Palmtree, X } from 'lucide-react';
import { loginWithNext } from '@/lib/authLinks';
import styles from './Navbar.module.css';

function useHash() {
  const [hash, setHash] = useState('');
  useEffect(() => {
    const read = () => setHash(typeof window !== 'undefined' ? window.location.hash : '');
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  return hash;
}

export default function Navbar() {
  const pathname = usePathname();
  const hash = useHash();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const navClass = `${styles.navbar} ${isScrolled ? styles.solid : styles.transparent}`;

  const linkClass = useCallback(
    (key: string) => {
      let active = false;
      if (key.startsWith('#')) {
        active = pathname === '/' && hash === key;
      } else {
        active = pathname === key.split('?')[0];
      }
      return `${styles.link} ${active ? styles.linkActive : ''}`;
    },
    [hash, pathname],
  );

  const mobileLinkClass = useCallback(
    (key: string) => {
      let active = false;
      if (key.startsWith('#')) {
        active = pathname === '/' && hash === key;
      } else {
        active = pathname === key.split('?')[0];
      }
      return `${styles.mobileLink} ${active ? styles.mobileLinkActive : ''}`;
    },
    [hash, pathname],
  );

  return (
    <>
      <nav className={navClass}>
        <Link href="/" className={styles.logo}>
          <Palmtree size={28} />
          SafarTrip.uz
        </Link>

        <div className={styles.navLinks}>
          <Link href="/#destinations" className={linkClass('#destinations')}>
            Destinatsiyalar
          </Link>
          <Link href="/#packages" className={linkClass('#packages')}>
            Paketlar
          </Link>
          <Link href="/#guides" className={linkClass('#guides')}>
            Gidlar
          </Link>
          <Link href="/user/bookings" className={linkClass('/user/bookings')}>
            Bronlarim
          </Link>
        </div>

        <div className={styles.actions}>
          <Link href="/login" className={styles.loginBtn}>
            Kirish
          </Link>
          <Link href={loginWithNext('/trip-builder')} className={styles.ctaBtn}>
            Safar tuzing
          </Link>
        </div>

        <button
          type="button"
          className={styles.menuBtn}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
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
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className={styles.mobilePanel}>
            <div className={styles.mobileHeader}>
              <div className={styles.mobileBrand}>
                <Palmtree size={22} />
                SafarTrip.uz
              </div>
              <button
                type="button"
                className={styles.mobileClose}
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <div className={styles.mobileLinks}>
              <Link
                href="/#destinations"
                className={mobileLinkClass('#destinations')}
                onClick={() => setIsMenuOpen(false)}
              >
                Destinatsiyalar
              </Link>
              <Link
                href="/#packages"
                className={mobileLinkClass('#packages')}
                onClick={() => setIsMenuOpen(false)}
              >
                Paketlar
              </Link>
              <Link
                href="/#guides"
                className={mobileLinkClass('#guides')}
                onClick={() => setIsMenuOpen(false)}
              >
                Gidlar
              </Link>
              <Link
                href="/user/bookings"
                className={mobileLinkClass('/user/bookings')}
                onClick={() => setIsMenuOpen(false)}
              >
                Bronlarim
              </Link>
            </div>

            <div className={styles.mobileActions}>
              <Link href="/login" className={styles.mobileLogin} onClick={() => setIsMenuOpen(false)}>
                Kirish
              </Link>
              <Link href={loginWithNext('/trip-builder')} className={styles.mobileCta} onClick={() => setIsMenuOpen(false)}>
                Safar tuzing
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
