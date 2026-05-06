import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Star } from 'lucide-react';
import styles from './DestinationHighlight.module.css';

export default function DestinationHighlight() {
  return (
    <section className={styles.wrapper}>
      <div className="container">
        
        <div className={styles.highlightRow} style={{ backgroundColor: 'var(--bg-sand)', padding: '48px', borderRadius: '24px' }}>
          <div className={styles.imageSide}>
            <div className={styles.imageContainer}>
              <Image
                src="/hero-bg.png"
                alt="Zomin manzarasi"
                fill
                className={styles.image}
                sizes="(max-width: 900px) 100vw, 480px"
                loading="lazy"
              />
            </div>
            <div className={styles.floatingCard}>
              <div className={styles.rating}>
                <Star fill="var(--warning)" color="var(--warning)" size={20} /> 4.9/5
              </div>
              <div className={styles.quote}>
                &ldquo;Umrimda ko&apos;rgan eng go&apos;zal joy&rdquo; — Aziz, Toshkent
              </div>
            </div>
          </div>
          
          <div className={styles.textSide}>
            <h2 className={`${styles.title} font-display`}>Zomin — bir marta borgan qaytib keladi</h2>
            <p className={styles.paragraph}>
              Zaamin milliy tabiiy boqida yashil tog&apos;lar, musaffo ko&apos;llar va sharsharalar sizni kutadi. Bu yerda tabiat bilan birlashish mumkin.
            </p>
            <p className={styles.paragraph}>
              Piyoda yurishdan tortib, ot minishgacha. Oilaviy piknik, romantik dam olish yoki aktiv turizm — hammasi Zominda mumkin.
            </p>
            <p className={styles.paragraph}>
              SafarTrip orqali Zomin safarini oldindan rejalash, mehmonxona, transport va gidni bitta joydan bron qiling.
            </p>
            
            <div className={styles.features}>
              <div className={styles.feature}>🌲 Toza havo</div>
              <div className={styles.feature}>🏊 Ko&apos;l</div>
              <div className={styles.feature}>🚵 Aktiv dam</div>
              <div className={styles.feature}>🍖 Piknik</div>
            </div>
            
            <Link href="/travel-plan/new?destination=zomin" className={styles.ctaBtn}>
              Zomin safarini rejalashtirish <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        <div className={styles.highlightRow} data-reversed="true" style={{ backgroundColor: 'white', padding: '48px', borderRadius: '24px', marginTop: '64px' }}>
          <div className={styles.imageSide}>
            <div className={styles.imageContainer}>
              <Image
                src="/jizzax-bg.png"
                alt="Jizzax daryosi"
                fill
                className={styles.image}
                sizes="(max-width: 900px) 100vw, 480px"
                loading="lazy"
              />
            </div>
          </div>
          
          <div className={styles.textSide}>
            <h2 className={`${styles.title} font-display`}>Jizzax — tarix va zamonaviylik qo&apos;shilgan joy</h2>
            <p className={styles.paragraph}>
              Qadimgi Ipak yo&apos;lida joylashgan Jizzax ko&apos;p asrlik tarixi bilan sizni o&apos;z bag&apos;riga oladi. Qadimiy qal&apos;alar, arxeologik yodgorliklar va boy madaniyat.
            </p>
            <p className={styles.paragraph}>
              Jizzax oshxonasi o&apos;ziga xos. Mahalliy bozorlar, non tandirlari va Sangzor daryosi bo&apos;yidagi choyxonalar — unutilmas tajriba.
            </p>
            <p className={styles.paragraph}>
              Toshkentdan 2 soat — bir kunlik sayohat yoki dam olish uchun ideal. SafarTrip bilan transport va ekskursiyalarni oldindan band qiling.
            </p>
            
            <div className={styles.features}>
              <div className={styles.feature}>🏛️ Tarix</div>
              <div className={styles.feature}>🍽️ Oshxona</div>
              <div className={styles.feature}>🛍️ Bozor</div>
              <div className={styles.feature}>🎭 Madaniyat</div>
            </div>
            
            <Link href="/travel-plan/new?destination=jizzax" className={styles.ctaBtn} style={{ backgroundColor: 'var(--primary)' }}>
              Jizzax safarini rejalashtirish <ArrowRight size={20} />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
