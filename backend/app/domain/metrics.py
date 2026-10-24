"""Forecast error statistics.

Sign convention used throughout: ``error = forecast - actual``.
A positive error is an *over-forecast*: less wind arrived than planned, so the desk would be
short and need to buy additional (e.g. thermal) power. That is the costly direction for this team.
"""

import math
from collections import defaultdict
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import date, datetime

from app.domain.models import LONDON, ForecastPoint, local_date
from app.domain.selection import ForecastIndex


@dataclass(frozen=True, slots=True)
class ErrorSample:
    target: datetime
    forecast: float
    actual: float
    publish_time: datetime

    @property
    def error(self) -> float:
        return self.forecast - self.actual

    @property
    def horizon_hours(self) -> float:
        return (self.target - self.publish_time).total_seconds() / 3600


@dataclass(frozen=True, slots=True)
class ErrorSummary:
    count: int
    mae: float
    bias: float
    rmse: float
    median_abs: float
    p90_abs: float
    max_abs: float
    mean_actual: float
    nmae: float  # MAE as a fraction of mean actual generation
    over_forecast_share: float  # fraction of periods where forecast > actual


@dataclass(frozen=True, slots=True)
class BufferLevel:
    """How much to shave off the forecast so actual wind meets the plan ``coverage`` of the time."""

    coverage: float
    derate_mw: float


@dataclass(frozen=True, slots=True)
class HistogramBin:
    lower: float
    upper: float
    count: int


def pair_samples(
    actuals: Mapping[datetime, float], selected: Mapping[datetime, ForecastPoint]
) -> list[ErrorSample]:
    """Join decision-time forecasts with actuals by target time (unmatched periods are dropped)."""
    samples = [
        ErrorSample(target, point.generation, actuals[target], point.publish_time)
        for target, point in selected.items()
        if target in actuals
    ]
    samples.sort(key=lambda s: s.target)
    return samples


def quantile(values: Sequence[float], q: float) -> float:
    """Linear-interpolated quantile (numpy's default method), without the numpy dependency."""
    if not values:
        raise ValueError("quantile of empty sequence")
    if not 0 <= q <= 1:
        raise ValueError("q must be within [0, 1]")
    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def summarize(samples: Sequence[ErrorSample]) -> ErrorSummary | None:
    if not samples:
        return None
    errors = [s.error for s in samples]
    absolute = [abs(e) for e in errors]
    n = len(samples)
    mae = sum(absolute) / n
    mean_actual = sum(s.actual for s in samples) / n
    return ErrorSummary(
        count=n,
        mae=mae,
        bias=sum(errors) / n,
        rmse=math.sqrt(sum(e * e for e in errors) / n),
        median_abs=quantile(absolute, 0.5),
        p90_abs=quantile(absolute, 0.9),
        max_abs=max(absolute),
        mean_actual=mean_actual,
        nmae=mae / mean_actual if mean_actual else math.nan,
        over_forecast_share=sum(1 for e in errors if e > 0) / n,
    )


def group_summaries[K](
    samples: Iterable[ErrorSample], key: Callable[[ErrorSample], K]
) -> dict[K, ErrorSummary]:
    groups: dict[K, list[ErrorSample]] = defaultdict(list)
    for sample in samples:
        groups[key(sample)].append(sample)
    return {k: s for k, group in sorted(groups.items()) if (s := summarize(group)) is not None}


def by_local_hour(samples: Iterable[ErrorSample]) -> dict[int, ErrorSummary]:
    return group_summaries(samples, lambda s: s.target.astimezone(LONDON).hour)


def by_delivery_day(samples: Iterable[ErrorSample]) -> dict[date, ErrorSummary]:
    return group_summaries(samples, lambda s: local_date(s.target))


def by_horizon(
    index: ForecastIndex,
    actuals: Mapping[datetime, float],
    targets: Iterable[datetime],
    max_hours: int,
) -> dict[int, ErrorSummary]:
    """Error of *every* forecast run against actuals, bucketed by whole hours of lead time.

    Independent of the selection rule: this shows how skill decays with lead time.
    """
    samples: list[ErrorSample] = []
    for target in targets:
        if target not in actuals:
            continue
        for point in index.for_target(target):
            if 0 <= point.horizon_hours < max_hours + 1:
                samples.append(
                    ErrorSample(target, point.generation, actuals[target], point.publish_time)
                )
    return group_summaries(samples, lambda s: math.floor(s.horizon_hours))


def buffer_levels(
    samples: Sequence[ErrorSample], coverages: Sequence[float] = (0.5, 0.8, 0.9, 0.95)
) -> list[BufferLevel]:
    """MW to subtract from the forecast so that actual >= planned wind in ``coverage`` of periods.

    The q-quantile of ``forecast - actual``; negative values mean the forecast can be raised.
    """
    if not samples:
        return []
    errors = [s.error for s in samples]
    return [BufferLevel(coverage=c, derate_mw=quantile(errors, c)) for c in coverages]


def histogram(samples: Sequence[ErrorSample], bin_width: float = 500.0) -> list[HistogramBin]:
    """Fixed-width histogram of signed errors, with bins aligned on multiples of ``bin_width``."""
    if not samples:
        return []
    if bin_width <= 0:
        raise ValueError("bin_width must be positive")
    counts: dict[int, int] = defaultdict(int)
    for sample in samples:
        counts[math.floor(sample.error / bin_width)] += 1
    first, last = min(counts), max(counts)
    return [
        HistogramBin(lower=i * bin_width, upper=(i + 1) * bin_width, count=counts.get(i, 0))
        for i in range(first, last + 1)
    ]
