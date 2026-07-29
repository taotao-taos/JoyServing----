# 字体与字号规范

> 适用于 JoyServing · 京小灵全站排版。来源：`src/index.css` + `lib/ui.ts` + 全站 TSX。  
> **写作格式**：字号 Token / class + **px** + Hex（文本色）+ Tailwind，与 [forms.md](./forms.md) 一致。

---

## 一、字体族

| 用途 | 定义 | Tailwind | 是否必选 |
|------|------|----------|----------|
| 全局正文 | `'Inter Variable', sans-serif` | `font-sans` | 必选 |
| 标题 alias | `var(--font-sans)` | `font-heading` | shadcn Card/Dialog 标题 |
| 等宽 | 系统 mono | `font-mono` | ID、Cron、代码块 |

**（强约束）**：`html { font-sans }`，body 默认 `text-foreground`（`#111111`）。历史文档中的 Geist 已废弃，以 Inter 为准。

---

## 二、字号层级（强约束）

### 2.1 标准层级表

| 层级 | class | px | 字重 | 字色 Hex | 用途 |
|------|-------|-----|------|----------|------|
| 页面主标题 | `text-xl font-extrabold tracking-tight` | 20px | extrabold | `#111111` | `<PageHeader>` h1 |
| 弹窗/区块标题 | `text-sm font-extrabold` | 14px | extrabold | `#111111` | Modal h2、面板标题 |
| shadcn 卡片标题 | `text-sm font-medium` | 14px | medium | `#111111` | CardTitle、DialogTitle |
| **默认正文** | `text-xs/relaxed` | 12px | medium | `#111111` | PAGE、按钮、表单、表格 |
| 表格/筛选 | `text-[11px]` | 11px | medium~bold | `#404040` | Dashboard、ABTest 表格 |
| 表头/徽章 | `text-[10px]` | 10px | medium~semibold | `#A3A3A3` | 表头 uppercase、badgeClass |
| 侧栏一级 | `text-[12.5px] font-bold` | 12.5px | bold | `#262626` | Navigation |
| 侧栏二级 | `text-[12px] font-medium` | 12px | medium | `#737373` | 子导航 |
| 分组标签 | `text-[10px] font-extrabold uppercase tracking-widest` | 10px | extrabold | `#A3A3A3` | 「项目」「组织」 |
| 最微字 | `text-[9px]`~`text-[8px]` | 8~9px | bold | `#737373` | Beta 标、角标、ID |

### 2.2 Tailwind 标准字号对照

| class | px | 行高 | 用途 |
|-------|-----|------|------|
| `text-[0.625rem]` | 10px | — | Button size=xs |
| `text-xs` / `text-xs/relaxed` | 12px | ~19.5px | **全站默认密度** |
| `text-sm` | 14px | 20px | 标题、描述 |
| `text-base` | 16px | 24px | CardIcon sm |
| `text-lg` | 18px | 28px | Login 副标题 |
| `text-xl` | 20px | 28px | PageHeader |
| `text-2xl` | 24px | 32px | 特例大标题（少用） |

---

## 三、字重梯度

| class | 用途 | 典型场景 |
|------|------|----------|
| `font-black` | 900 | Beta 标、通知数字 `#FFFFFF` 上 |
| `font-extrabold` | 800 | **页面标题**、uppercase 分组 |
| `font-bold` | 700 | 表格强调列、Navigation 标题 |
| `font-semibold` | 600 | 激活导航、Toast、雇佣按钮 |
| `font-medium` | 500 | **默认控件**、表头、Label |
| `font-normal` | 400 | 长描述（少用） |

**（强约束）**：标题不得用 `font-normal`；控件默认 `font-medium`。

---

## 四、行高与字距

| Token | class | 数值/效果 | 用途 |
|-------|-------|-----------|------|
| 默认行高 | `text-xs/relaxed` | lh ≈ 1.625 | 正文、按钮、表单 |
| 紧凑 | `leading-tight` | lh ≈ 1.25 | 标题、表格单元格 |
| 略紧 | `leading-snug` | lh ≈ 1.375 | line-clamp 场景 |
| 无行高 | `leading-none` | lh = 1 | 徽章、进度条标签 |
| 宽松 | `leading-relaxed` | lh ≈ 1.625 | 描述段落 |
| 字距紧 | `tracking-tight` | — | PageHeader、Toast |
| 字距宽 | `tracking-wider` / `tracking-widest` | — | 表头/侧栏 uppercase |
| 等宽数字 | `tabular-nums` | — | Dashboard 指标 |
| 截断 | `line-clamp-2` | — | 实验名、卡片描述 |

---

## 五、文本色层级

| 层级 | Hex | Tailwind | 场景 |
|------|-----|----------|------|
| 主标题/正文 | `#111111` | `text-foreground` / `text-neutral-900` | h1、主列 |
| 次级正文 | `#262626` | `text-neutral-800` | 侧栏标题 |
| 次要/Label | `#737373` | `text-muted-foreground` / `text-neutral-500` | Label、描述 |
| 最弱/表头 | `#A3A3A3` | `text-neutral-400` | 时间戳、placeholder 旁 |
| 侧栏图标 | `#737373` | `text-neutral-550` | 未激活图标 |
| 反色 | `#FFFFFF` | `text-white` / `text-primary-foreground` | 墨黑按钮、Toast |
| 链接 | `#111111` | `text-primary underline` | link variant |
| 错误 | `#DC2626` | `text-destructive` | 校验提示 |

---

## 六、组件排版规范

### 6.1 PageHeader（强约束）

```
容器: gap-3 pb-3.5 mb-5 border-b border-line #E7E5E0
h1:   text-xl(20px) font-extrabold #111111 tracking-tight gap-2
右侧: gap-3
```

### 6.2 Modal

```
标题: text-sm(14px) font-extrabold #111111 mb-4
正文: text-xs(12px) #111111
Footer 分隔: border-neutral-100 #F5F5F5
```

### 6.3 表格表头（强约束）

```
背景: bg-neutral-50 #FAFAFA 或 bg-rail #F5F4F0
字: text-[10px] #A3A3A3 font-medium uppercase tracking-wider
分隔: border-b border-neutral-200 #E5E5E5
```

### 6.4 Toast

```
字: text-xs(12px) font-semibold tracking-tight #FFFFFF
底: bg-ink #111111 rounded-xl
图标: #E5E5E5 text-neutral-200 size-14px
```

---

## 七、校验规则

### 示例

- ✅ PageHeader 用 `text-xl font-extrabold`，字色 `#111111`
- ✅ 表单/按钮用 `text-xs/relaxed`（12px）
- ✅ Label 用 `text-muted-foreground`（`#737373`）
- ❌ 页面标题 `text-2xl` 未走 PageHeader
- ❌ 正文 `text-sm`（14px）导致密度不一致
- ❌ `text-[#333333]` 裸 Hex

### 修正建议

- 裸 Hex → `text-foreground` / `text-muted-foreground`
- 过大标题 → 收敛到 PageHeader `text-xl`
- 表格字过大 → 统一 `text-[11px]` 或 `text-xs`

---

## 八、校验清单

- [ ] 全局 `font-sans`（Inter Variable）
- [ ] 页面标题仅 PageHeader 输出 `text-xl font-extrabold`
- [ ] 页面/表单默认 `text-xs/relaxed`（12px）
- [ ] Label `#737373`，主文 `#111111`
- [ ] 表头 `text-[10px]` + uppercase + `#A3A3A3`
- [ ] 无裸 Hex 字号/字色
- [ ] 与 `forms.md`、`ui-constants.md` 一致
