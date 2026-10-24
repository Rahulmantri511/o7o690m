import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Feedback.module.css";

export function Skeleton({ height = 16, className }: { height?: number; className?: string }) {
  return <div className={clsx(styles.skeleton, className)} style={{ height }} aria-hidden />;
}

export function LoadingBlock({ label = "Loading", height = 320 }: { label?: string; height?: number }) {
  return (
    <div className={styles.loading} style={{ minHeight: height }} role="status">
      <span className={styles.pulse} aria-hidden />
      <span className="mono">{label}…</span>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.error} role="alert">
      <p className={styles.errorTitle}>
        <span aria-hidden>⚠</span> {title}
      </p>
      {message && <p className={styles.errorMessage}>{message}</p>}
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Callout({
  label,
  children,
  tone = "neutral",
}: {
  label: string;
  children: ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <aside className={clsx(styles.callout, styles[tone])}>
      <p className={styles.calloutLabel}>{label}</p>
      <div className={styles.calloutBody}>{children}</div>
    </aside>
  );
}
