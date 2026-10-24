/**
 * Shared Recharts styling. Colours reference CSS custom properties so charts follow the theme
 * without re-rendering. Marks: 2px lines, >=8px active dots with a surface ring, hairline grid.
 */
export const COLORS = {
  actual: "var(--series-actual)",
  forecast: "var(--series-forecast)",
  band: "var(--series-band)",
  revision: "var(--series-revision)",
  over: "var(--diverge-over)",
  under: "var(--diverge-under)",
  ink: "var(--ink)",
  muted: "var(--ink-muted)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  surface: "var(--surface)",
  sunken: "var(--surface-sunken)",
} as const;

export const AXIS_TICK = {
  fill: "var(--ink-muted)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
} as const;

export const axisProps = {
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: { stroke: COLORS.axis },
} as const;

export const yAxisProps = {
  tick: AXIS_TICK,
  tickLine: false,
  axisLine: false,
  width: 44,
} as const;

export const gridProps = {
  stroke: COLORS.grid,
  strokeDasharray: undefined,
  vertical: false,
} as const;

export const activeDot = (color: string) => ({
  r: 4.5,
  fill: color,
  stroke: COLORS.surface,
  strokeWidth: 2,
});

export const cursorProps = { stroke: COLORS.axis, strokeWidth: 1 } as const;
