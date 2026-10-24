"""Loads the wind dataset once and keeps it in memory (thread-safe, TTL-based refresh).

Source priority depends on ``Settings.data_mode``:
``auto`` -> live Elexon, falling back to the bundled snapshot; ``live`` -> Elexon only;
``snapshot`` -> bundled snapshot only.
"""

import logging
import threading
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from enum import StrEnum

from app.config import DataMode, Settings
from app.domain.models import local_day_bounds
from app.domain.selection import ForecastIndex
from app.services.elexon_client import ElexonClient, ElexonError
from app.services.parsing import parse_actuals, parse_forecasts
from app.services.snapshot import read_snapshot

logger = logging.getLogger(__name__)

# WINDFOR runs reach ~66 h ahead; fetching runs from 3 days before the first delivery day covers
# every lead time used by the horizon analysis (<= 48 h) plus the D-1 decision cut-off.
FORECAST_LOOKBACK = timedelta(days=3)


class DataSource(StrEnum):
    LIVE = "live"
    SNAPSHOT = "snapshot"


@dataclass(frozen=True)
class WindDataset:
    actuals: dict[datetime, float]
    forecasts: ForecastIndex
    source: DataSource
    fetched_at: datetime
    delivery_days: list[date]


@dataclass(frozen=True)
class FetchWindow:
    first_settlement_day: date
    last_settlement_day: date
    publish_from: datetime
    publish_to: datetime


def fetch_window(settings: Settings) -> FetchWindow:
    window_start, _ = local_day_bounds(settings.delivery_start)
    _, window_end = local_day_bounds(settings.delivery_end)
    return FetchWindow(
        first_settlement_day=settings.delivery_start,
        last_settlement_day=settings.delivery_end,
        publish_from=window_start - FORECAST_LOOKBACK,
        publish_to=window_end,
    )


def delivery_days(settings: Settings) -> list[date]:
    span = (settings.delivery_end - settings.delivery_start).days
    return [settings.delivery_start + timedelta(days=i) for i in range(span + 1)]


class WindDataRepository:
    def __init__(
        self,
        settings: Settings,
        client_factory: Callable[[], ElexonClient] | None = None,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._settings = settings
        self._client_factory = client_factory or (
            lambda: ElexonClient(
                settings.elexon_base_url,
                settings.elexon_timeout_seconds,
                settings.elexon_retries,
            )
        )
        self._clock = clock
        self._lock = threading.Lock()
        self._dataset: WindDataset | None = None
        self._loaded_at: datetime | None = None

    def get(self) -> WindDataset:
        with self._lock:
            if self._dataset is None or self._is_stale():
                self._dataset = self._load()
                self._loaded_at = self._clock()
            return self._dataset

    def refresh(self) -> WindDataset:
        with self._lock:
            self._dataset = self._load()
            self._loaded_at = self._clock()
            return self._dataset

    def _is_stale(self) -> bool:
        if self._loaded_at is None or self._dataset is None:
            return True
        if (
            self._dataset.source is DataSource.SNAPSHOT
            and self._settings.data_mode is DataMode.SNAPSHOT
        ):
            return False
        age = (self._clock() - self._loaded_at).total_seconds()
        return age > self._settings.cache_ttl_seconds

    def _load(self) -> WindDataset:
        mode = self._settings.data_mode
        if mode is DataMode.SNAPSHOT:
            return self._load_snapshot()
        try:
            return self._load_live()
        except ElexonError:
            if mode is DataMode.LIVE:
                raise
            logger.exception("Live Elexon load failed; falling back to bundled snapshot")
            return self._load_snapshot()

    def _load_live(self) -> WindDataset:
        window = fetch_window(self._settings)
        with self._client_factory() as client:
            actual_rows = client.fetch_wind_actuals(
                window.first_settlement_day, window.last_settlement_day
            )
            forecast_rows = client.fetch_wind_forecasts(window.publish_from, window.publish_to)
        if not actual_rows or not forecast_rows:
            raise ElexonError("Elexon returned no wind data for the analysis window")
        return self._build(actual_rows, forecast_rows, DataSource.LIVE, self._clock())

    def _load_snapshot(self) -> WindDataset:
        snapshot = read_snapshot(self._settings.snapshot_dir)
        return self._build(
            snapshot.actual_rows, snapshot.forecast_rows, DataSource.SNAPSHOT, snapshot.fetched_at
        )

    def _build(
        self,
        actual_rows: list[dict[str, object]],
        forecast_rows: list[dict[str, object]],
        source: DataSource,
        fetched_at: datetime,
    ) -> WindDataset:
        actuals = {p.start_time: p.generation for p in parse_actuals(actual_rows)}
        forecasts = ForecastIndex(parse_forecasts(forecast_rows))
        logger.info(
            "Loaded %d actual periods and %d forecast points from %s",
            len(actuals),
            len(forecasts),
            source,
        )
        return WindDataset(actuals, forecasts, source, fetched_at, delivery_days(self._settings))
