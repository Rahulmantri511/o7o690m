from app.services.parsing import parse_actuals, parse_forecasts
from tests.conftest import utc


def test_parse_actuals_filters_non_wind_and_keeps_latest_publication() -> None:
    rows = [
        {
            "startTime": "2026-01-02T00:00:00Z",
            "publishTime": "2026-01-02T00:30:00Z",
            "fuelType": "WIND",
            "generation": 100,
        },
        {
            "startTime": "2026-01-02T00:00:00Z",
            "publishTime": "2026-01-02T01:00:00Z",
            "fuelType": "WIND",
            "generation": 120,
        },
        {
            "startTime": "2026-01-02T00:00:00Z",
            "publishTime": "2026-01-02T00:30:00Z",
            "fuelType": "CCGT",
            "generation": 9999,
        },
        {"startTime": "garbage", "fuelType": "WIND", "generation": 1},
        {"startTime": "2026-01-02T00:30:00Z", "fuelType": "WIND"},
    ]
    points = parse_actuals(rows)
    assert [(p.start_time, p.generation) for p in points] == [(utc(2026, 1, 2), 120.0)]


def test_parse_forecasts_deduplicates_and_sorts() -> None:
    rows = [
        {
            "publishTime": "2026-01-01T09:30:00Z",
            "startTime": "2026-01-02T01:00:00Z",
            "generation": 2,
        },
        {
            "publishTime": "2026-01-01T09:30:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "generation": 1,
        },
        {
            "publishTime": "2026-01-01T09:30:00Z",
            "startTime": "2026-01-02T00:00:00Z",
            "generation": 1,
        },
        {
            "publishTime": "2026-01-01T09:30:00Z",
            "startTime": "2026-01-02T02:00:00Z",
            "generation": None,
        },
    ]
    points = parse_forecasts(rows)
    assert [p.generation for p in points] == [1.0, 2.0]
    assert points[0].horizon_hours == 14.5
