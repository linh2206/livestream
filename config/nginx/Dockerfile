FROM alfg/nginx-rtmp

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories and set permissions
RUN mkdir -p /var/www/html/hls && \
    chmod -R 777 /var/www/html/hls

# Create script to fix permissions automatically
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'chmod -R 777 /var/www/html/hls' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 8080 1935

CMD ["/start.sh"]