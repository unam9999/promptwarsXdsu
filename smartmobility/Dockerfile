# ── Stage 1: Use nginx to serve static files ──
FROM nginx:alpine

# Copy all app files into nginx's default serve directory
COPY . /usr/share/nginx/html

# Simple nginx config — serve index.html, gzip enabled
RUN echo 'server { \
  listen 8080; \
  root /usr/share/nginx/html; \
  index index.html; \
  gzip on; \
  gzip_types text/plain text/css application/javascript application/json; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
