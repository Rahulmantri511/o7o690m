import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { DailyError } from "@/api/types";
import { formatAxisMW, formatDayLong, formatDayParts, formatMW, formatPercent, formatSignedMW } from "@/lib/format";
import { DataEndBar, TooltipCard } from "./ChartParts";
import { axisProps, COLORS, gridProps, yAxisProps } from "./chartTheme";

interface DailyBiasChartProps {
  data: DailyError[];
  onSelectDay?: (day: string) => void;
  height?: number;
}

/** Signed daily bias: above zero the forecast promised more wind than arrived. */
export function DailyBiasChart({ data, onSelectDay, height = 300 }: DailyBiasChartProps) {
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Daily forecast bias across the delivery window">
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
          barCategoryGap={2}
          onClick={(state) => {
            const day = (state?.activePayload?.[0]?.payload as DailyError | undefined)?.date;
            if (day && onSelectDay) onSelectDay(day);
          }}
          style={{ cursor: onSelectDay ? "pointer" : undefined }}
        >
          <CartesianGrid {...gridProps} />
          <XAxis
            {...axisProps}
            dataKey="date"
            interval={0}
            tickFormatter={(d: string, i: number) => (i % 3 === 0 ? String(formatDayParts(d).dayOfMonth) : "")}
          />
          <YAxis {...yAxisProps} tickFormatter={formatAxisMW} />
          <ReferenceLine y={0} stroke={COLORS.axis} />
          <Tooltip content={<DailyTooltip clickable={Boolean(onSelectDay)} />} cursor={{ fill: "var(--surface-hover)" }} isAnimationActive={false} />
          <Bar dataKey="bias" maxBarSize={24} shape={<DataEndBar />}>
            {data.map((d) => (
              <Cell key={d.date} fill={d.bias >= 0 ? COLORS.over : COLORS.under} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DailyTooltip({ active, payload, clickable }: TooltipProps<number, string> & { clickable: boolean }) {
  const row = payload?.[0]?.payload as DailyError | undefined;
  if (!active || !row) return null;
  return (
    <TooltipCard
      title={formatDayLong(row.date)}
      rows={[
        { label: "Bias", value: `${formatSignedMW(row.bias)} MW`, color: row.bias >= 0 ? COLORS.over : COLORS.under },
        { label: "MAE", value: `${formatMW(row.mae)} MW` },
        { label: "MAE / mean actual", value: formatPercent(row.nmae) },
      ]}
      footer={clickable ? "Click to open this day on the decision desk" : undefined}
    />
  );
}
