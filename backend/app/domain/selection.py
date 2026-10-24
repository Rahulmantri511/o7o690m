"""Which forecast was available when the purchase decision had to be made?

Two selection rules are supported:

* ``CUTOFF`` (default) - the latest forecast published at or before a fixed decision time on the
  day before delivery (e.g. 11:00 UK time on D-1, the GB day-ahead auction gate closure).
  This mirrors how the trading desk actually works.
* ``HORIZON`` - the latest forecast published at least ``horizon_hours`` before each target time.
  This isolates accuracy as a function of lead time.

Both rules only ever pick forecasts published *before* the target time, so hindcast values
(WINDFOR runs also carry ~26 h of already-elapsed hours) can never leak into the analysis.
"""

from bisect import bisect_right
from collections import defaultdict
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from enum import StrEnum

from app.domain.models import LONDON, ForecastPoint, local_date


class SelectionMode(StrEnum):
    CUTOFF = "cutoff"
    HORIZON = "horizon"


@dataclass(frozen=True, slots=True)
class ForecastSelection:
    mode: SelectionMode = SelectionMode.CUTOFF
    cutoff: time = time(11, 0)
    days_ahead: int = 1
    horizon_hours: float = 24.0

    def __post_init__(self) -> None:
        if self.horizon_hours < 0:
            raise ValueError("horizon_hours must be >= 0")
        if self.days_ahead < 1:
            raise ValueError("days_ahead must be >= 1")

    def publish_deadline(self, target: datetime) -> datetime:
        """Latest publish time a forecast may have to be usable for ``target``."""
        if self.mode is SelectionMode.CUTOFF:
            decision_day = local_date(target) - timedelta(days=self.days_ahead)
            return datetime.combine(decision_day, self.cutoff, tzinfo=LONDON).astimezone(
                target.tzinfo
            )
        return target - timedelta(hours=self.horizon_hours)

    def describe(self) -> str:
        if self.mode is SelectionMode.CUTOFF:
            day = "D-1" if self.days_ahead == 1 else f"D-{self.days_ahead}"
            return f"Latest forecast published by {self.cutoff:%H:%M} UK time on {day}"
        return f"Latest forecast published at least {self.horizon_hours:g} h before each period"


class ForecastIndex:
    """Forecast points grouped by target time and ordered by publish time.

    Supports O(log n) "latest forecast published by T" lookups per target.
    """

    def __init__(self, forecasts: Iterable[ForecastPoint]) -> None:
        grouped: dict[datetime, list[ForecastPoint]] = defaultdict(list)
        for point in forecasts:
            grouped[point.start_time].append(point)
        self._by_target: dict[datetime, list[ForecastPoint]] = {}
        self._publish_times: dict[datetime, list[datetime]] = {}
        for target, points in grouped.items():
            points.sort(key=lambda p: p.publish_time)
            self._by_target[target] = points
            self._publish_times[target] = [p.publish_time for p in points]

    def __len__(self) -> int:
        return sum(len(points) for points in self._by_target.values())

    @property
    def targets(self) -> list[datetime]:
        return sorted(self._by_target)

    def all_points(self) -> Iterable[ForecastPoint]:
        for points in self._by_target.values():
            yield from points

    def for_target(self, target: datetime) -> list[ForecastPoint]:
        return list(self._by_target.get(target, ()))

    def latest_by(self, target: datetime, deadline: datetime) -> ForecastPoint | None:
        """Most recent forecast for ``target`` published at or before ``deadline``."""
        publish_times = self._publish_times.get(target)
        if not publish_times:
            return None
        position = bisect_right(publish_times, deadline)
        if position == 0:
            return None
        return self._by_target[target][position - 1]


def select_forecasts(
    index: ForecastIndex, targets: Iterable[datetime], selection: ForecastSelection
) -> dict[datetime, ForecastPoint]:
    """Pick the decision-time forecast for each target (targets without one are omitted)."""
    chosen: dict[datetime, ForecastPoint] = {}
    for target in targets:
        deadline = min(selection.publish_deadline(target), target)
        point = index.latest_by(target, deadline)
        if point is not None:
            chosen[target] = point
    return chosen


def forecast_runs_for_window(
    index: ForecastIndex, start: datetime, end: datetime
) -> Mapping[datetime, list[ForecastPoint]]:
    """All forecast runs (keyed by publish time) that cover ``[start, end)`` before it ends.

    Only values published before their own target time are kept (true forecasts, no hindcasts).
    """
    runs: dict[datetime, list[ForecastPoint]] = defaultdict(list)
    for target in index.targets:
        if not start <= target < end:
            continue
        for point in index.for_target(target):
            if point.publish_time <= target:
                runs[point.publish_time].append(point)
    return {publish: sorted(points, key=lambda p: p.start_time) for publish, points in runs.items()}
