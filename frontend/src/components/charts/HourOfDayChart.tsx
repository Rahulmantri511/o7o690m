import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { HourBucket } from "@/api/types";
import { formatAxisMW, formatMW, formatSignedMW } from "@/lib/format";
import { DataEndBar, TooltipCard } from "./ChartParts";
import { axisProps, COLORS, gridProps, yAxisProps } from "./chartTheme";

const label = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Mean absolute error by UK clock hour of the delivery period. */
export function HourOfDayChart({ data, height = 280 }: { data: HourBucket[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Mean absolute error by hour of day">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} barCategoryGap={2}>
          <CartesianGrid {...gridProps} />
          <XAxis
            {...axisProps}
            dataKey="hour"
            tickFormatter={(h: number) => (h % 3 === 0 ? label(h) : "")}
            interval={0}
          />
          <YAxis {...yAxisProps} tickFormatter={formatAxisMW} />
          <Tooltip content={<HourTooltip />} cursor={{ fill: "var(--surface-hover)" }} isAnimationActive={false} />
          <Bar dataKey="mae" fill="var(--heat-3)" maxBarSize={24} shape={<DataEndBar />} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourTooltip({ active, payload }: TooltipProps<number, string>) {
  const row = payload?.[0]?.payload as HourBucket | undefined;
  if (!active || !row) return null;
  return (
    <TooltipCard
      title={`${label(row.hour)} – ${label((row.hour + 1) % 24)} UK`}
      rows={[
        { label: "MAE", value: `${formatMW(row.mae)} MW`, color: "var(--heat-3)" },
        { label: "Bias", value: `${formatSignedMW(row.bias)} MW`, color: COLORS.over },
      ]}
      footer={`${row.count} delivery hours`}
    />
  );
}
