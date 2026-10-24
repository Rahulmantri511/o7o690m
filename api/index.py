"""Vercel serverless entry point: exposes the FastAPI app from ``backend/``.

All ``/api/*`` requests are rewritten here (see ``vercel.json``); FastAPI routes them by path.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app  # noqa: E402

__all__ = ["app"]
