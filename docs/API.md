# API 参考

浏览器统一调用 **`/api/*`**。开发时由 Vite 内嵌中间件处理；生产由 Nginx 反代到 Express `:3847`。

## Node API（Express / Vite 共用）

实现：`server/aiHandlers.ts`、`server/agent/`、`server/index.ts`、`vite-local-api-plugin.ts`。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/models` | 对话 / 生图模型列表 |
| POST | `/api/chat` | 基础 OpenAI 兼容对话 |
| POST | `/api/agent/chat` | Agent 对话（工具循环，**编辑器主路径**） |
| POST | `/api/images` | 文生图 / 参考图编辑 |
| POST | `/api/images/remove-bg` | Liblib Comfy 抠图 |
| POST | `/api/images/enhance` | Liblib Comfy 质感增强 |
| POST | `/api/videos` | 文生视频 |
| GET | `/api/videos/raw/:token` | 视频流代理 |
| POST | `/api/route-intent` | 意图识别 |
| POST | `/api/storyboard/split` | 分镜正文拆分为镜头列表 |
| POST | `/api/tasks/plan` | 多图任务规划 |
| POST | `/api/tasks/stream` | 执行任务流（SSE） |
| POST | `/api/tasks/auto` | 自动规划并执行 |
| ALL | `/api/creagic/*` | 转发至 Creagic Python 侧车 |

### 常用请求体

**POST /api/agent/chat**

```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "model": "optional-model-id"
}
```

**POST /api/images**

```json
{
  "prompt": "...",
  "model": "optional",
  "referenceImageUrl": "optional-https-url"
}
```

**POST /api/storyboard/split**

```json
{
  "assistantText": "分镜正文...",
  "targetCount": 6
}
```

响应：`{ "shots": ["镜头1", "镜头2", ...] }`

## Creagic Python 侧车

入口：`server/promts/creagic-engine/src/creagic/api_app.py`  
默认：`http://127.0.0.1:5799`  
浏览器路径前缀：`/api/creagic`（Node 去掉前缀后转发）

| 方法 | Python 路径 | 说明 |
|------|-------------|------|
| GET | `/health` | 健康检查 |
| POST/GET/PATCH/DELETE | `/sessions` | 会话 CRUD |
| POST | `/engine/prepare` | 对话前：记忆 / 上下文 |
| POST | `/engine/postprocess` | 对话后处理 |
| GET | `/tools/openai` | OpenAI 格式工具定义 |
| POST | `/tools/execute` | 工具执行 |
| POST | `/tools/approve` | 工具审批 |
| POST | `/engine/plan` | 任务规划 |
| POST | `/engine/validate` | 质量验证 |
| POST | `/engine/multi-agent` | 多 Agent |
| POST/GET | `/snapshots` | 快照 |
| POST | `/snapshots/{id}/restore` | 恢复快照 |
| GET | `/stats` | 统计 |

生产环境建议配置 `CREAGIC_INTERNAL_HEADER_NAME` / `CREAGIC_INTERNAL_HEADER_VALUE`，由 Nginx 注入内部头，Express 校验后转发。

## 限流

默认对以下前缀限流（`API_RATE_LIMIT_*`）：

- `/api/chat`、`/api/images`、`/api/videos`、`/api/route-intent`、`/api/agent`、`/api/tasks`
