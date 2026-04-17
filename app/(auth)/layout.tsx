import Link from 'next/link';
import { ArrowLeft, BadgeCheck, MapPinned, Palmtree, Sparkles } from 'lucide-react';
import styles from './layout.module.css';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      {/* Visual Form Side */}
      <div className={styles.formSide}>
        <Link href="/" className={styles.backNav}>
          <ArrowLeft size={20} /> Ortga qaytish
        </Link>
        
        <div className={styles.content}>
          <Link href="/" className={styles.logoArea}>
            <Palmtree size={32} /> SafarTrip.uz
          </Link>
          
          {children}
        </div>
        
        <div className={styles.footer}>
          © {new Date().getFullYear()} SafarTrip.uz — Barcha huquqlar himoyalangan
        </div>
      </div>

      {/* Hero Image Side */}
      <div className={styles.imageSide}>
        <div className={styles.overlay}>
          <div className={styles.promo}>
            <div className={styles.badge}>
              <Sparkles size={16} />
              SafarTrip • Travel platform
            </div>

            <h2 className={`${styles.promoTitle} font-display`}>
              Reja tuzing. Tanlang. Safarga chiqing.
            </h2>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <MapPinned size={18} />
                </div>
                <div className={styles.featureText}>
                  <div className={styles.featureTitle}>Aniq yo‘nalishlar</div>
                  <div className={styles.featureDesc}>Zomin, Jizzax va yaqin manzillar bo‘yicha takliflar.</div>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <BadgeCheck size={18} />
                </div>
                <div className={styles.featureText}>
                  <div className={styles.featureTitle}>Ishonchli hamkorlar</div>
                  <div className={styles.featureDesc}>Mehmonxona, transport va gid — bir joyda.</div>
                </div>
              </div>

              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <Sparkles size={18} />
                </div>
                <div className={styles.featureText}>
                  <div className={styles.featureTitle}>Silliq tajriba</div>
                  <div className={styles.featureDesc}>Tez, qulay va mobilga mos dizayn.</div>
                </div>
              </div>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>24/7</div>
                <div className={styles.statLabel}>Qo‘llab-quvvatlash</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>1 klik</div>
                <div className={styles.statLabel}>Qidiruv & tanlov</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>100+</div>
                <div className={styles.statLabel}>Paketlar</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
