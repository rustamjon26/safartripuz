import Link from 'next/link';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import styles from './PackageCards.module.css';

export default function PackageCards() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={`${styles.title} font-display`}>Tayyor Paketlar — Tanlang va Boring</h2>
        
        <div className={styles.grid}>
          {/* Ekonom */}
          <div className={styles.card}>
            <div className={styles.header}>
              <h3 className={styles.name}>🌿 Ekonom</h3>
              <div className={styles.price}>
                350,000 <span className={styles.priceUnit}>so'm / kishi</span>
              </div>
            </div>
            <ul className={styles.inclusions}>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> 2 kecha mehmonxona</li>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> Transfer xizmati</li>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> Milliy bog'ga kirish bileti</li>
            </ul>
            <Link href="/trip-builder?package=ekonom" className={`${styles.ctaBtn} ${styles.btnOutline}`}>
              Tanlash <ArrowRight size={18} />
            </Link>
            <div className={styles.cancelPolicy}>
              <ShieldCheck size={16} /> Bekor qilish bepul (24 soatgacha)
            </div>
          </div>

          {/* Standart (Highlighted) */}
          <div className={styles.card} data-highlighted="true">
            <div className={styles.badge}>Ko'p tanlangan</div>
            <div className={styles.header}>
              <h3 className={styles.name}>⭐ Standart</h3>
              <div className={styles.price}>
                580,000 <span className={styles.priceUnit}>so'm / kishi</span>
              </div>
            </div>
            <ul className={styles.inclusions}>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> 3 kecha mehmonxona</li>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> Transfer xizmati</li>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> Gid xizmati (1 kun)</li>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> Ekskursiya</li>
            </ul>
            <Link href="/trip-builder?package=standart" className={`${styles.ctaBtn} ${styles.btnPrimary}`}>
              Tanlash <ArrowRight size={18} />
            </Link>
            <div className={styles.cancelPolicy}>
              <ShieldCheck size={16} /> Bekor qilish bepul (24 soatgacha)
            </div>
          </div>

          {/* Premium */}
          <div className={styles.card}>
            <div className={styles.header}>
              <h3 className={styles.name}>👑 Premium</h3>
              <div className={styles.price}>
                980,000 <span className={styles.priceUnit}>so'm / kishi</span>
              </div>
            </div>
            <ul className={styles.inclusions}>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> 5 kecha yulduzli mehmonxona</li>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> Premium transfer</li>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> Shaxsiy gid (butun safar)</li>
              <li className={styles.inclusionItem}><Check size={18} className={styles.icon} /> 3 mahal maxsus ovqatlanish</li>
            </ul>
            <Link href="/trip-builder?package=premium" className={`${styles.ctaBtn} ${styles.btnOutline}`}>
              Tanlash <ArrowRight size={18} />
            </Link>
            <div className={styles.cancelPolicy}>
              <ShieldCheck size={16} /> Bekor qilish bepul (24 soatgacha)
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
