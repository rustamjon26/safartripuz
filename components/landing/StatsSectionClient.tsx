'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import styles from './StatsSection.module.css';
import type { LandingStats } from '@/lib/landingStats';

function useAnimatedStat(
  end: number,
  start: number,
  isVisible: boolean,
  duration: number = 2000,
) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    setCount(start);
  }, [start]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easing * (end - start) + start));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [end, start, duration, isVisible]);

  return count;
}

function animStart(end: number) {
  if (end <= 0) return 0;
  return Math.min(end, Math.max(0, Math.floor(end * 0.85)));
}

type Props = { stats: LandingStats };

export default function StatsSectionClient({ stats }: Props) {
  const { tourists, hotelsDisplay, guidesDisplay, reviewPercentDisplay } =
    stats;

  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const t0 = useMemo(() => animStart(tourists), [tourists]);
  const h0 = useMemo(() => animStart(hotelsDisplay), [hotelsDisplay]);
  const g0 = useMemo(() => animStart(guidesDisplay), [guidesDisplay]);
  const r0 = useMemo(
    () => animStart(reviewPercentDisplay),
    [reviewPercentDisplay],
  );

  const touristsN = useAnimatedStat(tourists, t0, isVisible);
  const hotelsN = useAnimatedStat(hotelsDisplay, h0, isVisible);
  const guidesN = useAnimatedStat(guidesDisplay, g0, isVisible);
  const satisfactionN = useAnimatedStat(
    reviewPercentDisplay,
    r0,
    isVisible,
  );

  return (
    <section ref={sectionRef} className={styles.statsWrapper}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>😊</div>
          <div className={styles.statNumber}>{touristsN}+</div>
          <div className={styles.statLabel}>Xursand sayyohlar</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>🏨</div>
          <div className={styles.statNumber}>{hotelsN}+</div>
          <div className={styles.statLabel}>Hamkor mehmonxonalar</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>🧭</div>
          <div className={styles.statNumber}>{guidesN}+</div>
          <div className={styles.statLabel}>Gid mutaxassislar</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>⭐</div>
          <div className={styles.statNumber}>{satisfactionN}%</div>
          <div className={styles.statLabel}>Ijobiy sharhlar</div>
        </div>
      </div>
    </section>
  );
}
