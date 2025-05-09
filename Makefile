.PHONY: help setup quick-start setup-dev setup-backend setup-frontend dev-backend dev-frontend run-prod docker-setup docker-build docker-up docker-down clean lint-backend lint-frontend test-backend test-frontend

help:
	@echo "GSTInvoicePro Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make quick-start        Quick start with automated setup script"
	@echo "  make setup-dev         Setup development environment (backend and frontend)"
	@echo "  make setup-backend     Setup backend development environment"
	@echo "  make setup-frontend    Setup frontend development environment"
	@echo "  make dev-backend       Run backend development server"
	@echo "  make dev-frontend      Run frontend development server"
	@echo "  make run-prod          Run production servers (backend and frontend)"
	@echo "  make docker-setup      Setup Docker environment"
	@echo "  make docker-build      Build Docker images"
	@echo "  make docker-up         Start Docker containers"
	@echo "  make docker-down       Stop Docker containers"
	@echo "  make clean             Clean up temporary files"
	@echo "  make lint-backend      Run backend linting"
	@echo "  make lint-frontend     Run frontend linting"
	@echo "  make test-backend      Run backend tests"
	@echo "  make test-frontend     Run frontend tests"
	@echo ""

quick-start:
	@echo "Running quick start setup..."
	@if [ "$(OS)" = "Windows_NT" ]; then \
		setup.bat; \
	else \
		chmod +x setup.sh && ./setup.sh; \
	fi

setup-dev: setup-backend setup-frontend

setup-backend:
	@echo "Setting up backend development environment..."
	cd backend && \
	python -m venv venv && \
	. venv/Scripts/activate && \
	pip install -r requirements.txt && \
	pip install pytest flake8 black isort mypy

setup-frontend:
	@echo "Setting up frontend development environment..."
	cd frontend && npm install

dev-backend:
	@echo "Starting backend development server..."
	cd backend && \
	. venv/Scripts/activate && \
	python run.py

dev-frontend:
	@echo "Starting frontend development server..."
	cd frontend && npm run dev

run-prod:
	@echo "Starting production servers..."
	cd backend && \
	. venv/Scripts/activate && \
	gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app &
	cd frontend && npm run start

docker-setup:
	@echo "Setting up Docker environment..."
	cp backend/.env.example backend/.env
	echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local

docker-build:
	@echo "Building Docker images..."
	docker-compose build

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

clean:
	@echo "Cleaning up temporary files..."
	find . -name "__pycache__" -type d -exec rm -rf {} +
	find . -name "*.pyc" -delete
	find . -name ".pytest_cache" -type d -exec rm -rf {} +
	find . -name ".coverage" -delete
	find . -name "htmlcov" -type d -exec rm -rf {} +
	rm -rf backend/.coverage
	rm -rf frontend/.next
	rm -rf frontend/node_modules/.cache

lint-backend:
	@echo "Running backend linting..."
	cd backend && \
	. venv/Scripts/activate && \
	black app tests && \
	isort app tests && \
	flake8 app tests && \
	mypy app

lint-frontend:
	@echo "Running frontend linting..."
	cd frontend && npm run lint

test-backend:
	@echo "Running backend tests..."
	cd backend && \
	. venv/Scripts/activate && \
	pytest -xvs tests/

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm test 