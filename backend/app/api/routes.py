from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status

from app.api.dependencies import Analytics, Selection, get_repository
from app.schemas import AccuracyOut, DayOut, HealthOut, MetaOut
from app.services.analytics import DayNotAvailableError
from app.services.repository import WindDataRepository

router = APIRouter(prefix="/api")

# Data for a closed historic month changes rarely: let browsers and the CDN cache responses.
CACHE_HEADER = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"


@router.get("/health", response_model=HealthOut, tags=["system"])
def health(repository: Annotated[WindDataRepository, Depends(get_repository)]) -> HealthOut:
    try:
        return HealthOut(status="ok", source=repository.get().source)
    except Exception:
        return HealthOut(status="degraded", source=None)


@router.get("/meta", response_model=MetaOut, tags=["wind"])
def meta(analytics: Analytics, response: Response) -> MetaOut:
    response.headers["Cache-Control"] = CACHE_HEADER
    return analytics.meta()


@router.get("/days/{day}", response_model=DayOut, tags=["wind"])
def day_view(
    day: Annotated[date, Path(description="Delivery day (UK local), YYYY-MM-DD")],
    analytics: Analytics,
    selection: Selection,
    response: Response,
) -> DayOut:
    try:
        result = analytics.day(day, selection)
    except DayNotAvailableError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    response.headers["Cache-Control"] = CACHE_HEADER
    return result


@router.get("/accuracy", response_model=AccuracyOut, tags=["wind"])
def accuracy(analytics: Analytics, selection: Selection, response: Response) -> AccuracyOut:
    response.headers["Cache-Control"] = CACHE_HEADER
    return analytics.accuracy(selection)
