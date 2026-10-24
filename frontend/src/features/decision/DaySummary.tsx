import type { DayView } from "@/api/types";
import { StatTile } from "@/components/ui/StatTile";
import { formatClock, formatMW, formatPercent, formatSignedMW } from "@/lib/format";
import styles from "./DecisionPage.module.css";

export function DaySummary({ day }: { day: DayView }) {
  const { summary } = day;
  const errors = summary.errors;
  const energyGap =
    summary.forecast_energy_gwh != null && summary.actual_energy_gwh != null
      ? summary.forecast_energy_gwh - summary.actual_energy_gwh
      : null;

  return (
    <div className={styles.summaryGrid}>
      <StatTile
        label="Planned wind energy"
        value={summary.forecast_energy_gwh?.toFixed(1) ?? "-"}
        unit="GWh"
        hint="Decision-time forecast, hourly periods"
      />
      <StatTile
        label="Delivered wind energy"
        value={summary.actual_energy_gwh?.toFixed(1) ?? "-"}
        unit="GWh"
        hint={
          energyGap != null
            ? `${energyGap >= 0 ? "Shortfall" : "Surplus"} of ${Math.abs(energyGap).toFixed(1)} GWh vs plan`
            : undefined
        }
        tone={energyGap != null && energyGap > 0 ? "warning" : "default"}
      />
      <StatTile
        label="Mean abs. error"
        value={formatMW(errors?.mae)}
        unit="MW"
        hint={errors ? `${formatPercent(errors.nmae)} of mean actual output` : undefined}
      />
      <StatTile
        label="Bias (F − A)"
        value={formatSignedMW(errors?.bias)}
        unit="MW"
        hint={errors ? `Over-forecast in ${formatPercent(errors.over_forecast_share)} of hours` : undefined}
      />
      <StatTile
        label="Largest shortfall"
        value={formatMW(summary.peak_over_forecast_mw)}
        unit="MW"
        hint={summary.peak_over_forecast_at ? `At ${formatClock(summary.peak_over_forecast_at)} UK` : undefined}
      />
      <StatTile
        label="Firm wind (P90)"
        value={formatMW(summary.firm_wind_p90_mw)}
        unit="MW avg"
        hint="Wind you could count on 9 times in 10, given the month's error record"
      />
    </div>
  );
}
