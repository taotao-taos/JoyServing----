# JoyServing · 京小灵 统一设计规范（DESIGN.md）

本规范是全站前端交互与视觉的**单一事实来源（Single Source of Truth）**。
所有页面、组件在新增或修改时都应遵循本文件；如需扩展，请先更新本文件与对应 token/共享组件，再落地到页面，避免重新出现「散落的硬编码」。

> 设计基调：**暖灰画布 + 墨黑主色（warm‑neutral + ink）**。克制、专业、信息密度高，强调内容而非装饰。统一前历史上存在「暖灰/墨黑」与「冷蓝/slate」两套并行风格，现已全部收敛到暖灰墨黑系。

---

## 1. 设计原则

1. **单色为骨，语义色为点缀**：界面主体只用中性灰（`neutral`）+ 墨黑（`ink`）+ 纸底（`paper`）。彩色仅用于**语义状态**与**实时信号**，且含义全站一致。
2. **Token 优先**：颜色、圆角、阴影一律走 token / 共享常量，不写裸十六进制（`bg-[#...]`）或随机灰阶。
3. **组件复用**：页面头部、分段切换、弹窗、卡片、按钮、表单等重复结构必须复用共享层（见 §7），不再逐页手抄。
4. **一致的层级语言**：标题 `font-extrabold` + `tracking-tight`；正文 `text-neutral-800`；次要信息 `text-neutral-500`；最弱信息 `text-neutral-400`。

---

## 2. 颜色 Token

定义于 `src/index.css`（`:root` + `@theme inline`），通过 Tailwind 工具类使用，例如 `bg-paper` / `text-ink` / `border-line`。

| Token | 工具类前缀 | 取值 | 用途 |
|---|---|---|---|
| `--paper` | `bg-paper` | `#FAF9F6` | 页面画布底色（全站统一） |
| `--surface` | `bg-surface` | `#FFFFFF` | 卡片 / 弹窗 / 面板 / 表格主体 |
| `--rail` | `bg-rail` | `#F5F4F0` | 侧栏、表头、分段切换容器、轻填充 |
| `--rail-strong` | `bg-rail-strong` | `#ECEBE6` | 略深轨道（侧栏页脚等） |
| `--line` | `border-line` | `#E7E5E0` | 发丝级描边（默认边框） |
| `--ink` | `bg-ink` / `text-ink` | `#111111` | 主操作按钮、标题、深色面、选中态 |
| `--ink-hover` | `bg-ink-hover` | `#262626` | 墨黑按钮 hover |
| `--live` | `bg-live` / `text-live` | `#1E90FF`（DodgerBlue） | **实时 / 在线 / AI 自动**信号，唯一允许的蓝 |

### 语义状态色（含义固定，跨页一致）

| 语义 | 配色 | 典型用法 |
|---|---|---|
| 成功 / 在线 / 推荐 | `emerald`（`bg-emerald-50 text-emerald-600 border-emerald-100`） | 在线徽章、就绪、实验优胜方 B、运行中 |
| 警告 / 待处理 | `amber` | 阈值提醒、转人工率、暂停就绪 |
| 危险 / 删除 / 不满意 | `rose` | 删除按钮 hover、满意度差、危险操作 |
| 实时 / 自动 / 链路 | `live`（DodgerBlue）/ `sky` 系 | AI 自动会话徽章、实时指标、思考追踪 |
| 中性信息 | `neutral` | 普通标签、ID、计数 |
| 品牌标记 | `orange`（仅 `OpenClaw` 标） | 市场页 OpenClaw 品牌角标（唯一保留的橙） |

> 已废弃：`slate-*`、`blue-*`、`indigo-*`、`cyan-*`、`violet-*` 作为**主色/中性色**使用一律禁止；`slate` 全部映射为 `neutral`，`blue/indigo` 主操作映射为 `ink`，实时信号映射为 `live/sky`。

### 补齐的中间灰阶

为让既有意图真正生效，`@theme` 中补齐了 Tailwind 默认缺失的 `neutral-150/250/350/550/850`，可正常使用 `bg-neutral-850` 等。

---

## 3. 字体与排版

- 字体：`Geist Variable`（`font-sans`，全局默认）。等宽数字/ID/Cron 用 `font-mono`。
- 标题层级：
  - 页面主标题 `h1`：`text-2xl font-extrabold tracking-tight text-neutral-900`（由 `PageHeader` 统一输出）。
  - 区块标题：`text-sm font-extrabold text-neutral-900`。
  - 正文：`text-xs` ~ `text-sm`，`text-neutral-800`；描述/辅助：`text-xs text-neutral-500 leading-relaxed`。
- 字重梯度：`font-extrabold`（标题/强调）> `font-bold` > `font-semibold` > `font-medium`。

---

## 4. 间距与布局（紧凑密度 / Compact）

全站采用**高信息密度**的紧凑节奏，目标是最大化屏幕利用率，因此只压间距/内边距/字号，不动信息结构与配色。

- **页面外壳**：`flex-1 overflow-y-auto p-5 bg-paper text-neutral-800 font-sans`（常量 `PAGE`）。全站页面内边距统一 `p-5`。
- 页面纵向节奏：分段切换（`mb-5`）→ 标题区（`pb-3.5 mb-5`，下边框 `border-line`）→ 内容。
- 标题字号：页面主标题 `text-xl`（由 `PageHeader` 输出），区块标题 `text-sm`。
- 栅格：卡片网格 `grid gap-4`，按断点 `md:grid-cols-2 lg:grid-cols-3/4`。
- 卡片内边距 `p-4`；面板/区块内边距 `p-4`~`p-5`；弹窗 `p-5`。
- 表格单元格 `px-4 py-2.5`（紧凑行高）。
- 控件高度：按钮 / 输入 / 下拉 / 分段 tab 统一 `h-8`（分段 tab `h-7`）。
- 区块纵向间距 `space-y-4`；模块间距 `mb-5`~`mb-6`。
- 滚动区域统一加 `custom-scrollbar`（纤细、低饱和、hover 加深，定义于 `index.css`）。

---

## 5. 圆角语义

| 元素 | 圆角 |
|---|---|
| 控件：按钮 / 输入框 / 下拉 / 分段 tab / 小标签 | `rounded-xl`（必要时 `rounded-lg`） |
| 面板 / 表格容器 / 弹窗 / 区块 | `rounded-2xl` |
| 内容卡（员工/知识库/技能/实验卡等） | `rounded-3xl` |
| 胶囊徽章 / 头像 | `rounded-full` |

## 6. 阴影

| 名称 | 值 | 用途 |
|---|---|---|
| 卡片静态 | `shadow-[0_8px_30px_rgb(0,0,0,0.015)]` | 内容卡默认（常量 `CARD`） |
| 卡片悬浮 | `shadow-[0_20px_50px_rgba(0,0,0,0.05)] -translate-y-1` | 卡片 hover（常量 `CARD_HOVER`） |
| 面板 | `shadow-[0_8px_30px_rgb(0,0,0,0.01)]` | 面板/表格（常量 `PANEL`） |
| 弹窗 | `shadow-[0_24px_70px_rgba(0,0,0,0.18)]` | Modal 面板 |
| 分段选中 | `shadow-[0_2px_10px_rgba(0,0,0,0.06)]` | SegmentedTabs 选中片 |

---

## 7. 共享层（落地约定）

### 7.1 样式常量 `@/lib/ui`

可组合的 className 字符串与徽章工具：

`PAGE` · `CARD` · `CARD_HOVER` · `PANEL` · `BTN_INK` · `BTN_SOFT` · `BTN_OUTLINE` · `FIELD` · `LABEL` · `MODAL_OVERLAY` · `MODAL_PANEL` · `badgeClass(tone)`（tone: `neutral|ink|success|warning|danger|live`）。

```tsx
import { PAGE, CARD, CARD_HOVER, BTN_INK, FIELD } from '@/lib/ui';
<div className={PAGE}>…</div>
<button className={BTN_INK}>主操作</button>
<input className={FIELD} />
```

### 7.2 共享组件 `src/components/common/`

- **`<SegmentedTabs items={[{ tab, label, match?, onSelect? }]} />`**
  页面内子页切换器（顶部）。自动读取 `useApp()` 的 `activeTab/setActiveTab`，统一容器、选中态与动效。
- **`<PageHeader icon? title description? > {右侧操作} </PageHeader>`**
  统一标题区：图标 + 主标题 + 描述 + 右侧操作槽（按钮/搜索/切换器）。
- **`<Modal open onClose icon? title description? footer? maxWidth?>{内容}</Modal>`**
  统一弹窗：遮罩 + 面板 + 标题区 + 底部操作区，含点击遮罩关闭与入场动效。

### 7.3 按钮规范

| 类型 | 用法 | 常量 |
|---|---|---|
| 主操作（墨黑） | 页面级主 CTA（新建、保存、部署、雇佣） | `BTN_INK` |
| 次级（柔灰） | 取消、辅助操作 | `BTN_SOFT` |
| 描边（白底） | 弹窗取消、低强调操作 | `BTN_OUTLINE` |
| 幽灵/分段 | 由 `SegmentedTabs` 或本地 ghost 处理 | — |

### 7.4 分段切换分组（标准 `items`）

- 员工域：`employees`（我的数字员工）/ `market`（数字员工市场）
- 训练域：`kb` / `skills` / `tasks`
- 监测域：`dashboard` / `abTest` / `staff` / `roles`

---

## 8. 组件级细则

- **卡片**：`CARD` + `CARD_HOVER`，内容卡圆角 `rounded-3xl`；选中态用 `ring-1 ring-neutral-900/15 border-neutral-900/20`（不再用蓝色 ring）。
- **表格**：容器 `PANEL`；表头 `bg-rail border-b border-line text-neutral-400 uppercase tracking-wider`；行 hover `hover:bg-neutral-50`；分隔 `divide-neutral-100`。
- **表单**：输入/下拉/文本域统一 `FIELD`；标签统一 `LABEL`；聚焦态 `focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200`。
- **徽章**：用 `badgeClass(tone)` 或对应语义色三件套（`bg-*-50 text-*-600 border-*-100`）。
- **深色面**（命令条、思考追踪、流程图）：底 `bg-ink` / `bg-neutral-900`，描边 `border-neutral-700/800`，其上主操作用 `bg-white text-neutral-900`，强调信号用 `text-live`。
- **Toast / 提示**：墨黑底 `bg-ink text-white rounded-xl`。

---

## 9. 暗色模式

`index.css` 保留了 `.dark` 变量定义，但**当前不启用**：页面以亮色暖灰为唯一视觉目标。若未来启用暗色，应改为消费语义 token（`bg-paper/surface/ink` 等）而非裸色，再补齐暗色取值。

---

## 10. 维护清单（改动前自检）

- [ ] 颜色是否走了 token / 语义色？有没有新引入 `bg-[#...]`、`slate-*`、`blue-*`？
- [ ] 头部 / 分段 / 弹窗 / 卡片 / 按钮 / 表单是否复用了共享层？
- [ ] 圆角、阴影、间距是否符合 §4–§6？
- [ ] `npm run lint`（tsc）与 `npm run build` 是否通过？
