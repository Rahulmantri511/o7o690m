"""Convert raw Elexon rows into validated domain objects (malformed rows are skipped, not fatal)."""

import logging
from collections.abc import Iterable
from typing import Any

from app.domain.models import ActualPoint, ForecastPoint, parse_utc

logger = logging.getLogger(__name__)


def parse_actuals(rows: Iterable[dict[str, Any]]) -> list[ActualPoint]:
    """FUELHH WIND rows -> one point per settlement period (the latest publication wins)."""
    latest: dict[str, tuple[str, ActualPoint]] = {}
    skipped = 0
    for row in rows:
        if row.get("fuelType", "WIND") != "WIND":
            continue
        try:
            point = ActualPoint(parse_utc(row["startTime"]), float(row["generation"]))
        except (KeyError, TypeError, ValueError):
            skipped += 1
            continue
        published = str(row.get("publishTime", ""))
        current = latest.get(row["startTime"])
        if current is None or published >= current[0]:
            latest[row["startTime"]] = (published, point)
    if skipped:
        logger.warning("Skipped %d malformed FUELHH rows", skipped)
    return sorted((point for _, point in latest.values()), key=lambda p: p.start_time)


def parse_forecasts(rows: Iterable[dict[str, Any]]) -> list[ForecastPoint]:
    """WINDFOR rows -> forecast points, de-duplicated on (publish time, target time)."""
    unique: dict[tuple[str, str], ForecastPoint] = {}
    skipped = 0
    for row in rows:
        try:
            point = ForecastPoint(
                publish_time=parse_utc(row["publishTime"]),
                start_time=parse_utc(row["startTime"]),
                generation=float(row["generation"]),
            )
        except (KeyError, TypeError, ValueError):
            skipped += 1
            continue
        unique[(row["publishTime"], row["startTime"])] = point
    if skipped:
        logger.warning("Skipped %d malformed WINDFOR rows", skipped)
    return sorted(unique.values(), key=lambda p: (p.publish_time, p.start_time))
