import type { ReactElement, ReactNode } from "react";
import styles from "./notebook.module.css";

type HandDrawnUnderlineProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3" | "span";
  className?: string;
};

export function HandDrawnUnderline({
  children,
  as: Tag = "h2",
  className,
}: HandDrawnUnderlineProps): ReactElement {
  return (
    <Tag className={`${styles.headlineMd} ${styles.handUnderline}${className ? ` ${className}` : ""}`}>
      {children}
    </Tag>
  );
}
