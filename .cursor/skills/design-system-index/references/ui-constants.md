# `@/lib/ui` 样式常量规范

> 文件：`lib/ui.ts` — 全站共享 className，**（强约束）禁止逐页手抄**。  
> **写作格式**：常量名 + 完整 class + 关键属性表（px / Hex / Token）。

---

## 一、使用原则

1. 页面/表单/弹窗优先 import 常量，不得复制粘贴 class 字符串。
2. 颜色走 token；文档对照 Hex，代码只用 Tailwind。
3. 与 shadcn 组件并存时，业务 CRUD 页以本文件常量为准。

```tsx
import { PAGE, CARD, BTN_INK, FIELD, LABEL, badgeClass } from '@/lib/ui';
```

---

## 二、PAGE（页面外壳）

**完整 class：**
```
flex-1 min-h-0 overflow-y-auto p-5 bg-background text-foreground font-sans text-xs/relaxed
```

| 属性 | Token | 值 | Hex |
|------|-------|-----|-----|
| 内边距 | H5 | 20px | — |
| 背景 | background | — | `#FFFFFF` |
| 字色 | foreground | 12px | `#111111` |
| 字体 | font-sans | Inter | — |

---

## 三、CARD / CARD_HOVER / PANEL

### CARD

```
bg-card text-card-foreground rounded-lg ring-1 ring-foreground/10 transition-all duration-200
```

| 属性 | 值 | Hex |
|------|-----|-----|
| 背景 | bg-card | `#FFFFFF` |
| 圆角 | rounded-lg | ~7px |
| 描边 | ring-foreground/10 | `#111111` 10% |

### CARD_HOVER

```
hover:ring-foreground/15
```

### PANEL

```
bg-card text-card-foreground rounded-lg ring-1 ring-foreground/10
```

组合：`className={`${CARD} ${CARD_HOVER} p-4`}`（内边距 V4 = 16px）

---

## 四、按钮常量

### BTN_INK（主操作 · 强约束）

```
inline-flex items-center justify-center gap-1
bg-primary text-primary-foreground hover:bg-primary/80
font-medium rounded-md px-2 h-7 text-xs/relaxed
focus-visible:ring-2 focus-visible:ring-ring/30
active:translate-y-px disabled:opacity-50
```

| 属性 | 值 | Hex |
|------|-----|-----|
| 背景 | primary | `#111111` |
| 字色 | primary-foreground | `#FAFAFA` |
| hover | primary/80 | `#262626` 近似 |
| 高 | h-7 | 28px |
| 圆角 | rounded-md | ~6px |

### BTN_SOFT（次级）

| 属性 | 值 | Hex |
|------|-----|-----|
| 背景 | secondary | `#F5F5F5` |
| 字色 | secondary-foreground | `#111111` |

### BTN_OUTLINE（描边）

| 属性 | 值 | Hex |
|------|-----|-----|
| 背景 | background | `#FFFFFF` |
| 描边 | border-border | `#E8E8E8` |
| hover 底 | muted/50 | `#F5F5F5` 50% |

---

## 五、表单常量

### FIELD

```
w-full bg-background border border-input rounded-md text-xs/relaxed text-foreground
placeholder:text-muted-foreground px-3 py-2
focus-visible:ring-2 focus-visible:ring-ring/30
```

| 属性 | Token | 值 | Hex |
|------|-------|-----|-----|
| 背景 | background | — | `#FFFFFF` |
| 描边 | input | — | `#E8E8E8` |
| 字/placeholder | foreground / muted | 12px | `#111111` / `#737373` |
| Label 间距 | V1 | mb-1 = 4px | — |
| padding | — | px-3 py-2 | 12×8px |

### LABEL

```
block text-xs font-medium text-muted-foreground mb-1
```

字色 `#737373`，字号 12px。

---

## 六、浮层常量

### MODAL_OVERLAY

```
fixed inset-0 bg-black/40 backdrop-blur-sm … p-4
```

遮罩 `#000000` 40% 透明度。

### MODAL_PANEL

```
bg-popover rounded-lg shadow-lg ring-1 ring-foreground/10 border border-border p-5
```

| 属性 | 值 | Hex |
|------|-----|-----|
| 背景 | popover | `#FFFFFF` |
| 内边距 | H5 p-5 | 20px |
| 圆角 | rounded-lg | ~7px |
| 阴影 | shadow-lg | 见 radius-shadow.md |

Modal 组件：`z-[130]`，`max-w-sm` 默认。

### TOAST

```
fixed top-[26px] … bg-ink text-white text-xs rounded-xl
shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-neutral-800/20
```

| 属性 | Hex |
|------|-----|
| 背景 ink | `#111111` |
| 字色 | `#FFFFFF` |
| 阴影 | 黑 15% |

---

## 七、badgeClass(tone)

基础壳（10px 字、`rounded-full`）：

```
inline-flex … text-[10px] font-medium px-2 py-0.5 rounded-full border
```

| tone | 背景 Hex | 字 Hex | 边 Hex |
|------|----------|--------|--------|
| neutral | `#F5F5F5` | `#737373` | `#E8E8E8` |
| ink | `#111111` | `#FAFAFA` | transparent |
| success | `#ECFDF5` | `#059669` | `#D1FAE5` |
| warning | `#FFFBEB` | `#D97706` | `#FDE68A` |
| danger | `#FEE2E2` | `#DC2626` | `#FECACA` |
| live | `#F0F9FF` | `#0284C7` | `#E0F2FE` |

> 设计稿 `#F2F7FF` → `live` tone / `bg-sky-50`（`#F0F9FF`）

---

## 八、校验清单

- [ ] 页面用 `PAGE`，非手写 `p-5 bg-white`
- [ ] 主/次/取消用 `BTN_INK` / `BTN_SOFT` / `BTN_OUTLINE`
- [ ] 表单用 `FIELD` + `LABEL`
- [ ] 卡片/面板用 `CARD` / `PANEL`
- [ ] 弹窗用 `MODAL_*` 或 common `<Modal>`
- [ ] 徽章用 `badgeClass(tone)`
- [ ] 无复制常量字符串到页面
