#!/bin/bash
set -euo pipefail

# LiveStream App - Universal Stop Script
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_DIR="$PROJECT_ROOT/docker"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info() { echo -e "${BLUE}==> $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }

log_info "Stopping LiveStream services..."
cd "$DOCKER_DIR"
docker-compose down
log_success "LiveStream App stopped"
