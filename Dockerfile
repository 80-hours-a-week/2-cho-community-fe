# Frontend Docker Image (multi-stage build)
# Build: docker build -t my-community-fe:latest ./2-cho-community-fe

# Stage 1: Vite 빌드
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Nginx 서빙
FROM nginx:alpine

ARG APP_VERSION=1.0.0
LABEL maintainer="corpseonthemission@icloud.com"
LABEL version="${APP_VERSION}"
LABEL description="my-community-fe: A community platform frontend built with Vanilla JS and served by Nginx"

# Copy build output to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
