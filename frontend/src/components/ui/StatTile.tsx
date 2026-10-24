import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./StatTile.module.css";

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  size?: "md" | "hero";
  tone?: "default" | "warning";
  className?: string;
}

export function StatTile({
  label,
  value,
  unit,
  hint,
  size = "md",
  tone = "default",
  className,
}: StatTileProps) {
  return (
    <div className={clsx(styles.tile, styles[size], styles[tone], className)}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>
        <span>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </p>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
