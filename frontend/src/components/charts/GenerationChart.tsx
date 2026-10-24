import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { DayView } from "@/api/types";
import {
  formatAxisMW,
  formatClock,
  formatDateTime,
  formatMW,
  formatSignedMW,
} from "@/lib/format";
import { TooltipCard } from "./ChartParts";
import { activeDot, axisProps, COLORS, cursorProps, gridProps, yAxisProps } from "./chartTheme";

interface Row {
  t: number;
  actual: number | null;
  forecast: number | null;
  band: [number, number] | null;
  error: number | null;
  published: string | null;
  [revision: `r${number}`]: number | undefined;
}

interface GenerationChartProps {
  day: DayView;
  showRevisions: boolean;
  height?: number;
}

/** Actual (half-hourly) vs the decision-time forecast (hourly) with its 80 % likely range. */
export function GenerationChart({ day, showRevisions, height = 380 }: GenerationChartProps) {
  const revisions = useMemo(
    () => day.forecast_runs.filter((run) => !run.is_decision_run),
    [day.forecast_runs],
  );

  const rows = useMemo(() => {
    const byTime = new Map<number, Row>();
    for (const p of day.points) {
      const t = Date.parse(p.time);
      byTime.set(t, {
        t,
        actual: p.actual,
        forecast: p.forecast,
        band: p.likely_low != null && p.likely_high != null ? [p.likely_low, p.likely_high] : null,
        error: p.error,
        published: p.forecast_published_at,
      });
    }
    revisions.forEach((run, i) => {
      for (const point of run.points) {
        const row = byTime.get(Date.parse(point.time));
        if (row) row[`r${i}`] = point.generation;
      }
    });
    return [...byTime.values()].sort((a, b) => a.t - b.t);
  }, [day.points, revisions]);

  const first = rows[0]?.t ?? 0;
  const last = rows.at(-1)?.t ?? 0;
  const ticks = rows.filter((r) => new Date(r.t).getUTCMinutes() === 0).map((r) => r.t).filter((_, i) => i % 3 === 0);

  return (
    <div style={{ width: "100%", height }} role="img" aria-label={`Wind generation on ${day.date}: actual versus decision-time forecast`}>
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis
            {...axisProps}
            dataKey="t"
            type="number"
            scale="time"
            domain={[first, last]}
            ticks={ticks}
            tickFormatter={(t: number) => formatClock(new Date(t).toISOString())}
          />
          <YAxis {...yAxisProps} tickFormatter={formatAxisMW} domain={[0, "auto"]} />
          <Tooltip content={<GenerationTooltip />} cursor={cursorProps} isAnimationActive={false} />

          <Area
            dataKey="band"
            stroke="none"
            fill={COLORS.band}
            connectNulls
            isAnimationActive={false}
            activeDot={false}
            type="linear"
          />

          {showRevisions &&
            revisions.map((run, i) => (
              <Line
                key={run.published_at}
                dataKey={`r${i}`}
                stroke={COLORS.revision}
                strokeWidth={1.25}
                dot={false}
                activeDot={false}
                connectNulls
                isAnimationActive={false}
                type="linear"
              />
            ))}

          <Line
            dataKey="forecast"
            stroke={COLORS.forecast}
            strokeWidth={2}
            dot={false}
            activeDot={activeDot(COLORS.forecast)}
            connectNulls
            type="linear"
            animationDuration={500}
          />
          <Line
            dataKey="actual"
            stroke={COLORS.actual}
            strokeWidth={2}
            dot={false}
            activeDot={activeDot(COLORS.actual)}
            type="linear"
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function GenerationTooltip({ active, payload }: TooltipProps<number, string>) {
  const row = payload?.[0]?.payload as Row | undefined;
  if (!active || !row) return null;
  const iso = new Date(row.t).toISOString();
  return (
    <TooltipCard
      title={`${formatClock(iso)} – ${formatClock(new Date(row.t + 30 * 60_000).toISOString())} UK`}
      rows={[
        { label: "Actual", value: `${formatMW(row.actual)} MW`, color: COLORS.actual },
        ...(row.forecast != null
          ? [
              { label: "Forecast", value: `${formatMW(row.forecast)} MW`, color: COLORS.forecast },
              ...(row.band
                ? [{ label: "Likely range", value: `${formatMW(row.band[0])}–${formatMW(row.band[1])}` }]
                : []),
              {
                label: "Error (F − A)",
                value: row.error != null ? `${formatSignedMW(row.error)} MW` : "-",
                emphasis: true,
              },
            ]
          : []),
      ]}
      footer={row.published ? `Forecast published ${formatDateTime(row.published)}` : "Forecasts are hourly"}
    />
  );
}
