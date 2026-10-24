import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAccuracy, useDay, useMeta } from "@/api/queries";
import type { DayView } from "@/api/types";
import { ChartLegend } from "@/components/charts/ChartParts";
import { COLORS } from "@/components/charts/chartTheme";
import { GenerationChart } from "@/components/charts/GenerationChart";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { useSelection } from "@/hooks/useSelection";
import { formatDateTime, formatDayLong, formatHours } from "@/lib/format";
import { DayStrip } from "./DayStrip";
import { DaySummary } from "./DaySummary";
import { HourlyTable } from "./HourlyTable";
import styles from "./DecisionPage.module.css";

export function DecisionPage() {
  const meta = useMeta();
  const { selection } = useSelection();
  const [params, setParams] = useSearchParams();
  const [showRevisions, setShowRevisions] = useState(false);

  const days = meta.data?.delivery_days ?? [];
  const requested = params.get("day");
  const day = requested && days.includes(requested) ? requested : days.at(-1);

  const dayQuery = useDay(day, selection);
  const accuracy = useAccuracy(selection);

  const selectDay = (next: string) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set("day", next);
        return updated;
      },
      { replace: true },
    );

  if (meta.isError) {
    return <ErrorState title="Couldn't load wind data" message={meta.error.message} onRetry={() => meta.refetch()} />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="eyebrow">Decision desk · Delivery day</p>
        <h1 className="page-title">{day ? formatDayLong(day) : " "}</h1>
        <p className="page-lede">{dayQuery.data ? <DecisionContext day={dayQuery.data} /> : " "}</p>
      </header>

      {day && <DayStrip days={days} selected={day} daily={accuracy.data?.daily} onSelect={selectDay} />}

      <div className={styles.mainGrid}>
        <Card
          eyebrow="Generation · MW"
          title="Forecast at decision time vs actual"
          actions={
            <label className={styles.toggle}>
              <input type="checkbox" checked={showRevisions} onChange={(e) => setShowRevisions(e.target.checked)} />
              <span>Show later revisions</span>
            </label>
          }
          className={styles.chartCard}
        >
          <div className={styles.legendRow}>
            <ChartLegend
              items={[
                { label: "Actual (half-hourly)", color: COLORS.actual },
                { label: "Decision-time forecast (hourly)", color: COLORS.forecast },
                { label: "80% likely range", color: COLORS.band, kind: "band" },
                ...(showRevisions ? [{ label: "Other forecast runs", color: COLORS.revision, kind: "thin" as const }] : []),
              ]}
            />
          </div>
          {dayQuery.isError ? (
            <ErrorState message={dayQuery.error.message} onRetry={() => dayQuery.refetch()} />
          ) : dayQuery.data ? (
            <div className={dayQuery.isPlaceholderData ? styles.stale : undefined}>
              <GenerationChart day={dayQuery.data} showRevisions={showRevisions} />
            </div>
          ) : (
            <LoadingBlock label="Loading day" height={380} />
          )}
        </Card>

        <Card eyebrow="Day in numbers" title="Plan vs outcome" className={styles.summaryCard}>
          {dayQuery.data ? <DaySummary day={dayQuery.data} /> : <LoadingBlock label="Loading" height={300} />}
        </Card>
      </div>

      {dayQuery.data && (
        <Card
          eyebrow="Table view"
          title="Hour by hour"
          description="Every hourly forecast period for the day, with the error and the run it came from."
          bodyClassName={styles.flushBody}
        >
          <HourlyTable day={dayQuery.data} />
        </Card>
      )}
    </div>
  );
}

function DecisionContext({ day }: { day: DayView }) {
  const firstRun = day.decision_runs[0];
  const leads = day.points
    .filter((p) => p.forecast_published_at)
    .map((p) => (Date.parse(p.time) - Date.parse(p.forecast_published_at!)) / 3_600_000);
  const leadText = leads.length ? `${formatHours(Math.min(...leads))}–${formatHours(Math.max(...leads))}` : null;

  if (!firstRun) return <>No forecast was published in time for this day under the current rule.</>;
  if (day.selection.mode === "cutoff" && day.decision_deadline) {
    return (
      <>
        Purchase decision at <strong>{formatDateTime(day.decision_deadline)}</strong> using the forecast run published{" "}
        <strong>{formatDateTime(firstRun)}</strong>
        {leadText && <> · lead time {leadText}</>}.
      </>
    );
  }
  return (
    <>
      Each period uses the latest run published at least <strong>{formatHours(day.selection.horizon_hours)}</strong> ahead ·{" "}
      {day.decision_runs.length} run{day.decision_runs.length === 1 ? "" : "s"} used, published{" "}
      {formatDateTime(firstRun)} to {formatDateTime(day.decision_runs.at(-1)!)}.
    </>
  );
}
