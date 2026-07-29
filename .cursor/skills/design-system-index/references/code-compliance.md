# UI 代码合规审查规范

> 适用于 PR 审查、样式 refactor、消除硬编码。  
> 输出格式：**通过项 / 不符合项**（位置 + 当前值 + 规范 Hex/Token + 建议修正）。

---

## 一、快速检查命令

```bash
# 裸十六进制（强约束禁止）
rg 'bg-\[#|text-\[#|border-\[#' src/

# 废弃色板
rg 'slate-|blue-[0-9]|indigo-|cyan-' src/ --glob '*.tsx'

# 绕过 PageHeader
rg 'text-xl font-extrabold' src/components/ --glob '*.tsx' | rg -v PageHeader
```

---

## 二、色彩必检

| 验证项 | 规范要求 | Hex 参考 | 检查方式 |
|--------|----------|----------|----------|
| 无裸 Hex | 禁止 `bg-[#F2F7FF]` 等 | 映射 token | rg / 目视 |
| 画布/表面 | `bg-background` / `bg-card` | `#FFFFFF` | className |
| 主文本 | `text-foreground` | `#111111` | className |
| 主按钮 | `BTN_INK` / `bg-primary` | `#111111` | import 常量 |
| Label | `LABEL` / `text-muted-foreground` | `#737373` | className |
| 描边 | `border-border` / `border-input` | `#E8E8E8` | className |
| 信息浅蓝 | `bg-sky-50` | `#F0F9FF`（稿 `#F2F7FF`） | 非裸 Hex |
| 废弃 slate/blue 主色 | 改 neutral / ink / sky | — | rg |
| 语义徽章 | `badgeClass(tone)` 三件套 | 见 color-tokens | 目视 |

---

## 三、共享层必检

| 验证项 | 规范 | 反例 |
|--------|------|------|
| 页面外壳 | `PAGE`（H5=20px） | 手写 `p-6 bg-white` |
| 主/次/取消按钮 | `BTN_INK` / `BTN_SOFT` / `BTN_OUTLINE` | 手写 `bg-neutral-900 px-4` |
| 表单 | `FIELD` + `LABEL` | 裸 input class |
| 卡片/面板 | `CARD` / `PANEL` | 手写 ring/shadow |
| 标题 | `<PageHeader>` | 手写 h1 + border-b |
| 分段 | `<SegmentedTabs>` | 手写 tab 按钮 |
| 弹窗 | `<Modal>` 或 Dialog + MODAL_* | 自定义 overlay |

---

## 四、间距 / 圆角 / 排版必检

| 验证项 | Token | 标准 |
|--------|-------|------|
| 页面边距 | H5 | 20px `p-5` |
| 表单项间距 | V4 | 16px `space-y-4` |
| Label 间距 | V1 | 4px `mb-1` |
| 控件高度 | — | 28px `h-7` |
| 控件圆角 | radius-md | ~6px `rounded-md` |
| 面板圆角 | radius-lg | ~7px `rounded-lg` |
| 页面标题 | — | `text-xl font-extrabold` PageHeader |
| 正文 | — | `text-xs/relaxed` 12px |
| 滚动区 | — | `custom-scrollbar` |

---

## 五、常见违规与修复

| 违规 | 当前 | 规范 | 建议修正 |
|------|------|------|----------|
| 裸画布 Hex | `bg-[#FAF9F6]` | `#FAF9F6` paper | `bg-paper` 或 `PAGE` |
| 信息底 Hex | `bg-[#F2F7FF]` | sky-50 `#F0F9FF` | `bg-sky-50` |
| 主色 Hex | `text-[#333]` | `#111111` | `text-foreground` |
| slate 中性 | `bg-slate-50` | `#FAFAFA` | `bg-neutral-50` / `bg-muted` |
| 蓝色主按钮 | `bg-blue-600` | `#111111` ink | `BTN_INK` |
| 手写标题 | 自定义 h1 | PageHeader | 改用组件 |
| 蓝色选中 ring | `ring-blue-500` | foreground/10 | `ring-foreground/10` |

---

## 六、审查输出模板

```markdown
## UI 合规审查 — [页面/组件名]

### 通过项
- 主按钮使用 BTN_INK（#111111）…

### 不符合项
1. **[文件:行]** — 当前：`bg-[#F2F7FF]` → 规范：`bg-sky-50`（#F0F9FF）→ 建议：替换 class

### 未验证
- …（需补充材料）
```

---

## 七、校验清单

- [ ] 无裸 Hex（含 `#F2F7FF`、`#333`、`#FAF9F6` 等）
- [ ] 无 slate/blue 主色
- [ ] 复用 PAGE / BTN_* / FIELD / LABEL / CARD / PANEL
- [ ] PageHeader / SegmentedTabs / Modal
- [ ] H5/V1/V4 间距、rounded-md/lg
- [ ] `npm run lint` 与 `npm run build` 通过
