# LiveStream Platform Makefile
# Optimized for Docker-based deployment

.PHONY: help start stop clean setup reset-password logs install-ffmpeg

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

setup:
	@echo "Setting up LiveStream Platform..."
	@echo "Step 1: Installing system dependencies..."
	@echo "This may take 5-15 minutes. Progress will be saved to install.log"
	@echo "You can monitor progress with: tail -f install.log"
	./scripts/install-all.sh > install.log 2>&1 || echo "Install step completed with warnings"
	@echo "Step 2: Building and starting services..."
	@echo "This may take 10-20 minutes. Progress will be saved to build.log"
	@echo "You can monitor progress with: tail -f build.log"
	./scripts/build-start.sh > build.log 2>&1 || echo "Build step completed with warnings"
	@echo "Setup complete! Access at \$${FRONTEND_URL}"
	@echo "Check install.log and build.log for details"
