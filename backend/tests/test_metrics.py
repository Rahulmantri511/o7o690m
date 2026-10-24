import math

import pytest

from app.domain import metrics
from app.domain.metrics import ErrorSample
from app.domain.models import ForecastPoint
from app.domain.selection import ForecastIndex
from tests.conftest import utc

PUBLISHED = utc(2026, 1, 1, 9, 30)


def sample(forecast: float, actual: float, hour: int = 0) -> ErrorSample:
    return ErrorSample(utc(2026, 1, 2, hour), forecast, actual, PUBLISHED)


def test_quantile_matches_linear_interpolation() -> None:
    values = [1.0, 2.0, 3.0, 4.0]
    assert metrics.quantile(values, 0) == 1
    assert metrics.quantile(values, 1) == 4
    assert metrics.quantile(values, 0.5) == 2.5
    assert metrics.quantile(values, 0.9) == pytest.approx(3.7)
    with pytest.raises(ValueError):
        metrics.quantile([], 0.5)


def test_summarize_uses_forecast_minus_actual_sign_convention() -> None:
    summary = metrics.summarize([sample(110, 100), sample(80, 100), sample(130, 100)])
    assert summary is not None
    assert summary.count == 3
    assert summary.mae == pytest.approx(20)
    assert summary.bias == pytest.approx(20 / 3)
    assert summary.rmse == pytest.approx(math.sqrt((100 + 400 + 900) / 3))
    assert summary.max_abs == 30
    assert summary.nmae == pytest.approx(0.2)
    assert summary.over_forecast_share == pytest.approx(2 / 3)


def test_summarize_empty_returns_none() -> None:
    assert metrics.summarize([]) is None


def test_pair_samples_drops_periods_without_actuals() -> None:
    t1, t2 = utc(2026, 1, 2, 0), utc(2026, 1, 2, 1)
    selected = {
        t1: ForecastPoint(PUBLISHED, t1, 500),
        t2: ForecastPoint(PUBLISHED, t2, 600),
    }
    samples = metrics.pair_samples({t1: 450.0}, selected)
    assert [(s.target, s.error) for s in samples] == [(t1, 50)]


def test_buffer_levels_cover_requested_share_of_periods() -> None:
    samples = [sample(100 + e, 100) for e in range(0, 101, 10)]  # errors 0..100
    levels = {b.coverage: b.derate_mw for b in metrics.buffer_levels(samples, (0.5, 0.9))}
    assert levels[0.5] == pytest.approx(50)
    assert levels[0.9] == pytest.approx(90)
    covered = sum(1 for s in samples if s.actual >= s.forecast - levels[0.9]) / len(samples)
    assert covered >= 0.9


def test_histogram_bins_are_aligned_and_contiguous() -> None:
    bins = metrics.histogram([sample(100, 900), sample(1300, 1000), sample(1100, 1000)], 500)
    assert [(b.lower, b.upper, b.count) for b in bins] == [
        (-1000, -500, 1),
        (-500, 0, 0),
        (0, 500, 2),
    ]


def test_by_horizon_ignores_hindcasts_and_buckets_by_whole_hour() -> None:
    target = utc(2026, 1, 2, 12)
    index = ForecastIndex(
        [
            ForecastPoint(utc(2026, 1, 2, 9, 30), target, 1100),  # 2.5 h -> bucket 2
            ForecastPoint(utc(2026, 1, 1, 9, 30), target, 1300),  # 26.5 h -> bucket 26
            ForecastPoint(utc(2026, 1, 2, 15, 30), target, 1000),  # hindcast -> ignored
        ]
    )
    result = metrics.by_horizon(index, {target: 1000.0}, [target], max_hours=48)
    assert sorted(result) == [2, 26]
    assert result[2].bias == 100
    assert result[26].bias == 300


def test_by_local_hour_and_day_grouping() -> None:
    samples = [sample(110, 100, hour=0), sample(130, 100, hour=0), sample(100, 100, hour=5)]
    by_hour = metrics.by_local_hour(samples)
    assert by_hour[0].mae == 20
    assert by_hour[5].mae == 0
    assert len(metrics.by_delivery_day(samples)) == 1
