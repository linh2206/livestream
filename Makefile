# LiveStream App Makefile
# Optimized version with duplicates removed

.PHONY: help install start stop status clean build test setup sync optimize

# Default target
.DEFAULT_GOAL := help

help:
	@echo "🚀 LiveStream App - Available Commands:"
	@echo ""
	@echo "📦 Development:"
	@echo "  make install    - Install Docker, dependencies and setup"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make status     - Show service status"
	@echo "  make build      - Build all services"
	@echo "  make test       - Run tests"
	@echo "  make setup      - Quick setup (install + start)"
	@echo ""
	@echo "🚀 Deployment:"
	@echo "  make sync       - Sync code to server"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make logs       - Show service logs"
	@echo "  make optimize   - Optimize system and clean up"
	@echo ""
	@echo "📊 Quick Access:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://183.182.104.226:24190"
	@echo "  Web UI:   http://localhost:8080"
	@echo ""

# Development
install:
	@echo "Installing Docker, dependencies and setup..."
	./scripts/app.sh install

start:
	@echo "Starting all services..."
	./scripts/app.sh start

stop:
	@echo "Stopping all services..."
	./scripts/app.sh stop

status:
	@echo "Checking service status..."
	./scripts/app.sh status

# Build & Test
build:
	@echo "Building all services..."
	./scripts/app.sh build

test:
	@echo "Running tests..."
	./scripts/app.sh test

# Deployment
sync:
	@echo "Syncing code to server..."
	@echo "Using default server: ubuntu@183.182.104.226:24122"
	@echo "Override with: SERVER_HOST=ip SERVER_PORT=port SERVER_USER=user make sync"
	./scripts/app.sh sync

# Maintenance
clean:
	@echo "Cleaning up containers and images..."
	./scripts/app.sh clean

logs:
	@echo "Showing service logs..."
	./scripts/app.sh logs

optimize:
	@echo "Optimizing system and cleaning up..."
	./scripts/app.sh optimize

# Quick setup
setup:
	@echo "Setting up LiveStream App..."
	./scripts/app.sh setup
	@echo "Setup complete! Access at http://localhost:3000"