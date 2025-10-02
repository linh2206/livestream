# LiveStream Platform Makefile
# Optimized for Docker-based deployment

.PHONY: help install start stop clean setup reset-password build logs setup-ssh fix-apt

# Default target
.DEFAULT_GOAL := help

help:
	@echo "🚀 LiveStream Platform - Available Commands:"
	@echo ""
	@echo "📦 Development:"
	@echo "  make install    - Install system dependencies only"
	@echo "  make build      - Build and start all services"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make setup      - Complete setup (install + build)"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make reset-password - Reset admin password to default"
	@echo "  make logs       - View service logs"
	@echo ""
	@echo "🔧 System Setup:"
	@echo "  make setup-ssh  - Setup SSH server configuration"
	@echo "  make fix-apt    - Fix APT package manager issues"
	@echo ""
	@echo "📊 Quick Access:"
	@echo "  Frontend:  \$${FRONTEND_URL:-http://localhost:3000}"
	@echo "  Backend:   \$${API_BASE_URL:-http://localhost:9000/api/v1}"
	@echo "  Grafana:   \$${GRAFANA_URL:-http://localhost:8080} (admin/admin123)"
	@echo "  Prometheus: \$${PROMETHEUS_URL:-http://localhost:9090}"
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

reset-password:
	@echo "Resetting admin password..."
	./scripts/reset-password.sh

logs:
	@echo "Viewing service logs..."
	docker-compose logs -f

# System Setup
setup-ssh:
	@echo "Setting up SSH server..."
	./scripts/setup-ssh-server.sh

fix-apt:
	@echo "Fixing APT package manager issues (NUCLEAR OPTION)..."
	sudo ./scripts/fix-apt-issues.sh

# Quick setup
setup:
	@echo "Setting up LiveStream Platform..."
	./scripts/install-all.sh
	./scripts/build-start.sh
	@echo "Setup complete! Access at \$${FRONTEND_URL:-http://localhost:3000}"