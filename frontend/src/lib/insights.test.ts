import type { Accuracy, ErrorSummary } from "@/api/types";
import { buildInsight } from "./insights";

const summary = (overrides: Partial<ErrorSummary>): ErrorSummary => ({
  count: 744,
  mae: 2000,
  bias: 1700,
  rmse: 2500,
  median_abs: 1500,
  p90_abs: 4200,
  max_abs: 9000,
  mean_actual: 11500,
  nmae: 0.17,
  over_forecast_share: 0.84,
  ...overrides,
});

const accuracy = (s: ErrorSummary | null): Accuracy => ({
  selection: { mode: "cutoff", cutoff: "11:00", horizon_hours: 24, description: "" },
  summary: s,
  decision_horizon_range: [14.5, 37.5],
  buffers: [{ coverage: 0.9, derate_mw: 4184 }],
  by_horizon: [],
  by_hour: [],
  daily: [],
  histogram: [],
  worst_periods: [],
});

describe("buildInsight", () => {
  it("flags a material over-forecast with the P90 buffer", () => {
    const insight = buildInsight(accuracy(summary({})))!;
    expect(insight.tone).toBe("warning");
    expect(insight.headline).toContain("over-predicted wind in 84% of hours");
    expect(insight.detail).toContain("4.18 GW");
  });

  it("calls a small bias unbiased", () => {
    const insight = buildInsight(accuracy(summary({ bias: 100, over_forecast_share: 0.52 })))!;
    expect(insight.tone).toBe("neutral");
    expect(insight.headline).toContain("broadly unbiased");
  });

  it("handles a material under-forecast", () => {
    const insight = buildInsight(accuracy(summary({ bias: -1200, over_forecast_share: 0.2 })))!;
    expect(insight.headline).toContain("under-predicted wind in 80% of hours");
    expect(insight.tone).toBe("neutral");
  });

  it("returns null without data", () => {
    expect(buildInsight(accuracy(null))).toBeNull();
  });
});
