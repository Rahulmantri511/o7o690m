"""FastAPI dependencies: shared repository, analytics service and query-param parsing."""

from datetime import time
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, Query, status

from app.config import Settings, get_settings
from app.domain.selection import ForecastSelection, SelectionMode
from app.services.analytics import AnalyticsService
from app.services.elexon_client import ElexonError
from app.services.repository import WindDataRepository


@lru_cache
def get_repository() -> WindDataRepository:
    return WindDataRepository(get_settings())


def get_analytics(
    repository: Annotated[WindDataRepository, Depends(get_repository)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AnalyticsService:
    try:
        dataset = repository.get()
    except (ElexonError, OSError) as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, f"Wind data unavailable: {exc}"
        ) from exc
    return AnalyticsService(dataset, settings)


def get_selection(
    settings: Annotated[Settings, Depends(get_settings)],
    mode: Annotated[SelectionMode, Query(description="cutoff (D-1 decision time) or horizon")] = (
        SelectionMode.CUTOFF
    ),
    cutoff: Annotated[
        str | None,
        Query(pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="UK local decision time on D-1"),
    ] = None,
    horizon: Annotated[float | None, Query(ge=0, le=72, description="Minimum lead time, hours")] = (
        None
    ),
) -> ForecastSelection:
    return ForecastSelection(
        mode=mode,
        cutoff=time.fromisoformat(cutoff) if cutoff else settings.default_cutoff,
        horizon_hours=horizon if horizon is not None else settings.default_horizon_hours,
    )


Analytics = Annotated[AnalyticsService, Depends(get_analytics)]
Selection = Annotated[ForecastSelection, Depends(get_selection)]
