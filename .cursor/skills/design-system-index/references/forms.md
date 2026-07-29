# 表单页面规范

> 适用于 JoyServing · 京小灵 B 端后台的**弹窗表单**、**整页 CRUD 表单**与**内嵌筛选表单**。  
> 实现层优先 `@/lib/ui` 的 `FIELD` / `LABEL` / `BTN_*` 与 `<Modal>` / `<PageHeader>` 共享组件。  
> 色彩、间距写作格式：**Token 名 + Hex + Tailwind class**（与 [design-system-skills/forms.md](https://github.com/xasking/design-system-skills/blob/main/design-system-index/references/forms.md) 一致）。

---

## 一、页面整体结构

### 1.1 布局层级（弹窗表单 · 最常用）

```
┌────────────────────────────────────────────────────────────┐
│ MODAL_OVERLAY  bg-black/40  #00000066  backdrop-blur-sm   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ MODAL_PANEL  bg-popover  #FFFFFF  rounded-lg  p-5     │ │
│  │  标题  text-sm font-extrabold  #111111                 │ │
│  │  ─────────────────────────────────────────────────    │ │
│  │  表单区  space-y-4  (表单项间距 16px / V4)             │ │
│  │    Label  text-muted-foreground  #737373  mb-1 (V1)   │ │
│  │    Input  FIELD  border-input  #E8E8E8  rounded-md    │ │
│  │  ─────────────────────────────────────────────────    │ │
│  │  Footer  mt-6 pt-3 border-neutral-100  gap-2          │ │
│  │    [BTN_OUTLINE 取消]  [BTN_INK 确定]                  │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 1.2 布局层级（整页 CRUD 表单）

```
┌────────────────────────────────────────────────────────────┐
│ PAGE  bg-background  #FFFFFF  p-5  (20px / H5)              │
├────────────────────────────────────────────────────────────┤
│ SegmentedTabs（可选）  mb-5                                 │
├────────────────────────────────────────────────────────────┤
│ PageHeader  pb-3.5 mb-5 border-line  #E7E5E0                │
│   标题 text-xl  #111111          [BTN_INK 新建]  bg-ink     │
├────────────────────────────────────────────────────────────┤
│ PANEL / 卡片网格                                            │
│   表格 + 行内 Modal 编辑  或  独立表单 PANEL                 │
└────────────────────────────────────────────────────────────┘
```

### 1.3 核心模块说明

| 模块 | 说明 | 是否必选 |
|------|------|----------|
| 页面外壳 `PAGE` | 画布 `#FFFFFF`（`bg-background`），内边距 **20px（H5）** | 整页表单必选 |
| `PageHeader` | 标题 + 右侧主操作（新建/保存） | 整页表单必选 |
| `Modal` | 新建/编辑弹窗，遮罩 + 面板 + footer | 弹窗 CRUD 必选 |
| 表单字段 | `LABEL` + `FIELD`，上下布局 | 必选 |
| 底部按钮区 | 弹窗 footer 或 PageHeader 右侧 | 必选 |

---

## 二、色彩规范（表单场景）

> 代码中走 token，文档中同时标注 Hex 便于设计稿对照。**禁止**在 TSX 写 `bg-[#FFFFFF]`，须用 Tailwind token。

| 用途 | Token | Hex（参考） | Tailwind |
|------|-------|-------------|----------|
| 页面画布 | `--background` / paper | `#FFFFFF` | `bg-background` / `bg-paper` |
| 暖灰画布（历史别名） | paper 暖色 | `#FAF9F6` | `bg-paper`（DESIGN 文档） |
| 卡片/弹窗底 | `--surface` / card | `#FFFFFF` | `bg-card` / `bg-popover` |
| 主文本 / 标题 | `--foreground` / ink | `#111111` | `text-foreground` / `text-ink` |
| Label / 次要说明 | `--muted-foreground` | `#737373` | `text-muted-foreground` |
| 输入框描边 | `--input` / line | `#E8E8E8` | `border-input` / `border-line` |
| 表头/轨道底 | `--rail` | `#F5F4F0` | `bg-rail` / `bg-muted` |
| 聚焦环 | `--ring` | `#A3A3A3` | `ring-ring/30` |
| 主按钮底 | `--primary` / ink | `#111111` | `bg-primary` / `BTN_INK` |
| 主按钮字 | `--primary-foreground` | `#FAFAFA` | `text-primary-foreground` |
| 错误/必填提示 | `--destructive` | `#DC2626` | `text-destructive` |
| 成功提示底 | emerald-50 | `#ECFDF5` | `bg-emerald-50` |
| 警告提示底 | amber-50 | `#FFFBEB` | `bg-amber-50` |
| 实时/信息提示底 | sky-50 | `#F0F9FF` | `bg-sky-50` |
| 信息浅蓝（设计稿对照） | — | `#F2F7FF` | 映射为 `bg-sky-50`，**禁止**硬编码 Hex |

---

## 三、主内容区规范

### 3.1 内容区布局

- **页面内边距（强约束）**：整页表单外壳统一 **20px（H5）**，class `p-5`（`PAGE` 常量），不得改为 `p-6` / `p-4`。
- **背景**：`bg-background`（`#FFFFFF`）；侧栏外主内容区由 `PAGE` 承担。
- **弹窗内边距（强约束）**：`MODAL_PANEL` 统一 **20px（H5）** `p-5`。
- **卡片/面板间距**：区块之间 **16px（V4）** `space-y-4` 或 `mb-5`（20px 模块间距）。

### 3.2 主内容卡片 / PANEL

- **面板样式（强约束）**：
  ```
  PANEL = bg-card #FFFFFF + rounded-lg + ring-1 ring-foreground/10
  ```
- **圆角（强约束）**：表单容器/弹窗/面板统一 **`rounded-lg`（约 7px，`--radius-lg` = 0.45rem）**；输入控件用 **`rounded-md`（约 5px）**。
- **内边距**：面板内容 **16px（V4）** `p-4`；弹窗整体 **20px（H5）** `p-5`。
- **阴影**：默认 **不用重阴影**，以 `ring-1 ring-foreground/10` 描边为主；弹窗可加 `shadow-lg`。

### 3.3 表单分组原则

- 按业务逻辑分组；每组可选小标题 `text-sm font-extrabold text-neutral-900`（`#111111`）。
- 分组标题与首个表单项间距：**16px（V3）** `mb-4` 或外层 `space-y-4`。
- 分组与分组之间：**16px（V4）** `space-y-4`（紧凑密度；不放 32px）。

---

## 四、表单字段规范

### 4.1 表单布局

- **布局方式（强约束）**：优先 **上下布局**（Label 在上、控件在下）：
  ```tsx
  import { FIELD, LABEL } from '@/lib/ui';

  <div>
    <label className={LABEL}>字段名称</label>
    <input className={FIELD} placeholder="请输入" />
  </div>
  ```
- **LABEL 完整 class**：
  ```
  block text-xs font-medium text-muted-foreground #737373 mb-1
  ```
- **FIELD 完整 class**：
  ```
  w-full bg-background #FFFFFF border border-input #E8E8E8 rounded-md
  text-xs/relaxed text-foreground #111111 placeholder:text-muted-foreground
  px-3 py-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30
  ```

### 4.2 间距（强约束）

| 位置 | Token | 数值 | Tailwind | 说明 |
|------|-------|------|----------|------|
| Label → 输入控件 | V1 | **4px** | `LABEL` 自带 `mb-1` | 不得用 `mb-2`（8px）除非设计确认 |
| 相邻表单项 | V4 | **16px** | `space-y-4` | 不得压缩为 `space-y-2`（8px） |
| 弹窗 footer 上分隔 | — | 24px + 12px | `mt-6 pt-3` | 顶部分割线 `border-neutral-100` `#F5F5F5` |
| footer 按钮间距 | — | 8px | `gap-2` | 取消 + 确定 |
| 页面左右边距 | H5 | **20px** | `p-5` / `PAGE` | 全站紧凑标准 |

### 4.3 控件尺寸（强约束）

| 控件 | 高度 | 水平 padding | 字号 | class |
|------|------|--------------|------|-------|
| 输入/下拉/textarea | **28px** 内容区 | px-3 (12px) | 12px | `FIELD` / `h-7` Select |
| 主/次按钮 | **28px** | px-2 (8px) | 12px | `BTN_INK` / `BTN_SOFT` / `BTN_OUTLINE` |
| shadcn Input（少用） | 28px | px-2 | 12px | `components/ui/input` |

### 4.4 字段类型与组件映射

| 场景 | 组件 | 备注 |
|------|------|------|
| 单行文本 | `<input className={FIELD} />` | 必填加 `required` |
| 多行文本 | `<textarea className={cn(FIELD, 'min-h-[80px] resize-y')} />` | rows 由 min-h 控制 |
| 原生下拉 | `<select className={FIELD}>` | 简单枚举 |
| 复杂下拉 | shadcn `<Select>` + `SelectTrigger` `h-7` | 与 FIELD padding 略有差异 |
| 单选/开关 | shadcn / 本地 segmented | 少于 5 项可用按钮组 |
| 日期/数字 | `<input type="number\|date" className={FIELD} />` | 等宽数字加 `font-mono` |

### 4.5 校验与提示

- **必填**：HTML `required` 或提交前校验；错误文案 `text-destructive #DC2626 text-xs`。
- **输入错误态**：`aria-invalid` → `border-destructive ring-destructive/20`（shadcn 内置）。
- **帮助说明**：Label 右侧小问号 + Popover（颜色 `#A3A3A3` / `text-neutral-400`，间距 Label 文字 **4px** `ml-1`）。
- **字段间提示条**：成功 `bg-emerald-50 #ECFDF5 border-emerald-200`；警告 `bg-amber-50 #FFFBEB`；信息 `bg-sky-50 #F0F9FF`（设计稿 `#F2F7FF` 归入此类）。

### 4.6 字段命名

- 状态字段：`camelCase`（如 `marketingGoal`）
- 表单 label：简洁中文，单位放 placeholder（如 `placeholder="请输入，单位：次/日"`）

---

## 五、底部按钮区

### 5.1 弹窗 Footer（强约束）

```tsx
<Modal
  footer={
    <>
      <button type="button" className={BTN_OUTLINE} onClick={onClose}>取消</button>
      <button type="button" className={BTN_INK} onClick={onSave}>确定</button>
    </>
  }
>
```

| 属性 | 值 |
|------|-----|
| 布局 | `flex gap-2 justify-end` |
| 上间距 | `mt-6`（24px） |
| 上内边距 + 分隔线 | `pt-3 border-t border-neutral-100`（`#F5F5F5`） |
| 主按钮 | `BTN_INK` → bg `#111111`，字 `#FAFAFA` |
| 次按钮 | `BTN_OUTLINE` → 白底 `#FFFFFF`，描边 `#E8E8E8` |

### 5.2 整页主操作

- 新建/保存等主 CTA 放 **`PageHeader` 右侧 slot**，class `BTN_INK`。
- 批量/危险操作用 `BTN_SOFT` 或 `Button variant="destructive"`。

### 5.3 常见流程

- 弹窗 CRUD：打开 Modal → 填写 → 确定 / 取消
- 整页：PageHeader「新建」→ Modal 或内嵌 PANEL 表单 → 保存

---

## 六、内嵌筛选表单（Dashboard 模式）

用于表格上方筛选，**允许** neutral 三件套，仍禁止 `slate-*` / 裸 Hex：

| 元素 | 背景 | 描边 | 字色 | class 摘要 |
|------|------|------|------|-----------|
| 搜索框 | `#FAFAFA` | `#E5E5E5` | `#404040` | `bg-neutral-50 border-neutral-200 text-[11px] rounded-md pl-8 pr-2 py-1.5` |
| 下拉 | `#FFFFFF` | `#E5E5E5` | 12px | `min-w-[140px] h-7 text-xs border-neutral-200/60` |
| 查询按钮 | `#262626` hover `#404040` | — | 白 | `bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] h-7 rounded-md` |

聚焦：`focus:border-neutral-400`（`#A3A3A3`），不用蓝色描边。

---

## 七、表单间距校验规则

> 适用于表单页、Modal 表单、PANEL 内表单。布局层校验，不修改组件库内部实现。

| 规则 | Token | 标准值 | 检查方式 |
|------|-------|--------|----------|
| 页面左右边距 | H5 | 20px | 是否 `PAGE` / `p-5` |
| Label → 输入 | V1 | 4px | 是否 `LABEL`（`mb-1`） |
| 表单项之间 | V4 | 16px | 是否 `space-y-4` |
| 弹窗内边距 | H5 | 20px | 是否 `MODAL_PANEL` / `p-5` |
| 面板内边距 | V4 | 16px | 是否 `p-4` |
| 控件高度 | — | 28px | 是否 `FIELD` / `h-7` / `BTN_*` |
| 容器圆角 | radius-lg | ~7px | 是否 `rounded-lg`（面板） |
| 输入圆角 | radius-md | ~5px | 是否 `rounded-md` |
| 最后一项下间距 | — | 0 额外 margin | 容器 `space-y-4` 即可，勿再 `mb-4` 叠加 |

### 示例

- ✅ 正确：
  - Label `#737373` + 输入 `#FFFFFF` 描边 `#E8E8E8`，间距 V1=4px、V4=16px
  - 主按钮 `#111111`，取消白底描边
  - 信息提示底 `#F0F9FF`（`bg-sky-50`），不用 `bg-[#F2F7FF]`
- ❌ 反例：
  - `bg-[#F2F7FF]`、`text-[#333]` 裸 Hex
  - Label 与输入间距 8px（`mb-2`）与规范 V1 不一致
  - 表单项间距 8px（`space-y-2`）
  - 弹窗按钮区无 `border-t` 分隔
  - 输入框 `rounded-xl` 与 FIELD 的 `rounded-md` 不一致

### 修正建议

- 裸 Hex → 查 `color-tokens.md` 映射为 Tailwind token
- `#F2F7FF` → `bg-sky-50`（`#F0F9FF`）
- 间距不对 → 统一 `LABEL` + `space-y-4` + `PAGE`/`MODAL_PANEL`

---

## 八、间距与圆角汇总

| 位置 | Token | 数值 | Hex / 说明 |
|------|-------|------|------------|
| 页面左右内边距 | H5 | 20px | — |
| 弹窗/面板内边距 | H5 / V4 | 20px / 16px | 弹窗 p-5，面板 p-4 |
| Label → 输入 | V1 | 4px | — |
| 表单项之间 | V4 | 16px | — |
| 模块间距 | — | 20px | `mb-5` PageHeader 下 |
| Footer 上间距 | — | 24px | `mt-6` |
| 面板圆角 | radius-lg | 0.45rem ≈ 7px | `rounded-lg` |
| 输入圆角 | radius-md | 0.36rem ≈ 5px | `rounded-md` |
| 主按钮背景 | ink | `#111111` | `BTN_INK` |
| 输入描边 | input | `#E8E8E8` | `border-input` |

详见 `spacing-scale.md`、`radius-shadow.md`、`color-tokens.md`。

---

## 九、与设计系统其他规范的关系

- **色彩**：遵循 `color-tokens.md`，主按钮 `#111111`（ink），错误 `#DC2626`（destructive）
- **字体**：遵循 `typography.md`，表单默认 `text-xs/relaxed`（12px）
- **组件**：优先 `ui-constants.md` + `components-full.md` 中的 `Modal` / `FIELD`
- **代码审查**：新建表单后对照 `code-compliance.md`

---

## 十、示例结构（代码层面）

```tsx
import { PAGE, FIELD, LABEL, BTN_INK, BTN_OUTLINE } from '@/lib/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { Modal } from '@/components/common/Modal';

export function ExampleFormPage() {
  return (
    <div className={PAGE}>
      <PageHeader title="资源管理">
        <button type="button" className={BTN_INK} onClick={() => setOpen(true)}>
          新建
        </button>
      </PageHeader>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="新建资源"
        footer={
          <>
            <button type="button" className={BTN_OUTLINE} onClick={() => setOpen(false)}>
              取消
            </button>
            <button type="button" className={BTN_INK} onClick={handleSave}>
              确定
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={LABEL}>名称</label>
            <input className={FIELD} placeholder="请输入" required />
          </div>
          <div>
            <label className={LABEL}>描述</label>
            <textarea className={`${FIELD} min-h-[80px] resize-y`} placeholder="选填" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

---

## 十一、校验清单

新建或修改表单时，请确认：

- [ ] **页面边距**：整页表单使用 `PAGE`（H5 = 20px），无裸 `p-6` / `p-8`
- [ ] **弹窗内边距**：`MODAL_PANEL` p-5（20px）
- [ ] **圆角**：面板 `rounded-lg`，输入 `rounded-md`
- [ ] **Label 色**：`text-muted-foreground`（`#737373`），非 `#999` 硬编码
- [ ] **输入描边**：`border-input`（`#E8E8E8`），聚焦 `ring-ring/30`
- [ ] **表单项间距**：`space-y-4`（V4 = 16px）
- [ ] **Label 间距**：`LABEL` mb-1（V1 = 4px）
- [ ] **按钮**：主 `BTN_INK`（`#111111`），取消 `BTN_OUTLINE`
- [ ] **Footer**：`mt-6 pt-3 border-t border-neutral-100`
- [ ] **无裸 Hex**：无 `bg-[#F2F7FF]` 等，信息底用 `bg-sky-50`
- [ ] **与** `color-tokens.md` **、** `ui-constants.md` **一致**
