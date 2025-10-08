# LiveStream Platform - Optimized Makefile
.PHONY: help start stop clean setup reset-password logs install-ffmpeg compile-ffmpeg check-ffmpeg setup-ssh clean-ffmpeg setup-runner check-runner

.DEFAULT_GOAL := help

help:
	@echo "LiveStream Platform Commands:"
	@echo "  make setup      - Complete setup (install + build)"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make logs       - View service logs"
	@echo "  make clean      - Clean up containers and images"
	@echo "  make reset-password - Reset admin password"
	@echo "  make setup-ssh  - Install & configure SSH server (password + key)"
	@echo "  make setup-runner - Setup GitHub Actions runner"
	@echo "  make check-runner - Check running GitHub Actions runners"	@echo "  make install-ffmpeg - Quick install FFmpeg (prebuilt)"
	@echo "  make compile-ffmpeg - Compile FFmpeg from source (long)"
	@echo "  make check-ffmpeg   - Show FFmpeg version and codecs"
	@echo ""
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

# SSH server setup
setup-ssh:
	@echo "Installing and configuring SSH server..."
	./scripts/setup-ssh-server.sh

# FFmpeg
install-ffmpeg:
	@echo "Installing FFmpeg (quick)..."
	./scripts/install-ffmpeg-quick.sh

compile-ffmpeg:
	@echo "Compiling FFmpeg from source (this may take a long time)..."
	./scripts/compile-ffmpeg.sh

check-ffmpeg:
	@echo "FFmpeg version:"
	ffmpeg -version || echo "FFmpeg not found"

# Cleanup FFmpeg build artifacts (does not uninstall system packages)
clean-ffmpeg:
	@echo "Cleaning FFmpeg build artifacts..."
	rm -rf /tmp/ffmpeg-build
	@echo "FFmpeg build artifacts removed."

setup:
	@echo "Setting up LiveStream Platform..."
	./scripts/install-all.sh
	./scripts/build-start.sh
	@echo "Setup complete! Access at http://localhost:3000"

 

# GitHub Actions runner setup
setup-runner:
	@echo "Setting up GitHub Actions runner..."
	./scripts/setup-runner.sh
# Check running GitHub Actions runners
check-runner:
	@echo "Checking GitHub Actions runners status..."
	@echo "=== Runner Directories ==="
	@ls -la ~/workspace/runner* 2>/dev/null || echo "No runners found in ~/workspace/"
	@echo ""
	@echo "=== Runner Services ==="
	@systemctl --user list-units --type=service | grep runner || echo "No runner services found"
	@echo ""
	@echo "=== Runner Processes ==="
	@ps aux | grep -E "(runner|actions)" | grep -v grep || echo "No runner processes found"
