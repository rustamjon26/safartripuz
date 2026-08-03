import styles from "./StatsSection.module.css";

const STATS = [
  { value: "500+", label: "Mehmonxonalar" },
  { value: "120", label: "Gidlar" },
  { value: "12k+", label: "Sayohatlar" },
  { value: "4.9", label: "Reyting" },
] as const;

export default function StatsSection() {
  return (
    <section className={styles.section} aria-label="Platforma statistikasi">
      <div className={styles.grid}>
        {STATS.map((item) => (
          <div key={item.label}>
            <p className={styles.value}>{item.value}</p>
            <p className={styles.label}>{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
