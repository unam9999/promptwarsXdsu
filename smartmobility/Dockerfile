# ── Build stage ──
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ── Production stage ──
FROM node:20-alpine

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy deps from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY package.json server.js ./
COPY public ./public

# Switch to non-root user
USER appuser

# Cloud Run uses PORT env var (default 8080)
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/config || exit 1

CMD ["node", "server.js"]
