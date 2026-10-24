"""Bundled raw-data snapshot: lets the app run offline and survive Elexon outages."""

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

ACTUALS_FILE = "fuelhh_wind.json"
FORECASTS_FILE = "windfor.json"
MANIFEST_FILE = "manifest.json"


@dataclass(frozen=True)
class RawSnapshot:
    actual_rows: list[dict[str, Any]]
    forecast_rows: list[dict[str, Any]]
    fetched_at: datetime


def write_snapshot(
    directory: Path,
    actual_rows: list[dict[str, Any]],
    forecast_rows: list[dict[str, Any]],
    extra_manifest: dict[str, Any] | None = None,
) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / ACTUALS_FILE).write_text(json.dumps(actual_rows, separators=(",", ":")))
    (directory / FORECASTS_FILE).write_text(json.dumps(forecast_rows, separators=(",", ":")))
    manifest = {
        "fetched_at": datetime.now(UTC).isoformat(),
        "actual_rows": len(actual_rows),
        "forecast_rows": len(forecast_rows),
        **(extra_manifest or {}),
    }
    (directory / MANIFEST_FILE).write_text(json.dumps(manifest, indent=2))


def read_snapshot(directory: Path) -> RawSnapshot:
    manifest = json.loads((directory / MANIFEST_FILE).read_text())
    return RawSnapshot(
        actual_rows=json.loads((directory / ACTUALS_FILE).read_text()),
        forecast_rows=json.loads((directory / FORECASTS_FILE).read_text()),
        fetched_at=datetime.fromisoformat(manifest["fetched_at"]),
    )
