#!/bin/bash

echo "🧹 Cleaning Livestream Platform - Complete Cleanup"
echo "================================================="

# Check Docker Compose version and use appropriate command
if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Stop and remove containers
echo "🛑 Stopping and removing containers..."
$COMPOSE_CMD down -v

# Remove all containers
echo "🗑️ Removing all containers..."
docker container prune -f

# Remove all images
echo "🗑️ Removing all images..."
docker image prune -a -f

# Remove all volumes
echo "🗑️ Removing all volumes..."
docker volume prune -f

# Remove all networks
echo "🗑️ Removing all networks..."
docker network prune -f

# Remove all build cache
echo "🗑️ Removing build cache..."
docker builder prune -a -f

# Clean system
echo "🧹 Cleaning Docker system..."
docker system prune -a -f

# Remove node_modules
echo "🗑️ Removing node_modules..."
rm -rf apps/api/node_modules
rm -rf apps/frontend/node_modules

# Remove package-lock files
echo "🗑️ Removing package-lock files..."
rm -f apps/api/package-lock.json
rm -f apps/frontend/package-lock.json

# Remove build artifacts
echo "🗑️ Removing build artifacts..."
rm -rf apps/api/dist
rm -rf apps/frontend/.next
rm -rf apps/frontend/out

# Clean logs
echo "🗑️ Cleaning logs..."
sudo journalctl --vacuum-time=1d

echo ""
echo "✅ Cleanup completed successfully!"
echo "================================================="
echo "All containers, images, volumes, and build artifacts have been removed."
echo "You can now run install-all.sh to reinstall everything."
echo "================================================="
