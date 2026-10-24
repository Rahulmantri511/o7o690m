import { createSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useAccuracy } from "@/api/queries";
import { ChartLegend } from "@/components/charts/ChartParts";
import { COLORS } from "@/components/charts/chartTheme";
import { DailyBiasChart } from "@/components/charts/DailyBiasChart";
import { ErrorHistogram } from "@/components/charts/ErrorHistogram";
import { HorizonChart } from "@/components/charts/HorizonChart";
import { HourOfDayChart } from "@/components/charts/HourOfDayChart";
import { Card } from "@/components/ui/Card";
import { Callout, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { StatTile } from "@/components/ui/StatTile";
import { useSelection } from "@/hooks/useSelection";
import {
  formatDateTime,
  formatGW,
  formatHours,
  formatMW,
  formatPercent,
  formatSignedGW,
  formatSignedMW,
  toUkDay,
} from "@/lib/format";
import { buildInsight } from "@/lib/insights";
import { BufferTable } from "./BufferTable";
import styles from "./AccuracyPage.module.css";

export function AccuracyPage() {
  const { selection } = useSelection();
  const accuracy = useAccuracy(selection);
  const navigate = useNavigate();
  const { search } = useLocation();

  if (accuracy.isError) {
    return <ErrorState title="Couldn't load accuracy" message={accuracy.error.message} onRetry={() => accuracy.refetch()} />;
  }
  if (!accuracy.data) return <LoadingBlock label="Crunching forecast errors" height={480} />;

  const data = accuracy.data;
  const s = data.summary;
  const insight = buildInsight(data);
  const openDay = (day: string) => {
    const params = new URLSearchParams(search);
    params.set("day", day);
    navigate({ pathname: "/", search: createSearchParams(params).toString() });
  };

  return (
    <div className={`page ${accuracy.isPlaceholderData ? styles.stale : ""}`}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className="eyebrow">Forecast accuracy · {data.daily.length} delivery days</p>
          <h1 className="page-title">How far off was the forecast we decided on?</h1>
          <p className="page-lede">
            {data.selection.description}. Errors are forecast minus actual: positive means less wind arrived than
            planned.
          </p>
        </div>
        {s && (
          <StatTile
            size="hero"
            label="Mean absolute error"
            value={formatGW(s.mae)}
            unit="GW"
            hint={`${formatPercent(s.nmae)} of mean wind output · ${s.count.toLocaleString("en-GB")} hours`}
            className={styles.heroStat}
          />
        )}
      </header>

      {s && (
        <div className={styles.kpis}>
          <StatTile label="Bias (F − A)" value={formatSignedGW(s.bias)} unit="GW" hint="Average signed error" tone={s.bias > 0 ? "warning" : "default"} />
          <StatTile label="RMSE" value={formatGW(s.rmse)} unit="GW" hint="Penalises large misses" />
          <StatTile label="P90 absolute error" value={formatGW(s.p90_abs)} unit="GW" hint="9 in 10 hours miss by less" />
          <StatTile label="Worst hour" value={formatGW(s.max_abs)} unit="GW" hint="Largest single miss" />
          <StatTile label="Over-forecast hours" value={formatPercent(s.over_forecast_share)} hint="Forecast above actual" />
        </div>
      )}

      {insight && (
        <Callout label="Key finding" tone={insight.tone}>
          <strong>{insight.headline}</strong> {insight.detail}
        </Callout>
      )}

      <div className={styles.gridWide}>
        <Card
          eyebrow="Bias by delivery day · MW"
          title="Which days went wrong, and which way"
          description="Bars above zero: the forecast promised more wind than arrived. Click a day to inspect it."
          actions={
            <ChartLegend
              items={[
                { label: "Over-forecast", color: COLORS.over, kind: "square" },
                { label: "Under-forecast", color: COLORS.under, kind: "square" },
              ]}
            />
          }
        >
          <DailyBiasChart data={data.daily} onSelectDay={openDay} />
        </Card>
        <Card
          eyebrow="Purchasing rule"
          title="How much wind to trust"
          description="Subtract this buffer from the decision-time forecast to cover actual wind in the given share of hours."
        >
          {s && <BufferTable buffers={data.buffers} meanActual={s.mean_actual} />}
        </Card>
      </div>

      <div className={styles.gridHalf}>
        <Card
          eyebrow="Error vs lead time · MW"
          title="Skill decays with lead time"
          description="All forecast runs, by hours between publication and delivery. Shaded: lead times used by the current rule."
          actions={
            <ChartLegend
              items={[
                { label: "MAE", color: COLORS.ink },
                { label: "Bias", color: COLORS.over },
              ]}
            />
          }
        >
          <HorizonChart data={data.by_horizon} highlight={data.decision_horizon_range} />
          {data.decision_horizon_range && (
            <p className={styles.note}>
              Decision forecasts had lead times of {formatHours(data.decision_horizon_range[0])}–
              {formatHours(data.decision_horizon_range[1])}.
            </p>
          )}
        </Card>
        <Card eyebrow="Error by hour of day · MW" title="When in the day the forecast misses" description="Mean absolute error by UK clock hour of the delivery period.">
          <HourOfDayChart data={data.by_hour} />
        </Card>
      </div>

      <div className={styles.gridHalf}>
        <Card
          eyebrow="Error distribution · hours"
          title="Spread of hourly errors"
          description="500 MW bins of forecast − actual. A distribution centred right of zero is a systematic over-forecast."
          actions={
            <ChartLegend
              items={[
                { label: "Shortfall", color: COLORS.over, kind: "square" },
                { label: "Surplus", color: COLORS.under, kind: "square" },
              ]}
            />
          }
        >
          <ErrorHistogram data={data.histogram} />
        </Card>
        <Card eyebrow="Largest shortfalls" title="Five worst hours" bodyClassName={styles.flushBody}>
          <table className={styles.worstTable}>
            <thead>
              <tr>
                <th scope="col">Period (UK)</th>
                <th scope="col">Forecast</th>
                <th scope="col">Actual</th>
                <th scope="col">Error</th>
              </tr>
            </thead>
            <tbody>
              {data.worst_periods.map((w) => (
                <tr key={w.time} onClick={() => openDay(toUkDay(w.time))} title="Open this day">
                  <th scope="row">{formatDateTime(w.time)}</th>
                  <td>{formatMW(w.forecast)}</td>
                  <td>{formatMW(w.actual)}</td>
                  <td className={styles.over}>{formatSignedMW(w.error)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
