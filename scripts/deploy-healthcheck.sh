#!/usr/bin/env sh
set -e

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "用法: sh scripts/deploy-healthcheck.sh your-domain.com"
  exit 1
fi

echo "[1/4] 检查首页"
curl -fsS "https://${DOMAIN}/" >/dev/null

echo "[2/4] 检查健康接口"
curl -fsS "https://${DOMAIN}/api/health" >/dev/null

echo "[3/4] 检查后端端口不对外（3847）"
if curl -m 3 -fsS "http://${DOMAIN}:3847/api/health" >/dev/null 2>&1; then
  echo "失败: 3847 对外可访问"
  exit 1
fi

echo "[4/4] 检查侧车端口不对外（5799）"
if curl -m 3 -fsS "http://${DOMAIN}:5799/health" >/dev/null 2>&1; then
  echo "失败: 5799 对外可访问"
  exit 1
fi

echo "健康检查通过"
