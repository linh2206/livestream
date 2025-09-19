FROM tiangolo/nginx-rtmp

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories
RUN mkdir -p /var/www/html/hls

# Expose ports
EXPOSE 8080 1935

CMD ["nginx", "-g", "daemon off;"]