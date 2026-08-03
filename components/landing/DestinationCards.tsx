import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./DestinationCards.module.css";

type Destination = {
  id: string;
  name: string;
  blurb: string;
  href: string;
  image: string;
  wide: boolean;
  badge?: string;
};

const DESTINATIONS: Destination[] = [
  {
    id: "samarqand",
    name: "Samarqand",
    blurb: "Buyuk Ipak Yo'lining yuragi va moviy gumbazlar shahri.",
    href: "/travel-plan/new?destination=samarqand",
    image:
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
    wide: true,
    badge: "Tarixiy",
  },
  {
    id: "toshkent",
    name: "Toshkent",
    blurb: "Zamonaviylik va an'analar tutashgan poytaxt.",
    href: "/travel-plan/new?destination=toshkent",
    image:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80",
    wide: false,
  },
  {
    id: "zomin",
    name: "Zomin",
    blurb: "O'zbekistonning Shveytsariyasi — toza havo va tabiat.",
    href: "/travel-plan/new?destination=zomin",
    image: "/jizzax-bg.png",
    wide: false,
  },
  {
    id: "buxoro",
    name: "Buxoro",
    blurb: "Qadimiy sharq ertaklari jonlangan shahar.",
    href: "/travel-plan/new?destination=buxoro",
    image:
      "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=1200&q=80",
    wide: false,
  },
  {
    id: "xiva",
    name: "Xiva",
    blurb: "Ochiq osmon ostidagi muzey-shahar.",
    href: "/travel-plan/new?destination=xiva",
    image:
      "https://images.unsplash.com/photo-1590074072786-a66914d668f1?auto=format&fit=crop&w=1200&q=80",
    wide: false,
  },
];

export default function DestinationCards() {
  return (
    <section id="destinations" className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <h2 className="font-display">Mashhur manzillar</h2>
            <p>
              O&apos;zbekistonning eng go&apos;zal go&apos;shalarini biz bilan
              kashf eting.
            </p>
          </div>
          <Link href="/tours" className={styles.seeAll}>
            Barchasini ko&apos;rish <ArrowRight size={16} />
          </Link>
        </div>

        <div className={styles.grid}>
          {DESTINATIONS.map((d) => (
            <Link
              key={d.id}
              href={d.href}
              className={`${styles.card} ${d.wide ? styles.cardWide : styles.cardNarrow}`}
            >
              <Image
                src={d.image}
                alt={d.name}
                fill
                className={styles.cardImg}
                sizes={d.wide ? "(max-width:768px) 100vw, 66vw" : "(max-width:768px) 100vw, 33vw"}
              />
              <div className={styles.cardShade} />
              <div className={styles.cardBody}>
                {d.badge ? <span className={styles.badge}>{d.badge}</span> : null}
                <h3 className="font-display">{d.name}</h3>
                <p>{d.blurb}</p>
              </div>
            </Link>
          ))}
        </div>

        <Link href="/tours" className={styles.mobileSeeAll}>
          Barchasini ko&apos;rish <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
