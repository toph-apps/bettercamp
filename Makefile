.PHONY: dev api web scrape osrm-build osrm-up osrm-down test build clean

dev:
	@echo "Starting API :8000 and web :5173"
	@$(MAKE) -j2 api web

api:
	cd api && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd web && npm run dev -- --host

scrape:
	cd scraper && uv run python -m sepaq

osrm-build:
	cd osrm && ./build.sh

osrm-up:
	docker compose up -d osrm

osrm-down:
	docker compose down osrm

test:
	uv run --package bettercamp-api pytest api/tests
	uv run --package bettercamp-scraper pytest scraper/tests
	cd web && npm test --silent || true

build:
	cd web && npm run build

clean:
	rm -rf api/.venv scraper/.venv web/node_modules web/dist
	find . -type d -name __pycache__ -exec rm -rf {} +
