# 设计需求输入模板

> 将 UI 需求结构化，便于 Agent 按设计系统落地。填写后 Agent 应加载 `design-system-index` 对应 references。

---

## 一、新建整页

```yaml
page:
  name: "页面名称"
  domain: employees | kb | dashboard | staff | …   # SegmentedTabs 分组
  tabs: []                                        # 子页 tab 值列表
  header:
    title: ""
    icon: optional
    actions: ["新建", "搜索"]
  layout: table | card-grid | form | dashboard
  colors:                         # 可选，默认走 token
    canvas: "#FFFFFF"             → bg-background
    primary: "#111111"            → BTN_INK
  spacing:
    page_padding: "H5 20px"       → PAGE
  content:
    - type: table | cards | form | stats
```

---

## 二、新建/编辑表单（Modal）

```yaml
form:
  mode: create | edit
  title: ""
  fields:
    - name: fieldName
      label: "字段名称"
      type: text | textarea | select | number
      required: true | false
      hint: ""                      # 问号 Popover 文案
  spacing:
    label_to_input: "V1 4px"        → LABEL mb-1
    item_gap: "V4 16px"             → space-y-4
  actions:
    primary: "确定"                 → BTN_INK #111111
    secondary: "取消"               → BTN_OUTLINE
```

---

## 三、样式审查请求

```yaml
review:
  target: "src/components/XxxPage.tsx"
  scope: color | typography | spacing | radius | components | full
  focus:
    - "裸 Hex 如 #F2F7FF"
    - "未用 PageHeader"
    - "未用 FIELD/LABEL"
```

---

## 四、Agent 处理流程

1. 解析模板，缺失字段向用户追问；
2. 加载 `SKILL.md` → 按 scope 读 references；
3. 设计稿 Hex → 查 `color-tokens.md` 映射 Tailwind（如 `#F2F7FF` → `bg-sky-50`）；
4. 实现时 import `@/lib/ui` + common 组件；
5. 输出标注引用模块；审查时按 `code-compliance.md` 模板回复。

---

## 五、校验清单

- [ ] 需求含 layout / actions / fields（表单）
- [ ] 审查需求含 target + scope
- [ ] Agent 未直接使用设计稿 Hex 写 TSX
