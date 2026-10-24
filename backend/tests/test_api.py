"""End-to-end API tests on the synthetic dataset from ``conftest.py`` (actuals flat at 1000 MW)."""

import pytest
from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    assert client.get("/api/health").json() == {"status": "ok", "source": "snapshot"}


def test_meta(client: TestClient) -> None:
    body = client.get("/api/meta").json()
    assert body["delivery_days"] == ["2026-01-02", "2026-01-03"]
    assert body["forecast_runs"] == 3
    assert body["defaults"]["cutoff"] == "11:00"
    assert body["forecast_publish_times_utc"] == ["09:30", "15:30"]


def test_day_view_uses_decision_time_run(client: TestClient) -> None:
    body = client.get("/api/days/2026-01-02").json()
    assert body["decision_deadline"] == "2026-01-01T11:00:00Z"
    assert body["decision_runs"] == ["2026-01-01T09:30:00Z"]
    assert len(body["points"]) == 48
    on_hour, half_past = body["points"][0], body["points"][1]
    assert on_hour["forecast"] == 1500 and on_hour["error"] == 500
    assert half_past["forecast"] is None and half_past["actual"] == 1000
    summary = body["summary"]
    assert summary["errors"]["mae"] == 500
    assert summary["forecast_energy_gwh"] == pytest.approx(36)
    assert summary["actual_energy_gwh"] == pytest.approx(24)
    # Only the 09:30 and 15:30 runs were published before 2 Jan began.
    runs = {r["published_at"]: r for r in body["forecast_runs"]}
    assert runs["2026-01-01T09:30:00Z"]["is_decision_run"] is True
    assert runs["2026-01-01T15:30:00Z"]["is_decision_run"] is False
    assert runs["2026-01-01T15:30:00Z"]["lead_hours"] == 8.5


def test_horizon_mode_switches_run(client: TestClient) -> None:
    body = client.get("/api/days/2026-01-02", params={"mode": "horizon", "horizon": 4}).json()
    assert body["decision_deadline"] is None
    assert body["points"][0]["forecast"] == 1200


def test_accuracy_over_whole_window(client: TestClient) -> None:
    body = client.get("/api/accuracy").json()
    summary = body["summary"]
    assert summary["count"] == 48  # 24 hourly forecasts x 2 days
    assert summary["mae"] == 350  # (500 + 200) / 2
    assert summary["bias"] == 150
    assert summary["over_forecast_share"] == 0.5
    assert [d["bias"] for d in body["daily"]] == [500, -200]
    assert {b["coverage"] for b in body["buffers"]} == {0.5, 0.8, 0.9, 0.95}
    assert body["by_horizon"][0]["horizon_hours"] >= 0
    assert body["worst_periods"][0]["error"] == 500


@pytest.mark.parametrize(
    ("path", "status"),
    [
        ("/api/days/2025-12-01", 404),
        ("/api/days/not-a-date", 422),
        ("/api/accuracy?cutoff=25:00", 422),
        ("/api/accuracy?mode=sideways", 422),
        ("/api/accuracy?mode=horizon&horizon=-1", 422),
    ],
)
def test_invalid_requests(client: TestClient, path: str, status: int) -> None:
    assert client.get(path).status_code == status


def test_responses_are_cacheable(client: TestClient) -> None:
    assert "max-age" in client.get("/api/accuracy").headers["cache-control"]
