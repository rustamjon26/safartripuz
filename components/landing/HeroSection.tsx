"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loginWithNext } from "@/lib/authLinks";
import styles from "./HeroSection.module.css";

export default function HeroSection() {
  return (
    <section className={styles.hero} aria-label="SafarTrip bosh sahifa">
      <div className={styles.heroMedia}>
        <Image
          src="/landing/hero-registan.jpg"
          alt="Registon maydoni, Samarqand"
          fill
          priority
          className={styles.heroBgImg}
          sizes="100vw"
        />
        <div className={styles.heroOverlay} />
      </div>

      <div className={styles.heroContent}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>
            <span className={styles.pulse} aria-hidden />
            AI-powered Travel Planner
          </div>

          <h1 className={`${styles.title} font-display`}>
            O&apos;zbekiston bo&apos;ylab orzuingizdagi sayohatni rejalashtiring
          </h1>

          <p className={styles.subtitle}>
            AI yordamida bir necha daqiqada mukammal safar tuzing. Silk Road
            bo&apos;ylab unutilmas xotiralarni birga yaratamiz.
          </p>

          <div className={styles.ctaGroup}>
            <Link
              href={loginWithNext("/trip-builder")}
              className={styles.btnPrimary}
            >
              Safar tuzish <ArrowRight size={18} />
            </Link>
            <Link href="/#destinations" className={styles.btnGhost}>
              Kashf qilish
            </Link>
          </div>
        </div>
      </div>

      <div className={styles.shimmer} aria-hidden />
    </section>
  );
}
