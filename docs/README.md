# CreativeAI 文档索引

Lovart — Design Made Simple。本文档目录与代码一一对应，便于本地开发与 Git 协作。

## 文档结构

| 文档 | 内容 |
|------|------|
| [FEATURES.md](./FEATURES.md) | 功能清单、前端模块、所需环境变量 |
| [API.md](./API.md) | Node / Creagic 全部 HTTP 端点 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 架构、进程、目录、数据流 |
| [DEPLOY.md](./DEPLOY.md) | 生产部署（Nginx + PM2 + HTTPS） |

## 根目录关键文件

| 文件 | 用途 |
|------|------|
| [../README.md](../README.md) | 快速开始 |
| [../.env.example](../.env.example) | 环境变量模板（复制为 `.env`） |
| [../package.json](../package.json) | npm 脚本 |
| [../deploy/nginx.creativeai.conf.example](../deploy/nginx.creativeai.conf.example) | Nginx 模板 |
| [../ecosystem.config.cjs](../ecosystem.config.cjs) | PM2 进程配置 |

## 子模块文档

| 路径 | 说明 |
|------|------|
| [../server/promts/creagic-engine/README.md](../server/promts/creagic-engine/README.md) | Creagic Python 引擎（记忆 / 工具 / 规划 / 验证） |
| [../public/editor-skills/如何使用.txt](../public/editor-skills/如何使用.txt) | 编辑器技能扩展 |
| [../Login process/README.md](../Login process/README.md) | 历史脚手架（未接入主应用） |

## npm 脚本速查

| 命令 | 作用 |
|------|------|
| `npm run dev` | Vite 前端 `:3000`，内嵌 `/api/*` |
| `npm run server` | Express API `:3847`（生产反代目标） |
| `npm run creagic:api` | Creagic Python 侧车 `:5799` |
| `npm run dev:full` | 上述三者并行 |
| `npm run build` | 构建静态前端到 `dist/` |
| `npm run preview` | 预览构建产物（含 API 中间件） |
| `npm run lint` | TypeScript 类型检查 |
| `npm run test` | COS 解析单元测试 |

## 上传 Git 前检查

- [ ] 已复制 `.env.example` → `.env`，且 **未** 提交 `.env`
- [ ] `.gitignore` 已排除 `node_modules/`、`dist/`、`data/`、`.git.bak-*/`
- [ ] 生产部署需配置 `AIHUBMIX_API_KEY`、`API_ALLOWED_ORIGINS` 等（见 `.env.example`）
- [ ] 启用 Creagic 侧车时安装 Python 依赖：`pip install -r server/promts/creagic-engine/requirements-api.txt`
