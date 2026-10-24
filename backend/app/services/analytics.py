"""Composes the pure domain functions into the views served by the API."""

from datetime import date

from app.config import Settings
from app.domain import metrics
from app.domain.metrics import ErrorSample, ErrorSummary
from app.domain.models import half_hours, local_day_bounds
from app.domain.selection import (
    ForecastSelection,
    SelectionMode,
    forecast_runs_for_window,
    select_forecasts,
)
from app.schemas import (
    AccuracyOut,
    BufferLevelOut,
    DailyErrorOut,
    DayOut,
    DayPointOut,
    DaySummaryOut,
    ErrorSummaryOut,
    ForecastRunOut,
    ForecastRunPointOut,
    HistogramBinOut,
    HorizonBucketOut,
    HourBucketOut,
    MetaOut,
    SelectionDefaults,
    SelectionOut,
    WorstPeriodOut,
)
from app.services.repository import WindDataset

LIKELY_RANGE = (0.1, 0.9)  # quantiles of error that bound the "likely actual" band
HISTOGRAM_BIN_MW = 500.0


class DayNotAvailableError(LookupError):
    pass


class AnalyticsService:
    def __init__(self, dataset: WindDataset, settings: Settings) -> None:
        self._data = dataset
        self._settings = settings
        first, _ = local_day_bounds(dataset.delivery_days[0])
        _, last = local_day_bounds(dataset.delivery_days[-1])
        self._targets = half_hours(first, last)

    # ------------------------------------------------------------------ meta

    def meta(self) -> MetaOut:
        runs = {p.publish_time for p in self._data.forecasts.all_points()}
        return MetaOut(
            source=self._data.source,
            fetched_at=self._data.fetched_at,
            timezone="Europe/London",
            delivery_days=self._data.delivery_days,
            actual_periods=len(self._data.actuals),
            forecast_points=len(self._data.forecasts),
            forecast_runs=len(runs),
            forecast_publish_times_utc=sorted({f"{t:%H:%M}" for t in runs}),
            defaults=SelectionDefaults(
                mode=ForecastSelection().mode,
                cutoff=f"{self._settings.default_cutoff:%H:%M}",
                horizon_hours=self._settings.default_horizon_hours,
                max_horizon_hours=self._settings.max_horizon_hours,
            ),
        )

    # ------------------------------------------------------------------- day

    def day(self, day: date, selection: ForecastSelection) -> DayOut:
        if day not in self._data.delivery_days:
            raise DayNotAvailableError(f"{day} is outside the analysis window")

        start, end = local_day_bounds(day)
        targets = half_hours(start, end)
        selected = select_forecasts(self._data.forecasts, targets, selection)
        samples = metrics.pair_samples(self._data.actuals, selected)
        low_q, high_q = self._error_quantiles(selection)

        points = []
        for target in targets:
            actual = self._data.actuals.get(target)
            chosen = selected.get(target)
            forecast = chosen.generation if chosen else None
            points.append(
                DayPointOut(
                    time=target,
                    actual=actual,
                    forecast=forecast,
                    forecast_published_at=chosen.publish_time if chosen else None,
                    error=forecast - actual
                    if forecast is not None and actual is not None
                    else None,
                    likely_low=max(forecast - high_q, 0.0) if forecast is not None else None,
                    likely_high=forecast - low_q if forecast is not None else None,
                )
            )

        decision_runs = sorted({p.publish_time for p in selected.values()})
        runs = forecast_runs_for_window(self._data.forecasts, start, end)
        forecast_runs = [
            ForecastRunOut(
                published_at=published,
                lead_hours=(start - published).total_seconds() / 3600,
                is_decision_run=published in decision_runs,
                points=[
                    ForecastRunPointOut(time=p.start_time, generation=p.generation) for p in pts
                ],
            )
            for published, pts in sorted(runs.items())
        ]

        return DayOut(
            date=day,
            selection=_selection_out(selection),
            decision_deadline=(
                selection.publish_deadline(start)
                if selection.mode is SelectionMode.CUTOFF
                else None
            ),
            decision_runs=decision_runs,
            points=points,
            forecast_runs=forecast_runs,
            summary=self._day_summary(samples, high_q),
        )

    def _day_summary(self, samples: list[ErrorSample], high_q: float) -> DaySummaryOut:
        if not samples:
            return DaySummaryOut(
                errors=None,
                forecast_energy_gwh=None,
                actual_energy_gwh=None,
                peak_over_forecast_mw=None,
                peak_over_forecast_at=None,
                firm_wind_p90_mw=None,
            )
        worst = max(samples, key=lambda s: s.error)
        # Hourly forecast values compared with the half-hour starting on the hour: each sample
        # represents one hour, so MW x 1 h = MWh.
        return DaySummaryOut(
            errors=_summary_out(metrics.summarize(samples)),
            forecast_energy_gwh=sum(s.forecast for s in samples) / 1000,
            actual_energy_gwh=sum(s.actual for s in samples) / 1000,
            peak_over_forecast_mw=worst.error if worst.error > 0 else 0.0,
            peak_over_forecast_at=worst.target,
            firm_wind_p90_mw=sum(max(s.forecast - high_q, 0.0) for s in samples) / len(samples),
        )

    # -------------------------------------------------------------- accuracy

    def accuracy(self, selection: ForecastSelection) -> AccuracyOut:
        samples = self._samples(selection)
        horizons = [s.horizon_hours for s in samples]
        by_horizon = metrics.by_horizon(
            self._data.forecasts,
            self._data.actuals,
            self._targets,
            self._settings.max_horizon_hours,
        )
        worst = sorted(samples, key=lambda s: s.error, reverse=True)[:5]
        return AccuracyOut(
            selection=_selection_out(selection),
            summary=_summary_out(metrics.summarize(samples)),
            decision_horizon_range=(min(horizons), max(horizons)) if horizons else None,
            buffers=[
                BufferLevelOut(coverage=b.coverage, derate_mw=b.derate_mw)
                for b in metrics.buffer_levels(samples)
            ],
            by_horizon=[
                HorizonBucketOut(
                    horizon_hours=h, mae=s.mae, bias=s.bias, p90_abs=s.p90_abs, count=s.count
                )
                for h, s in by_horizon.items()
            ],
            by_hour=[
                HourBucketOut(hour=h, mae=s.mae, bias=s.bias, count=s.count)
                for h, s in metrics.by_local_hour(samples).items()
            ],
            daily=[
                DailyErrorOut(date=d, mae=s.mae, bias=s.bias, nmae=s.nmae, count=s.count)
                for d, s in metrics.by_delivery_day(samples).items()
            ],
            histogram=[
                HistogramBinOut(lower=b.lower, upper=b.upper, count=b.count)
                for b in metrics.histogram(samples, HISTOGRAM_BIN_MW)
            ],
            worst_periods=[
                WorstPeriodOut(
                    time=s.target,
                    forecast=s.forecast,
                    actual=s.actual,
                    error=s.error,
                    published_at=s.publish_time,
                )
                for s in worst
            ],
        )

    # --------------------------------------------------------------- helpers

    def _samples(self, selection: ForecastSelection) -> list[ErrorSample]:
        selected = select_forecasts(self._data.forecasts, self._targets, selection)
        return metrics.pair_samples(self._data.actuals, selected)

    def _error_quantiles(self, selection: ForecastSelection) -> tuple[float, float]:
        errors = [s.error for s in self._samples(selection)]
        if not errors:
            return 0.0, 0.0
        return metrics.quantile(errors, LIKELY_RANGE[0]), metrics.quantile(errors, LIKELY_RANGE[1])


def _selection_out(selection: ForecastSelection) -> SelectionOut:
    return SelectionOut(
        mode=selection.mode,
        cutoff=f"{selection.cutoff:%H:%M}",
        horizon_hours=selection.horizon_hours,
        description=selection.describe(),
    )


def _summary_out(summary: ErrorSummary | None) -> ErrorSummaryOut | None:
    if summary is None:
        return None
    return ErrorSummaryOut(
        count=summary.count,
        mae=summary.mae,
        bias=summary.bias,
        rmse=summary.rmse,
        median_abs=summary.median_abs,
        p90_abs=summary.p90_abs,
        max_abs=summary.max_abs,
        mean_actual=summary.mean_actual,
        nmae=summary.nmae,
        over_forecast_share=summary.over_forecast_share,
    )
