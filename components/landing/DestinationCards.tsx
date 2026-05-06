import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { formatUzInteger } from '@/lib/displayHelpers';
import styles from './DestinationCards.module.css';

export default function DestinationCards() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className="font-display" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)' }}>Qayerga Bormoqchisiz?</h2>
          <p className={styles.subtitle}>Hozirda 2 ta maxsus yo&apos;nalish mavjud — ko&apos;proq tez orada!</p>
        </div>

        <div className={styles.grid}>
          <Link href="/travel-plan/new?destination=zomin" className={styles.card}>
            <div className={styles.cardBg}>
              <Image
                src="/hero-bg.png"
                alt="Zomin manzarasi"
                fill
                className={styles.cardBgImg}
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
              />
            </div>
            <div className={styles.cardOverlay} />
            <div className={styles.cardContent}>
              <div className={styles.tags}>
                <span className={styles.tag}>🏔️ Tog&apos; havosi</span>
                <span className={styles.tag}>🌲 Milliy bog&apos;</span>
                <span className={styles.tag}>🏊 Ko&apos;l va sharsharalar</span>
              </div>
              <h3 className={`${styles.cardTitle} ${styles.destText}`}>Zomin — Jizzax viloyatining tog&apos; duri</h3>
              <p className={styles.cardDesc}>
                Dengiz sathidan 1500m balandlikda, toza havo va ajoyib manzaralar. Oilalar va aktiv sayyohlar uchun ideal joy.
              </p>
              <div className={styles.footer}>
                <span className={styles.price}>Paketlar narxi {formatUzInteger(350000)} so&apos;mdan</span>
                <span className={styles.cta}>
                  Zomin safarini tuzing <ArrowRight size={18} />
                </span>
              </div>
            </div>
          </Link>

          <Link href="/travel-plan/new?destination=jizzax" className={styles.card}>
            <div className={styles.cardBg}>
              <Image
                src="/jizzax-bg.png"
                alt="Jizzax manzarasi"
                fill
                className={styles.cardBgImg}
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
              />
            </div>
            <div className={styles.cardOverlay} />
            <div className={styles.cardContent}>
              <div className={styles.tags}>
                <span className={styles.tag}>🏛️ Tarixiy shahar</span>
                <span className={styles.tag}>🌸 Bog&apos;lar</span>
                <span className={styles.tag}>🍽️ Milliy taomlar</span>
              </div>
              <h3 className={`${styles.cardTitle} ${styles.destText}`}>Jizzax — Markaziy Osiyo yuragida</h3>
              <p className={styles.cardDesc}>
                Qadimiy ipak yo&apos;li bo&apos;yida joylashgan, boy tarixga ega shahar. Madaniyat, tarix va ajoyib oshxona sevuvchilar uchun.
              </p>
              <div className={styles.footer}>
                <span className={styles.price}>Paketlar narxi {formatUzInteger(280000)} so&apos;mdan</span>
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
