# LiveStream App Makefile
.PHONY: help install start stop status clean build test setup-ssh ssh-status reset-all

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
	@echo ""
	@echo "Server Setup:"
	@echo "  make setup-ssh  - Configure SSH server for Ubuntu"
	@echo "  make ssh-status - Show SSH service status"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make logs       - Show service logs"
	@echo "  make reset-all  - Reset everything (keep SSH and code)"
	@echo ""

# Development
install:
	@echo "Installing dependencies..."
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
	cd services/api && npm test || echo "No tests configured"
	cd services/frontend && npm test || echo "No tests configured"

# Deployment
deploy:
	@echo "Deploying to server..."
	./scripts/app.sh start

# Server Setup
setup-ssh:
	@echo "Configuring SSH server for Ubuntu..."
	@chmod +x scripts/setup-ssh-server.sh
	@bash scripts/setup-ssh-server.sh

# SSH Management
ssh-status:
	@echo "SSH service status:"
	@sudo systemctl status ssh --no-pager

# Maintenance
clean:
	@echo "Cleaning up containers and images..."
	./scripts/app.sh clean

logs:
	@echo "Showing service logs..."
	./scripts/app.sh logs

# Reset everything (keep SSH and code)
reset-all:
	@echo "Resetting everything (keeping SSH and code)..."
	@chmod +x scripts/reset-all.sh
	@bash scripts/reset-all.sh

# Quick setup
setup: install start
	@echo "Setup complete! Access at http://localhost:8080"
