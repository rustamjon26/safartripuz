'use client';
import Link from 'next/link';
import { ArrowRight, Play, CheckCircle2 } from 'lucide-react';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroBackground} />
      <div className={styles.heroOverlay} />
      
      <div className={styles.heroContent}>
        <div className={styles.eyebrow}>
          🏔️ O'zbekistonning yashirin jannatiga xush kelibsiz
        </div>
        
        <h1 className={`${styles.title} font-display`}>
          Zomin va Jizzax — ko'krak to'la havo, ko'z to'la go'zallik
        </h1>
        
        <p className={styles.subtitle}>
          Mehmonxona, transport, gid — hammasi bir joyda. 3 daqiqada safar tuzing.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/trip-builder" className={styles.btnPrimary}>
            Safar tuzishni boshlash <ArrowRight size={20} />
          </Link>
          <button className={styles.btnGhost} onClick={() => alert('Tez kunda!')}>
            <Play size={20} /> Videoni ko'rish
          </button>
        </div>
      </div>

      <div className={styles.trustBadges}>
        <div className={styles.badge}>
          <CheckCircle2 size={16} className={styles.badgeIcon} /> 1,200+ xursand sayyoh
        </div>
        <div className={styles.badge}>
          <CheckCircle2 size={16} className={styles.badgeIcon} /> 48 soat ichida javob
        </div>
        <div className={styles.badge}>
          <CheckCircle2 size={16} className={styles.badgeIcon} /> Bekor qilish bepul
        </div>
      </div>
    </section>
  );
}
