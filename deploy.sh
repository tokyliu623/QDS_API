#!/bin/bash
set -e

# QDS API - 自动化部署脚本
# 功能：Docker部署 + 定时任务配置
# 前提：运维已配置Nginx: /api/vivo-docs/ → 5051

APP_NAME="qds-api"
APP_PORT="5051"
DATA_DIR="/data/qds-api/data"
CACHE_DIR="/data/qds-api/data/cache"
LOG_DIR="/data/qds-api/logs"
IMAGE_NAME="qds-api:latest"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  QDS API - 自动化部署"
echo "========================================="
echo ""

# [1/6] 检查环境
echo "[1/6] 检查环境..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 未安装 Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 已就绪${NC}"

# [2/6] 创建目录
echo ""
echo "[2/6] 创建数据目录..."
mkdir -p "$DATA_DIR" "$CACHE_DIR" "$LOG_DIR"
echo -e "${GREEN}✅ 目录创建完成${NC}"

# [3/6] 检查 .env 文件
echo ""
echo "[3/6] 检查配置文件..."
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 未找到 .env 文件${NC}"
    echo "   请复制 .env.example 并配置 VIVO_AK 和 VIVO_SK"
    exit 1
fi
echo -e "${GREEN}✅ 配置文件存在${NC}"

# [4/6] 构建镜像
echo ""
echo "[4/6] 构建 Docker 镜像..."
docker build --no-cache -t "$IMAGE_NAME" .
echo -e "${GREEN}✅ 镜像构建完成${NC}"

# [5/6] 部署容器
echo ""
echo "[5/6] 部署容器..."
if docker ps -a --format '{{.Names}}' | grep -q "^${APP_NAME}$"; then
    echo "停止旧容器..."
    docker stop "$APP_NAME" 2>/dev/null || true
    docker rm "$APP_NAME" 2>/dev/null || true
fi

docker run -d \
    --name "$APP_NAME" \
    --restart always \
    -p "127.0.0.1:${APP_PORT}:${APP_PORT}" \
    -v "${DATA_DIR}:/app/data" \
    --env-file .env \
    -e DATABASE_URL=file:/app/data/dev.db \
    -e CACHE_DIR=/app/data/cache \
    "$IMAGE_NAME"

sleep 5
echo -e "${GREEN}✅ 容器启动完成${NC}"

# [6/6] 配置定时任务
echo ""
echo "[6/6] 配置定时任务..."
CRON_JOB="0 2 * * * docker exec qds-api npx tsx /app/scripts/cleanup-cache.ts >> /data/qds-api/logs/cleanup.log 2>&1"

if ! crontab -l 2>/dev/null | grep -q "qds-api"; then
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo -e "${GREEN}✅ 定时任务已添加${NC}"
else
    echo -e "${YELLOW}⚠️  定时任务已存在，跳过${NC}"
fi

# 验证服务
echo ""
echo "验证服务..."
MAX_RETRIES=10
RETRY_COUNT=0
HEALTHY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "http://localhost:${APP_PORT}/api/health" &> /dev/null; then
        HEALTHY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  等待服务响应... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 3
done

if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}✅ 服务健康检查通过${NC}"
else
    echo -e "${YELLOW}⚠️  服务可能仍在启动中${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}  🎉 QDS API 部署完成！${NC}"
echo "========================================="
echo ""
echo "  📍 访问地址:"
echo "     - 内网: http://localhost:${APP_PORT}"
echo "     - 外网: http://qds-test.vmic.xyz/api/vivo-docs/"
echo ""
echo "  📊 数据目录:"
echo "     - 数据: $DATA_DIR"
echo "     - 缓存: $CACHE_DIR"
echo "     - 日志: $LOG_DIR"
echo ""
echo "  🔧 常用命令:"
echo "     - 查看日志: docker logs -f ${APP_NAME}"
echo "     - 重启服务: docker restart ${APP_NAME}"
echo "     - 清理缓存: docker exec ${APP_NAME} npx tsx /app/scripts/cleanup-cache.ts"
echo ""
echo "========================================="