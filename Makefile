# LiveStream App Makefile
# Optimized version with duplicates removed

.PHONY: help install start stop clean setup reset-admin

# Default target
.DEFAULT_GOAL := help

help:
	@echo "🚀 LiveStream App - Available Commands:"
	@echo ""
	@echo "📦 Development:"
	@echo "  make install    - Install Docker, dependencies and setup"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make setup      - Quick setup (install + start)"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make reset-admin - Reset admin user to default credentials"
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



# Maintenance
clean:
	@echo "Cleaning up containers and images..."
	./scripts/app.sh clean

reset-admin:
	@echo "Resetting admin user..."
	./scripts/reset-admin.sh


# Quick setup
setup:
	@echo "Setting up LiveStream App..."
	./scripts/app.sh setup
	@echo "Setup complete! Access at http://localhost:3000"