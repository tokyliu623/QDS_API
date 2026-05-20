# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN mkdir -p public
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

# 安装 Python 和 openpyxl (用于 Excel 中文解析)
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --no-cache-dir openpyxl --break-system-packages

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p /app/data/cache && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 5051

ENV PORT=5051
ENV NODE_ENV=production
ENV DB_FILE=/app/data/cache.db
ENV CACHE_DIR=/app/data/cache
ENV CACHE_EXPIRE_DAYS=7

CMD ["node", "server.js"]