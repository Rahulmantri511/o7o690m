import clsx from "clsx";
import type { DayView } from "@/api/types";
import { formatClock, formatDateTime, formatMW, formatSignedMW } from "@/lib/format";
import styles from "./HourlyTable.module.css";

/** Table view of the day (accessible alternative to the chart; hourly periods only). */
export function HourlyTable({ day }: { day: DayView }) {
  const hourly = day.points.filter((p) => p.forecast != null);
  return (
    <div className={styles.scroller}>
      <table className={styles.table}>
        <caption className="visually-hidden">Hourly forecast and actual wind generation, MW</caption>
        <thead>
          <tr>
            <th scope="col">Period (UK)</th>
            <th scope="col">Forecast</th>
            <th scope="col">Actual</th>
            <th scope="col">Error (F − A)</th>
            <th scope="col">Likely range</th>
            <th scope="col">Forecast published</th>
          </tr>
        </thead>
        <tbody>
          {hourly.map((p) => (
            <tr key={p.time}>
              <th scope="row">{formatClock(p.time)}</th>
              <td>{formatMW(p.forecast)}</td>
              <td>{formatMW(p.actual)}</td>
              <td className={clsx(p.error != null && (p.error > 0 ? styles.over : styles.under))}>
                {p.error != null && <span aria-hidden>{p.error > 0 ? "▲ " : "▼ "}</span>}
                {formatSignedMW(p.error)}
              </td>
              <td>
                {formatMW(p.likely_low)}–{formatMW(p.likely_high)}
              </td>
              <td className={styles.muted}>{p.forecast_published_at ? formatDateTime(p.forecast_published_at) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
