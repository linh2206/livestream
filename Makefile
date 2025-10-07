# LiveStream Platform - Optimized Makefile
.PHONY: help start stop clean setup reset-password logs install-ffmpeg compile-ffmpeg check-ffmpeg setup-ssh clean-ffmpeg

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
	@echo "  make install-ffmpeg - Quick install FFmpeg (prebuilt)"
	@echo "  make compile-ffmpeg - Compile FFmpeg from source (long)"
	@echo "  make check-ffmpeg   - Show FFmpeg version and codecs"
	@echo "  make runner-purge   - Remove existing self-hosted runner (inline)"
	@echo "  make runner-install - Install/register self-hosted runner(s) (inline)"
	@echo "  make runner-reinstall - Purge then install runner(s) (inline)"
	@echo "  make runner-start   - Start runner service(s)"
	@echo "  make runner-status  - Status of runner service(s)"
	@echo "  make runner-user    - Create 'runner' user if missing"
	@echo "  make runner-delete  - Alias of runner-purge"
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

# ===== Self-hosted Runner =====
# Variables (override when calling):
# GH_URL=<repo_or_org_url> GH_TOKEN=<registration_token> COUNT=1 NAME=runner LABELS=prod,linux PREFIX=actions-runner VERSION=2.316.1 RUNNER_BASE=$$PWD

runner-purge:
	@echo "Purging existing runners via script..."
	RUNNER_USER=${RUNNER_USER} COUNT=${COUNT} PREFIX=${PREFIX} RUNNER_BASE=${RUNNER_BASE} bash -c '\
	  USERNAME="$${RUNNER_USER:-runner}"; id $$USERNAME >/dev/null 2>&1 || sudo useradd -m -s /bin/bash $$USERNAME; \
	  sudo -u $$USERNAME -H env RUNNER_COUNT="$${COUNT:-1}" RUNNER_PREFIX="$${PREFIX:-actions-runner}" RUNNER_BASE="$${RUNNER_BASE:-$$HOME}" bash scripts/runner.sh --purge'

runner-install:
	@echo "Installing runner(s) via script..."
	RUNNER_USER=${RUNNER_USER} GH_URL="$(GH_URL)" GH_TOKEN="$(GH_TOKEN)" RUNNER_BASE="$(RUNNER_BASE)" bash -c '\
	  USERNAME="$${RUNNER_USER:-runner}"; id $$USERNAME >/dev/null 2>&1 || sudo useradd -m -s /bin/bash $$USERNAME; \
	  sudo -u $$USERNAME -H env GH_URL="$(GH_URL)" GH_TOKEN="$(GH_TOKEN)" RUNNER_BASE="$(RUNNER_BASE)" bash scripts/runner.sh --install \
		$$( [ -n "$(COUNT)" ] && echo --count $(COUNT) ) \
		$$( [ -n "$(NAME)" ] && echo --name $(NAME) ) \
		$$( [ -n "$(LABELS)" ] && echo --labels $(LABELS) ) \
		$$( [ -n "$(PREFIX)" ] && echo --prefix $(PREFIX) ) \
		$$( [ -n "$(RUNNER_BASE)" ] && echo --base $(RUNNER_BASE) ) \
		$$( [ -n "$(VERSION)" ] && echo --version $(VERSION) )'

runner-reinstall: runner-purge runner-install

runner-start:
	@echo "Starting runner service(s)..."
	@RUNNER_USER=${RUNNER_USER} COUNT=${COUNT} PREFIX=${PREFIX} RUNNER_BASE=${RUNNER_BASE} bash -c '\
	  COUNT="$${COUNT:-1}"; PREFIX="$${PREFIX:-actions-runner}"; BASE="$${RUNNER_BASE:-}"; \
	  USERNAME="$${RUNNER_USER:-runner}"; HOME_DIR=$$(getent passwd $$USERNAME | cut -d: -f6); \
	  [ -z "$$BASE" ] && BASE="$$HOME_DIR"; \
	  if [ $$COUNT -le 1 ]; then \
	    d="$$BASE/$$PREFIX"; [ -d "$$d" ] && cd "$$d" && sudo ./svc.sh start || true; \
	  else \
	    for i in $$(seq 1 $$COUNT); do d="$$BASE/$$PREFIX$$i"; [ -d "$$d" ] && cd "$$d" && sudo ./svc.sh start || true; done; \
	  fi'

runner-status:
	@echo "Runner service status..."
	@RUNNER_USER=${RUNNER_USER} COUNT=${COUNT} PREFIX=${PREFIX} RUNNER_BASE=${RUNNER_BASE} bash -c '\
	  COUNT="$${COUNT:-1}"; PREFIX="$${PREFIX:-actions-runner}"; BASE="$${RUNNER_BASE:-}"; \
	  USERNAME="$${RUNNER_USER:-runner}"; HOME_DIR=$$(getent passwd $$USERNAME | cut -d: -f6); \
	  [ -z "$$BASE" ] && BASE="$$HOME_DIR"; \
	  if [ $$COUNT -le 1 ]; then \
	    d="$$BASE/$$PREFIX"; [ -d "$$d" ] && cd "$$d" && sudo ./svc.sh status || true; \
	  else \
	    for i in $$(seq 1 $$COUNT); do d="$$BASE/$$PREFIX$$i"; [ -d "$$d" ] && cd "$$d" && sudo ./svc.sh status || true; done; \
	  fi'
runner-user:
	@RUNNER_USER=${RUNNER_USER} bash -c '\
	  USERNAME="$${RUNNER_USER:-runner}"; \
	  id $$USERNAME >/dev/null 2>&1 || sudo useradd -m -s /bin/bash $$USERNAME; \
	  echo "User $$USERNAME is ready."'

runner-delete: runner-purge
