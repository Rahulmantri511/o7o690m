"""API response contracts (mirrored by ``frontend/src/api/types.ts``)."""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.domain.selection import SelectionMode
from app.services.repository import DataSource


class Schema(BaseModel):
    model_config = ConfigDict(frozen=True)


class SelectionOut(Schema):
    mode: SelectionMode
    cutoff: str  # "HH:MM", UK local time on D-1
    horizon_hours: float
    description: str


class ErrorSummaryOut(Schema):
    count: int
    mae: float
    bias: float
    rmse: float
    median_abs: float
    p90_abs: float
    max_abs: float
    mean_actual: float
    nmae: float
    over_forecast_share: float


class SelectionDefaults(Schema):
    mode: SelectionMode
    cutoff: str
    horizon_hours: float
    max_horizon_hours: int


class MetaOut(Schema):
    source: DataSource
    fetched_at: datetime
    timezone: str
    delivery_days: list[date]
    actual_periods: int
    forecast_points: int
    forecast_runs: int
    forecast_publish_times_utc: list[str]
    defaults: SelectionDefaults


class DayPointOut(Schema):
    time: datetime
    actual: float | None
    forecast: float | None
    forecast_published_at: datetime | None
    error: float | None
    likely_low: float | None  # 80 % likely range of actual output, given the forecast
    likely_high: float | None


class ForecastRunPointOut(Schema):
    time: datetime
    generation: float


class ForecastRunOut(Schema):
    published_at: datetime
    lead_hours: float  # publish time -> start of delivery day (negative = intraday run)
    is_decision_run: bool
    points: list[ForecastRunPointOut]


class DaySummaryOut(Schema):
    errors: ErrorSummaryOut | None
    forecast_energy_gwh: float | None
    actual_energy_gwh: float | None
    peak_over_forecast_mw: float | None
    peak_over_forecast_at: datetime | None
    firm_wind_p90_mw: float | None  # average wind the desk could rely on with 90 % confidence


class DayOut(Schema):
    date: date
    selection: SelectionOut
    decision_deadline: datetime | None
    decision_runs: list[datetime]
    points: list[DayPointOut]
    forecast_runs: list[ForecastRunOut]
    summary: DaySummaryOut


class BufferLevelOut(Schema):
    coverage: float
    derate_mw: float


class HorizonBucketOut(Schema):
    horizon_hours: int
    mae: float
    bias: float
    p90_abs: float
    count: int


class HourBucketOut(Schema):
    hour: int
    mae: float
    bias: float
    count: int


class DailyErrorOut(Schema):
    date: date
    mae: float
    bias: float
    nmae: float
    count: int


class HistogramBinOut(Schema):
    lower: float
    upper: float
    count: int


class WorstPeriodOut(Schema):
    time: datetime
    forecast: float
    actual: float
    error: float
    published_at: datetime


class AccuracyOut(Schema):
    selection: SelectionOut
    summary: ErrorSummaryOut | None
    decision_horizon_range: tuple[float, float] | None
    buffers: list[BufferLevelOut]
    by_horizon: list[HorizonBucketOut]
    by_hour: list[HourBucketOut]
    daily: list[DailyErrorOut]
    histogram: list[HistogramBinOut]
    worst_periods: list[WorstPeriodOut]


class HealthOut(Schema):
    status: str
    source: DataSource | None
