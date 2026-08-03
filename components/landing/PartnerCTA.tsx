import Image from "next/image";
import Link from "next/link";
import styles from "./PartnerCTA.module.css";

export default function PartnerCTA() {
  return (
    <section className={styles.section} id="partners">
      <div className={styles.inner}>
        <div className={styles.panel}>
          <div className={styles.copy}>
            <h2 className="font-display">SafarTrip hamkoriga aylaning</h2>
            <p>
              Mehmonxonangiz, gidlik xizmatingiz yoki transport kompaniyangiz
              bormi? Bizning ekotizimga qo&apos;shiling va minglab sayyohlar
              bilan aloqa o&apos;rnating.
            </p>
            <div className={styles.actions}>
              <Link href="/partner/hotel" className={styles.btnPrimary}>
                Arizani topshirish
              </Link>
              <Link href="/login" className={styles.btnGhost}>
                Kabinetga kirish
              </Link>
            </div>
          </div>
          <div className={styles.media}>
            <Image
              src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=80"
              alt="SafarTrip hamkor jamoasi"
              fill
              className={styles.mediaImg}
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
