import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { loginWithNext } from '@/lib/authLinks';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={`${styles.title} font-display`}>Safar tuzish hech qachon bu qadar oson bo'lmagan</h2>
        
        <div className={styles.grid}>
          {/* Step 1 */}
          <div className={styles.step}>
            <div className={styles.iconWrapper}>
              📅
              <span className={styles.stepNumber}>1</span>
            </div>
            <h3 className={styles.stepTitle}>Destinatsiya va sana tanlang</h3>
            <p className={styles.stepDesc}>Zomin yoki Jizzax, qaysi sanalar, necha kishi — barchasi 1 daqiqada</p>
          </div>

          {/* Step 2 */}
          <div className={styles.step}>
            <div className={styles.iconWrapper}>
              🏨🚗🧭
              <span className={styles.stepNumber}>2</span>
            </div>
            <h3 className={styles.stepTitle}>Xizmatlarni tanlang</h3>
            <p className={styles.stepDesc}>Mehmonxona, transport va gid — barcha variantlar narxlari bilan ko'rsatiladi</p>
          </div>

          {/* Step 3 */}
          <div className={styles.step}>
            <div className={styles.iconWrapper}>
              ✅
              <span className={styles.stepNumber}>3</span>
            </div>
            <h3 className={styles.stepTitle}>To'lang va boring</h3>
            <p className={styles.stepDesc}>Xavfsiz to'lov, darhol tasdiqlash, safar boshlanadi!</p>
          </div>
        </div>

        <div className={styles.ctaWrapper}>
          <Link href={loginWithNext("/trip-builder")} className={styles.ctaBtn}>
            Hoziroq boshlash <ArrowRight size={20} style={{ marginLeft: 8 }} />
          </Link>
        </div>
      </div>
    </section>
  );
}
