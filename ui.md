---
name: joyserving-ui
description: 京小灵（JoyServing）B 端管理台 UI 设计规范 Skill。覆盖全局布局、颜色、字体、圆角、阴影、间距 Token 与核心组件（分段切换、卡片、按钮、弹窗、徽章、分页），并附首页、数字员工市场页、员工培训页三个页面模板。生成或修改任何京小灵页面（React + Tailwind）前必须遵循本规范。
---

# 京小灵 UI 设计规范（AI 生成专用）

> **用法**：把本文件全文粘贴到 AI Studio 的 System Instructions（或对话开头），然后用一句话描述要生成的页面，例如1.直接描述需求新增页面xxx，2.按京小灵规范生成一个xxx页。AI 输出 React + Tailwind 代码时必须逐条遵守本规范。

## 0. 设计基调（一句话）

**白底画布 + 墨黑主色 + 发丝灰描边**：克制、专业、信息密度高。界面主体只用中性灰阶；彩色只用于**语义状态**（成功绿 / 信息蓝 / 警告琥珀 / 危险玫红），且含义全站固定。禁止任何多余装饰色。

技术栈约定：React 函数组件 + TypeScript + Tailwind CSS，图标用 Hugeicons（经 `lib/icons.tsx` 统一导出，尺寸 13–16px），文案全部中文。

---

## 1. 颜色 Token（唯一允许的色板）

### 1.1 中性色（界面骨架）

| 用途 | 值 | Tailwind |
|---|---|---|
| 主内容区画布 / 卡片底 | `#FFFFFF` | `bg-white` |
| 侧栏底 | `#FAFAFA` | `bg-neutral-50` |
| 浅灰填充（分段切换容器 / 次级按钮底） | `#F5F5F5` | `bg-neutral-100` |
| 侧栏导航激活底 | `#EBEDF1` | `bg-[rgb(235,237,241)]`（hover 用 `/50` 半透明） |
| 描边（卡片 / 按钮 / 输入框） | `#E5E5E5` | `border-[#E5E5E5]`（弱化时可用 `/60` `/50`） |
| 标题墨黑 | `#171717` | `text-neutral-900` |
| 主文字 / 主按钮底 | `#262626` | `text-neutral-800` / `bg-neutral-800` |
| 次要文字（描述、说明） | `#737373` | `text-neutral-500` |
| 弱文字（占位、图标默认、计数） | `#A3A3A3` | `text-neutral-400` |

### 1.2 语义色（含义固定，禁止挪用）

| 语义 | 文字 | 底色 | 描边 | 典型用法 |
|---|---|---|---|---|
| 成功 / 在岗 / 开箱即用 | `#009966` | `#ECFDF5` | `#A4F4CF`（60%） | 「上岗」按钮、开箱即用 tag |
| 在线状态点 | `#00AC6B` | — | 白色 2px 外圈 | 头像右下角圆点；离线用 `#737373` |
| 信息 / 休息 / 实时 | `#0050D2` | `#F0F7FF` | `#91C5FF` | 「休息」按钮、AI 自动徽章 |
| 警告 / 定制 / 待处理 | `#B45309` | `#FFFBEB` | `#FDE68A`（60%） | 专属定制 tag、排队计数 |
| 提醒圆点 | `#FBBF24` | — | 白色 1.5px 外圈 | 按钮角标小红点（9px） |
| 危险 / 删除 | `rose-600` | `rose-50` | — | 删除 hover：`hover:text-rose-600 hover:bg-rose-50` |
| 头像容器 | — | `#F8FAFC` | `rgba(198,210,255,0.6)` 1.5px | 员工头像方形圆角框 |

**硬性规则**：
- 除上表外**禁止**出现任何裸 Hex；禁止 `slate-*` / `blue-*` / `indigo-*` 作为中性色或主色。
- 主操作永远是墨黑 `#262626`，不是蓝色。

---

## 2. 字体与字阶

- 字体：`Inter`，中文回退 `PingFang SC / Microsoft YaHei`；数字/ID 用 `font-mono` + `tabular-nums`。
- 全站字阶（只用这几档）：

| 层级 | 规格 |
|---|---|
| Banner 大标题 | `text-2xl（24px） font-bold text-neutral-800` |
| 页面/区块主标题 | `text-xl（20px） font-semibold text-neutral-900 tracking-tight` |
| 卡片标题 / 弹窗标题 | `text-sm（14px） font-semibold text-neutral-900` |
| 正文 / 按钮 / 输入 | `text-[13px]` 或 `text-xs（12px） text-neutral-800` |
| 描述 / 辅助 | `text-[11px] text-neutral-500 leading-relaxed` |
| Tag / 徽章 | `text-[9px]`~`text-[10px] font-semibold` |

---

## 3. 圆角语义

| 元素 | 圆角 | Tailwind |
|---|---|---|
| 内容卡片 / Banner / 面板 / 弹窗 | 13px | `rounded-[13px]` |
| 按钮 / 输入框 / 下拉 / 小按钮 | 7px | `rounded-[7px]` |
| Banner 内大 CTA | 10px | `rounded-[10px]` |
| 分段切换容器 8px、选中片 6px | — | `rounded-lg` / `rounded-md` |
| 员工头像方形圆角框（66px） | 20px | `rounded-[20px]` |
| Tag 小标签 | 4px | `rounded` |
| 徽章 / 状态点 / 进度条 | 全圆 | `rounded-full` |

---

## 4. 阴影与悬浮

| 场景 | 值 |
|---|---|
| 卡片静态 | `shadow-[0_2px_10px_rgba(31,35,41,0.02)]` |
| 卡片 hover | `hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)]` + `transition-all duration-200` |
| 小按钮 | `shadow-[0_1px_0_rgba(0,0,0,0.05)]` |
| 分段切换选中片 | `shadow-[0_1px_3px_rgba(0,0,0,0.05)]` |
| 弹窗面板 | `shadow-lg ring-1 ring-black/10` |

主按钮 hover 统一 `hover:opacity-90`；白底小按钮 hover 统一 `hover:bg-neutral-50`。

---

## 5. 间距与布局节奏

- 主内容区四周留白 **20px**（`p-5`）；顶部分段切换区 `px-5 py-4` 且 `sticky top-0 bg-white z-10`。
- 区块标题行与内容间距 **20px**（`mb-5`）。
- 卡片流式列表 gap **12px**（`gap-3`）；管理页栅格 gap **16px**（`gap-4`）。
- 卡片内边距 **16px**（`p-4`）；弹窗内边距 **20px**（`p-5`）。
- 控件高度统一 **32px**（`h-8`）；分段切换容器 38px（内部选中片 30px）；Banner CTA 40px。
- 滚动容器加纤细滚动条（6px、`neutral-300`、hover 加深）。

---

## 6. 全局布局骨架

所有管理台页面都套在这个外壳里（左侧栏 + 右主区）：

```tsx
<div className="flex h-screen w-screen overflow-hidden bg-white font-sans text-neutral-800 antialiased">
  {/* 左侧栏：232px，可折叠到 52px */}
  <aside className="w-[232px] shrink-0 bg-neutral-50 flex flex-col">
    {/* 1) Logo 区：px-5 pt-6 pb-4，logo 高 33px + Beta 胶囊 */}
    {/* 2) 主 CTA：w-full h-[38px] bg-[rgb(243,245,248)] border border-[#E4E6EA] rounded-xl text-[14px] font-medium */}
    {/* 3) 分组导航（滚动区 px-3.5 py-2.5 space-y-4）：
          - 分组标题：text-[12px] font-medium text-neutral-900/70 px-2 py-1.5
          - 一级项：h-[38px] px-2 rounded-lg text-[14px] font-semibold text-[rgb(38,38,38)]
            激活：bg-[rgb(235,237,241)]；hover：bg-[rgb(235,237,241)]/50；左侧 16px 图标
          - 二级项：h-8 pl-8 pr-2 rounded-md text-[13px]
            激活：bg-[rgb(235,237,241)]/50 font-medium；默认 text-[rgb(89,89,89)] */}
    {/* 4) 底部：向导进度卡（白底 rounded-xl）+ 工作台入口 + 用户资料条（border-t） */}
  </aside>

  {/* 右主区 */}
  <main className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
    {/* 顶部分段切换（sticky） */}
    <div className="px-5 py-4 sticky top-0 bg-white z-10 shrink-0">{/* SegmentedTabBar */}</div>
    {/* 滚动内容 */}
    <div className="flex-1 min-h-0 overflow-y-auto pb-5">{/* 页面内容，区块 padding 20px */}</div>
  </main>
</div>
```

侧栏导航固定分组：**项目**（数字员工〔我的数字员工 / 数字员工市场〕、办公室、员工培训〔员工知识 / 员工技能 / 员工比拼〕）、**组织**（组织管理〔员工分配 / 角色权限〕）、底部**一线客服**（客服工作台）。

---

## 7. 核心组件（直接复制使用）

### 7.1 分段切换 SegmentedTabBar（页面顶部一级切换）

```tsx
<nav className="inline-flex h-[38px] items-center gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
  {items.map((it) => (
    <button
      key={it.id}
      className={`h-[30px] px-3 rounded-md text-[13px] font-medium leading-none transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
        active === it.id
          ? 'bg-white text-neutral-950 shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
          : 'bg-transparent text-neutral-500 hover:text-neutral-950'
      }`}
    >
      {it.label}
    </button>
  ))}
</nav>
```

### 7.2 区块标题行（标题 + 右侧筛选）

```tsx
<div className="flex items-center justify-between flex-wrap gap-3 mb-5">
  <h2 className="text-xl font-semibold text-neutral-900">我的数字员工</h2>
  <div className="flex items-center gap-3">
    {/* 搜索框 */}
    <label className="flex items-center h-8 w-44 px-2.5 gap-1.5 bg-white border border-[#E5E5E5]/60 rounded-[7px]">
      <SearchIcon size={14} className="text-neutral-400 shrink-0" />
      <input className="flex-1 min-w-0 bg-transparent outline-none text-xs text-neutral-800 placeholder:text-neutral-800/50" placeholder="按工号或姓名查找…" />
    </label>
    {/* 下拉 */}
    <select className="h-8 px-2.5 bg-white border border-[#E5E5E5]/60 rounded-[7px] text-xs text-neutral-800/50 cursor-pointer">
      <option>所有状态</option>
    </select>
  </div>
</div>
```

### 7.3 按钮三件套

```tsx
{/* 主按钮（墨黑）：页面级主 CTA、弹窗确定 */}
<button className="inline-flex items-center justify-center gap-1 h-8 px-3 bg-neutral-800 text-white text-xs font-semibold rounded-[7px] hover:opacity-90 transition cursor-pointer disabled:opacity-50">立即雇佣</button>

{/* 次级按钮（柔灰）：再次操作、取消 */}
<button className="inline-flex items-center justify-center gap-1 h-8 px-3 bg-neutral-100 text-neutral-800 text-xs font-semibold rounded-[7px] border border-[#E5E5E5] hover:bg-neutral-200 transition cursor-pointer">取消</button>

{/* 描边按钮（白底）：低强调操作 */}
<button className="inline-flex items-center justify-center gap-1 h-8 px-3 bg-white text-neutral-800 text-xs font-semibold rounded-[7px] border border-[#E5E5E5] hover:bg-neutral-50 shadow-[0_1px_0_rgba(0,0,0,0.05)] transition cursor-pointer">培训</button>
```

语义变体（只改三个颜色，结构不变）：
- 上岗（绿）：`bg-[#ECFDF5]/50 border-[#A4F4CF] text-[#009966] hover:bg-[#ECFDF5]/80`
- 休息（蓝）：`bg-[#F0F7FF] border-[#91C5FF] text-[#0050D2] hover:bg-[#E6F1FC]`

### 7.4 内容卡片（员工卡，224×224 居中式）

```tsx
<div className="w-56 h-56 bg-white border border-[#E5E5E5] rounded-[13px] shadow-[0_2px_10px_rgba(31,35,41,0.02)] flex flex-col items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)]">
  <div className="flex flex-col items-center w-[194px]">
    {/* 头像：66px 方形圆角框 + 状态点 */}
    <div className="relative w-[66px] h-[66px] mb-2.5">
      <div className="w-full h-full rounded-[20px] overflow-hidden border-[1.5px] border-[rgba(198,210,255,0.6)] bg-[#F8FAFC] flex items-center justify-center">
        <img className="w-full h-full object-cover" src={avatar} alt="" />
      </div>
      <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-white bg-[#00AC6B]" /> {/* 离线 #737373 */}
    </div>
    <div className="text-sm font-medium text-neutral-900 mb-2.5 truncate max-w-full">京京-售后专家</div>
    <p className="text-[11px] text-neutral-500 leading-[1.6] text-center line-clamp-2 mb-2.5">擅长退换货政策解读与安抚话术。</p>
    {/* 操作条：上分割线 + 三按钮（培训 / 上岗|休息 / •••） */}
    <div className="w-full border-t border-[#EDEDED]/60 pt-2.5 flex justify-center gap-1.5">
      {/* 每个按钮 w-[75px] h-8，"更多"为 w-8 h-8，样式见 7.3 */}
    </div>
  </div>
</div>
```

### 7.5 市场卡片（224 宽，头像 + 名称 + Tag + 描述 + 整宽 CTA）

结构自上而下居中排列，卡片壳同 7.4（`min-h-[248px] p-4`）：
1. 头像框（同 7.4）
2. 名称：`text-sm font-semibold text-neutral-900 text-center line-clamp-2`
3. Tag：开箱即用 `bg-[#ECFDF5] text-[#009966] border border-[#A4F4CF]/60`；专属定制 `bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]/60`；公共 `text-[9px] font-semibold px-1.5 py-px rounded`
4. 描述：`text-[11px] text-neutral-500 text-center line-clamp-2 flex-1`
5. 整宽按钮 `w-full h-8`：未雇佣→主按钮「立即雇佣」；已雇佣→次级「再次雇佣」；定制→描边「帮我定制一位」

### 7.6 Banner 引导横幅（首页顶部）

```tsx
<div className="relative mx-5 h-[182px] rounded-[13px] overflow-hidden border border-[#E5E5E5]/50 shadow-[0_8px_30px_rgba(0,0,0,0.01)]">
  <img className="absolute inset-0 w-full h-full object-cover" src={bannerBg} alt="" /> {/* 浅色渐变插画底 */}
  <div className="absolute inset-0 flex items-center px-[26px]">
    <div className="ml-5">
      <div className="text-2xl font-bold text-neutral-800 mb-2">雇佣新员工上手向导</div>
      <div className="text-xs text-neutral-800/60 mb-5">一键带你雇人、配技能、试岗，几步就能让数字员工上岗。</div>
      <button className="w-[150px] h-10 bg-neutral-800 text-white text-sm rounded-[10px] flex items-center justify-center gap-2.5 hover:opacity-90 transition cursor-pointer">立即雇佣开始 →</button>
    </div>
  </div>
  {/* 右侧装饰插画 absolute right-5 top-5 */}
</div>
```

### 7.7 弹窗 Modal

```tsx
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
  <div className="bg-white rounded-[13px] w-full max-w-md p-5 shadow-lg ring-1 ring-black/10" onClick={(e) => e.stopPropagation()}>
    <h2 className="text-sm font-extrabold text-neutral-900 mb-4">创建知识库</h2>
    <div className="text-xs space-y-4">{/* 表单内容 */}</div>
    <div className="flex gap-2 justify-end mt-6 pt-3 border-t border-neutral-100">
      {/* 次级按钮「取消」 + 主按钮「确定」 */}
    </div>
  </div>
</div>
```

表单控件：
- 标签：`block text-xs font-medium text-neutral-500 mb-1`（必填加 `<span className="text-rose-500">*</span>`，右侧可放 `0/30` 计数）
- 输入/下拉/文本域：`w-full bg-white border border-[#E5E5E5] rounded-[7px] text-xs text-neutral-800 placeholder:text-neutral-400 px-3 py-2 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 transition`
- 可多选选项卡：整行按钮 `px-3 py-2 rounded-lg border text-left`，选中 `border-neutral-800/30 bg-neutral-800/5` + 左侧 Check 图标

### 7.8 语义徽章 badge

```tsx
const badge = 'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border';
// 中性: bg-neutral-100 text-neutral-500 border-[#E5E5E5]
// 成功: bg-emerald-50 text-emerald-600 border-emerald-100
// 警告: bg-amber-50 text-amber-600 border-amber-100
// 实时: bg-sky-50 text-sky-600 border-sky-100
// 危险: bg-rose-50 text-rose-600 border-rose-100
```

### 7.9 分页（列表超 10 条时出现）

`flex justify-between text-[10px] text-neutral-400`：左侧「共 N 条」；右侧「上一页」「下一页」描边小按钮（`px-2 py-1 rounded-md border border-[#E5E5E5] disabled:opacity-40`）+ 当前页墨黑块（`px-2 py-1 rounded-md bg-neutral-800 text-white font-bold`）+「10 条/页」。

### 7.10 彩色卡片图标 CardIcon（管理页卡片左上角）

40×40 `rounded-xl` 渐变方块 + 白色字形，颜色按 id 稳定哈希从 8 组渐变里取（blue/violet/emerald/amber-orange/rose-pink/cyan-sky/indigo/fuchsia-purple 的 `from-*-500 to-*-600`），保证同一对象颜色恒定。**仅**用于卡片图标，不得扩散到其它元素。

---

## 8. 页面模板

### 8.1 首页（我的数字员工）

```
[sticky 分段切换: 我的数字员工 | 数字员工市场]
[Banner 引导横幅 §7.6]（左右留白 20px）
[区块 padding 20px]
  [标题行 §7.2: "我的数字员工" + 搜索框 + 状态下拉(所有状态/已上岗/待上岗)]
  [卡片流式列表 flex flex-wrap gap-3: 员工卡 §7.4 × N]
```

### 8.2 数字员工市场页

```
[sticky 分段切换: 我的数字员工 | 数字员工市场]（与首页共用外壳，无 Banner）
[区块 padding 20px]
  [标题行: "数字员工市场" + 分段切换(全部类型/开箱即用/联系定制)]
  [卡片流式列表 flex flex-wrap gap-3: 市场卡 §7.5 × N]
```

### 8.3 员工培训页（员工知识 / 员工技能 / 员工比拼 三个子页共用骨架）

```
[页面外壳: flex-1 overflow-y-auto p-5 bg-white text-xs]
[sticky 分段切换: 📚 员工知识 | 员工技能 | 🧪 员工比拼]（mb-5）
[PageHeader（mb-5, pb-3.5 下边框 border-neutral-200）:
  h1 text-xl font-extrabold tracking-tight + 右侧操作槽(搜索框 + 主按钮"创建新知识库")]
[可选二级行: 左 SegmentedTabBar（已订阅/团队/市场）+ 右搜索与新建，pb-3 mb-6 下边框]
[卡片栅格 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3~4 gap-4:
  管理卡片 = 卡片壳 §7.4 + p-4，内部自上而下:
    行1: CardIcon §7.10 + 右上角悬浮操作(重命名/删除, text-neutral-400 hover:text-rose-600)
    行2: 标题 text-sm font-extrabold line-clamp-2
    行3: 元信息（"包含文档数: N 个文件" 胶囊 / font-mono 字符数 / 更新时间 tag），行间用 border-t border-neutral-100 分隔
    行4: 底部操作条 pt-3 border-t（整宽次级小按钮，如"上传新文档"）]
[ListPagination §7.9（mt-4 pt-3 上边框）]
[弹窗 §7.7: 创建/重命名，字段带字数计数]
```

拖拽上传区（知识库详情）：`border-2 border-dashed border-neutral-300 rounded-2xl p-8 text-center`，拖入时 `border-neutral-900 bg-neutral-100/60`；解析日志用墨黑终端块 `bg-neutral-900 text-emerald-400 font-mono text-[11px] rounded-xl p-3`。

---

## 9. 生成前自检清单（Do / Don't）

- [ ] 画布是白色，主按钮是墨黑 `#262626`（**不是蓝色**）。
- [ ] 所有描边用 `#E5E5E5`（或其 50%/60% 半透明），没有 `border-gray-300` 之类随机灰。
- [ ] 彩色只出现在语义场景（§1.2）与 CardIcon（§7.10），含义与表格一致。
- [ ] 卡片 13px 圆角、控件 7px 圆角、控件高 32px、内容区留白 20px、卡片间距 12px（栅格 16px）。
- [ ] 卡片 hover 上浮 2px + 加深阴影；主按钮 hover 降透明度；白底按钮 hover `bg-neutral-50`。
- [ ] 页面顶部有 sticky 分段切换；页面结构符合 §8 对应模板。
- [ ] 文案中文、口吻拟人化职场（雇佣/上岗/休息/培训/比拼），图标 lucide 13–16px。
- [ ] 空态给一句居中的 `text-sm text-neutral-400` 提示；列表超 10 条给分页。
