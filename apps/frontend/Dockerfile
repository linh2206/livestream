FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (need dev deps for build)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build application (skip for now due to ARM64 issues)
# RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (need dev deps for dev mode)
RUN npm install --no-audit --no-fund && npm cache clean --force

# Copy source code (no build for now)
COPY --from=builder /app ./

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start application
CMD ["npm", "run", "dev"]

