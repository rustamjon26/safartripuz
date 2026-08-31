import Link from "next/link";
import { Globe, Mail, MessageCircle } from "lucide-react";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div className={styles.column}>
          <Link href="/" className={styles.logo}>
            SafarTrip
          </Link>
          <p className={styles.link}>
            O&apos;zbekistonning eng aqlli sayohat platformasi. Mehmonxona,
            transport va gid — bir joyda.
          </p>
        </div>

        <div className={styles.column}>
          <h3 className={styles.title}>Kompaniya</h3>
          <Link href="/about" className={styles.link}>
            Biz haqimizda
          </Link>
          <Link href="/contact" className={styles.link}>
            Bog&apos;lanish
          </Link>
          <Link href="/partner/hotel" className={styles.link}>
            Hamkorlik
          </Link>
        </div>

        <div className={styles.column}>
          <h3 className={styles.title}>Xizmatlar</h3>
          <Link href="/hotels" className={styles.link}>
            Mehmonxonalar
          </Link>
          <Link href="/taxi" className={styles.link}>
            Transport
          </Link>
          <Link href="/guide" className={styles.link}>
            Gidlar
          </Link>
          <Link href="/trip-builder" className={styles.link}>
            AI safar tuzish
          </Link>
        </div>

        <div className={styles.column}>
          <h3 className={styles.title}>Huquqiy / Ijtimoiy</h3>
          <Link href="/privacy" className={styles.link}>
            Maxfiylik siyosati
          </Link>
          <Link href="/terms" className={styles.link}>
            Foydalanish shartlari
          </Link>
          <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
            <a href="https://t.me/safartrip" className={styles.link} aria-label="Telegram">
              <MessageCircle size={20} />
            </a>
            <a href="mailto:info@safartrip.uz" className={styles.link} aria-label="Email">
              <Mail size={20} />
            </a>
            <a href="https://safartrip.uz" className={styles.link} aria-label="Web">
              <Globe size={20} />
            </a>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>
          &copy; {new Date().getFullYear()} SafarTrip Uzbekistan. Barcha
          huquqlar himoyalangan.
        </p>
      </div>
    </footer>
  );
}
