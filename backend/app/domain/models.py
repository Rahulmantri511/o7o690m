"""Core value types for actual and forecast wind generation."""

from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

LONDON = ZoneInfo("Europe/London")
HALF_HOUR = timedelta(minutes=30)


@dataclass(frozen=True, slots=True)
class ActualPoint:
    """Metered national wind output (FUELHH), average MW over a 30-minute settlement period."""

    start_time: datetime
    generation: float


@dataclass(frozen=True, slots=True)
class ForecastPoint:
    """One hourly value from one published wind forecast run (WINDFOR)."""

    publish_time: datetime
    start_time: datetime
    generation: float

    @property
    def horizon_hours(self) -> float:
        """Lead time between publication and the target time (negative = hindcast)."""
        return (self.start_time - self.publish_time).total_seconds() / 3600


def parse_utc(value: str) -> datetime:
    """Parse an Elexon ISO-8601 timestamp (``2026-01-01T00:00:00Z``) as an aware UTC datetime."""
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def local_day_bounds(day: date) -> tuple[datetime, datetime]:
    """UTC start (inclusive) and end (exclusive) of a UK local calendar day.

    GB settlement days follow UK local time, so a day is 46 or 50 half-hours on clock-change days.
    """
    start = datetime.combine(day, time(0), tzinfo=LONDON).astimezone(UTC)
    end = datetime.combine(day + timedelta(days=1), time(0), tzinfo=LONDON).astimezone(UTC)
    return start, end


def local_date(moment: datetime) -> date:
    return moment.astimezone(LONDON).date()


def half_hours(start: datetime, end: datetime) -> list[datetime]:
    """All settlement-period start times in ``[start, end)``."""
    slots: list[datetime] = []
    cursor = start
    while cursor < end:
        slots.append(cursor)
        cursor += HALF_HOUR
    return slots
