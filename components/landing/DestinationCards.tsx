import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './DestinationCards.module.css';

export default function DestinationCards() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className="font-display" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)' }}>Qayerga Bormoqchisiz?</h2>
          <p className={styles.subtitle}>Hozirda 2 ta maxsus yo'nalish mavjud — ko'proq tez orada!</p>
        </div>

        <div className={styles.grid}>
          {/* Zomin Card */}
          <Link href="/trip-builder?dest=zomin" className={styles.card}>
            <div className={styles.cardBg} style={{ backgroundImage: "url('/hero-bg.png')" }} />
            <div className={styles.cardOverlay} />
            <div className={styles.cardContent}>
              <div className={styles.tags}>
                <span className={styles.tag}>🏔️ Tog' havosi</span>
                <span className={styles.tag}>🌲 Milliy bog'</span>
                <span className={styles.tag}>🏊 Ko'l va sharsharalar</span>
              </div>
              <h3 className={styles.cardTitle}>Zomin — Jizzax viloyatining tog' duri</h3>
              <p className={styles.cardDesc}>
                Dengiz sathidan 1500m balandlikda, toza havo va ajoyib manzaralar. Oilalar va aktiv sayyohlar uchun ideal joy.
              </p>
              <div className={styles.footer}>
                <span className={styles.price}>Paketlar narxi 350,000 so'mdan</span>
                <span className={styles.cta}>
                  Zomin safarini tuzing <ArrowRight size={18} />
                </span>
              </div>
            </div>
          </Link>

          {/* Jizzax Card */}
          <Link href="/trip-builder?dest=jizzax" className={styles.card}>
            <div className={styles.cardBg} style={{ backgroundImage: "url('/jizzax-bg.png')" }} />
            <div className={styles.cardOverlay} />
            <div className={styles.cardContent}>
              <div className={styles.tags}>
                <span className={styles.tag}>🏛️ Tarixiy shahar</span>
                <span className={styles.tag}>🌸 Bog'lar</span>
                <span className={styles.tag}>🍽️ Milliy taomlar</span>
              </div>
              <h3 className={styles.cardTitle}>Jizzax — Markaziy Osiyo yuragida</h3>
              <p className={styles.cardDesc}>
                Qadimiy ipak yo'li bo'yida joylashgan, boy tarixga ega shahar. Madaniyat, tarix va ajoyib oshxona sevuvchilar uchun.
              </p>
              <div className={styles.footer}>
                <span className={styles.price}>Paketlar narxi 280,000 so'mdan</span>
                <span className={styles.cta}>
                  Jizzax safarini tuzing <ArrowRight size={18} />
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
