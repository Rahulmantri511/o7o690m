import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { HorizonBucket } from "@/api/types";
import { formatAxisMW, formatMW, formatSignedMW } from "@/lib/format";
import { TooltipCard } from "./ChartParts";
import { activeDot, axisProps, COLORS, cursorProps, gridProps, yAxisProps } from "./chartTheme";

interface HorizonChartProps {
  data: HorizonBucket[];
  highlight: [number, number] | null;
  height?: number;
}

/** How forecast skill decays with lead time, across every published run. */
export function HorizonChart({ data, highlight, height = 280 }: HorizonChartProps) {
  return (
    <div style={{ width: "100%", height }} role="img" aria-label="Mean absolute error and bias by forecast lead time">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid {...gridProps} />
          {highlight && (
            <ReferenceArea
              x1={Math.floor(highlight[0])}
              x2={Math.min(Math.floor(highlight[1]), 48)}
              fill={COLORS.sunken}
              fillOpacity={1}
              stroke="none"
              ifOverflow="extendDomain"
              label={{
                value: "Decision lead times",
                position: "insideTop",
                fill: "var(--ink-muted)",
                fontSize: 10.5,
                fontFamily: "var(--font-mono)",
              }}
            />
          )}
          <XAxis
            {...axisProps}
            dataKey="horizon_hours"
            type="number"
            domain={[0, 48]}
            ticks={[0, 6, 12, 18, 24, 30, 36, 42, 48]}
            tickFormatter={(h: number) => `${h}h`}
          />
          <YAxis {...yAxisProps} tickFormatter={formatAxisMW} />
          <ReferenceLine y={0} stroke={COLORS.axis} />
          <Tooltip content={<HorizonTooltip />} cursor={cursorProps} isAnimationActive={false} />
          <Line dataKey="mae" stroke={COLORS.ink} strokeWidth={2} dot={false} activeDot={activeDot(COLORS.ink)} type="monotone" />
          <Line dataKey="bias" stroke={COLORS.over} strokeWidth={2} dot={false} activeDot={activeDot(COLORS.over)} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizonTooltip({ active, payload }: TooltipProps<number, string>) {
  const row = payload?.[0]?.payload as HorizonBucket | undefined;
  if (!active || !row) return null;
  return (
    <TooltipCard
      title={`Lead time ${row.horizon_hours}–${row.horizon_hours + 1} h`}
      rows={[
        { label: "MAE", value: `${formatMW(row.mae)} MW`, color: COLORS.ink },
        { label: "Bias", value: `${formatSignedMW(row.bias)} MW`, color: COLORS.over },
        { label: "P90 |error|", value: `${formatMW(row.p90_abs)} MW` },
      ]}
      footer={`${row.count.toLocaleString("en-GB")} forecast–actual pairs`}
    />
  );
}
