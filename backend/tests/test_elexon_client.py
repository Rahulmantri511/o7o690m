from datetime import date

import httpx
import pytest

from app.services.elexon_client import ElexonClient, ElexonError
from tests.conftest import utc


def make_client(handler) -> ElexonClient:
    return ElexonClient(
        "https://example.test/api", retries=1, transport=httpx.MockTransport(handler)
    )


def test_actuals_request_uses_settlement_dates_and_wind_filter() -> None:
    seen: list[httpx.URL] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.url)
        return httpx.Response(200, json=[{"fuelType": "WIND"}, {"fuelType": "CCGT"}])

    rows = make_client(handler).fetch_wind_actuals(date(2026, 1, 2), date(2026, 2, 1))
    assert rows == [{"fuelType": "WIND"}]
    assert seen[0].path == "/api/datasets/FUELHH/stream"
    assert seen[0].params["settlementDateFrom"] == "2026-01-02"
    assert seen[0].params["fuelType"] == "WIND"


def test_forecasts_are_fetched_in_non_overlapping_publish_chunks() -> None:
    windows: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        windows.append(
            (request.url.params["publishDateTimeFrom"], request.url.params["publishDateTimeTo"])
        )
        return httpx.Response(200, json=[{"n": len(windows)}])

    rows = make_client(handler).fetch_wind_forecasts(utc(2026, 1, 1), utc(2026, 1, 15))
    assert windows == [
        ("2026-01-01T00:00:00Z", "2026-01-07T23:59:59Z"),
        ("2026-01-08T00:00:00Z", "2026-01-14T23:59:59Z"),
        ("2026-01-15T00:00:00Z", "2026-01-15T00:00:00Z"),
    ]
    assert len(rows) == 3


def test_server_errors_are_retried_then_raised() -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(503)

    with pytest.raises(ElexonError):
        make_client(handler).fetch_wind_actuals(date(2026, 1, 2), date(2026, 1, 2))
    assert calls == 2


def test_wrapped_data_payload_is_unwrapped() -> None:
    client = make_client(lambda r: httpx.Response(200, json={"data": [{"fuelType": "WIND"}]}))
    assert client.fetch_wind_actuals(date(2026, 1, 2), date(2026, 1, 2)) == [{"fuelType": "WIND"}]
