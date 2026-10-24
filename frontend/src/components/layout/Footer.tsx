import { useMeta } from "@/api/queries";
import { formatDateTime } from "@/lib/format";
import styles from "./Footer.module.css";

export function Footer() {
  const meta = useMeta();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p>
          Data: Elexon Insights Solution (BMRS) · FUELHH (wind outturn) &amp; WINDFOR (wind
          forecast). National, transmission-metered wind.
        </p>
        <p className="mono">
          {meta.data
            ? `${meta.data.actual_periods.toLocaleString("en-GB")} periods · ${meta.data.forecast_runs} forecast runs · loaded ${formatDateTime(meta.data.fetched_at)}`
            : " "}
        </p>
      </div>
    </footer>
  );
}
