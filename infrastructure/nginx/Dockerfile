# Simple Nginx Dockerfile
FROM nginx:alpine

# Create necessary directories
RUN mkdir -p /var/www/hls /var/www/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create simple index.html
RUN echo '<html><body><h1>LiveStream App</h1><p>API: http://localhost:8080/api</p><p>Frontend: http://localhost:8080</p></body></html>' > /var/www/html/index.html

# Set permissions
RUN chown -R nginx:nginx /var/www && chmod -R 755 /var/www

# Expose port 8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]