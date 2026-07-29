# 圆角与阴影规范

> 适用于 JoyServing · 京小灵容器、控件、浮层。来源：`src/index.css` + `lib/ui.ts` + 全站 TSX。  
> **写作格式**：Token 名 + **px/rem** + Hex（描边/遮罩）+ Tailwind class。

---

## 一、圆角 Token 体系

基准：`--radius: 0.45rem`（**7.2px**）

| Token | 计算 | 约 px | Tailwind | 用途 |
|-------|------|-------|----------|------|
| radius-sm | ×0.6 | ~4px | `rounded-sm` | Button xs |
| **radius-md** | ×0.8 | **~6px** | `rounded-md` | **控件（强约束）** |
| **radius-lg** | 0.45rem | **~7px** | `rounded-lg` | **面板/卡片（强约束）** |
| radius-xl | ×1.4 | ~10px | `rounded-xl` | Dialog、Toast、Navigation CTA |
| radius-2xl | ×1.8 | ~13px | `rounded-2xl` | 个人菜单、AB 面板 |
| radius-3xl | ×2.2 | ~16px | `rounded-3xl` | Editor 大卡（特例） |
| radius-4xl | ×2.6 | ~19px | `rounded-4xl` | shadcn Badge |
| radius-full | 9999px | — | `rounded-full` | 徽章、Avatar、进度条 |

---

## 二、圆角语义（强约束）

| 元素 | class | 不得使用 |
|------|-------|----------|
| 按钮 / 输入 / Select / Segmented tab | `rounded-md` | `rounded-xl` 作控件默认 |
| 面板 / CARD / PANEL / Modal 面板 | `rounded-lg` | `rounded-2xl` 作默认面板 |
| shadcn Dialog 内容 | `rounded-xl` | — |
| Toast | `rounded-xl` | — |
| 徽章 badgeClass | `rounded-full` | `rounded-md` |
| SegmentedTabs 容器 | `rounded-lg` | — |
| SegmentedTabs 选中片 | `rounded-md` | — |

### 设计稿对照

- 设计稿 **10px 圆角**（如 OneUI radius-r2）→ 京小灵映射 **`rounded-lg`（~7px）** 或 Dialog **`rounded-xl`（~10px）**，须与容器类型一致，禁止 `rounded-[10px]` 硬编码。

---

## 三、阴影与 Ring 规范

### 3.1 原则（强约束）

当前 Mira 预设：**静态容器用 ring，浮层才用 shadow**。

| 场景 | 推荐 | 禁止 |
|------|------|------|
| 卡片/面板静态 | `ring-1 ring-foreground/10`（描边 `#111111` 10%） | 默认 `shadow-md` |
| 卡片 hover | `hover:ring-foreground/15` | 重 `shadow-xl` |
| 弹窗 | `shadow-lg` + ring | 仅 shadow 无 ring |
| Toast | 见 TOAST 常量 | 无 shadow |
| 遮罩 | `bg-black/40`（`#00000066`）+ `backdrop-blur-sm` | 纯透明 |

### 3.2 标准 shadow 值

| 名称 | CSS 值 | Hex/alpha | 常量 / 用途 |
|------|--------|-----------|-------------|
| Toast | `0 10px 30px rgba(0,0,0,0.15)` | 黑 15% | `TOAST` |
| 弹窗 | `shadow-lg` | Tailwind 预设 | `MODAL_PANEL` |
| 轻浮层 | `0 2px 10px rgba(31,35,41,0.03)` | `#1F2329` 3% | AB/Market 面板 |
| 菜单 | `0 12px 40px rgba(0,0,0,0.12)` | 黑 12% | Navigation 个人菜单 |
| 引导卡 | `0 2px 10px rgba(31,35,41,0.02)` | `#1F2329` 2% | 新手引导 |

### 3.3 Ring / Border 对照

| 用途 | class | 视觉 |
|------|-------|------|
| 默认容器 | `ring-1 ring-foreground/10` | 浅灰描边 |
| hover | `ring-foreground/15` | 略深 |
| 激活（Tab/Nav） | `ring-1 ring-foreground/10` | 与容器一致 |
| 卡片选中 | `ring-neutral-900/15 border-neutral-900/20` | `#111111` 15% |
| 输入/按钮聚焦 | `ring-2 ring-ring/30` | `#A3A3A3` 30% |
| 页面头分隔 | `border-b border-line` | `#E7E5E0` |
| 输入描边 | `border border-input` | `#E8E8E8` |

---

## 四、全站 shadow 扫描表（遗留参考）

| class | 场景 | 新页面是否推荐 |
|-------|------|----------------|
| `shadow-xs` | Navigation 折叠新建 | 可选 |
| `shadow-sm` | 雇佣按钮、CardIcon | 可选 |
| `shadow-md` | Select dropdown | 组件库内置 |
| `shadow-lg` | Modal | **推荐** |
| `shadow-2xl` | Login、Drawer | 大浮层可用 |
| `shadow-none` | Market 卡 | **推荐** 静态卡 |
| `shadow-[0_10px_30px_rgba(0,0,0,0.15)]` | Toast | **必用 TOAST** |

---

## 五、校验规则

### 示例

- ✅ 输入 `rounded-md`，面板 `rounded-lg` + ring
- ✅ Modal `shadow-lg ring-1 ring-foreground/10`
- ✅ Toast 使用 `TOAST` 常量
- ❌ 静态列表卡默认 `shadow-md`
- ❌ `rounded-[10px]` 裸值
- ❌ 选中态 `ring-blue-500`

### 修正建议

- 静态卡 shadow → 改 ring
- 裸圆角 px → 查 radius Token 表
- 蓝色 ring → `ring-foreground/10`

---

## 六、校验清单

- [ ] 控件 `rounded-md`，面板 `rounded-lg`
- [ ] 静态容器 `ring-1 ring-foreground/10`，非默认 shadow
- [ ] Modal/Toast 使用 `MODAL_PANEL` / `TOAST`
- [ ] 遮罩 `bg-black/40 backdrop-blur-sm`
- [ ] 聚焦 `ring-ring/30`，非蓝色 ring
- [ ] 无 `rounded-[Npx]` 硬编码（Editor 特例除外）
- [ ] 与 `ui-constants.md`、`forms.md` 一致
