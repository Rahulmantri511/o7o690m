"""Download the analysis window from Elexon and store it as the bundled offline snapshot.

Usage (from ``backend/``):  uv run python -m scripts.refresh_snapshot
"""

import logging

from app.config import get_settings
from app.services.elexon_client import ElexonClient
from app.services.repository import fetch_window
from app.services.snapshot import write_snapshot


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    settings = get_settings()
    window = fetch_window(settings)
    with ElexonClient(settings.elexon_base_url, settings.elexon_timeout_seconds) as client:
        actual_rows = client.fetch_wind_actuals(
            window.first_settlement_day, window.last_settlement_day
        )
        forecast_rows = client.fetch_wind_forecasts(window.publish_from, window.publish_to)
    # Keep only the fields the app uses so the bundled files stay small.
    actual_rows = [
        {
            k: r[k]
            for k in (
                "publishTime",
                "startTime",
                "settlementDate",
                "settlementPeriod",
                "fuelType",
                "generation",
            )
        }
        for r in actual_rows
    ]
    forecast_rows = [
        {k: r[k] for k in ("publishTime", "startTime", "generation")} for r in forecast_rows
    ]
    write_snapshot(
        settings.snapshot_dir,
        actual_rows,
        forecast_rows,
        extra_manifest={
            "settlement_days": [
                window.first_settlement_day.isoformat(),
                window.last_settlement_day.isoformat(),
            ],
            "publish_window": [window.publish_from.isoformat(), window.publish_to.isoformat()],
        },
    )
    logging.info(
        "Snapshot written: %d actual rows, %d forecast rows -> %s",
        len(actual_rows),
        len(forecast_rows),
        settings.snapshot_dir,
    )


if __name__ == "__main__":
    main()
