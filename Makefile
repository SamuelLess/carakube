.PHONY: help install install-frontend install-backend install-dev check-pnpm setup-completion completion-info
.PHONY: dev dev-frontend dev-backend dev-full
.PHONY: lint lint-frontend lint-backend typecheck typecheck-frontend typecheck-backend
.PHONY: test test-frontend test-backend test-e2e test-all
.PHONY: build build-frontend build-backend
.PHONY: docker-up docker-down docker-logs docker-restart
.PHONY: clean clean-frontend clean-backend clean-all
.PHONY: ci ci-frontend ci-backend

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(CYAN)Carakube Makefile Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)💡 Tip: Enable tab completion with:$(NC) source scripts/makefile-completion.sh"
	@echo "$(YELLOW)   Or run:$(NC) make setup-completion"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(CYAN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Installation

install: install-backend install-frontend ## Install all dependencies (backend + frontend)
	@echo "$(GREEN)✓ All dependencies installed$(NC)"

install-backend: ## Install Python backend dependencies
	@echo "$(CYAN)Installing backend dependencies...$(NC)"
	cd operator && uv sync
	@echo "$(GREEN)✓ Backend dependencies installed$(NC)"

install-frontend: check-pnpm ## Install Node.js frontend dependencies
	@echo "$(CYAN)Installing frontend dependencies...$(NC)"
	cd frontend && pnpm install
	@echo "$(GREEN)✓ Frontend dependencies installed$(NC)"

install-dev: ## Install development dependencies (including test tools)
	@echo "$(CYAN)Installing dev dependencies...$(NC)"
	cd operator && uv add --dev pytest pytest-asyncio pytest-cov pytest-mock vulture ruff ty
	cd frontend && pnpm add -D @playwright/test
	cd frontend && pnpm exec playwright install
	@echo "$(GREEN)✓ Dev dependencies installed$(NC)"

check-pnpm: ## Check if pnpm is installed
	@which pnpm > /dev/null || (echo "$(YELLOW)⚠ pnpm is not installed. Installing via npm...$(NC)" && npm install -g pnpm)

check-deps-frontend: check-pnpm ## Check if frontend dependencies are installed
	@echo "$(CYAN)Checking frontend dependencies...$(NC)"
	@if [ ! -d "frontend/node_modules" ]; then \
		echo "$(YELLOW)⚠ node_modules not found. Installing dependencies...$(NC)"; \
		cd frontend && pnpm install; \
	fi

check-deps-backend: ## Check if backend dependencies are installed
	@echo "$(CYAN)Checking backend dependencies...$(NC)"
	@cd operator && uv pip list || (echo "$(YELLOW)⚠ Run 'make install-backend'$(NC)" && exit 1)

##@ Development

dev: dev-full ## Start full development stack (alias for dev-full)

dev-frontend: check-deps-frontend ## Start frontend development server on port 3001 (pnpm)
	@echo "$(CYAN)Starting frontend dev server on port 3001 (pnpm)...$(NC)"
	cd frontend && API_URL=http://localhost:8000/api/graph pnpm dev -p 3001

dev-backend: ## Start backend development server (uv)
	@echo "$(CYAN)Starting backend dev server (uv)...$(NC)"
	cd operator && uv run main.py

dev-full: ## Start full stack with Docker Compose
	@echo "$(CYAN)Starting full development stack...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✓ Stack running:$(NC)"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend API: http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

##@ Code Quality

lint: lint-frontend lint-backend ## Run all linters

lint-frontend: ## Lint frontend code (pnpm + ESLint)
	@echo "$(CYAN)Linting frontend...$(NC)"
	cd frontend && pnpm run lint

lint-backend: ## Lint backend code (uv + ruff)
	@echo "$(CYAN)Linting backend with uv...$(NC)"
	cd operator && uv run ruff check scanner/ main.py

format-backend: ## Format backend code with uv + ruff
	@echo "$(CYAN)Formatting backend...$(NC)"
	cd operator && uv run ruff format scanner/ main.py

typecheck: typecheck-frontend typecheck-backend ## Run all type checkers

typecheck-frontend: ## Type check frontend (TypeScript)
	@echo "$(CYAN)Type checking frontend...$(NC)"
	cd frontend && pnpm exec tsc --noEmit

typecheck-backend: ## Type check backend (uv + ty)
	@echo "$(CYAN)Type checking backend with uv...$(NC)"
	cd operator && uv run ty scanner/ main.py || true

vulture: ## Find dead code in Python (uv + vulture)
	@echo "$(CYAN)Running vulture with uv...$(NC)"
	cd operator && uv run vulture scanner/ main.py --min-confidence 80 || true

##@ Testing

test: test-backend test-frontend ## Run all tests

test-frontend: ## Run frontend unit tests (if any)
	@echo "$(CYAN)Running frontend tests...$(NC)"
	cd frontend && pnpm run lint

test-backend: ## Run backend unit tests (uv + pytest)
	@echo "$(CYAN)Running backend tests with uv...$(NC)"
	cd operator && uv run pytest -v

test-e2e: ## Run end-to-end tests with Playwright
	@echo "$(CYAN)Running E2E tests...$(NC)"
	cd frontend && pnpm run test:e2e

test-e2e-ui: ## Run E2E tests in interactive UI mode
	@echo "$(CYAN)Opening Playwright UI...$(NC)"
	cd frontend && pnpm run test:e2e:ui

test-e2e-headed: ## Run E2E tests in headed mode (see browser)
	@echo "$(CYAN)Running E2E tests (headed)...$(NC)"
	cd frontend && pnpm run test:e2e:headed

test-coverage: ## Run backend tests with coverage report
	@echo "$(CYAN)Running tests with coverage...$(NC)"
	cd operator && uv run pytest --cov=scanner --cov-report=html --cov-report=term
	@echo "$(GREEN)✓ Coverage report: operator/htmlcov/index.html$(NC)"

test-all: test-backend test-frontend test-e2e ## Run all tests (unit + E2E)

##@ Building

build: build-frontend build-backend ## Build everything for production

build-frontend: ## Build frontend for production
	@echo "$(CYAN)Building frontend...$(NC)"
	cd frontend && pnpm run build
	@echo "$(GREEN)✓ Frontend built$(NC)"

build-backend: ## Build backend Docker image
	@echo "$(CYAN)Building backend Docker image...$(NC)"
	docker build -t carakube-operator:latest operator/
	@echo "$(GREEN)✓ Backend image built$(NC)"

build-all: ## Build all Docker images
	@echo "$(CYAN)Building all Docker images...$(NC)"
	docker compose build
	@echo "$(GREEN)✓ All images built$(NC)"

##@ Docker

docker-up: ## Start Docker Compose stack
	docker compose up -d

docker-down: ## Stop Docker Compose stack
	docker compose down

docker-logs: ## View Docker Compose logs (follow)
	docker compose logs -f

docker-logs-operator: ## View operator logs
	docker compose logs -f operator

docker-logs-frontend: ## View frontend logs
	docker compose logs -f frontend

docker-restart: ## Restart Docker Compose stack (rebuild & force-recreate)
	@echo "$(CYAN)Rebuilding and recreating containers...$(NC)"
	docker compose up -d --build --force-recreate
	@echo "$(GREEN)✓ Containers rebuilt and restarted$(NC)"

docker-clean: ## Remove all containers and volumes
	docker compose down -v
	docker system prune -f

##@ CI/CD

ci: ## Run all CI checks (backend: lint + test + vulture, frontend: eslint + typecheck + prettier)
	@echo "$(CYAN)======================================$(NC)"
	@echo "$(CYAN)Running Complete CI Pipeline$(NC)"
	@echo "$(CYAN)======================================$(NC)"
	@echo ""
	@echo "$(YELLOW)Backend Checks (uv)...$(NC)"
	@echo "  → Linting..."
	@cd operator && uv run ruff check scanner/ main.py
	@echo "  → Testing..."
	@cd operator && uv run pytest -v || true
	@echo "  → Dead code analysis..."
	@cd operator && uv run vulture scanner/ main.py --min-confidence 80 || true
	@echo ""
	@echo "$(YELLOW)Frontend Checks...$(NC)"
	@echo "  → Running pnpm lint (ESLint + TypeCheck)..."
	@cd frontend && pnpm run lint
	@echo "  → Prettier format check..."
	@cd frontend && pnpm exec prettier --check src/ e2e/ playwright.config.ts
	@echo ""
	@echo "$(CYAN)======================================$(NC)"
	@echo "$(GREEN)✓ All CI checks passed!$(NC)"
	@echo "$(CYAN)======================================$(NC)"

##@ Cleanup

clean: clean-frontend clean-backend ## Clean all build artifacts

clean-frontend: ## Clean frontend build artifacts
	@echo "$(CYAN)Cleaning frontend...$(NC)"
	cd frontend && rm -rf .next node_modules/.cache
	@echo "$(GREEN)✓ Frontend cleaned$(NC)"

clean-backend: ## Clean backend artifacts
	@echo "$(CYAN)Cleaning backend...$(NC)"
	cd operator && rm -rf __pycache__ .pytest_cache .coverage htmlcov
	find operator -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)✓ Backend cleaned$(NC)"

clean-all: clean docker-clean ## Deep clean (including Docker)
	@echo "$(CYAN)Deep cleaning...$(NC)"
	cd frontend && rm -rf node_modules
	cd operator && rm -rf .venv
	@echo "$(GREEN)✓ Everything cleaned$(NC)"

##@ Utilities

setup-completion: ## Install shell completion for make targets
	@echo "$(CYAN)Setting up tab completion...$(NC)"
	@chmod +x scripts/makefile-completion.sh
	@echo ""
	@echo "$(GREEN)✓ Completion script ready!$(NC)"
	@echo ""
	@echo "$(YELLOW)Add this to your shell profile:$(NC)"
	@echo ""
	@echo "  $(CYAN)# For bash (~/.bashrc or ~/.bash_profile):$(NC)"
	@echo "  source $(PWD)/scripts/makefile-completion.sh"
	@echo ""
	@echo "  $(CYAN)# For zsh (~/.zshrc):$(NC)"
	@echo "  autoload -U +X bashcompinit && bashcompinit"
	@echo "  source $(PWD)/scripts/makefile-completion.sh"
	@echo ""
	@echo "  $(CYAN)# For xonsh (~/.xonshrc):$(NC)"
	@echo "  source-bash $(PWD)/scripts/makefile-completion.sh"
	@echo ""
	@echo "$(YELLOW)Or source it now:$(NC)"
	@echo "  source scripts/makefile-completion.sh"

completion-info: ## Show how to enable tab completion
	@echo "$(CYAN)Tab Completion Setup$(NC)"
	@echo ""
	@echo "Run: $(GREEN)make setup-completion$(NC)"
	@echo "Then follow the instructions to add it to your shell profile."

health-check: ## Check if all services are healthy
	@echo "$(CYAN)Checking service health...$(NC)"
	@curl -s http://localhost:8000/health | grep -q healthy && echo "$(GREEN)✓ Backend healthy$(NC)" || echo "$(YELLOW)⚠ Backend not responding$(NC)"
	@curl -s http://localhost:3000 > /dev/null && echo "$(GREEN)✓ Frontend healthy$(NC)" || echo "$(YELLOW)⚠ Frontend not responding$(NC)"

status: ## Show running Docker containers
	@echo "$(CYAN)Docker containers:$(NC)"
	@docker compose ps

quick-test: ## Run quick integration test
	@echo "$(CYAN)Running quick integration test...$(NC)"
	@bash scripts/quick-test.sh

watch-backend: ## Watch and reload backend on changes
	@echo "$(CYAN)Watching backend for changes...$(NC)"
	cd operator && uv run watchfiles 'uv run main.py' scanner/

fresh-start: clean-all install docker-up ## Fresh start (clean + install + run)
	@echo "$(GREEN)✓ Fresh start complete!$(NC)"
	@echo "  Visit: http://localhost:3000"

