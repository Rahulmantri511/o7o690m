from datetime import time

import pytest

from app.domain.models import ForecastPoint
from app.domain.selection import (
    ForecastIndex,
    ForecastSelection,
    SelectionMode,
    forecast_runs_for_window,
    select_forecasts,
)
from tests.conftest import utc

TARGET = utc(2026, 1, 15, 12)


def point(published, target=TARGET, mw=100.0):
    return ForecastPoint(publish_time=published, start_time=target, generation=mw)


@pytest.fixture
def index() -> ForecastIndex:
    return ForecastIndex(
        [
            point(utc(2026, 1, 14, 4, 30), mw=1),
            point(utc(2026, 1, 14, 9, 30), mw=2),  # last run before 11:00 on D-1
            point(utc(2026, 1, 14, 11, 30), mw=3),  # just after the cut-off
            point(utc(2026, 1, 15, 7, 30), mw=4),  # intraday, 4.5 h ahead
            point(utc(2026, 1, 15, 15, 30), mw=5),  # published after the target: a hindcast
        ]
    )


def test_cutoff_mode_picks_latest_run_before_d_minus_1_cutoff(index: ForecastIndex) -> None:
    chosen = select_forecasts(index, [TARGET], ForecastSelection())
    assert chosen[TARGET].generation == 2


def test_cutoff_time_is_configurable(index: ForecastIndex) -> None:
    selection = ForecastSelection(cutoff=time(12, 0))
    assert select_forecasts(index, [TARGET], selection)[TARGET].generation == 3


def test_horizon_mode_respects_minimum_lead_time(index: ForecastIndex) -> None:
    four_hours = ForecastSelection(mode=SelectionMode.HORIZON, horizon_hours=4)
    assert select_forecasts(index, [TARGET], four_hours)[TARGET].generation == 4
    # 24 h before 12:00 on the 15th is 12:00 on the 14th, so the 11:30 run qualifies.
    day_ahead = ForecastSelection(mode=SelectionMode.HORIZON, horizon_hours=24)
    assert select_forecasts(index, [TARGET], day_ahead)[TARGET].generation == 3
    longer = ForecastSelection(mode=SelectionMode.HORIZON, horizon_hours=26)
    assert select_forecasts(index, [TARGET], longer)[TARGET].generation == 2


def test_hindcasts_are_never_selected(index: ForecastIndex) -> None:
    zero_lead = ForecastSelection(mode=SelectionMode.HORIZON, horizon_hours=0)
    assert select_forecasts(index, [TARGET], zero_lead)[TARGET].generation == 4


def test_targets_without_eligible_forecast_are_omitted(index: ForecastIndex) -> None:
    far = ForecastSelection(mode=SelectionMode.HORIZON, horizon_hours=72)
    assert select_forecasts(index, [TARGET], far) == {}
    assert select_forecasts(index, [utc(2026, 1, 20)], ForecastSelection()) == {}


def test_cutoff_uses_uk_local_delivery_day_during_bst() -> None:
    # 23:30 UTC on 1 July is 00:30 BST on 2 July, so D-1 is 1 July and the cut-off is 10:00 UTC.
    target = utc(2026, 7, 1, 23, 30)
    assert ForecastSelection().publish_deadline(target) == utc(2026, 7, 1, 10, 0)


def test_invalid_selection_rejected() -> None:
    with pytest.raises(ValueError):
        ForecastSelection(horizon_hours=-1)
    with pytest.raises(ValueError):
        ForecastSelection(days_ahead=0)


def test_forecast_runs_for_window_drops_hindcasts(index: ForecastIndex) -> None:
    runs = forecast_runs_for_window(index, utc(2026, 1, 15), utc(2026, 1, 16))
    assert utc(2026, 1, 15, 15, 30) not in runs
    assert len(runs) == 4
