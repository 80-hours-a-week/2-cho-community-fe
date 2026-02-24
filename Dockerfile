# Frontend Docker Image
# Build: docker build -t my-community-frontend:latest ./2-cho-community-fe

FROM nginx:alpine

ARG APP_VERSION=1.0.0
LABEL maintainer="corpseonthemission@icloud.com"
LABEL version="${APP_VERSION}"
LABEL description="my-community-frontend"

# Copy static files to Nginx html directory
COPY . /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
