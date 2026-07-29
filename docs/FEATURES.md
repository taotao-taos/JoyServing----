# 功能清单

## 1. 认证与账户（前端 Mock）

| 功能 | 实现 | 说明 |
|------|------|------|
| 登录 / 注册 / 激活 / 忘记密码 | `src/components/LoginPage.tsx` | **无后端**，纯 localStorage |
| 测试账号 | 同上 | `admin@creagic.com` / `123456`，邀请码 `CREAGIC` |
| 登出 | `Header.tsx` | 清除 `creagic_auth_logged_in` |

> 生产环境需替换为真实认证服务；`Login process/` 为旧 Gemini 脚手架，**未接入**主应用。

## 2. 首页与项目

| 功能 | 实现 | 依赖 |
|------|------|------|
| 搜索启动编辑器 | `MainContent.tsx` | 无 |
| 分类推荐 | `CategoryChips.tsx` | `public/editor-skills/` |
| 项目列表 CRUD | `ProjectsPage.tsx` | `src/lib/projectsStorage.ts`（localStorage） |
| 积分显示 | `Header.tsx` | `src/lib/creditsStorage.ts`（前端 mock） |
| 定价弹窗 | `PricingModal.tsx` | UI only，无支付后端 |

## 3. 编辑器核心

| 功能 | API / 模块 | 必需环境变量 |
|------|------------|--------------|
| AI 对话（Agent） | `POST /api/agent/chat` | `AIHUBMIX_API_KEY` |
| 基础对话 | `POST /api/chat` | 同上 |
| 文生图 | `POST /api/images` | `AIHUBMIX_*` 或 `VOLCENGINE_*` / `GOOGLE_*`（见 `IMAGE_PROVIDER`） |
| 参考图编辑 | 同上 + `referenceImageUrl` | 可选 `TENCENT_COS_*` 中转 |
| 抠图 | `POST /api/images/remove-bg` | `LIBLIB_COMFY_*` |
| 质感增强 | `POST /api/images/enhance` | `LIBLIB_COMFY_*` |
| 文生视频 | `POST /api/videos` | `AIHUBMIX_API_KEY`，可选 `AIHUBMIX_VIDEO_*` |
| 意图路由 | `POST /api/route-intent` | `AIHUBMIX_API_KEY` |
| 多图任务规划 | `POST /api/tasks/plan` | 同上 |
| 多图任务执行（SSE） | `POST /api/tasks/stream` | 同上 |
| 自动规划+执行 | `POST /api/tasks/auto` | 同上 |
| 分镜拆分 | `POST /api/storyboard/split` | 无（启发式拆分） |
| 分镜批量出图 | `EditorPage.tsx` + 生图 API | 文生图通道 |
| 模型列表 | `GET /api/models` | 无 |
| 聊天会话持久化 | `src/lib/chatSessionStorage.ts` | localStorage |
| 编辑器技能 | `public/editor-skills/manifest.json` | 静态资源 |

## 4. Creagic 侧车（可选）

配置 `CREAGIC_PYTHON_URL=http://127.0.0.1:5799` 后启用：

| 功能 | 浏览器路径 | Python 路径 |
|------|-----------|-------------|
| 会话 CRUD | `/api/creagic/sessions` | `/sessions` |
| 对话前准备 | `/api/creagic/engine/prepare` | `/engine/prepare` |
| 对话后处理 | `/api/creagic/engine/postprocess` | `/engine/postprocess` |
| 工具定义 / 执行 | `/api/creagic/tools/*` | `/tools/*` |
| 任务规划 / 验证 | `/api/creagic/engine/plan` 等 | 同名 |
| 快照 | `/api/creagic/snapshots` | `/snapshots` |

详见 [API.md](./API.md) 与 [creagic-engine README](../server/promts/creagic-engine/README.md)。

## 5. 编辑器技能（public/editor-skills）

| 分类 | 文件 |
|------|------|
| 海报宣传 | `categories/design.md` |
| 社交封面 | `categories/social.md` |
| 品牌设计 | `categories/branding.md` |
| 风格插画 | `categories/illustration.md` |
| 电商营销 | `categories/ecommerce.md` |
| 视频分镜 | `categories/video.md` |
| 分镜故事板套件 | `分镜故事板/SKILL.md` |

模型 UI 清单：`public/ai-models/manifest.json`。

## 6. 最小可运行配置

仅体验对话 + 生图：

```env
AIHUBMIX_API_KEY=sk-your-key-here
```

完整本地开发（含 Creagic）：

```env
AIHUBMIX_API_KEY=sk-your-key-here
CREAGIC_PYTHON_URL=http://127.0.0.1:5799
```

生产部署额外需要：

```env
API_HOST=127.0.0.1
PORT=3847
API_ALLOWED_ORIGINS=https://your-domain.com
CREAGIC_INTERNAL_HEADER_VALUE=<long-random-token>
```

完整变量说明见 [../.env.example](../.env.example)。
