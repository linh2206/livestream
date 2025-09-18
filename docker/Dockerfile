# Nginx RTMP Dockerfile
FROM nginx:alpine

# Install dependencies
RUN apk add --no-cache \
    nginx-mod-rtmp \
    ffmpeg \
    curl

# Create necessary directories
RUN mkdir -p /var/www/hls /var/www/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy web files
COPY ../web /var/www/html

# Set permissions
RUN chown -R nginx:nginx /var/www && \
    chmod -R 755 /var/www

# Expose ports
EXPOSE 8080 1935

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
