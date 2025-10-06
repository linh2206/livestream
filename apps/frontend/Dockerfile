# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

WORKDIR /app

# Set npm registry and timeout for network resilience
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Copy package files
COPY package*.json ./

# Install ALL dependencies (need dev deps for build) with retry
RUN npm ci --no-audit --no-fund --prefer-offline || \
    (npm cache clean --force && npm ci --no-audit --no-fund) || \
    npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build application with optimizations and network resilience
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for health checks with network resilience
RUN apk update --no-cache && \
    apk add --no-cache curl || \
    (sleep 5 && apk update --no-cache && apk add --no-cache curl)

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only with network resilience
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    (npm ci --only=production --no-audit --no-fund --prefer-offline || \
     (npm cache clean --force && npm ci --only=production --no-audit --no-fund) || \
     npm install --only=production --no-audit --no-fund) && \
    npm cache clean --force

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

# Create cache directory
RUN mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

ENV PORT=3000
ENV NODE_ENV=production

# Start application
CMD ["npm", "run", "start"]

