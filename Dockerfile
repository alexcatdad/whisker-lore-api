# Build stage
FROM oven/bun:1.1-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY src/ ./src/
COPY convex/ ./convex/
COPY tsconfig.json ./

# Production stage
FROM oven/bun:1.1-alpine

WORKDIR /app

# Copy dependencies and source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/convex ./convex
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    mkdir -p /app/data/logs && \
    chown -R appuser:appgroup /app

USER appuser

ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["bun", "src/api-server.ts"]
