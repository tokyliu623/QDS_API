#!/bin/sh

set -e

echo "[entrypoint] Starting QDS API..."

DATABASE_URL="${DATABASE_URL:-file:/app/data/dev.db}"
CACHE_DIR="${CACHE_DIR:-/app/data/cache}"

mkdir -p /app/data
mkdir -p "$CACHE_DIR"

chown -R nextjs:nodejs /app/data 2>/dev/null || true

echo "[entrypoint] Running database migrations..."
npx prisma db push --skip-generate --schema=/app/prisma/schema.prisma --accept-data-loss || true

echo "[entrypoint] Starting server on port ${PORT:-5051}..."
exec node server.js