.PHONY: setup setup.frontend setup.server dev dev.frontend dev.server build deploy test test.server clean help

# Default target
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Setup:"
	@echo "  setup            Install all dependencies (frontend + server)"
	@echo "  setup.frontend   Install frontend (npm) dependencies"
	@echo "  setup.server     Install server (mix) dependencies"
	@echo ""
	@echo "Development:"
	@echo "  dev              Start both frontend and server for development"
	@echo ""
	@echo "Production:"
	@echo "  build            Build the frontend and copy to Phoenix static"
	@echo "  deploy           Full production build (frontend + digest)"
	@echo "  serve            Start the production server (single port 4000)"
	@echo ""
	@echo "Testing:"
	@echo "  test             Run all tests"
	@echo "  test.server      Run server tests only"
	@echo ""
	@echo "Other:"
	@echo "  clean            Remove build artifacts"

# ── Setup ──────────────────────────────────────────────

setup: setup.frontend setup.server

setup.frontend:
	npm install

setup.server:
	cd goose_server && mix deps.get

# ── Development ────────────────────────────────────────

dev:
	@trap 'kill 0' EXIT; \
		npm run dev & \
		wait

# ── Production ─────────────────────────────────────────

build:
	npx next build
	cp -r out/* goose_server/priv/static/

deploy: build
	cd goose_server && mix phx.digest

serve:
	cd goose_server && mix phx.server

# ── Testing ────────────────────────────────────────────

test: test.server

test.server:
	cd goose_server && mix test

# ── Cleanup ────────────────────────────────────────────

clean:
	rm -rf out .next
	rm -rf goose_server/priv/static/_next
	rm -rf goose_server/priv/static/index.html
	rm -rf goose_server/priv/static/404.html
	rm -f goose_server/priv/static/cache_manifest.json
