'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Palmtree, X } from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    // Check initial position on mount
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

  return (
    <>
      <nav className={navClass}>
      <Link href="/" className={styles.logo}>
        <Palmtree size={28} />
        SafarTrip.uz
      </Link>
      
      <div className={styles.navLinks}>
        <Link href="#destinations" className={styles.link}>Destinatsiyalar</Link>
        <Link href="#packages" className={styles.link}>Paketlar</Link>
        <Link href="#guides" className={styles.link}>Gidlar</Link>
        <Link href="/bookings" className={styles.link}>Bronlarim</Link>
      </div>

      <div className={styles.actions}>

        
        <Link href="/login" className={styles.loginBtn}>Kirish</Link>
        <Link href="/trip-builder" className={styles.ctaBtn}>Safar tuzing</Link>
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
            <Link href="#destinations" className={styles.mobileLink} onClick={() => setIsMenuOpen(false)}>
              Destinatsiyalar
            </Link>
            <Link href="#packages" className={styles.mobileLink} onClick={() => setIsMenuOpen(false)}>
              Paketlar
            </Link>
            <Link href="#guides" className={styles.mobileLink} onClick={() => setIsMenuOpen(false)}>
              Gidlar
            </Link>
            <Link href="/bookings" className={styles.mobileLink} onClick={() => setIsMenuOpen(false)}>
              Bronlarim
            </Link>
          </div>

          <div className={styles.mobileActions}>

            <Link href="/login" className={styles.mobileLogin} onClick={() => setIsMenuOpen(false)}>
              Kirish
            </Link>
            <Link href="/trip-builder" className={styles.mobileCta} onClick={() => setIsMenuOpen(false)}>
              Safar tuzing
            </Link>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
