/** Mirrors backend/app/schemas.py. Timestamps are ISO-8601 UTC strings; MW unless noted. */

export type SelectionMode = "cutoff" | "horizon";
export type DataSource = "live" | "snapshot";

export interface Selection {
  mode: SelectionMode;
  cutoff: string; // "HH:MM" UK local time on D-1
  horizon: number; // hours
}

export interface SelectionOut {
  mode: SelectionMode;
  cutoff: string;
  horizon_hours: number;
  description: string;
}

export interface ErrorSummary {
  count: number;
  mae: number;
  bias: number;
  rmse: number;
  median_abs: number;
  p90_abs: number;
  max_abs: number;
  mean_actual: number;
  nmae: number;
  over_forecast_share: number;
}

export interface Meta {
  source: DataSource;
  fetched_at: string;
  timezone: string;
  delivery_days: string[];
  actual_periods: number;
  forecast_points: number;
  forecast_runs: number;
  forecast_publish_times_utc: string[];
  defaults: {
    mode: SelectionMode;
    cutoff: string;
    horizon_hours: number;
    max_horizon_hours: number;
  };
}

export interface DayPoint {
  time: string;
  actual: number | null;
  forecast: number | null;
  forecast_published_at: string | null;
  error: number | null;
  likely_low: number | null;
  likely_high: number | null;
}

export interface ForecastRun {
  published_at: string;
  lead_hours: number;
  is_decision_run: boolean;
  points: { time: string; generation: number }[];
}

export interface DayView {
  date: string;
  selection: SelectionOut;
  decision_deadline: string | null;
  decision_runs: string[];
  points: DayPoint[];
  forecast_runs: ForecastRun[];
  summary: {
    errors: ErrorSummary | null;
    forecast_energy_gwh: number | null;
    actual_energy_gwh: number | null;
    peak_over_forecast_mw: number | null;
    peak_over_forecast_at: string | null;
    firm_wind_p90_mw: number | null;
  };
}

export interface BufferLevel {
  coverage: number;
  derate_mw: number;
}

export interface HorizonBucket {
  horizon_hours: number;
  mae: number;
  bias: number;
  p90_abs: number;
  count: number;
}

export interface HourBucket {
  hour: number;
  mae: number;
  bias: number;
  count: number;
}

export interface DailyError {
  date: string;
  mae: number;
  bias: number;
  nmae: number;
  count: number;
}

export interface HistogramBin {
  lower: number;
  upper: number;
  count: number;
}

export interface WorstPeriod {
  time: string;
  forecast: number;
  actual: number;
  error: number;
  published_at: string;
}

export interface Accuracy {
  selection: SelectionOut;
  summary: ErrorSummary | null;
  decision_horizon_range: [number, number] | null;
  buffers: BufferLevel[];
  by_horizon: HorizonBucket[];
  by_hour: HourBucket[];
  daily: DailyError[];
  histogram: HistogramBin[];
  worst_periods: WorstPeriod[];
}
