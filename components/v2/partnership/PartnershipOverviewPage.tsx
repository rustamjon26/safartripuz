import Link from "next/link";
import type { ReactElement } from "react";
import { Annotation } from "../Annotation";
import { CoffeeRing, NotebookShell } from "../NotebookShell";
import { PhotoMount } from "../PhotoMount";
import { IconGroups, IconMap, IconMonitoring } from "../icons";
import styles from "../notebook.module.css";
import partner from "./partnership.module.css";

const PILLARS = [
  {
    id: "I",
    title: "Ochiqlik",
    body: "Biz shaffoflik va ochiq muloqotga ishonamiz. Har bir hamkorimiz tizimning teng huquqli a'zosi bo'lib, qarorlar qabul qilish jarayonida ishtirok etadi.",
    link: "[ VIEW CRITERIA ]",
    watermark: "OPENNESS",
    slot: "SFT/IMG-P1",
    subject: "Qo'lyozma arxiv skani",
    size: "1400 × 900 px",
  },
  {
    id: "II",
    title: "Raqamli meros",
    body: "Sizning tarixingiz — bizning boyligimiz. Biz har bir ob'ektning 3D modelini va raqamli egizagini yaratib, kelajak avlodlar uchun asrab qolamiz.",
    link: "[ TECHNOLOGY STACK ]",
    watermark: "HERITAGE",
    slot: "SFT/IMG-P2",
    subject: "Raqamli meros vizualizatsiyasi",
    size: "1400 × 900 px",
    reverse: true,
  },
  {
    id: "III",
    title: "O'sish",
    body: "Biz bilan biznesingiz chegarasiz kengayadi. Global marketing kampaniyalari va innovatsion bron qilish tizimi orqali yangi bozorlarni egallang.",
    link: "[ REVENUE MODELS ]",
    watermark: "GROWTH",
    slot: "SFT/IMG-P3",
    subject: "Mehmonxona hovlisi",
    size: "1400 × 900 px",
  },
];

export function PartnershipOverviewPage(): ReactElement {
  return (
    <NotebookShell
      showHistoryIcon
      footerLayout="stack"
      railLabel="Project SafarTrip // 2026"
      navItems={[
        { href: "/v2#xizmatlar", label: "Xizmatlar" },
        { href: "/v2#sayohat", label: "Safarnomalar" },
        { href: "/v2/hamkorlik", label: "Hamkorlik", active: true },
      ]}
      primaryCta={{ href: "/trip-builder", label: "Ilovani ochish" }}
      pageMark="PAGE [ 02 / 02 ]"
      footer={
        <>
          <div className={partner.footerWide}>
            <div className={partner.footerBrand}>
              <div className={styles.headlineMd} style={{ letterSpacing: "-0.02em" }}>
                SafarTrip
              </div>
              <p className={`${styles.bodyMd} ${styles.muted}`}>
                O&apos;zbekiston bo&apos;ylab sayohat uchun bitta ilova — mehmonxona, dacha, gid, taksi va AI
                reja bir joyda.
              </p>
            </div>
            <div>
              <div className={`${styles.labelSm} ${styles.muted}`} style={{ marginBottom: 12 }}>
                RESURSLAR
              </div>
              <ul className={partner.linkList}>
                <li>Hamkorlik qo&apos;llanmasi</li>
                <li>Brend kitobi</li>
                <li>API hujjatlari</li>
              </ul>
            </div>
            <div>
              <div className={`${styles.labelSm} ${styles.muted}`} style={{ marginBottom: 12 }}>
                ALOQA
              </div>
              <ul className={partner.linkList}>
                <li>info@safartrip.uz</li>
                <li>+998 71 200 00 00</li>
                <li>Toshkent, O&apos;zbekiston</li>
              </ul>
            </div>
          </div>
          <div className={partner.footerBottom}>
            <span className={`${styles.labelXs} ${styles.muted}`}>
              © 2026 SAFARTRIP. ALL RIGHTS RESERVED.
            </span>
          </div>
        </>
      }
    >
      <section className={`${styles.section} ${partner.hero}`}>
        <Annotation>
          {`[Note 041-A]
Ecosystem mapping for travel partnership onboarding.`}
        </Annotation>
        <div className={partner.heroGrid}>
          <div className={partner.heroCopy}>
            <div className={`${styles.labelSm} ${styles.archive} ${partner.eyebrow}`}>
              <span className={partner.eyebrowRule} aria-hidden="true" />
              Hamkorlik imkoniyatlari
            </div>
            <h1 className={partner.heroTitle}>
              O&apos;zbekiston turizm ekotizimiga <em className={styles.archive}>qo&apos;shiling</em>.
            </h1>
            <p className={`${styles.bodyLg} ${styles.muted}`}>
              Bizning tadqiqotga asoslangan platformamiz bilan an&apos;anaviy mehmondo&apos;stlikni zamonaviy
              raqamli meros tajribasiga aylantiring.
            </p>
            <div className={partner.heroCta}>
              <button type="button" className={styles.btnPrimary} disabled title="Ariza shakli keyingi bosqichda">
                Hamkorlikni boshlash
              </button>
              <p className={`${styles.labelXs} ${styles.muted}`} style={{ marginTop: 8, fontStyle: "italic" }}>
                * Ariza shakli Stage 2 da ochiladi. Hozircha ma&apos;lumot uchun shu sahifa.
              </p>
            </div>
          </div>
          <div className={partner.heroPhoto}>
            <PhotoMount
              slotId="SFT/IMG-H01"
              subject="Karvonsaroy / FIG 01"
              sizeLabel="900 × 1125 px"
              caption="FIG 01. ARCHIVAL SITE"
              rotation="1deg"
              aspectClassName={partner.heroSlot}
            />
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${partner.stats}`}>
        <div className={partner.statCell}>
          <div className={partner.statMeta}>
            <span className={`${styles.labelSm} ${styles.archive}`}>OBSERVATION_01</span>
            <IconMonitoring size={16} />
          </div>
          <div className={partner.statValue}>1M+</div>
          <div className={partner.statLabel}>Active Users</div>
          <p className={`${styles.labelXs} ${styles.muted}`}>Global reach across digital explorer networks.</p>
        </div>
        <div className={partner.statCell}>
          <div className={partner.statMeta}>
            <span className={`${styles.labelSm} ${styles.archive}`}>OBSERVATION_02</span>
            <IconGroups size={16} />
          </div>
          <div className={partner.statValue}>250+</div>
          <div className={partner.statLabel}>Verified Partners</div>
          <p className={`${styles.labelXs} ${styles.muted}`}>Certified tourism providers and heritage sites.</p>
        </div>
        <div className={partner.statCell}>
          <div className={partner.statMeta}>
            <span className={`${styles.labelSm} ${styles.archive}`}>OBSERVATION_03</span>
            <IconMap size={16} />
          </div>
          <div className={partner.statValue}>12</div>
          <div className={partner.statLabel}>Regions Covered</div>
          <p className={`${styles.labelXs} ${styles.muted}`}>Comprehensive mapping from Khiva to Fergana.</p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={partner.pillars}>
          {PILLARS.map((pillar) => (
            <div
              key={pillar.id}
              className={`${partner.pillarRow}${pillar.reverse ? ` ${partner.pillarReverse}` : ""}`}
            >
              <div className={partner.pillarCopy}>
                <div className={`${styles.labelSm} ${styles.archive}`}>PILLAR {pillar.id}</div>
                <h3 className={partner.pillarTitle}>{pillar.title}</h3>
                <p className={`${styles.bodyMd} ${styles.muted}`}>{pillar.body}</p>
                <span className={`${styles.labelSm} ${partner.pillarLink}`}>{pillar.link}</span>
              </div>
              <div className={partner.pillarMedia}>
                <PhotoMount
                  slotId={pillar.slot}
                  subject={pillar.subject}
                  sizeLabel={pillar.size}
                  rotation={pillar.reverse ? "-1deg" : "1deg"}
                  aspectClassName={partner.pillarSlot}
                />
                <span className={partner.watermark} aria-hidden="true">
                  {pillar.watermark}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CoffeeRing className={partner.coffeeOnce} />

      <p className={`${styles.labelXs} ${styles.muted}`} style={{ marginBottom: 48 }}>
        <Link href="/v2" className={styles.archive} style={{ textDecoration: "underline" }}>
          ← Bosh sahifaga qaytish
        </Link>
      </p>
    </NotebookShell>
  );
}
