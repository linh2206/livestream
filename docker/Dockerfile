FROM nginx:alpine

# Install dependencies
RUN apk add --no-cache curl ffmpeg

# Create directories
RUN mkdir -p /var/www/html /hls /var/log/nginx

# Copy configuration and web files
COPY nginx.conf /etc/nginx/nginx.conf
COPY ../web/* /var/www/html/

# Set permissions
RUN chown -R nginx:nginx /var/www/html /hls /var/log/nginx

# Expose ports
EXPOSE 80 1935

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
