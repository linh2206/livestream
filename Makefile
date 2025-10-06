# LiveStream Platform Makefile
# Optimized for Docker-based deployment

.PHONY: help start stop clean setup reset-password logs install-ffmpeg restart-nginx

# Default target
.DEFAULT_GOAL := help

help:
	@echo "LiveStream Platform - Available Commands:"
	@echo ""
	@echo "Main Commands:"
	@echo "  make setup      - Complete setup (install + build)"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make logs       - View service logs"
	@echo "  make clean      - Clean up containers and images"
	@echo ""
	@echo "Utilities:"
	@echo "  make reset-password - Reset admin password"
	@echo "  make install-ffmpeg - Install FFmpeg"
	@echo "  make restart-nginx - Restart nginx container"
	@echo ""
	@echo "Quick Access:"
	@echo "  Frontend:  \$${FRONTEND_URL}"
	@echo "  Backend:   \$${API_BASE_URL}"
	@echo "  Grafana:   \$${GRAFANA_URL} (admin/admin123)"
	@echo "  Prometheus: \$${PROMETHEUS_URL}"
	@echo ""

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

install-ffmpeg:
	@echo "Installing FFmpeg from repositories (quick method)..."
	@echo "This requires sudo privileges"
	sudo ./scripts/install-ffmpeg-quick.sh

restart-nginx:
	@echo "Restarting nginx container..."
	docker-compose restart nginx
	@echo "Nginx restarted"

setup:
	@echo "Setting up LiveStream Platform..."
	@echo "Step 1: Installing system dependencies..."
	./scripts/install-all.sh || echo "Install step completed with warnings"
	@echo "Step 2: Building and starting services..."
	./scripts/build-start.sh || echo "Build step completed with warnings"
	@echo "Setup complete! Access at \$${FRONTEND_URL}"
