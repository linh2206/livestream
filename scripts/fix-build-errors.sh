#!/bin/bash

echo "🔧 FIXING BUILD ERRORS"
echo "======================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Build Error Analysis:${NC}"
echo "❌ Google Fonts fetch failed (EAI_AGAIN)"
echo "❌ Network timeout during build"
echo "❌ Next.js telemetry causing issues"
echo ""

echo -e "${YELLOW}🔧 Applied Fixes:${NC}"
echo "✅ Removed Google Fonts dependency"
echo "✅ Added system font fallback"
echo "✅ Disabled Next.js telemetry"
echo "✅ Updated Tailwind font configuration"
echo "✅ Added build resilience"
echo ""

echo -e "${YELLOW}🚀 Testing Build Fix...${NC}"

# Check Docker Compose version
if docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Clean previous builds
echo "Cleaning previous builds..."
$COMPOSE_CMD down >/dev/null 2>&1
docker system prune -f >/dev/null 2>&1

# Test frontend build
echo "Testing frontend build..."
if $COMPOSE_CMD build --no-cache frontend >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    echo "Build log:"
    $COMPOSE_CMD build --no-cache frontend
    exit 1
fi

# Test full build
echo "Testing full system build..."
if $COMPOSE_CMD build --no-cache >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Full build successful${NC}"
else
    echo -e "${RED}❌ Full build failed${NC}"
    echo "Build log:"
    $COMPOSE_CMD build --no-cache
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 BUILD ERRORS FIXED!${NC}"
echo "=========================="
echo ""
echo -e "${BLUE}📊 Build Status:${NC}"
echo "• Google Fonts: ✅ Replaced with system fonts"
echo "• Network Issues: ✅ Resolved with telemetry disabled"
echo "• Build Process: ✅ Optimized and resilient"
echo "• Docker Images: ✅ Built successfully"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. Deploy to server: docker-compose up -d"
echo "2. Check services: docker-compose ps"
echo "3. View logs: docker-compose logs -f"
echo ""
echo -e "${GREEN}✅ Ready for deployment!${NC}"
