import Link from "next/link";
import type { ReactElement } from "react";
import { Annotation } from "../Annotation";
import { HandDrawnUnderline } from "../HandDrawnUnderline";
import { CoffeeRing, NotebookShell } from "../NotebookShell";
import { PhotoMount } from "../PhotoMount";
import { IconAttachFile, IconSmartToy, IconVerified } from "../icons";
import styles from "../notebook.module.css";
import landing from "./landing.module.css";

const SERVICES = [
  { n: "01", status: "LIVE" as const, name: "Mehmonxona", line: "Rezervatsiya va boshqaruv" },
  { n: "02", status: "LIVE" as const, name: "Dacha", line: "Tog'li hududlar va hordiq" },
  { n: "03", status: "LIVE" as const, name: "Gid", line: "Sertifikatlangan mutaxassislar" },
  {
    n: "04",
    status: "LIVE" as const,
    name: "Taksi va transfer",
    line: "Aeroportdan mehmonxonaga, narx oldindan",
  },
  {
    n: "05",
    status: "LIVE" as const,
    name: "AI tur rejasi",
    line: "Kunma-kun reja, soatlari bilan",
  },
  {
    n: "06",
    status: "LIVE" as const,
    name: "Onlayn to'lov",
    line: "Payme, Click, Uzcard, Humo, Visa",
  },
  { n: "07", status: "SOON" as const, name: "Poyezd", line: "Shaharlararo temir yo'l chiptalari" },
  { n: "08", status: "SOON" as const, name: "Aviachipta", line: "Ichki va xalqaro reyslar" },
  { n: "09", status: "SOON" as const, name: "Rent-car", line: "Kunlik avtomobil ijarasi" },
];

const JOURNEY = [
  {
    slot: "SFT/IMG-J01",
    subject: "Aeroport transferi",
    size: "800 × 1000 px",
    caption: "01. Aeroportga qo'nish, transfer kutmoqda.",
    rotation: "-1.5deg",
  },
  {
    slot: "SFT/IMG-J02",
    subject: "Mehmonxona joylashuv",
    size: "800 × 1000 px",
    caption: "02. Mehmonxonaga joylashish, to'lov amalga oshirilgan.",
    rotation: "1deg",
  },
  {
    slot: "SFT/IMG-J03",
    subject: "Gid va AI reja",
    size: "800 × 1000 px",
    caption: "03. Sertifikatlangan gid va AI reja bilan shahar sayri.",
    rotation: "-0.5deg",
  },
  {
    slot: "SFT/IMG-J04",
    subject: "Zomin dacha",
    size: "800 × 1000 px",
    caption: "04. Zomin tog'laridagi dachada uyg'onish.",
    rotation: "2deg",
  },
];

export function LandingPage(): ReactElement {
  return (
    <NotebookShell
      navItems={[
        { href: "#xizmatlar", label: "Xizmatlar", active: true },
        { href: "#sayohat", label: "Safarnomalar" },
        { href: "/v2/hamkorlik", label: "Hamkorlik" },
      ]}
      primaryCta={{ href: "/trip-builder", label: "Ilovani ochish" }}
      footer={
        <>
          <div className={landing.footerBrand}>
            <span className={`${styles.labelSm}`} style={{ fontWeight: 700, letterSpacing: "0.12em" }}>
              SafarTrip
            </span>
            <p className={`${styles.labelXs} ${styles.muted}`}>
              © 2026 SafarTrip. Barcha huquqlar himoyalangan. SFT/VER-1.0.2. O&apos;zbekiston bo&apos;ylab
              sayohat uchun bitta ilova.
            </p>
          </div>
          <div className={landing.footerMeta}>
            <div className={landing.footerLinks}>
              <span className={`${styles.labelXs} ${styles.archive}`}>Maxfiylik siyosati</span>
              <span className={`${styles.labelXs} ${styles.archive}`}>Foydalanish shartlari</span>
            </div>
            <div className={landing.liveLine}>
              <span className={landing.pulse} aria-hidden="true" />
              <span className={styles.labelSm}>12 ta joy allaqachon Zominda ulangan.</span>
            </div>
          </div>
        </>
      }
    >
      <CoffeeRing className={landing.coffeeOnce} />

      {/* Hero */}
      <section className={`${styles.section} ${landing.hero}`}>
        <Annotation>
          {`SFT/ENTRY_001
DATE: 2026-05-12
LOC: TASHKENT`}
        </Annotation>
        <div className={landing.heroGrid}>
          <div className={`${landing.indexCard} ${styles.tippedIn}`} style={{ ["--rotation" as string]: "-1deg" }}>
            <IconAttachFile className={landing.paperclip} size={22} />
            <span className={`${styles.photoCorner} ${styles.cornerTl}`} />
            <span className={`${styles.photoCorner} ${styles.cornerTr}`} />
            <span className={`${styles.photoCorner} ${styles.cornerBl}`} />
            <span className={`${styles.photoCorner} ${styles.cornerBr}`} />
            <div className={landing.catBadge}>SFT/001</div>
            <h1 className={styles.headlineLg}>
              SafarTrip — O&apos;zbekiston bo&apos;ylab sayohat uchun yagona super-ilova. Beshta ilovani
              bittasi almashtiradi.
            </h1>
            <div className={landing.ctaRow}>
              <Link href="/trip-builder" className={styles.btnPrimary}>
                Ilovani ochish
              </Link>
              <Link href="/v2/hamkorlik" className={styles.btnSecondary}>
                [ Hamkor bo&apos;lish ]
              </Link>
            </div>
          </div>
          <PhotoMount
            slotId="SFT/IMG-A"
            subject="Samarqand, Registon"
            sizeLabel="1200 × 1200 px"
            caption="- Fig. A: Samarqand, Registon"
            rotation="2deg"
            aspectClassName={landing.squareSlot}
          />
        </div>
      </section>

      {/* Journey */}
      <section id="sayohat" className={styles.section}>
        <HandDrawnUnderline>Sayohat bosqichlari</HandDrawnUnderline>
        <div className={landing.journeyGrid}>
          {JOURNEY.map((beat) => (
            <div key={beat.slot} className={landing.journeyItem}>
              <PhotoMount
                slotId={beat.slot}
                subject={beat.subject}
                sizeLabel={beat.size}
                rotation={beat.rotation}
                aspectClassName={landing.journeySlot}
              />
              <p className={`${styles.labelSm} ${styles.archive}`}>{beat.caption}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catalogue */}
      <section id="xizmatlar" className={styles.section}>
        <div className={landing.catalogueHead}>
          <h2 className={`${styles.headlineMd}`} style={{ fontStyle: "italic" }}>
            Xizmatlar katalogi
          </h2>
          <span className={`${styles.labelXs} ${styles.archive}`}>TOTAL: 09 ITEMS</span>
        </div>
        <div className={landing.catalogueGrid}>
          {SERVICES.map((svc) => (
            <div
              key={svc.n}
              className={`${landing.catalogueEntry} ${svc.status === "SOON" ? landing.soon : landing.live}`}
            >
              <span className={styles.labelXs}>
                {svc.n}/{svc.status}
              </span>
              <h3 className={styles.bodyLg} style={{ fontWeight: 700 }}>
                {svc.name}
              </h3>
              <p className={`${styles.labelSm} ${styles.muted}`}>{svc.line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verification — two cards */}
      <section id="haqiqiylik" className={`${styles.section} ${landing.verifySection}`}>
        <Annotation>{`SFT/CLAIM-PAIR
METHOD: SOURCE_TIER`}</Annotation>
        <div className={landing.verifyIntro}>
          <IconSmartToy size={28} className={landing.verifyIcon} />
          <h2 className={styles.headlineMd}>AI reja tuzadi, lekin hech qachon to&apos;qimaydi.</h2>
          <p className={`${styles.bodyMd} ${styles.muted}`}>
            Bizning algoritmlarimiz har bir faktni arxiv manbalari bilan solishtiradi. Agar ma&apos;lumot
            tasdiqlanmasa, u &quot;Rivoyat&quot; deb belgilanadi.
          </p>
        </div>
        <div className={landing.verifyGrid}>
          <article className={landing.claimCard}>
            <div className={landing.claimHead}>
              <span className={landing.diamond} aria-hidden="true">
                <IconVerified size={18} />
              </span>
              <h3 className={`${styles.labelSm} ${styles.archive}`} style={{ fontWeight: 700 }}>
                TASDIQLANGAN
              </h3>
            </div>
            <p className={styles.bodyMd}>
              Hazrati Imom masjidi ustunlari sandal yog&apos;ochidan, Hindistondan keltirilgan.
            </p>
            <p className={`${styles.labelSm} ${styles.muted}`} style={{ marginTop: 16 }}>
              Manba: ikki mustaqil rasmiy manba
            </p>
            <p className={`${styles.labelXs} ${styles.archive}`} style={{ marginTop: 8 }}>
              SFT/CLM-0001
            </p>
          </article>
          <article className={landing.claimCard}>
            <div className={landing.claimHead}>
              <h3 className={`${styles.labelSm} ${styles.archive}`} style={{ fontWeight: 700 }}>
                RIVOYAT
              </h3>
            </div>
            <p className={styles.bodyMd}>&quot;Bu chinorni Amir Temur ekkan.&quot;</p>
            <p className={`${styles.labelSm} ${styles.muted}`} style={{ marginTop: 16 }}>
              Izoh: Xalq rivoyati. Tarixiy hujjat bilan tasdiqlanmagan.
            </p>
            <p className={`${styles.labelXs} ${styles.archive}`} style={{ marginTop: 8 }}>
              SFT/CLM-0002
            </p>
          </article>
        </div>
      </section>

      {/* Partner teaser — CTA only, no inputs */}
      <section id="hamkor" className={styles.section}>
        <div className={landing.partnerBlock}>
          <IconAttachFile className={landing.partnerClip} size={28} />
          <div className={landing.partnerTop}>
            <div>
              <HandDrawnUnderline>Hamkor bo&apos;lish</HandDrawnUnderline>
              <p className={`${styles.labelSm} ${styles.archive}`} style={{ marginTop: 8 }}>
                Mulk egalari uchun ro&apos;yxatga olish
              </p>
            </div>
            <div className={landing.stampBox} aria-hidden="true">
              <span className={styles.labelXs}>
                STAMP
                <br />
                HERE
              </span>
            </div>
          </div>
          <div className={landing.partnerBody}>
            <div className={landing.afzalliklar}>
              <h4 className={`${styles.labelSm}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                AFZALLIKLAR:
              </h4>
              <ul className={landing.afzList}>
                <li>- Bepul ro&apos;yxatdan o&apos;tish</li>
                <li>- 15 daqiqada joy qo&apos;shish</li>
                <li>- O&apos;z narxingizni belgilang</li>
                <li>- Avtomatik taqvim</li>
                <li>- HMS boshqaruv paneli</li>
              </ul>
            </div>
            <Link href="/v2/hamkorlik" className={`${styles.btnPrimary} ${landing.partnerCta}`}>
              Hamkorlikni ko&apos;rish
            </Link>
          </div>
        </div>
      </section>
    </NotebookShell>
  );
}
