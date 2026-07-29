# 生产部署

单 VPS 部署：仅 `80/443` 对外，Node API `3847` 与 Python 侧车 `5799` 监听 `127.0.0.1`。

## 1. 服务器前置

- Node.js 20+、Python 3.10+、Nginx、PM2
- 应用目录示例：`/var/www/creativeai`

```bash
git clone <repo-url> /var/www/creativeai
cd /var/www/creativeai
npm install
pip install -r server/promts/creagic-engine/requirements-api.txt  # 启用 Creagic 时
```

## 2. 环境变量

复制 `.env.example` → `.env`，至少配置：

```env
AIHUBMIX_API_KEY=...
API_HOST=127.0.0.1
PORT=3847
API_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
CREAGIC_PYTHON_URL=http://127.0.0.1:5799
CREAGIC_INTERNAL_HEADER_VALUE=<long-random-token>
```

**切勿**将 `.env` 提交到 Git 或暴露到公网。

## 3. 构建与 PM2

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

PM2 启动：

- `creativeai-api` — Express `:3847`
- `creativeai-creagic` — Python `:5799`

前端静态文件由 Nginx 直接提供 `dist/`，不在 PM2 中。

## 4. Nginx

模板：[deploy/nginx.creativeai.conf.example](../deploy/nginx.creativeai.conf.example)

需替换：

- `server_name`
- SSL 证书路径
- `x-internal-proxy-token`（与 `CREAGIC_INTERNAL_HEADER_VALUE` 一致）
- 前端 `root` 指向 `dist/`

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 5. HTTPS（Let's Encrypt）

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d your-domain.com -d www.your-domain.com
sudo nginx -t && sudo systemctl reload nginx
```

## 6. 防火墙

允许：`22`（SSH）、`80`、`443`  
禁止公网访问：`3847`、`5799`

## 7. 上线检查

```bash
sh scripts/deploy-healthcheck.sh your-domain.com
```

手动验证：

- [ ] 登录（当前为 Mock，按需替换）
- [ ] Agent 对话 `/api/agent/chat`
- [ ] 文生图 `/api/images`
- [ ] 文生视频 `/api/videos`
- [ ] 分镜拆分 `/api/storyboard/split`
- [ ] Creagic 链路 `/api/creagic/health`（若启用）
