# 间距与尺寸规范

> 来源：`lib/ui.ts`、共享组件、shadcn UI、全站 TSX。  
> 设计基调：**紧凑密度 Compact**。  
> **写作格式**：Token（H5/V1/V4/V3/V5）+ **px** + Tailwind，与 [forms.md](./forms.md) 一致。

---

## 一、间距 Token 汇总（强约束）

| Token | px | class | 用途 |
|-------|-----|-------|------|
| **H5** | **20** | `p-5` | 页面外壳 PAGE、Modal 面板 |
| **V4** | **16** | `space-y-4` / `p-4` / `gap-4` | 表单项、卡片内、网格 |
| **V3** | **16** | `mb-4` | 分组标题 → 首表单项（可与 V4 合并） |
| **V1** | **4** | `mb-1`（LABEL） | Label → 输入控件 |
| **V5** | **20~24** | `mb-5` ~ `mb-6` | 模块/区块之间 |
| Footer 上 | 24+12 | `mt-6 pt-3` | Modal footer 分隔 |

> 对照 OneUI 24px 体系：京小灵为**紧凑密度**，H5=20px、V4=16px，不得擅自改为 24px 除非更新本规范。

---

## 二、页面级间距

| Token / 模式 | px | class | 用途 |
|--------------|-----|-------|------|
| **H5** 页面内边距 | **20px** | `p-5` | PAGE 外壳统一 |
| 标题区下 | 14px + 20px | `pb-3.5 mb-5` | PageHeader |
| 标题下边框 | — | `border-b border-line` | PageHeader |
| 分段切换下 | 20px | `mb-5` | SegmentedTabs |
| **V4** 表单项/区块 | **16px** | `space-y-4` | 表单、列表 |
| **V1** Label→输入 | **4px** | `mb-1`（LABEL） | 表单 Label 下间距 |
| 模块间距 | 20~24px | `mb-5` ~ `mb-6` | 区块之间 |
| 卡片网格 | 16px | `grid gap-4` | 内容卡列表 |
| 页面纵向节奏 | — | SegmentedTabs → PageHeader → 内容 | 标准骨架 |

---

## 三、内边距 scale（全表）

| class | px | 主要用途 |
|-------|-----|----------|
| `p-1` | 4 | 分段容器内、icon 按钮 |
| `p-1.5` | 6 | 折叠按钮 |
| `p-2` | 8 | 个人菜单、Select group |
| `p-2.5` | 10 | 新手引导卡、Navigation 客服入口 |
| `p-3` | 12 | 侧栏 scroll、Dashboard 深色块 |
| `p-3.5` | 14 | 侧栏 px（展开） |
| `p-4` | 16 | **卡片内**、Dialog、Modal 外层 padding（shadcn p-4） |
| `p-5` | 20 | **页面**、MODAL_PANEL |
| `p-6` | 24 | EmployeeManage 顶栏（特例） |
| `px-2` | 8 | 按钮、Select trigger |
| `px-2.5` | 10 | 小按钮、搜索 |
| `px-3` | 12 | 导航项、表头筛选 |
| `px-4` | 16 | 雇佣按钮、侧栏区块 |
| `px-5` | 20 | 侧栏 logo 区 |
| `px-6` | 24 | EmployeeManage 顶栏 |
| `py-0.5` | 2 | 徽章、小标签 |
| `py-1` | 4 | Select label |
| `py-1.5` | 6 | 导航项、SegmentedTabs 按钮 |
| `py-2` | 8 | FIELD 输入、表格行 |
| `py-2.5` | 10 | Toast、新手引导 |
| `py-3` | 12 | — |
| `py-4` | 16 | 雇佣 CTA（`py-4.5` = 18px 特例） |
| `py-4.5` | 18 | Navigation 雇佣按钮 |
| `pl-8` | 32 | 带搜索图标的输入 |
| `pl-9` | 36 | 侧栏二级 indent |

---

## 四、外边距 / gap

| class | 用途 |
|-------|------|
| `gap-1` | 按钮内 icon、Dialog header |
| `gap-1.5` | 导航 icon+文字、Select trigger |
| `gap-2` | 卡片 header、Modal footer、表单行内 |
| `gap-2.5` | 新手引导、页脚 profile |
| `gap-3` | PageHeader 行、Navigation 一级 |
| `gap-3.5` | 折叠侧栏 |
| `gap-4` | 卡片 grid、Dialog content |
| `mb-1` | LABEL 自带 |
| `mb-1.5` ~ `mb-3` | 表单项、区块 |
| `mb-5` | PageHeader、SegmentedTabs |
| `mt-6 pt-3` | Modal footer 分隔 |
| `space-y-0.5` ~ `space-y-1` | 侧栏子项、菜单 |
| `space-y-4` | 表单 |

---

## 五、控件高度（强约束 h-7 = 28px）

| class | px | 用途 |
|-------|-----|------|
| `h-5` | 20 | Badge、Button xs |
| `h-6` | 24 | Button sm、Select sm |
| `h-7` | 28 | **默认**：BTN_*、FIELD、Input、Select default、SegmentedTabs |
| `h-8` | 32 | Button lg、CardIcon sm 容器、Navigation 引导 icon |
| `h-9` | 36 | Navigation 折叠新建、Avatar 页脚 |
| `h-10` | 40 | ImageSelectionToolbar |
| `h-16` | 64 | Header fixed |

### shadcn Button sizes

| size | height | padding | 字号 |
|------|--------|---------|------|
| `xs` | h-5 | px-2 | text-[0.625rem] |
| `sm` | h-6 | px-2 | text-xs/relaxed |
| `default` | h-7 | px-2 | text-xs/relaxed |
| `lg` | h-8 | px-2.5 | text-xs/relaxed |
| `icon` | size-7 | — | svg 3.5 |
| `icon-xs` | size-5 | — | svg 2.5 |
| `icon-sm` | size-6 | — | svg 3 |
| `icon-lg` | size-8 | — | svg 4 |

---

## 六、宽度 / 布局

| 模式 | class | 用途 |
|------|-------|------|
| 页面滚动 | `flex-1 min-h-0 overflow-y-auto` | PAGE |
| 侧栏 | `w-full h-full shrink-0` | Navigation |
| Modal 默认宽 | `max-w-sm` | Modal maxWidth |
| Dialog 宽 | `max-w-[calc(100%-2rem)] sm:max-w-sm` | shadcn Dialog |
| AB 侧栏 | `lg:w-[220px]` | 实验列表 |
| 抽屉 | `max-w-xl h-full` | Dashboard inspect |
| 表格 cell | `px-4 py-2.5` | 标准紧凑行 |
| 搜索框 | `w-36` | Dashboard 筛选 |
| Select min | `min-w-[140px]` | Dashboard |
| Toast max | `max-w-[90vw] md:max-w-md` | TOAST |

---

## 七、Avatar / CardIcon 尺寸

### Avatar（shadcn）

| size | 尺寸 |
|------|------|
| sm | size-6 (24px) |
| default | size-8 (32px) |
| lg | size-10 (40px) |

Navigation 页脚 override：`h-9 w-9`

### CardIcon

| size | 尺寸 | 圆角 | 字号 |
|------|------|------|------|
| sm | h-9 w-9 | rounded-xl | text-base |
| md | h-10 w-10 | rounded-xl | text-lg |
| lg | h-11 w-11 | rounded-2xl | text-xl |
| xl | h-12 w-12 | rounded-2xl | text-2xl |

---

## 八、z-index 层级

| 值 | 用途 |
|----|------|
| `z-40` | Header fixed |
| `z-50` | Modal overlay/panel、Dialog、Select popup、Navigation 菜单 |
| `z-[130]` | Modal（common/Modal.tsx） |
| `z-[200]` | Toast |

---

## 九、动画 / 滚动

| class | 用途 |
|-------|------|
| `transition-all duration-200` | CARD、导航、SegmentedTabs |
| `active:translate-y-px` | 按钮按下 |
| `animate-in fade-in duration-200` | Modal、Toast |
| **`custom-scrollbar`** | **所有滚动区必加** |

---

## 十、校验规则

### 示例

- ✅ 页面 `PAGE`（H5=20px），表单 `space-y-4`（V4=16px）
- ✅ 控件 `h-7`（28px），表格 cell `px-4 py-2.5`
- ❌ 页面 `p-6`（24px）破坏紧凑密度
- ❌ 表单项 `space-y-2`（8px）过密

---

## 十一、校验清单

- [ ] 页面/Modal 内边距 H5 = 20px（`p-5`）
- [ ] 表单项间距 V4 = 16px（`space-y-4`）
- [ ] Label 间距 V1 = 4px（`LABEL`）
- [ ] 默认控件高 28px（`h-7`）
- [ ] 滚动区 `custom-scrollbar`
- [ ] 与 `forms.md`、`ui-constants.md` 一致
