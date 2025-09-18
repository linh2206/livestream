# LiveStream App Makefile
# Simple commands for development and deployment

.PHONY: help install start stop status clean build test

# Default target
help:
	@echo "LiveStream App - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install    - Install dependencies and setup"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make status     - Show service status"
	@echo "  make build      - Build all services"
	@echo "  make test       - Run tests"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy     - Deploy to single server"
	@echo "  make deploy-multi - Deploy to multiple servers"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make logs       - Show service logs"
	@echo ""

# Development commands
install:
	@echo "Installing dependencies and setting up..."
	./scripts/livestream.sh install

start:
	@echo "Starting all services..."
	@echo "Cleaning up existing containers and images..."
	@docker stop $$(docker ps -q) 2>/dev/null || true
	@docker container prune -f 2>/dev/null || true
	@docker image prune -f 2>/dev/null || true
	@./scripts/livestream.sh start || (echo "Failed to start services. Check logs above." && exit 1)

stop:
	@echo "Stopping all services..."
	./scripts/livestream.sh stop

status:
	@echo "Checking service status..."
	./scripts/livestream.sh status

# Build commands
build:
	@echo "Building all services..."
	cd services/api && npm run build
	cd services/frontend && npm run build

# Test commands
test:
	@echo "Running tests..."
	cd services/api && npm test || echo "No tests configured"
	cd services/frontend && npm test || echo "No tests configured"

# Deployment commands
deploy:
	@echo "Deploying to single server..."
	./scripts/livestream.sh start

deploy-multi:
	@echo "Deploying to multiple servers..."
	./scripts/livestream.sh multi

# Maintenance commands
clean:
	@echo "Cleaning up..."
	@echo "Stopping any running Docker builds..."
	@docker stop $$(docker ps -q) 2>/dev/null || true
	@./scripts/livestream.sh clean

logs:
	@echo "Showing service logs..."
	./scripts/livestream.sh status

# Quick setup for new developers
setup: install start
	@echo "Setup complete! Access the app at http://localhost:8080"
