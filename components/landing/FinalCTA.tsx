import Link from 'next/link';
import { ArrowRight, MessageCircleQuestion, Clock } from 'lucide-react';
import styles from './FinalCTA.module.css';

export default function FinalCTA() {
  return (
    <section className={styles.section}>
      <div className={styles.background} />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <h2 className={`${styles.title} font-display`} style={{ color: 'white' }}>Safaringiz siz uchun tayyor — boshlashingiz kerak, xolos</h2>
        <p className={styles.subtitle}>SafarTrip bilan eng yaxshi xotiralarni hoziroq bron qiling.</p>
        
        <div className={styles.ctaGroup}>
          <Link href="/trip-builder" className={styles.btnPrimary}>
            Safar tuzishni boshlash <ArrowRight size={20} style={{ marginLeft: 8 }} />
          </Link>
          <button className={styles.btnGhost}>
            Savollaringiz bormi? <MessageCircleQuestion size={18} style={{ marginLeft: 8 }} />
          </button>
        </div>

        <div className={styles.urgency}>
          <Clock size={16} /> ⏰ Bugun bron qiling — kecha narxlari saqlanib qoladi
        </div>
      </div>
    </section>
  );
}
