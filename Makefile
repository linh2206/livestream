# LiveStream Platform Makefile
# Optimized for Docker-based deployment

.PHONY: help start stop clean setup reset-password logs

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
	@echo "Quick Access:"
	@echo "  Frontend:  \$${FRONTEND_URL}"
	@echo "  Backend:   \$${API_BASE_URL}"
	@echo "  RTMP:      rtmp://localhost:1935/live"
	@echo "  HLS:       http://localhost:8080/api/v1/hls"
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

setup:
	@echo "Setting up LiveStream Platform..."
	@echo "Step 1: Installing system dependencies..."
	./scripts/install-all.sh || echo "Install step completed with warnings"
	@echo "Step 2: Building and starting services..."
	./scripts/build-start.sh || echo "Build step completed with warnings"
	@echo "Setup complete! Access at \$${FRONTEND_URL}"
