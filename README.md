# WindScope

**Day-ahead wind forecast monitoring for a GB utility's power purchasing desk.**

WindScope answers the two questions the desk has to settle before the day-ahead auction:

1. **What did the latest wind forecast say when we had to decide?** For each delivery day it shows the forecast run that was available at the decision cut-off (by default 11:00 UK time on D-1, the GB day-ahead auction gate closure), plotted against what the wind actually did.
2. **How far can we trust it?** Forecast error over every delivery day whose purchase decision fell in January 2026, broken down by lead time and hour of day, and turned into a concrete purchasing rule ("plan wind = forecast − X GW to cover 90% of hours").

> **Live app (Vercel):** https://o7o690m.vercel.app · **Code:** https://github.com/Rahulmantri511/o7o690m · **Video:** _to be added_

---

## Key findings (January 2026, 11:00 D-1 cut-off)

| Metric | Value |
|---|---|
| Mean absolute error | **2.00 GW** (18% of mean wind output) |
| Bias (forecast − actual) | **+1.73 GW**: the forecast was too high in **84%** of hours |
| RMSE / P90 absolute error | 2.50 GW / 4.18 GW |
| Buffer to cover 90% of hours | forecast − **4.18 GW** |
| Worst event | 12 Jan overnight: forecast ~20.9 GW, actual ~14.0 GW |

Error grows with lead time, from about 1.7 GW at 0–6 h to about 2.4 GW at 48 h, but most of the error is **systematic over-forecasting** rather than random noise. That matters for purchasing: buying against the raw forecast leaves the desk short most of the time. Curtailment of wind farms (lowering metered output) is the likely cause. That is a hypothesis to confirm with balancing-mechanism data, which is outside this project's scope.

---

## Features

- **Decision desk.** Pick a delivery day from a strip that doubles as a heat-map of daily error. See actual output (half-hourly), the decision-time forecast (hourly), and an empirical 80% likely-range band. Optionally overlay every later forecast revision. Day KPIs cover planned vs delivered energy, MAE, bias, largest shortfall and P90 "firm wind". An hour-by-hour table gives an accessible alternative to the chart.
- **Forecast accuracy.** Hero MAE with KPI tiles, an auto-generated key finding, and daily bias (click a bar to open that day). Also: the buffer table (purchasing rule), error vs lead time with the decision lead-time band shaded, error by hour of day, the error distribution, and the five worst hours.
- **Forecast rule control.** Switch globally between a *day-ahead cut-off* (any time 06:00–20:00 on D-1) and a *fixed lead time* (0–48 h). The rule lives in the URL, so every view can be shared.
- **Methodology page.** Data sources, the selection rule, matching, metric definitions and caveats.
- **Light and dark themes**, a responsive layout, keyboard support, and colour-blind-checked series colours.
- **Resilient data.** Live Elexon data cached in memory, with a bundled snapshot fallback so the app works even if Elexon is down.

## Architecture

```
                 ┌──────────────────────── Browser (React SPA) ────────────────────────┐
                 │ Decision desk · Accuracy · Methodology                              │
                 │ TanStack Query (cache) ── selection rule in URL ── Recharts         │
                 └───────────────────────────────┬─────────────────────────────────────┘
                                                 │ GET /api/meta · /api/days/{day} · /api/accuracy
┌────────────────────────────────────────────────▼──────────────────────────────────────────┐
│ FastAPI (backend/app)                                                                      │
│  api/        thin routers + query validation (pydantic)                                    │
│  services/   AnalyticsService ← WindDataRepository (TTL cache, live → snapshot fallback)  │
│              ElexonClient (httpx, retries, chunked WINDFOR fetch) · parsing · snapshot    │
│  domain/     PURE logic: forecast selection (cut-off / horizon), error metrics             │
└────────────────────────────────────────────────┬──────────────────────────────────────────┘
                                                 │ HTTPS
                       Elexon Insights API: FUELHH/stream (WIND) · WINDFOR/stream
```

**Design decisions**

- **Pure domain core.** `domain/selection.py` and `domain/metrics.py` have no I/O and no framework imports. Every rule that matters (no look-ahead, D-1 cut-off in UK local time, quantile buffers) is unit-tested directly.
- **Forecast selection with no look-ahead.** WINDFOR runs also contain ~26 h of already-elapsed hours (hindcasts). Selection only ever takes values published *before* their target time, using an O(log n) "latest by deadline" index per target.
- **Fetching WINDFOR correctly.** The `/WINDFOR/stream` endpoint ignores `startTime` filters and only honours publish-time filters, so the client pulls runs by publish window, in 7-day chunks, from 3 days before the first delivery day. That covers every lead time up to 48 h.
- **Matching.** Hourly forecasts are paired with the settlement period starting at the same time. Days are UK local calendar days (`Europe/London`), so clock changes are handled correctly.
- **Sign convention.** `error = forecast − actual`, so a positive error is a shortfall: the costly direction for this desk.
- **Caching.** In-memory dataset with a TTL on the server, `Cache-Control` headers for the CDN, and TanStack Query on the client with `keepPreviousData` for smooth rule changes.

## Repository layout

```
.
├── backend/                      Python 3.12 · FastAPI
│   ├── app/
│   │   ├── main.py               App factory: CORS, gzip, OpenAPI at /api/docs
│   │   ├── config.py             Settings (WINDSCOPE_* env vars): data mode, window, cut-off
│   │   ├── schemas.py            Pydantic response contracts (mirrored in frontend/src/api/types.ts)
│   │   ├── api/
│   │   │   ├── routes.py         /api/health, /api/meta, /api/days/{day}, /api/accuracy
│   │   │   └── dependencies.py   Repository/service wiring, query-param → ForecastSelection
│   │   ├── domain/               Pure, framework-free logic
│   │   │   ├── models.py         ActualPoint, ForecastPoint, UK-day helpers
│   │   │   ├── selection.py      Cut-off / horizon selection rules, ForecastIndex
│   │   │   └── metrics.py        MAE, bias, RMSE, quantiles, buffers, groupings, histogram
│   │   ├── services/
│   │   │   ├── elexon_client.py  HTTP client for FUELHH & WINDFOR (retries, chunking)
│   │   │   ├── parsing.py        Raw rows → validated domain objects (dedupe, skip bad rows)
│   │   │   ├── repository.py     Cached dataset loader (live → snapshot fallback)
│   │   │   ├── snapshot.py       Read/write the bundled raw-data snapshot
│   │   │   └── analytics.py      Builds the day and accuracy views from domain functions
│   │   └── data/snapshot/        Bundled Elexon data for the analysis window (offline fallback)
│   ├── scripts/refresh_snapshot.py   Re-download the snapshot from Elexon
│   ├── tests/                    pytest: domain, parsing, client (mock transport), repository, API
│   ├── pyproject.toml / uv.lock  Pinned dependencies, ruff + mypy (strict) config
│   └── Dockerfile
├── frontend/                     React 18 · TypeScript · Vite
│   ├── src/
│   │   ├── app/App.tsx           Router (lazy routes) + QueryClient
│   │   ├── api/                  Typed fetch client, TanStack Query hooks, API types
│   │   ├── components/
│   │   │   ├── layout/           AppShell, Header, KPI TickerStrip, SelectionBar, Footer
│   │   │   ├── charts/           Generation, Horizon, Hour-of-day, Daily bias, Histogram
│   │   │   └── ui/               Card, StatTile, SegmentedControl, feedback states
│   │   ├── features/             Page-level modules: decision/, accuracy/, methodology/
│   │   ├── hooks/                useSelection (URL state), useTheme
│   │   ├── lib/                  Formatting (UK time), insight generation (+ tests)
│   │   └── styles/               Design tokens (light/dark) and global styles
│   ├── nginx.conf                SPA + /api reverse proxy for the Docker image
│   └── Dockerfile
├── api/index.py                  Vercel serverless entry point (wraps the FastAPI app)
├── vercel.json                   Vercel build: static React app + Python function, SPA rewrites
├── requirements.txt              Python runtime deps for the Vercel function
├── docker-compose.yml            backend :8000 + frontend :8080
├── Makefile                      install / dev / test / lint / snapshot / up
└── .github/workflows/ci.yml      Lint, type-check, test, build, docker build
```

## Running it

### Docker (recommended)

```bash
docker compose up --build
# open http://localhost:8080   (API docs: http://localhost:8000/api/docs)
```

Set `WINDSCOPE_DATA_MODE=snapshot` to run fully offline from the bundled data.

### Local development

Requirements: Python 3.12 with [uv](https://docs.astral.sh/uv/), and Node 20+.

```bash
make install
make dev-backend    # terminal 1 → http://localhost:8000/api/docs
make dev-frontend   # terminal 2 → http://localhost:5173  (proxies /api to :8000)
```

### Tests and quality checks

```bash
make check          # ruff, mypy --strict, pytest (+coverage), eslint, tsc, vitest
```

The backend has 37 tests at about 96% coverage. The frontend tests cover formatting, URL-state parsing, insight text and the API client.

### Deployment (Vercel)

The live app is deployed on Vercel at **https://o7o690m.vercel.app**. The React build is served as static files and `api/index.py` runs the FastAPI app as a Python function (see `vercel.json`). To deploy your own copy:

```bash
vercel link && vercel deploy --prod
```

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `WINDSCOPE_DATA_MODE` | `auto` | `auto` (live, fall back to snapshot) · `live` · `snapshot` |
| `WINDSCOPE_CACHE_TTL_SECONDS` | `21600` | How long live data stays cached in memory |
| `WINDSCOPE_DELIVERY_START` / `_END` | `2026-01-02` / `2026-02-01` | Analysis window (delivery days) |
| `VITE_API_BASE_URL` (frontend) | same origin | API base URL if served separately |

## API

| Endpoint | Description |
|---|---|
| `GET /api/meta` | Delivery days, data source, run counts, defaults |
| `GET /api/days/{YYYY-MM-DD}?mode=cutoff&cutoff=11:00` | Day view: half-hourly actuals, decision-time forecast, likely range, all forecast runs, day summary |
| `GET /api/accuracy?mode=horizon&horizon=24` | Summary metrics, buffers, error by lead time / hour / day, histogram, worst hours |
| `GET /api/health` | Liveness and data source |

Interactive docs are at `/api/docs`.

## Use of AI tools

This project was built with help from **Claude Code (Anthropic)**, used for exploring the Elexon API, scaffolding code, writing tests and drafting documentation. All design decisions, analysis and code were reviewed, run and verified by me.
