import { useMeta } from "@/api/queries";
import { Card } from "@/components/ui/Card";
import styles from "./MethodologyPage.module.css";

export function MethodologyPage() {
  const meta = useMeta();
  const publishTimes = meta.data?.forecast_publish_times_utc.join(", ");

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Methodology</p>
        <h1 className="page-title">How the numbers are made</h1>
        <p className="page-lede">
          Everything on WindScope comes from two public Elexon datasets. This page explains which forecast counts as
          &ldquo;available at decision time&rdquo;, how it is matched to actual output, and what each metric means.
        </p>
      </header>

      <div className={styles.grid}>
        <Card eyebrow="01 · Data" title="Sources">
          <dl className={styles.defs}>
            <dt>Actual generation</dt>
            <dd>
              <code>FUELHH</code>, fuel type <code>WIND</code>: average MW over each 30-minute settlement period,
              published about 30 minutes after the period ends.
            </dd>
            <dt>Forecast generation</dt>
            <dd>
              <code>WINDFOR</code>: hourly national wind forecasts, published up to 8 times a day
              {publishTimes ? ` (observed at ${publishTimes} UTC)` : ""}. Each run covers roughly the previous day to
              ~66 hours ahead.
            </dd>
            <dt>Coverage</dt>
            <dd>
              Both datasets cover wind farms with operational metering visible to the system operator, so they are
              like-for-like. Embedded (distribution-connected) wind is excluded from both.
            </dd>
            <dt>Window</dt>
            <dd>
              Delivery days {meta.data?.delivery_days[0] ?? "2 Jan"} to {meta.data?.delivery_days.at(-1) ?? "1 Feb"}:
              every day whose day-ahead purchase decision falls in January 2026.
            </dd>
          </dl>
        </Card>

        <Card eyebrow="02 · Selection" title="Which forecast was available?">
          <dl className={styles.defs}>
            <dt>Day-ahead cut-off (default)</dt>
            <dd>
              For delivery day D, use the latest run published at or before the cut-off on D-1. The default 11:00 UK
              time is the GB day-ahead auction gate closure, so this is exactly the information the desk had when it
              bought.
            </dd>
            <dt>Fixed lead time</dt>
            <dd>
              For each period, use the latest run published at least <em>H</em> hours earlier. This isolates how
              accuracy depends on lead time.
            </dd>
            <dt>No look-ahead</dt>
            <dd>
              WINDFOR runs also contain values for hours that have already passed. These hindcasts are always
              discarded: only forecasts published before their target time are used.
            </dd>
          </dl>
        </Card>

        <Card eyebrow="03 · Matching" title="Pairing forecasts with actuals">
          <p className={styles.prose}>
            Forecasts are hourly; actuals are half-hourly. Each hourly forecast is paired with the settlement period
            that starts at the same time (e.g. the 14:00 forecast with the 14:00–14:30 actual). Every metric uses
            these hourly pairs, and days are UK local calendar days.
          </p>
        </Card>

        <Card eyebrow="04 · Metrics" title="What the numbers mean">
          <dl className={styles.defs}>
            <dt>Error</dt>
            <dd>
              Forecast − actual. <strong>Positive = over-forecast</strong>: less wind than planned, so the desk is
              short and must buy more.
            </dd>
            <dt>MAE / RMSE</dt>
            <dd>Mean absolute error, and root-mean-square error (which weights large misses more heavily).</dd>
            <dt>Bias</dt>
            <dd>Mean signed error. A persistent non-zero bias is a correctable, systematic offset.</dd>
            <dt>P90 |error|</dt>
            <dd>90% of hours missed by less than this amount.</dd>
            <dt>Buffer (purchasing rule)</dt>
            <dd>
              The q-quantile of forecast − actual. Planning on <em>forecast − buffer</em> means actual wind met the
              plan in a share q of hours in this period.
            </dd>
            <dt>Likely range</dt>
            <dd>
              Forecast adjusted by the 10th and 90th percentile errors for the active rule: an empirical 80% interval
              for actual output.
            </dd>
          </dl>
        </Card>

        <Card eyebrow="05 · Caveats" title="Read with care" className={styles.full}>
          <ul className={styles.list}>
            <li>
              One month is a small sample, and January is windy. The buffers describe this period; they are not a
              guarantee for future months.
            </li>
            <li>
              The systematic over-forecast is consistent with curtailment: metered output falls when wind farms are
              constrained off, which a weather-driven forecast does not anticipate. This is a hypothesis to confirm
              against balancing-mechanism data (out of scope here).
            </li>
            <li>
              Pairing an hourly forecast with the half-hour starting on the hour, rather than the hourly mean, adds a
              small amount of noise but no bias.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
