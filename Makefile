# LiveStream Platform Makefile
# Optimized for Docker-based deployment

.PHONY: help install start stop clean setup reset-admin build logs

# Default target
.DEFAULT_GOAL := help

help:
	@echo "🚀 LiveStream Platform - Available Commands:"
	@echo ""
	@echo "📦 Development:"
	@echo "  make install    - Install system dependencies and setup"
	@echo "  make build      - Build and start all services"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make setup      - Quick setup (install + build)"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make reset-admin - Reset admin user to default credentials"
	@echo "  make logs       - View service logs"
	@echo ""
	@echo "📊 Quick Access:"
	@echo "  Frontend:  http://localhost:3000"
	@echo "  Backend:   http://localhost:9000/api/v1"
	@echo "  Grafana:   http://localhost:8080 (admin/admin123)"
	@echo "  Prometheus: http://localhost:9090"
	@echo ""

# Development
install:
	@echo "Installing system dependencies and setup..."
	./scripts/install-all.sh

build:
	@echo "Building and starting all services..."
	./scripts/build-start.sh

start:
	@echo "Starting all services..."
	docker-compose up -d

stop:
	@echo "Stopping all services..."
	docker-compose down

# Maintenance
clean:
	@echo "Cleaning up containers and images..."
	./scripts/clean-all.sh

reset-admin:
	@echo "Resetting admin user..."
	./scripts/reset-admin.sh

logs:
	@echo "Viewing service logs..."
	docker-compose logs -f

# Quick setup
setup:
	@echo "Setting up LiveStream Platform..."
	./scripts/install-all.sh
	./scripts/build-start.sh
	@echo "Setup complete! Access at http://localhost:3000"