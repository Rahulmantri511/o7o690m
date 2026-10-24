"""Shared fixtures: a small, fully synthetic two-day dataset with hand-checkable numbers."""

from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_repository
from app.config import DataMode, Settings, get_settings
from app.main import create_app
from app.services.repository import WindDataRepository
from app.services.snapshot import write_snapshot

DAY_1 = date(2026, 1, 2)
DAY_2 = date(2026, 1, 3)


def utc(*args: int) -> datetime:
    return datetime(*args, tzinfo=UTC)


def iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def make_actual_rows(first: date, days: int, generation: float = 1000.0) -> list[dict[str, Any]]:
    start = datetime(first.year, first.month, first.day, tzinfo=UTC)
    rows = []
    for i in range(days * 48):
        t = start + timedelta(minutes=30 * i)
        rows.append(
            {
                "publishTime": iso(t + timedelta(minutes=30)),
                "startTime": iso(t),
                "settlementDate": t.date().isoformat(),
                "settlementPeriod": i % 48 + 1,
                "fuelType": "WIND",
                "generation": generation,
            }
        )
    return rows


def make_forecast_run(
    published: datetime, first_target: datetime, hours: int, generation: float
) -> list[dict[str, Any]]:
    return [
        {
            "publishTime": iso(published),
            "startTime": iso(first_target + timedelta(hours=h)),
            "generation": generation,
        }
        for h in range(hours)
    ]


@pytest.fixture
def snapshot_rows() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Actuals flat at 1000 MW. Three forecast runs covering both delivery days:

    * 2026-01-01 09:30 -> 1500 MW (the D-1 11:00 decision run for 2 Jan)
    * 2026-01-01 15:30 -> 1200 MW (after the 2 Jan cut-off; decision run for... none)
    * 2026-01-02 09:30 -> 800 MW  (the decision run for 3 Jan)
    """
    actuals = make_actual_rows(DAY_1, 2)
    first_target = utc(2026, 1, 2, 0)
    forecasts = (
        make_forecast_run(utc(2026, 1, 1, 9, 30), first_target, 48, 1500)
        + make_forecast_run(utc(2026, 1, 1, 15, 30), first_target, 48, 1200)
        + make_forecast_run(utc(2026, 1, 2, 9, 30), first_target, 48, 800)
    )
    return actuals, forecasts


@pytest.fixture
def settings(tmp_path: Path, snapshot_rows: tuple[list[Any], list[Any]]) -> Settings:
    write_snapshot(tmp_path, *snapshot_rows)
    return Settings(
        data_mode=DataMode.SNAPSHOT,
        snapshot_dir=tmp_path,
        delivery_start=DAY_1,
        delivery_end=DAY_2,
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    app = create_app()
    repository = WindDataRepository(settings)
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_repository] = lambda: repository
    with TestClient(app) as test_client:
        yield test_client
