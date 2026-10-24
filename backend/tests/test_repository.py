from datetime import timedelta

import pytest

from app.config import DataMode, Settings
from app.services.elexon_client import ElexonError
from app.services.repository import DataSource, WindDataRepository
from tests.conftest import utc


class FailingClient:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return None

    def fetch_wind_actuals(self, *args):
        raise ElexonError("down")

    fetch_wind_forecasts = fetch_wind_actuals


class StubClient(FailingClient):
    calls = 0

    def __init__(self, rows):
        self._actuals, self._forecasts = rows

    def fetch_wind_actuals(self, *args):
        StubClient.calls += 1
        return self._actuals

    def fetch_wind_forecasts(self, *args):
        return self._forecasts


def test_auto_mode_falls_back_to_snapshot(settings: Settings) -> None:
    auto = settings.model_copy(update={"data_mode": DataMode.AUTO})
    dataset = WindDataRepository(auto, client_factory=FailingClient).get()
    assert dataset.source is DataSource.SNAPSHOT
    assert len(dataset.actuals) == 96


def test_live_mode_surfaces_errors(settings: Settings) -> None:
    live = settings.model_copy(update={"data_mode": DataMode.LIVE})
    with pytest.raises(ElexonError):
        WindDataRepository(live, client_factory=FailingClient).get()


def test_live_data_is_cached_until_ttl_expires(settings: Settings, snapshot_rows) -> None:
    StubClient.calls = 0
    now = [utc(2026, 2, 1)]
    live = settings.model_copy(update={"data_mode": DataMode.LIVE, "cache_ttl_seconds": 60})
    repo = WindDataRepository(
        live, client_factory=lambda: StubClient(snapshot_rows), clock=lambda: now[0]
    )
    assert repo.get().source is DataSource.LIVE
    repo.get()
    assert StubClient.calls == 1
    now[0] += timedelta(seconds=61)
    repo.get()
    assert StubClient.calls == 2


def test_delivery_days_cover_configured_window(settings: Settings) -> None:
    dataset = WindDataRepository(settings).get()
    assert [d.isoformat() for d in dataset.delivery_days] == ["2026-01-02", "2026-01-03"]
