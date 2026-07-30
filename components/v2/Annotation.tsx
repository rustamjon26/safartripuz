import type { ReactElement, ReactNode } from "react";
import styles from "./notebook.module.css";

type AnnotationProps = {
  children: ReactNode;
  className?: string;
};

/** Desktop: left margin. Mobile: tipped-in tag above content. Same information always. */
export function Annotation({ children, className }: AnnotationProps): ReactElement {
  return (
    <div className={`${styles.annotation}${className ? ` ${className}` : ""}`}>{children}</div>
  );
}
