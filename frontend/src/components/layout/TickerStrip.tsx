import { useAccuracy, useMeta } from "@/api/queries";
import { useSelection } from "@/hooks/useSelection";
import { formatDayParts, formatGW, formatPercent, formatSignedGW } from "@/lib/format";
import styles from "./TickerStrip.module.css";

/** Terminal-style headline figures for the active forecast rule, always visible. */
export function TickerStrip() {
  const { selection } = useSelection();
  const meta = useMeta();
  const accuracy = useAccuracy(selection);
  const summary = accuracy.data?.summary;
  const days = meta.data?.delivery_days ?? [];
  const first = days[0] ? formatDayParts(days[0]) : null;
  const last = days.at(-1) ? formatDayParts(days.at(-1)!) : null;

  const cells: { label: string; value: string; unit?: string; flag?: boolean }[] = [
    {
      label: "Delivery",
      value: first && last ? `${first.dayOfMonth} ${first.month} – ${last.dayOfMonth} ${last.month}` : "-",
    },
    { label: "Days", value: days.length ? String(days.length) : "-" },
    { label: "MAE", value: formatGW(summary?.mae), unit: "GW" },
    { label: "Bias", value: formatSignedGW(summary?.bias), unit: "GW", flag: (summary?.bias ?? 0) > 0 },
    { label: "RMSE", value: formatGW(summary?.rmse), unit: "GW" },
    { label: "P90 |err|", value: formatGW(summary?.p90_abs), unit: "GW" },
    { label: "Over-forecast", value: formatPercent(summary?.over_forecast_share), unit: "of hours" },
  ];

  return (
    <div className={styles.strip} aria-label="Headline accuracy figures">
      <dl className={styles.inner} aria-busy={accuracy.isFetching}>
        {cells.map((cell) => (
          <div key={cell.label} className={styles.cell}>
            <dt>{cell.label}</dt>
            <dd>
              {cell.flag && (
                <span className={styles.flag} aria-label="over-forecast">
                  ▲
                </span>
              )}
              <span className="num">{cell.value}</span>
              {cell.unit && <span className={styles.unit}>{cell.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
