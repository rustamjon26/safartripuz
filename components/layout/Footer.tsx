import Link from 'next/link';
import { Palmtree, Globe, Mail, MessageCircle } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div className={styles.column}>
          <Link href="/" className={styles.title} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palmtree size={24} />
            SafarTrip.uz
          </Link>
          <p className={styles.link}>Sayohatlaringiz ishonchli va qulay hamrohi. O'zbekiston bo'ylab en yaxshi xizmatlar.</p>
        </div>

        <div className={styles.column}>
          <h3 className={styles.title}>Kompaniya</h3>
          <Link href="/about" className={styles.link}>Biz haqimizda</Link>
          <Link href="/contact" className={styles.link}>Aloqa</Link>
          <Link href="/careers" className={styles.link}>Vakansiyalar</Link>
        </div>

        <div className={styles.column}>
          <h3 className={styles.title}>Hamkorlarga</h3>
          <Link href="/partners" className={styles.link}>Hamkor bo'lish</Link>
          <Link href="/login" className={styles.link}>Kabinetga kirish</Link>
        </div>

        <div className={styles.column}>
          <h3 className={styles.title}>Ijtimoiy tarmoqlar</h3>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="#" className={styles.link}><Globe size={20} /></a>
            <a href="#" className={styles.link}><MessageCircle size={20} /></a>
            <a href="#" className={styles.link}><Mail size={20} /></a>
          </div>
          <p className={styles.link} style={{ marginTop: '8px' }}>
            Nodirabegim ko'chasi 14, Toshkent, O'zbekiston<br/>
            +998 71 123-45-67
          </p>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>&copy; {new Date().getFullYear()} SafarTrip.uz. Barcha huquqlar himoyalangan.</p>
      </div>
    </footer>
  );
}
