"""Runtime configuration, overridable through ``WINDSCOPE_*`` environment variables."""

from datetime import date, time
from enum import StrEnum
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PACKAGE_DIR = Path(__file__).resolve().parent


class DataMode(StrEnum):
    AUTO = "auto"  # live Elexon data, falling back to the bundled snapshot
    LIVE = "live"  # live Elexon data only; fail loudly if unavailable
    SNAPSHOT = "snapshot"  # bundled snapshot only (offline / deterministic)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WINDSCOPE_", env_file=".env", extra="ignore")

    elexon_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    elexon_timeout_seconds: float = 20.0
    elexon_retries: int = 2

    data_mode: DataMode = DataMode.AUTO
    snapshot_dir: Path = PACKAGE_DIR / "data" / "snapshot"
    cache_ttl_seconds: int = 6 * 60 * 60

    # Delivery days whose day-ahead purchase decision is taken in January 2026
    # (decision on D-1, so delivery runs 2 Jan - 1 Feb inclusive).
    delivery_start: date = date(2026, 1, 2)
    delivery_end: date = date(2026, 2, 1)

    # GB day-ahead auction gate closure: 11:00 UK time on D-1.
    default_cutoff: time = time(11, 0)
    default_horizon_hours: float = 24.0
    max_horizon_hours: int = 48

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
