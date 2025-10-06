# LiveStream Platform Makefile
# Optimized for Docker-based deployment

.PHONY: help install start stop clean setup reset-password build logs setup-ssh fix-apt fix-docker install-ffmpeg compile-ffmpeg check-ffmpeg

# Default target
.DEFAULT_GOAL := help

help:
	@echo "LiveStream Platform - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make install    - Install system dependencies only"
	@echo "  make build      - Build and start all services"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make setup      - Complete setup (install + build, logs to files)"
	@echo "  make setup-verbose - Complete setup with verbose output"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make reset-password - Reset admin password to default"
	@echo "  make logs       - View service logs"
	@echo ""
	@echo "System Setup:"
	@echo "  make setup-ssh  - Setup SSH server configuration"
	@echo "  make fix-apt    - Fix APT HTTPS issues"
	@echo "  make fix-docker - Fix Docker connectivity issues"
	@echo ""
	@echo "FFmpeg Installation:"
	@echo "  make install-ffmpeg - Quick FFmpeg installation from repositories"
	@echo "  make compile-ffmpeg - Compile FFmpeg from source (slower but optimized)"
	@echo "  make check-ffmpeg  - Check FFmpeg installation status"
	@echo ""
	@echo "Quick Access:"
	@echo "  Frontend:  \$${FRONTEND_URL}"
	@echo "  Backend:   \$${API_BASE_URL}"
	@echo "  Grafana:   \$${GRAFANA_URL} (admin/admin123)"
	@echo "  Prometheus: \$${PROMETHEUS_URL}"
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
	@echo "Fixing APT HTTPS issues..."
	@echo "This requires sudo privileges"
	sudo ./scripts/fix-apt.sh

fix-docker:
	@echo "Fixing Docker connectivity issues..."
	@echo "This requires sudo privileges - please enter your password when prompted"
	@echo "Configuring Docker daemon for better connectivity..."
	@sudo mkdir -p /etc/docker
	@echo '{' | sudo tee /etc/docker/daemon.json > /dev/null
	@echo '    "registry-mirrors": [' | sudo tee -a /etc/docker/daemon.json > /dev/null
	@echo '        "https://docker.mirrors.ustc.edu.cn",' | sudo tee -a /etc/docker/daemon.json > /dev/null
	@echo '        "https://hub-mirror.c.163.com",' | sudo tee -a /etc/docker/daemon.json > /dev/null
	@echo '        "https://mirror.baidubce.com"' | sudo tee -a /etc/docker/daemon.json > /dev/null
	@echo '    ],' | sudo tee -a /etc/docker/daemon.json > /dev/null
	@echo '    "dns": ["8.8.8.8", "8.8.4.4"]' | sudo tee -a /etc/docker/daemon.json > /dev/null
	@echo '}' | sudo tee -a /etc/docker/daemon.json > /dev/null
	@sudo systemctl restart docker || true
	@echo "Docker daemon configured with registry mirrors"

fix-apt-resolver:
	@echo "Fixing APT package resolver breaks..."
	@echo "This requires sudo privileges"
	@sudo ./scripts/install-all.sh --fix-apt-only || echo "APT fix completed"

# FFmpeg Installation
install-ffmpeg:
	@echo "Installing FFmpeg from repositories (quick method)..."
	@echo "This requires sudo privileges"
	sudo ./scripts/install-ffmpeg-quick.sh

compile-ffmpeg:
	@echo "Compiling FFmpeg from source (optimized method)..."
	@echo "This requires sudo privileges and will take longer"
	sudo ./scripts/compile-ffmpeg.sh

check-ffmpeg:
	@echo "Checking FFmpeg installation..."
	@if command -v ffmpeg >/dev/null 2>&1; then \
		echo "FFmpeg is installed:"; \
		ffmpeg -version | head -1; \
	else \
		echo "FFmpeg is not installed. Run 'make install-ffmpeg' or 'make compile-ffmpeg'"; \
	fi



# Quick setup
setup:
	@echo "Setting up LiveStream Platform..."
	@echo "Step 1: Installing system dependencies..."
	./scripts/install-all.sh > install.log 2>&1
	@echo "Step 2: Building and starting services..."
	./scripts/build-start.sh > build.log 2>&1
	@echo "Setup complete! Access at \$${FRONTEND_URL}"
	@echo "Check install.log and build.log for details"

setup-verbose:
	@echo "Setting up LiveStream Platform (verbose mode)..."
	@echo "Step 1: Installing system dependencies..."
	./scripts/install-all.sh
	@echo "Step 2: Building and starting services..."
	./scripts/build-start.sh
	@echo "Setup complete! Access at \$${FRONTEND_URL}"