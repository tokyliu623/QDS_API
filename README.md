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