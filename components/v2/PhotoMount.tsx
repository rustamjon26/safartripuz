import type { ReactElement } from "react";
import styles from "./notebook.module.css";

type PhotoMountProps = {
  slotId: string;
  subject: string;
  sizeLabel: string;
  caption?: string;
  rotation?: string;
  className?: string;
  aspectClassName?: string;
};

export function PhotoMount({
  slotId,
  subject,
  sizeLabel,
  caption,
  rotation = "-1deg",
  className,
  aspectClassName,
}: PhotoMountProps): ReactElement {
  return (
    <figure
      className={`${styles.photoMount} ${styles.tippedIn}${className ? ` ${className}` : ""}`}
      style={{ ["--rotation" as string]: rotation }}
    >
      <span className={`${styles.photoCorner} ${styles.cornerTl}`} />
      <span className={`${styles.photoCorner} ${styles.cornerTr}`} />
      <span className={`${styles.photoCorner} ${styles.cornerBl}`} />
      <span className={`${styles.photoCorner} ${styles.cornerBr}`} />
      <div className={`${styles.photoSlot}${aspectClassName ? ` ${aspectClassName}` : ""}`}>
        <span className={styles.labelXs}>{slotId}</span>
        <span className={styles.labelSm}>{subject}</span>
        <span className={`${styles.labelXs} ${styles.muted}`}>{sizeLabel}</span>
      </div>
      {caption ? (
        <figcaption className={`${styles.labelXs} ${styles.archive}`} style={{ marginTop: 8, fontStyle: "italic" }}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
