"""Thin HTTP client for the Elexon Insights (BMRS) API.

Endpoints used:

* ``/datasets/FUELHH/stream`` - half-hourly outturn by fuel type, filtered by settlement date.
* ``/datasets/WINDFOR/stream`` - wind forecasts. Only *publish time* filters are honoured
  (``startTime`` parameters are silently ignored and return the latest run), so forecasts are
  fetched by publish window, in chunks.

The client returns raw JSON rows so they can be cached verbatim as a snapshot.
"""

import logging
import time
from collections.abc import Mapping
from datetime import date, datetime, timedelta
from typing import Any

import httpx

logger = logging.getLogger(__name__)

Row = dict[str, Any]


class ElexonError(RuntimeError):
    """Raised when the Elexon API cannot be reached or returns an unusable response."""


class ElexonClient:
    def __init__(
        self,
        base_url: str,
        timeout_seconds: float = 20.0,
        retries: int = 2,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._retries = retries
        self._http = httpx.Client(
            base_url=base_url.rstrip("/"),
            timeout=timeout_seconds,
            transport=transport,
            headers={"Accept": "application/json", "User-Agent": "WindScope/1.0"},
        )

    def __enter__(self) -> "ElexonClient":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def close(self) -> None:
        self._http.close()

    def fetch_wind_actuals(self, first_day: date, last_day: date) -> list[Row]:
        """FUELHH rows for fuel type WIND for settlement dates ``first_day..last_day`` inclusive."""
        rows = self._get_rows(
            "/datasets/FUELHH/stream",
            {
                "settlementDateFrom": first_day.isoformat(),
                "settlementDateTo": last_day.isoformat(),
                "fuelType": "WIND",
            },
        )
        return [row for row in rows if row.get("fuelType") == "WIND"]

    def fetch_wind_forecasts(
        self,
        publish_from: datetime,
        publish_to: datetime,
        chunk: timedelta = timedelta(days=7),
    ) -> list[Row]:
        """WINDFOR rows for every run published in ``[publish_from, publish_to]``."""
        rows: list[Row] = []
        cursor = publish_from
        while cursor <= publish_to:
            chunk_end = min(cursor + chunk - timedelta(seconds=1), publish_to)
            rows.extend(
                self._get_rows(
                    "/datasets/WINDFOR/stream",
                    {
                        "publishDateTimeFrom": _iso(cursor),
                        "publishDateTimeTo": _iso(chunk_end),
                    },
                )
            )
            cursor = chunk_end + timedelta(seconds=1)
        return rows

    def _get_rows(self, path: str, params: Mapping[str, str]) -> list[Row]:
        last_error: Exception | None = None
        for attempt in range(self._retries + 1):
            try:
                response = self._http.get(path, params=params)
                if response.status_code >= 500:
                    raise ElexonError(f"{path} returned HTTP {response.status_code}")
                response.raise_for_status()
                payload = response.json()
                if isinstance(payload, dict):  # non-stream endpoints wrap rows in {"data": [...]}
                    payload = payload.get("data", [])
                if not isinstance(payload, list):
                    raise ElexonError(f"{path} returned an unexpected payload shape")
                return payload
            except (httpx.TransportError, httpx.HTTPStatusError, ElexonError, ValueError) as exc:
                last_error = exc
                logger.warning("Elexon %s failed (attempt %d): %s", path, attempt + 1, exc)
                if attempt < self._retries:
                    time.sleep(0.5 * 2**attempt)
        raise ElexonError(f"Elexon request to {path} failed: {last_error}") from last_error


def _iso(moment: datetime) -> str:
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")
