---
name: design-system-index
description: JoyServing 京小灵设计系统全量 Token 索引。覆盖全部 CSS 变量+Hex、neutral/语义色阶、H5/V1/V4 间距、圆角/阴影/字阶/z-index、lib/ui 解码。新增/修改 UI、查 token、消除裸 Hex（如 #F2F7FF）前必须加载 tokens-full.md。
---

## 设计规范索引

**应用手册（产品/Agent 流程）**：[`APPLICATION-MANUAL.md`](APPLICATION-MANUAL.md) — 模板选型、Token 拼装、五维自检、PRD 交付格式。

**Token 全量入口**：[`references/tokens-full.md`](references/tokens-full.md) — 覆盖颜色/间距/圆角/阴影/字阶/z-index/`lib/ui` 全部 token。

本 Skill 对齐 [design-system-skills](https://github.com/xasking/design-system-skills/tree/main/design-system-index) 写作规范：
- **颜色**：Token + oklch + **Hex** + Tailwind
- **间距**：H5 / V1 / V4 / V5 + px + class
- **禁止**：TSX 裸 Hex → 查 tokens-full §3.8 映射表

**优先级**：`src/index.css` + `lib/ui.ts` > 共享组件 > `DESIGN.md` > 本 skill。

---

## 使用方式

1. **查 token / 做 UI / 审查样式** → 先读 `tokens-full.md`
2. 按场景补充读专题 reference（表单/组件/审查）
3. 实现 import `@/lib/ui` + `common/` 组件

### 场景 → references

| 场景 | 必读 |
|------|------|
| **产出 UI 规格 / 拼页面（产品）** | **`APPLICATION-MANUAL.md`** |
| **全量 token 查询（默认）** | **`tokens-full.md`** |
| 表单 / Modal CRUD | `tokens-full.md` + `forms.md` |
| 组件 className | `tokens-full.md` + `components-full.md` |
| 代码审查 | `tokens-full.md` + `code-compliance.md` |
| 配色专题 | `color-tokens.md`（tokens-full 子集） |
| 间距专题 | `spacing-scale.md`（tokens-full 子集） |
| 圆角/阴影专题 | `radius-shadow.md` |
| 字阶专题 | `typography.md` |
| ui 常量原文 | `ui-constants.md` |
| 需求结构化 | `input-templates.md` |

---

## 快速必记（摘自 tokens-full）

### 核心色 Hex

| 语义 | Hex | Tailwind |
|------|-----|----------|
| 画布 | `#FFFFFF` | `bg-background` |
| 纸底 | `#FAF9F6` | `bg-paper` |
| 主文/墨黑 | `#111111` | `text-foreground` / `bg-primary` |
| Label | `#737373` | `text-muted-foreground` |
| 描边 | `#E8E8E8` | `border-border` / `border-input` |
| 发丝线 | `#E7E5E0` | `border-line` |
| 聚焦环 | `#A3A3A3` | `ring-ring/30` |
| 错误 | `#DC2626` | `text-destructive` |
| 实时蓝 | `#1E90FF` | `text-live` |
| 信息浅蓝 | `#F0F9FF`（稿 `#F2F7FF`） | `bg-sky-50` |
| 成功底 | `#ECFDF5` | `bg-emerald-50` |
| 警告底 | `#FFFBEB` | `bg-amber-50` |

### 间距

| Token | px | class |
|-------|-----|-------|
| H5 | 20 | `p-5` |
| V4 | 16 | `space-y-4` / `p-4` |
| V1 | 4 | `mb-1`（LABEL） |

### 圆角（`--radius: 0.45rem`）

| Token | px≈ | class |
|-------|-----|-------|
| radius-md | 6 | `rounded-md` 控件 |
| radius-lg | 7 | `rounded-lg` 面板 |
| radius-xl | 10 | `rounded-xl` 浮层 |

### 阴影

- 静态：`ring-1 ring-foreground/10`
- 弹窗：`shadow-lg`
- Toast：`0 10px 30px rgba(0,0,0,0.15)`

---

## Skill 结构

```
.cursor/skills/design-system-index/
├── SKILL.md
├── APPLICATION-MANUAL.md      # ★ 应用手册（产品流程 + 交付格式）
├── DESIGN-SYSTEM-FULL.md      # 全量合并版
└── references/
    ├── tokens-full.md         # ★ Token 全量注册表（首选）
    ├── color-tokens.md
    ├── typography.md
    ├── spacing-scale.md
    ├── radius-shadow.md
    ├── ui-constants.md
    ├── components-full.md
    ├── forms.md
    ├── code-compliance.md
    └── input-templates.md
```
