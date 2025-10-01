FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (need nest CLI for start)
RUN npm ci --no-audit --no-fund && npm cache clean --force

# Copy source code
COPY . .

# Expose port
EXPOSE 9000

ENV PORT=9000
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
