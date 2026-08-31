import { MapPin, Sparkles, BadgeCheck } from "lucide-react";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    title: "1. Manzilni tanlang",
    text: "O'zingizga yoqqan yo'nalishni tanlang yoki bizdan tavsiya oling.",
    icon: MapPin,
    tone: "teal" as const,
  },
  {
    title: "2. AI bilan rejalang",
    text: "Aqlli tizimimiz siz uchun marshrut, mehmonxona va transportni tanlab beradi.",
    icon: Sparkles,
    tone: "soft" as const,
  },
  {
    title: "3. Bron qiling va zavqlaning",
    text: "Barcha xizmatlarni bir joyda to'lang va safaringizdan zavq oling.",
    icon: BadgeCheck,
    tone: "navy" as const,
  },
] as const;

export default function HowItWorks() {
  return (
    <section className={styles.section} id="how-it-works">
      <div className={styles.inner}>
        <div className={styles.header}>
          <h2 className="font-display">Sayohat qanday boshlanadi?</h2>
          <p>
            Bizning platformamiz orqali safarni rejalashtirish juda oson va
            qulay.
          </p>
        </div>

        <div className={styles.steps}>
          <div className={styles.line} aria-hidden />
          {STEPS.map((step) => {
            const Icon = step.icon;
            const toneClass =
              step.tone === "teal"
                ? styles.iconTeal
                : step.tone === "soft"
                  ? styles.iconSoft
                  : styles.iconNavy;
            return (
              <div key={step.title} className={styles.step}>
                <div className={`${styles.icon} ${toneClass}`}>
                  <Icon size={36} strokeWidth={1.75} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
