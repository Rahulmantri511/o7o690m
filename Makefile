.PHONY: install dev-backend dev-frontend test lint check snapshot up down

install:            ## Install backend + frontend dependencies
	cd backend && uv sync
	cd frontend && npm ci

dev-backend:        ## FastAPI on :8000 with reload
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend:       ## Vite on :5173 (proxies /api to :8000)
	cd frontend && npm run dev

test:               ## All tests
	cd backend && uv run pytest --cov=app
	cd frontend && npm test

lint:               ## Linters and type checkers
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy
	cd frontend && npm run lint && npm run typecheck

check: lint test    ## Everything CI runs

snapshot:           ## Re-download the bundled Elexon snapshot
	cd backend && uv run python -m scripts.refresh_snapshot

up:                 ## Full stack in Docker on :8080
	docker compose up --build -d

down:
	docker compose down
