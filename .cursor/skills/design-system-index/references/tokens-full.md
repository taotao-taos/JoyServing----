# Token 全量注册表（单一事实来源）

> **本文件覆盖项目全部设计 token**：CSS 变量、JoyServing 别名、Tailwind 色阶、间距、圆角、阴影、字阶、z-index、`lib/ui.ts` 解码。  
> 来源：`src/index.css` + `lib/ui.ts` + 全站 TSX 扫描（893 色 class / 全 spacing / 全 radius）。  
> 格式：**Token 名 + oklch + Hex + Tailwind class**。代码禁止裸 Hex。

---

## 一、CSS 变量全表（`:root` 亮色）

### 1.1 shadcn Mira 语义色

| CSS 变量 | oklch | Hex | Tailwind | 用途 |
|----------|-------|-----|----------|------|
| `--background` | `oklch(1 0 0)` | `#FFFFFF` | `bg-background` | 页面画布 |
| `--foreground` | `oklch(0.145 0 0)` | `#111111` | `text-foreground` | 主文本 |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | `bg-card` | 卡片底 |
| `--card-foreground` | `oklch(0.145 0 0)` | `#111111` | `text-card-foreground` | 卡片字 |
| `--popover` | `oklch(1 0 0)` | `#FFFFFF` | `bg-popover` | 弹窗/下拉 |
| `--popover-foreground` | `oklch(0.145 0 0)` | `#111111` | `text-popover-foreground` | 浮层字 |
| `--primary` | `oklch(0.205 0 0)` | `#111111` | `bg-primary` | 主操作/墨黑 |
| `--primary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | `text-primary-foreground` | 主按钮字 |
| `--secondary` | `oklch(0.97 0 0)` | `#F5F5F5` | `bg-secondary` | 次级底 |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `#111111` | `text-secondary-foreground` | 次级字 |
| `--muted` | `oklch(0.97 0 0)` | `#F5F5F5` | `bg-muted` | 轻填充 |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#737373` | `text-muted-foreground` | Label/次要 |
| `--accent` | `oklch(0.97 0 0)` | `#F5F5F5` | `bg-accent` | hover 填充 |
| `--accent-foreground` | `oklch(0.205 0 0)` | `#111111` | `text-accent-foreground` | accent 字 |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#DC2626` | `text-destructive` | 危险/错误 |
| `--border` | `oklch(0.922 0 0)` | `#E8E8E8` | `border-border` | 默认描边 |
| `--input` | `oklch(0.922 0 0)` | `#E8E8E8` | `border-input` | 输入描边 |
| `--ring` | `oklch(0.708 0 0)` | `#A3A3A3` | `ring-ring` | 聚焦环 |

### 1.2 JoyServing 品牌别名

| 别名 | 映射 | Hex（DESIGN） | Tailwind |
|------|------|---------------|----------|
| `--paper` | `--background` | `#FAF9F6` / `#FFFFFF` | `bg-paper` |
| `--surface` | `--card` | `#FFFFFF` | `bg-surface` |
| `--rail` | `--muted` | `#F5F4F0` | `bg-rail` |
| `--rail-strong` | `--accent` | `#ECEBE6` | `bg-rail-strong` |
| `--line` | `--border` | `#E7E5E0` | `border-line` |
| `--ink` | `--primary` | `#111111` | `bg-ink` |
| `--ink-hover` | color-mix +12% white | `#262626` | `hover:bg-primary/80` |
| `--live` | 独立 | `#1E90FF` | `bg-live` / `text-live` |
| `--card-line` | `--border` | `#E7E5E0` | `border-card-line` |
| `--nav-active` | `--sidebar-accent` | `#F5F5F5` | `bg-nav-active` |
| `--nav-active-line` | `--sidebar-border` | `#E8E8E8` | `border-nav-active-line` |

### 1.3 Sidebar

| 变量 | oklch | Hex | Tailwind |
|------|-------|-----|----------|
| `--sidebar` | `oklch(0.985 0 0)` | `#FAFAFA` | `bg-sidebar` |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `#111111` | `text-sidebar-foreground` |
| `--sidebar-primary` | `oklch(0.205 0 0)` | `#111111` | `bg-sidebar-primary` |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `#F5F5F5` | `bg-sidebar-accent` |
| `--sidebar-border` | `oklch(0.922 0 0)` | `#E8E8E8` | `border-sidebar-border` |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `#A3A3A3` | `ring-sidebar-ring` |

### 1.4 图表

| 变量 | oklch | Hex≈ | Tailwind |
|------|-------|------|----------|
| `--chart-1` | `oklch(0.87 0 0)` | `#DEDEDE` | `bg-chart-1` |
| `--chart-2` | `oklch(0.556 0 0)` | `#737373` | `bg-chart-2` |
| `--chart-3` | `oklch(0.439 0 0)` | `#595959` | `bg-chart-3` |
| `--chart-4` | `oklch(0.371 0 0)` | `#474747` | `bg-chart-4` |
| `--chart-5` | `oklch(0.269 0 0)` | `#2E2E2E` | `bg-chart-5` |

### 1.5 自定义 neutral 灰阶（`@theme` 补齐）

| Token | oklch | Hex≈ | Tailwind |
|-------|-------|------|----------|
| neutral-150 | `oklch(0.946 0 0)` | `#F0F0F0` | `bg-neutral-150` / `border-neutral-150` |
| neutral-250 | `oklch(0.896 0 0)` | `#E0E0E0` | `bg-neutral-250` / `border-neutral-250` |
| neutral-350 | `oklch(0.789 0 0)` | `#C4C4C4` | `border-neutral-350/10` |
| neutral-550 | `oklch(0.498 0 0)` | `#737373` | `text-neutral-550` |
| neutral-850 | `oklch(0.237 0 0)` | `#262626` | `bg-neutral-850` / `hover:bg-neutral-850` |

### 1.6 暗色 `.dark`（保留，当前未启用）

| 变量 | oklch | 说明 |
|------|-------|------|
| `--background` | `oklch(0.145 0 0)` | `#111111` 近似 |
| `--foreground` | `oklch(0.985 0 0)` | 反色字 |
| `--primary` | `oklch(0.922 0 0)` | 暗色主色变白 |
| `--card` | `oklch(0.205 0 0)` | 深卡 |
| `--destructive` | `oklch(0.704 0.191 22.216)` | 亮红 |
| `--live` | `oklch(0.623 0.214 259.815)` | 与亮色相同 |

---

## 二、Tailwind 标准 neutral 色阶（项目实际使用）

| Shade | Hex | 项目中的 class（节选） |
|-------|-----|------------------------|
| 50 | `#FAFAFA` | `bg-neutral-50` / `/50` `/60` `/70` `/80` |
| 100 | `#F5F5F5` | `bg-neutral-100` `border-neutral-100` `divide-neutral-100` |
| 150 | `#F0F0F0` | `border-neutral-150`（自定义） |
| 200 | `#E5E5E5` | `bg-neutral-200` `/40` `/50` `/60` `/80` `border-neutral-200/*` |
| 250 | `#E0E0E0` | `border-neutral-250/*`（自定义） |
| 300 | `#D4D4D4` | `bg-neutral-300` scrollbar thumb |
| 350 | `#C4C4C4` | `border-neutral-350/10`（自定义） |
| 400 | `#A3A3A3` | `text-neutral-400` 表头/最弱 |
| 500 | `#737373` | `text-neutral-500` 次要 |
| 550 | `#737373` | `text-neutral-550` 侧栏图标（自定义） |
| 600 | `#525252` | `text-neutral-600` |
| 700 | `#404040` | `text-neutral-700` 表格正文 |
| 800 | `#262626` | `bg-neutral-800` 筛选按钮 |
| 850 | `#262626` | `bg-neutral-850` hover（自定义） |
| 900 | `#171717` | `bg-neutral-900` CTA/进度条 |
| 950 | `#0A0A0A` | `bg-neutral-950` 深色命令区 |

---

## 三、语义色阶全表（Tailwind 标准 Hex + 项目 class）

### 3.1 emerald（成功/在线）

| Shade | Hex | 项目 class |
|-------|-----|-----------|
| 50 | `#ECFDF5` | `bg-emerald-50` `/20` `/30` `/50` |
| 100 | `#D1FAE5` | `bg-emerald-100` `border-emerald-100` |
| 200 | `#A7F3D0` | `border-emerald-200` |
| 500 | `#10B981` | `text-emerald-500` |
| 600 | `#059669` | `bg-emerald-600` `text-emerald-600` badgeClass success |
| 700 | `#047857` | `text-emerald-700` |
| 800 | `#065F46` | `text-emerald-800` |
| 950 | `#022C22` | `bg-emerald-950` `border-emerald-950` |

### 3.2 amber（警告/排队）

| Shade | Hex | 项目 class |
|-------|-----|-----------|
| 50 | `#FFFBEB` | `bg-amber-50` `/30` badgeClass warning |
| 100 | `#FEF3C7` | `border-amber-100` `/60` |
| 200 | `#FDE68A` | `border-amber-200` `/60` |
| 400 | `#FBBF24` | `border-amber-400` `ring-amber-400` |
| 600 | `#D97706` | `text-amber-600` |
| 700 | `#B45309` | `text-amber-700` |
| 800 | `#92400E` | `text-amber-800` |
| 900 | `#78350F` | `text-amber-900` |

### 3.3 rose（危险/删除）

| Shade | Hex | 项目 class |
|-------|-----|-----------|
| 50 | `#FFF1F2` | `bg-rose-50` hover 退出 |
| 200 | `#FECDD3` | `border-rose-200` `/60` |
| 500 | `#F43F5E` | `bg-rose-500` |
| 600 | `#E11D48` | `text-rose-600` |

### 3.4 sky（实时/信息/组 A）

| Shade | Hex | 项目 class |
|-------|-----|-----------|
| 50 | `#F0F9FF` | `bg-sky-50` `/40` badgeClass live；**稿 `#F2F7FF` 映射此色** |
| 100 | `#E0F2FE` | `bg-sky-100/80` `border-sky-100` `ring-sky-100` |
| 200 | `#BAE6FD` | `border-sky-200` |
| 300 | `#7DD3FC` | `border-sky-300` |
| 400 | `#38BDF8` | `border-sky-400` |
| 500 | `#0EA5E9` | `bg-sky-500` |
| 600 | `#0284C7` | `bg-sky-600` `text-sky-600` |
| 700 | `#0369A1` | `bg-sky-700` `text-sky-700` |
| 800 | `#075985` | `text-sky-800` |
| 900 | `#0C4A6E` | `text-sky-900` `border-sky-900/40` |
| 950 | `#082F49` | `bg-sky-950/20` |

### 3.5 violet（对比/组 B · 仅 AB 实验）

| Shade | Hex | 项目 class |
|-------|-----|-----------|
| 50 | `#F5F3FF` | `bg-violet-50` `/60` `/80` |
| 100 | `#EDE9FE` | `bg-violet-100` `border-violet-100` |
| 500 | `#8B5CF6` | `bg-violet-500` |
| 600 | `#7C3AED` | `text-violet-600` |
| 700 | `#6D28D9` | `text-violet-700` |

### 3.6 red（通知点）

| Shade | Hex | 项目 class |
|-------|-----|-----------|
| 50 | `#FEF2F2` | `bg-red-50` `/50` |
| 600 | `#DC2626` | `bg-red-600` 铃铛角标 |

### 3.7 orange（OpenClaw 品牌 · 特例）

| Shade | Hex | 项目 class |
|-------|-----|-----------|
| 50 | `#FFF7ED` | `bg-orange-50` |
| 100 | `#FFEDD5` | `bg-orange-100` |
| 500 | `#F97316` | `text-orange-500` |
| 600 | `#EA580C` | `text-orange-600` |

### 3.8 设计稿 Hex → Token 映射（强约束）

| 设计稿 Hex | 映射 Token | Tailwind |
|------------|-----------|----------|
| `#F2F7FF` | sky-50 | `bg-sky-50` |
| `#FAF9F6` | paper | `bg-paper` |
| `#111111` | ink/foreground | `text-foreground` |
| `#333333` | foreground | `text-foreground`（非 `#333` 硬编码） |
| `#FFFFFF` | background/card | `bg-background` |

---

## 四、Ring / 描边 / 透明度 Token

| Token | 值 | 视觉 |
|-------|-----|------|
| `ring-foreground/10` | `#111111` 10% | 默认容器 ring |
| `ring-foreground/15` | `#111111` 15% | CARD_HOVER |
| `ring-ring/30` | `#A3A3A3` 30% | 聚焦 FIELD/BTN |
| `ring-neutral-900/15` | `#171717` 15% | 卡片选中 |
| `border-neutral-900/20` | `#171717` 20% | 卡片选中描边 |
| `bg-black/40` | `#000000` 40% | MODAL_OVERLAY |
| `bg-black/80` | `#000000` 80% | Dialog overlay |
| `bg-muted/70` | `#F5F5F5` 70% | SegmentedTabs 容器 |
| `bg-input/20` | `#E8E8E8` 20% | shadcn Input 底 |
| `bg-destructive/10` | `#DC2626` 10% | 危险按钮/徽章 |
| `border-destructive/20` | `#DC2626` 20% | badge danger 边 |

---

## 五、间距 Token 全表

### 5.1 语义间距（强约束）

| Token | px | rem | Tailwind | 用途 |
|-------|-----|-----|----------|------|
| **H5** | 20 | 1.25 | `p-5` | PAGE / Modal |
| **V4** | 16 | 1 | `space-y-4` `p-4` `gap-4` | 表单项/卡片内 |
| **V3** | 16 | 1 | `mb-4` | 分组标题下 |
| **V1** | 4 | 0.25 | `mb-1` | LABEL |
| **V5** | 20~24 | 1.25~1.5 | `mb-5`~`mb-6` | 模块间 |
| Footer | 24+12 | — | `mt-6 pt-3` | Modal footer |

### 5.2 Tailwind spacing scale（全量 px）

| class | px | class | px | class | px |
|-------|-----|-------|-----|-------|-----|
| `p-0` / `gap-0` | 0 | `p-1` | 4 | `p-2` | 8 |
| `p-0.5` | 2 | `p-1.5` | 6 | `p-2.5` | 10 |
| `p-3` | 12 | `p-3.5` | 14 | `p-4` | 16 |
| `p-5` | 20 | `p-6` | 24 | `p-8` | 32 |
| `px-1` | 4 | `px-2` | 8 | `px-2.5` | 10 |
| `px-3` | 12 | `px-4` | 16 | `px-5` | 20 |
| `px-6` | 24 | `pl-8` | 32 | `pl-9` | 36 |
| `py-0.5` | 2 | `py-1` | 4 | `py-1.5` | 6 |
| `py-2` | 8 | `py-2.5` | 10 | `py-3` | 12 |
| `py-4` | 16 | `py-4.5` | 18 | `py-8` | 32 |
| `gap-1` | 4 | `gap-1.5` | 6 | `gap-2` | 8 |
| `gap-2.5` | 10 | `gap-3` | 12 | `gap-3.5` | 14 |
| `gap-4` | 16 | `gap-6` | 24 | `space-y-4` | 16 |
| `space-y-0.5` | 2 | `space-y-1` | 4 | `space-y-1.5` | 6 |
| `space-y-2` | 8 | `space-y-2.5` | 10 | `space-y-6` | 24 |

### 5.3 控件高度

| class | px | 用途 |
|-------|-----|------|
| `h-5` | 20 | Badge xs |
| `h-6` | 24 | Button sm |
| **`h-7`** | **28** | **BTN_* / FIELD / Input 默认** |
| `h-8` | 32 | Button lg |
| `h-9` | 36 | Nav 新建 / Avatar |
| `h-10` | 40 | Toolbar |
| `h-16` | 64 | Header |
| `size-6`~`size-10` | 24~40 | Avatar sm/default/lg |

---

## 六、圆角 Token 全表

基准：`--radius: 0.45rem` = **7.2px**

| Token | 计算 | px≈ | Tailwind | 项目使用 |
|-------|------|-----|----------|----------|
| radius-sm | ×0.6 | 4 | `rounded-sm` | Button xs、Editor 微控件 |
| **radius-md** | ×0.8 | **6** | **`rounded-md`** | **BTN/FIELD/Input/Nav/Segmented tab** |
| **radius-lg** | 0.45rem | **7** | **`rounded-lg`** | **CARD/PANEL/Modal/Card/Tabs/Select** |
| radius-xl | ×1.4 | 10 | `rounded-xl` | Dialog/Toast/Nav CTA/CardIcon sm |
| radius-2xl | ×1.8 | 13 | `rounded-2xl` | 个人菜单/AB 面板/CardIcon lg |
| radius-3xl | ×2.2 | 16 | `rounded-3xl` | Editor 大卡 |
| radius-4xl | ×2.6 | 19 | `rounded-4xl` | shadcn Badge |
| radius-full | 9999 | — | `rounded-full` | badge/Avatar/进度条 |
| 任意（禁止新页） | — | — | `rounded-[10px]` 等 | Editor/Creagic 遗留 |

**设计稿 10px 圆角** → `rounded-xl`（Dialog）或 `rounded-lg`（面板），禁止 `rounded-[10px]`。

---

## 七、阴影 Token 全表

### 7.1 标准 Tailwind shadow

| class | 值 | 推荐场景 |
|-------|-----|----------|
| `shadow-none` | none | Market 静态卡 |
| `shadow-xs` | 极小 | Nav 折叠按钮 |
| `shadow-sm` | 小 | 雇佣按钮、CardIcon |
| `shadow-md` | 中 | Select dropdown |
| **`shadow-lg`** | 大 | **MODAL_PANEL（推荐）** |
| `shadow-xl` | 更大 | Sidebar、Editor |
| `shadow-2xl` | 最大 | Login、Drawer |
| `shadow-inner` | 内阴影 | Avatar 渐变 |

### 7.2 自定义 shadow（项目扫描全量）

| CSS 值 | Hex 基调 | 用途 |
|--------|----------|------|
| `0 2px 10px rgba(31,35,41,0.02)` | `#1F2329` 2% | 新手引导 |
| `0 2px 10px rgba(31,35,41,0.03)` | `#1F2329` 3% | AB/Market/Task 面板 |
| `0 8px 24px rgba(31,35,41,0.06)` | `#1F2329` 6% | 卡片 hover |
| `0 8px 30px rgb(0,0,0,0.015)` | 黑 1.5% | DESIGN 历史 CARD |
| **`0 10px 30px rgba(0,0,0,0.15)`** | 黑 15% | **TOAST（必用）** |
| `0 12px 30px rgba(0,0,0,0.12)` | 黑 12% | EmployeeManage |
| `0 12px 40px rgba(0,0,0,0.12)` | 黑 12% | Nav 个人菜单 |
| `0 20px 50px rgba(0,0,0,0.1)` | 黑 10% | AiPopover/Editor |
| `0 24px 70px rgba(0,0,0,0.18)` | 黑 18% | DemoGuide |
| `0 24px 64px rgba(15,23,42,0.14)` | `#0F172A` 14% | PricingModal |
| `inset 0 0 0 1px rgba(15,23,42,0.06)` | 内描边 | MainContent |

**（强约束）** 新 JoyServing 页面：静态容器用 `ring-1 ring-foreground/10`，非 shadow。

---

## 八、字阶 Token 全表

| Token | class | px | 行高 | 用途 |
|-------|-------|-----|------|------|
| T-xs | `text-xs/relaxed` | 12 | ~19.5 | **默认正文/控件** |
| T-2xs | `text-[0.625rem]` | 10 | — | Button xs |
| T-10 | `text-[10px]` | 10 | — | 徽章/表头 |
| T-11 | `text-[11px]` | 11 | — | 表格/Toast |
| T-12 | `text-[12px]` | 12 | — | 侧栏子项 |
| T-12.5 | `text-[12.5px]` | 12.5 | — | Nav 一级 |
| T-sm | `text-sm` | 14 | 20 | Modal 标题 |
| T-xl | `text-xl` | 20 | 28 | PageHeader h1 |
| T-2xl | `text-2xl` | 24 | 32 | 特例 |

字色见 §二 neutral + §1.1 `--foreground` `#111111` / `--muted-foreground` `#737373`。

---

## 九、z-index Token

| 值 | 用途 |
|----|------|
| `z-40` | Header fixed |
| `z-50` | Modal overlay、Dialog、Select |
| `z-[130]` | common Modal overlay |
| `z-[200]` | Toast |

---

## 十、`lib/ui.ts` Token 解码

| 常量 | 关键 Token 组合 |
|------|----------------|
| `PAGE` | H5 + `bg-background` `#FFFFFF` + T-xs + `text-foreground` `#111111` |
| `CARD` | `bg-card` + radius-lg + `ring-foreground/10` |
| `CARD_HOVER` | `ring-foreground/15` |
| `PANEL` | 同 CARD 无 transition |
| `BTN_INK` | `bg-primary` `#111111` + h-7 + radius-md + `ring-ring/30` focus |
| `BTN_SOFT` | `bg-secondary` `#F5F5F5` + h-7 + radius-md |
| `BTN_OUTLINE` | `border-border` `#E8E8E8` + `bg-background` + h-7 |
| `FIELD` | `border-input` `#E8E8E8` + V1 via LABEL + px-3 py-2 + radius-md |
| `LABEL` | `text-muted-foreground` `#737373` + T-xs + V1 mb-1 |
| `TOAST` | `bg-ink` `#111111` + radius-xl + shadow 15% + z-200 |
| `MODAL_OVERLAY` | `bg-black/40` + backdrop-blur |
| `MODAL_PANEL` | `bg-popover` + H5 p-5 + radius-lg + shadow-lg + ring |
| `badgeClass` | 见 §3 语义色 + T-10 + rounded-full |

---

## 十一、禁止与遗留

| 类型 | 禁止/说明 |
|------|----------|
| 裸 Hex | `bg-[#F2F7FF]` 等 → 查 §3.8 映射 |
| slate/blue 主色 | 新页禁止；映射 ink/neutral/sky |
| zinc-* | Editor/Creagic 遗留，JoyServing 新页用 neutral |
| CardIcon 渐变 | blue/violet/indigo 等**仅** App 图标，非页面主色 |

---

## 十二、校验清单

- [ ] 所有颜色可追溯到本表 Token + Hex + Tailwind
- [ ] 间距使用 H5/V1/V4，无随意 p-6/p-3 混用
- [ ] 圆角控件 md / 面板 lg
- [ ] 静态 ring，浮层 shadow
- [ ] 无裸 Hex、无 slate 主色
