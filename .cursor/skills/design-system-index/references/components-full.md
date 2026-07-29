# 组件库规范（共享层 + shadcn）

> 适用于 JoyServing · 京小灵页面骨架与控件。来源：`src/components/common/*` + `components/ui/*`。  
> **（强约束）** 重复 UI 必须复用本规范组件，禁止逐页手抄。  
> **写作格式**：组件名 + 完整 class + Hex 关键色。

---

## 一、共享组件（`src/components/common/`）

### 1.1 PageHeader

| 区域 | class 摘要 | Hex |
|------|-----------|-----|
| 容器 | `gap-3 pb-3.5 mb-5 border-b border-line` | 线 `#E7E5E0` |
| h1 | `text-xl font-extrabold text-neutral-900 tracking-tight` | `#111111` |
| 右侧槽 | `flex items-center gap-3` | — |

```tsx
<PageHeader title="标题">
  <button className={BTN_INK}>新建</button>
</PageHeader>
```

### 1.2 SegmentedTabs

| 区域 | class 摘要 | Hex |
|------|-----------|-----|
| 容器 | `bg-muted/70 p-1 rounded-lg mb-5 ring-1 ring-foreground/10` | 底 `#F5F5F5` |
| 按钮 | `px-4 py-1.5 h-7 rounded-md text-xs/relaxed font-medium` | — |
| 激活 | `bg-background font-semibold ring-1 ring-foreground/10` | 底 `#FFFFFF` |
| 未激活 | `text-muted-foreground hover:text-foreground` | `#737373` |

**标准 tab 分组**：
- 员工：`employees` / `market`
- 训练：`kb` / `skills` / `tasks`
- 监测：`dashboard` / `abTest` / `staff` / `roles`

### 1.3 Modal（common）

| 区域 | 常量/class | Hex |
|------|-----------|-----|
| Overlay | `MODAL_OVERLAY` + `z-[130]` | 遮罩 `#00000066` |
| Panel | `MODAL_PANEL` + `max-w-sm` | 底 `#FFFFFF` |
| Title | `text-sm font-extrabold text-neutral-900 mb-4` | `#111111` |
| Body | `text-xs` | 12px |
| Footer | `mt-6 pt-3 border-t border-neutral-100 gap-2` | 线 `#F5F5F5` |

### 1.4 ToastHost

`TOAST` + 图标 `text-neutral-200`（`#E5E5E5`）+ `font-semibold tracking-tight`

### 1.5 CardIcon

| size | 尺寸 | 圆角 |
|------|------|------|
| sm | 36×36px | rounded-xl |
| md | 40×40px | rounded-xl |
| lg/xl | 44~48px | rounded-2xl |

渐变盘见 `color-tokens.md` §2.3（仅 App 图标，非页面主色）。

---

## 二、shadcn 组件（`components/ui/`）

### 2.1 Button

| variant | 背景 Hex | 字 Hex | class 核心 |
|---------|----------|--------|-----------|
| default | `#111111` | `#FAFAFA` | `bg-primary hover:bg-primary/80` |
| secondary | `#F5F5F5` | `#111111` | `bg-secondary` |
| outline | `#FFFFFF` | `#111111` | `border-border` |
| destructive | `#FEE2E2` | `#DC2626` | `bg-destructive/10` |
| ghost | transparent | `#111111` | `hover:bg-muted` |

| size | 高 | 字号 |
|------|-----|------|
| default | 28px h-7 | 12px |
| sm | 24px | 12px |
| lg | 32px | 12px |

### 2.2 Input

`h-7 rounded-md border-input #E8E8E8 bg-input/20 px-2 text-xs/relaxed`  
**业务 CRUD 优先 `FIELD`**（px-3 py-2）。

### 2.3 Card

`rounded-lg bg-card #FFFFFF ring-1 ring-foreground/10 text-xs/relaxed [--card-spacing:16px]`

### 2.4 Dialog

| 区域 | Hex / 尺寸 |
|------|-----------|
| Overlay | `#000000CC` bg-black/80 |
| Content | `#FFFFFF` rounded-xl p-4 max-w-sm |
| Title | 14px font-medium `#111111` |

### 2.5 Badge

`h-5 rounded-4xl px-2 text-xs` — variant 色同 Button 表。

### 2.6 Select

- Trigger：`h-7 rounded-md border-input #E8E8E8`
- Content：`rounded-lg shadow-md ring-foreground/10 bg-popover/70 backdrop-blur`
- Item：`min-h-7 rounded-md focus:bg-accent #F5F5F5`

### 2.7 Tabs

- List：`rounded-lg p-[3px] bg-muted #F5F5F5 h-8`
- Trigger 激活：`bg-background #FFFFFF`

### 2.8 Avatar

- default 32px `rounded-full`，描边 `border-border #E8E8E8`
- Fallback：`bg-muted #F5F5F5 text-muted-foreground`

---

## 三、Navigation 侧栏（摘要）

完整 Hex 见 `color-tokens.md` §2.4。

| 元素 | 关键尺寸 |
|------|----------|
| Logo 区 | `px-5 pt-6 pb-4` |
| 雇佣 CTA | `py-4.5 px-4 rounded-xl text-[12px]`，底 `#111111` |
| Nav 项 | `px-3 py-1.5 rounded-md text-xs/relaxed` |
| 子项 | `pl-9 text-[12px]` |
| 页脚 Avatar | `h-9 w-9` |

---

## 四、表格标准模式

| 区域 | class | Hex |
|------|-------|-----|
| 容器 | `PANEL` 或 `border border-neutral-100 rounded-md` | 边 `#F5F5F5` |
| thead | `bg-neutral-50 text-[10px] text-neutral-400 uppercase` | 底 `#FAFAFA` 字 `#A3A3A3` |
| tbody | `divide-neutral-100 hover:bg-neutral-50/50` | — |
| td | `px-4 py-2.5 text-[11px] text-neutral-700` | 字 `#404040` |

---

## 五、深色命令面

| 属性 | Hex | class |
|------|-----|-------|
| 背景 | `#0A0A0A` | `bg-neutral-950` |
| 字 | `#E5E5E5` | `text-neutral-200 font-mono text-xs` |
| 强调 | `#0284C7` | `text-live` / `text-sky-600` |

---

## 六、校验清单

- [ ] 页面头用 `<PageHeader>`，非手写 h1
- [ ] 子页切换用 `<SegmentedTabs>`
- [ ] CRUD 弹窗用 `<Modal>` + `BTN_*` + `FIELD`
- [ ] 按钮/输入色符合 Hex 表，无裸 `#`
- [ ] 表格 thead `#A3A3A3` + uppercase + `text-[10px]`
- [ ] 与 `ui-constants.md`、`forms.md` 一致
