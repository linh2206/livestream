# LiveStream Platform - Optimized Makefile
.PHONY: help start stop clean setup reset-password logs

.DEFAULT_GOAL := help

help:
	@echo "LiveStream Platform Commands:"
	@echo "  make setup      - Complete setup (install + build)"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make logs       - View service logs"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make reset-password - Reset admin password"
	@echo ""
	@echo "Access URLs:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:9000/api/v1"
	@echo "  RTMP:     rtmp://localhost:1935/live"
	@echo "  HLS:      http://localhost:8080/api/v1/hls"

start:
	@echo "Starting services..."
	docker-compose up -d

stop:
	@echo "Stopping services..."
	docker-compose down --remove-orphans

clean:
	@echo "Cleaning up..."
	./scripts/clean-all.sh

reset-password:
	@echo "Resetting admin password..."
	./scripts/reset-password.sh

logs:
	@echo "Viewing logs..."
	docker-compose logs -f

setup:
	@echo "Setting up LiveStream Platform..."
	./scripts/install-all.sh
	./scripts/build-start.sh
	@echo "Setup complete! Access at http://localhost:3000"
