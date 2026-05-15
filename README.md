# QDS API

Vivo 文档读取 API 服务

## 功能特性

- 读取 vivo 在线文档（Excel/CSV/JSON）
- Token 校验
- 文件缓存（7 天过期）
- 多 Sheet Excel 支持

## API 端点

| API | 方法 | 说明 |
|-----|------|------|
| `/api/vivo-docs/read` | POST | 读取文档 |
| `/api/vivo-docs/validate` | GET | 校验 Token |
| `/api/health` | GET | 健康检查 |

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env
# 编辑 .env，填入 VIVO_AK 和 VIVO_SK

# 初始化数据库
npm run db:push

# 启动开发服务器
npm run dev
```

### Docker 部署

```bash
# 构建镜像
docker build -t qds-api:latest .

# 运行容器
docker run -d \
  --name qds-api \
  --restart always \
  -p 0.0.0.0:5051:5051 \
  -v /data/qds-api/data:/app/data \
  -v /data/qds-api/cache:/app/data/cache \
  --env-file .env \
  qds-api:latest
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| VIVO_AK | vivo API 密钥 AK | 是 |
| VIVO_SK | vivo API 密钥 SK | 是 |
| DATABASE_URL | 数据库路径 | 否 |
| PORT | 服务端口 | 否 |
| CACHE_DIR | 缓存目录 | 否 |
| CACHE_EXPIRE_DAYS | 缓存过期天数 | 否 |

## 缓存清理

定时任务清理（每天凌晨 2:00）：

```bash
0 2 * * * docker exec qds-api npx tsx /app/scripts/cleanup-cache.ts >> /var/log/qds-api-cleanup.log 2>&1
```

## API 使用示例

### 读取文档

```bash
curl -X POST http://localhost:5051/api/vivo-docs/read \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.vivo.xyz/s/xxx", "apiToken": "your_token"}'
```

### 校验 Token

```bash
curl "http://localhost:5051/api/vivo-docs/validate?token=your_token"
```

## 服务器部署指南

### 1. 克隆仓库

```bash
cd /data/qds-api
git clone https://github.com/tokyliu623/QDS_API.git
```

### 2. 创建环境变量文件

```bash
cd QDS_API
cp .env.example .env
```

编辑 `.env` 文件：

```bash
VIVO_AK=your_actual_ak_here
VIVO_SK=your_actual_sk_here
DATABASE_URL=file:/app/data/dev.db
PORT=5051
CACHE_DIR=/app/data/cache
CACHE_EXPIRE_DAYS=7
```

### 3. Docker 部署

```bash
# 构建镜像
docker build -t qds-api:latest .

# 创建数据目录
mkdir -p /data/qds-api/data/cache

# 运行容器
docker run -d \
  --name qds-api \
  --restart always \
  -p 0.0.0.0:5051:5051 \
  -v /data/qds-api/data:/app/data \
  --env-file .env \
  qds-api:latest
```

### 4. Nginx 配置

在 `/etc/nginx/conf.d/qds-api.conf` 添加：

```nginx
server {
    listen 80;
    server_name qds-test.vmic.xyz;

    location /api/vivo-docs/ {
        proxy_pass http://localhost:5051/api/vivo-docs/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/health {
        proxy_pass http://localhost:5051/api/health;
    }
}
```

### 5. 配置缓存清理定时任务

```bash
# 编辑 crontab
crontab -e

# 添加以下行
0 2 * * * docker exec qds-api npx tsx /app/scripts/cleanup-cache.ts >> /var/log/qds-api-cleanup.log 2>&1
```

### 6. 验证部署

```bash
# 检查服务状态
curl http://localhost:5051/api/health

# 测试 Token 校验
curl "http://localhost:5051/api/vivo-docs/validate?token=your_token"

# 测试文档读取
curl -X POST http://localhost:5051/api/vivo-docs/read \
  -H "Content-Type: application/json" \
  -d '{"url": "https://docs.vivo.xyz/s/xxx", "apiToken": "your_token"}'
```

## 运维命令

```bash
# 查看日志
docker logs -f qds-api

# 重启服务
docker restart qds-api

# 进入容器
docker exec -it qds-api sh

# 查看缓存统计
curl http://localhost:5051/api/health

# 手动清理缓存
docker exec qds-api npx tsx /app/scripts/cleanup-cache.ts
```