import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { HistogramBin } from "@/api/types";
import { formatAxisMW, formatPercent, formatSignedMW } from "@/lib/format";
import { DataEndBar, TooltipCard } from "./ChartParts";
import { axisProps, COLORS, gridProps, yAxisProps } from "./chartTheme";

/** Distribution of hourly errors (forecast − actual) in 500 MW bins. */
export function ErrorHistogram({ data, height = 280 }: { data: HistogramBin[]; height?: number }) {
  const total = data.reduce((sum, b) => sum + b.count, 0);
  const rows = data.map((b) => ({ ...b, mid: (b.lower + b.upper) / 2, share: total ? b.count / total : 0 }));
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Histogram of hourly forecast errors">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} barCategoryGap={2}>
          <CartesianGrid {...gridProps} />
          <XAxis
            {...axisProps}
            dataKey="lower"
            interval={0}
            tickFormatter={(v: number) => (v % 2000 === 0 ? formatAxisMW(v) : "")}
          />
          <YAxis {...yAxisProps} allowDecimals={false} />
          <Tooltip content={<BinTooltip />} cursor={{ fill: "var(--surface-hover)" }} isAnimationActive={false} />
          <Bar dataKey="count" maxBarSize={24} shape={<DataEndBar />}>
            {rows.map((b) => (
              <Cell key={b.lower} fill={b.mid >= 0 ? COLORS.over : COLORS.under} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BinTooltip({ active, payload }: TooltipProps<number, string>) {
  const row = payload?.[0]?.payload as (HistogramBin & { share: number; mid: number }) | undefined;
  if (!active || !row) return null;
  return (
    <TooltipCard
      title={`Error ${formatSignedMW(row.lower)} to ${formatSignedMW(row.upper)} MW`}
      rows={[
        { label: "Hours", value: row.count, color: row.mid >= 0 ? COLORS.over : COLORS.under },
        { label: "Share", value: formatPercent(row.share, 1) },
      ]}
      footer={row.mid >= 0 ? "Forecast above actual (shortfall)" : "Forecast below actual (surplus)"}
    />
  );
}
