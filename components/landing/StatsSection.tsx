'use client';
import { useEffect, useState, useRef } from 'react';
import styles from './StatsSection.module.css';

function useCounter(end: number, start: number = 0, duration: number = 2000) {
  const [count, setCount] = useState(start);
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // easeOutExpo
      const easing = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easing * (end - start) + start));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end, start, duration, isVisible]);

  return { count, ref };
}

export default function StatsSection() {
  const { count: tourists, ref: tRef } = useCounter(1200);
  const { count: hotels } = useCounter(45);
  const { count: guides } = useCounter(30);
  const { count: satisfaction } = useCounter(98);

  return (
    <section className={styles.statsWrapper}>
      <div className={`container ${styles.grid}`}>
        <div ref={tRef} className={styles.statItem}>
          <div className={styles.statIcon}>😊</div>
          <div className={styles.statNumber}>{tourists}+</div>
          <div className={styles.statLabel}>Xursand sayyohlar</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>🏨</div>
          <div className={styles.statNumber}>{hotels}+</div>
          <div className={styles.statLabel}>Hamkor mehmonxonalar</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>🧭</div>
          <div className={styles.statNumber}>{guides}+</div>
          <div className={styles.statLabel}>Gid mutaxassislar</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statIcon}>⭐</div>
          <div className={styles.statNumber}>{satisfaction}%</div>
          <div className={styles.statLabel}>Ijobiy sharhlar</div>
        </div>
      </div>
    </section>
  );
}
