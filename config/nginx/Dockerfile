FROM nginx:alpine

# Install nginx-rtmp-module
RUN apk add --no-cache \
    git \
    build-base \
    pcre-dev \
    zlib-dev \
    openssl-dev \
    && cd /tmp \
    && git clone https://github.com/arut/nginx-rtmp-module.git \
    && wget http://nginx.org/download/nginx-1.24.0.tar.gz \
    && tar -xzf nginx-1.24.0.tar.gz \
    && cd nginx-1.24.0 \
    && ./configure \
        --prefix=/etc/nginx \
        --sbin-path=/usr/sbin/nginx \
        --modules-path=/usr/lib/nginx/modules \
        --conf-path=/etc/nginx/nginx.conf \
        --error-log-path=/var/log/nginx/error.log \
        --http-log-path=/var/log/nginx/access.log \
        --pid-path=/var/run/nginx.pid \
        --lock-path=/var/run/nginx.lock \
        --http-client-body-temp-path=/var/cache/nginx/client_temp \
        --http-proxy-temp-path=/var/cache/nginx/proxy_temp \
        --http-fastcgi-temp-path=/var/cache/nginx/fastcgi_temp \
        --http-uwsgi-temp-path=/var/cache/nginx/uwsgi_temp \
        --http-scgi-temp-path=/var/cache/nginx/scgi_temp \
        --with-perl_modules_path=/usr/lib/perl5/vendor_perl \
        --user=nginx \
        --group=nginx \
        --with-compat \
        --with-file-aio \
        --with-threads \
        --with-http_addition_module \
        --with-http_auth_request_module \
        --with-http_dav_module \
        --with-http_flv_module \
        --with-http_gunzip_module \
        --with-http_gzip_static_module \
        --with-http_mp4_module \
        --with-http_random_index_module \
        --with-http_realip_module \
        --with-http_secure_link_module \
        --with-http_slice_module \
        --with-http_ssl_module \
        --with-http_stub_status_module \
        --with-http_sub_module \
        --with-http_v2_module \
        --with-mail \
        --with-mail_ssl_module \
        --with-stream \
        --with-stream_realip_module \
        --with-stream_ssl_module \
        --with-stream_ssl_preread_module \
        --add-module=/tmp/nginx-rtmp-module \
    && make \
    && make install \
    && apk del git build-base

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create directories
RUN mkdir -p /var/www/html/hls \
    && chown -R nginx:nginx /var/www/html

# Expose ports
EXPOSE 8080 1935

CMD ["nginx", "-g", "daemon off;"]