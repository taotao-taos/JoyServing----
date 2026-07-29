# 架构说明

## 进程与端口

```
浏览器
  │
  ├─ 开发：Vite :3000（vite-local-api-plugin 内嵌 /api/*）
  │
  └─ 生产：Nginx :443
         ├─ 静态文件 → dist/
         └─ /api/*   → Express :3847
                        └─ /api/creagic/* → FastAPI :5799（可选）
```

| 进程 | 命令 | 默认端口 |
|------|------|----------|
| Vite 前端 | `npm run dev` | 3000 |
| Express API | `npm run server` | 3847 |
| Creagic 侧车 | `npm run creagic:api` | 5799 |
| 一键启动 | `npm run dev:full` | 3000 + 3847 + 5799 |

## 目录结构

```
├── src/                      # React 前端
│   ├── components/           # 页面与 UI（Login、Editor、Projects…）
│   └── lib/                  # API 客户端、localStorage
├── components/               # 共享 UI（shadcn、AiModelPopover）
├── server/                   # Express + AI 逻辑
│   ├── index.ts              # 生产 API 入口
│   ├── aiHandlers.ts         # 对话 / 生图 / 视频 / Liblib / 火山 / COS
│   ├── agent/                # 意图路由、任务队列、工具、模型注册
│   ├── creagicClient.ts      # Node 调用 Creagic
│   └── promts/creagic-engine/  # Python FastAPI 侧车
├── public/
│   ├── editor-skills/        # 编辑器技能 manifest + 分类文档
│   └── ai-models/            # 模型 UI manifest
├── scripts/                  # dev-full、creagic-api、healthcheck
├── deploy/                   # Nginx 配置模板
├── docs/                     # 项目文档（本目录）
├── vite-local-api-plugin.ts  # 开发环境 API 中间件
└── Login process/            # 历史 Gemini 脚手架（未集成）
```

## 数据持久化

| 数据 | 存储 | 说明 |
|------|------|------|
| 登录态 | localStorage | Mock 认证 |
| 项目列表 | localStorage | `projectsStorage` |
| 聊天会话 | localStorage | `chatSessionStorage` |
| 积分 | localStorage | 前端 mock |
| Creagic 会话 / 记忆 | `data/creagic/` | Python 侧车（已在 .gitignore） |

## 前端 → 后端调用链

```
EditorPage
  ├─ chatApi        → /api/agent/chat
  ├─ imageApi       → /api/images、remove-bg、enhance
  ├─ videoApi       → /api/videos
  ├─ routeIntentApi → /api/route-intent
  ├─ storyboardSplitApi → /api/storyboard/split
  └─ fetch          → /api/creagic/sessions（可选）
```

## 文生图通道

由 `IMAGE_PROVIDER` 控制（默认 `volcengine`）：

1. **volcengine** — 火山即梦直连（`VOLCENGINE_*`）
2. **google** — Google 直连（`GOOGLE_*`）
3. **aihubmix** — AIhubMix OpenAI 兼容（`AIHUBMIX_*`）

参考图公网 URL 不稳定时可启用腾讯云 COS 中转（`TENCENT_COS_*`）。
