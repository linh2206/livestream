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

# Install ALL dependencies - fix package-lock sync issue
RUN rm -f package-lock.json && npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install curl and netcat for health checks with network resilience
RUN apk update --no-cache && \
    apk add --no-cache curl netcat-openbsd || \
    (sleep 5 && apk update --no-cache && apk add --no-cache curl netcat-openbsd)

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only with network resilience
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 300000 && \
    (rm -f package-lock.json && npm install --only=production --no-audit --no-fund) && \
    npm cache clean --force

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Create directories for HLS and logs
RUN mkdir -p /app/hls /app/logs && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/main.js --health-check || exit 1

ENV PORT=9000
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
