/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 技能工作室 — 自然语言生成技能包（原型 mock，对齐 AgentOne createSkill）
 */

export type SkillStudioFile = {
  path: string;
  content: string;
};

export type SkillStudioDraft = {
  draftId: string;
  skillCode: string;
  displayName: string;
  purpose: string;
  capabilities: string[];
  files: SkillStudioFile[];
  /** 列表页用的简短描述 */
  listDescription: string;
};

function shortId(len = 12): string {
  return Math.random().toString(16).slice(2, 2 + len).padEnd(len, '0');
}

function isQcPrompt(text: string): boolean {
  return /质检|合规|稽核|审核|会话质量|客服对话/.test(text);
}

function isClaimsPrompt(text: string): boolean {
  return /理赔|免赔|保单|测算|赔付/.test(text);
}

function buildQcDraft(prompt: string, draftId: string, skillCode: string): SkillStudioDraft {
  const skillMd = `---
name: ${skillCode}
description: 汽车行业客服会话合规质检技能。根据对话内容核对合规要点、输出清单命中与风险提示。
---

# ${skillCode}

## 何时使用

当需要对照标准检查客服与客户对话是否合规、是否存在禁语或流程遗漏时使用本技能。

## 输入

- 完整客服对话（标注角色：客服 / 客户）
- 可选：场景类型、会话 ID、渠道

## 步骤

1. 读取 \`references/compliance_checklist.md\` 与质检标准
2. 按场景映射 \`references/automotive_scenarios.md\`
3. 逐条核对，填写 \`assets/inspection_report_template.md\`
4. 输出命中项、风险等级与改进建议

## 用户需求原文

${prompt.trim()}
`;

  const checklist = `# 合规检查清单

| 编号 | 检查点 | 严重度 | 说明 |
|------|--------|--------|------|
| C01 | 开场身份核实 | 高 | 是否核验证件/订单身份 |
| C02 | 禁语与承诺 | 高 | 不得承诺保本/绝对收益 |
| C03 | 投诉升级路径 | 中 | 激烈情绪是否转人工 |
| C04 | 结束确认 | 低 | 是否复述结论与后续动作 |
`;

  const criteria = `# 质检评分标准

| 维度 | 权重 | 满分说明 |
|------|------|----------|
| 服务态度 | 20% | 礼貌、共情、无打断 |
| 问题解决 | 25% | 定位准确、方案可执行 |
| 专业知识 | 25% | 口径正确、无误导 |
| 流程合规 | 30% | 必问项齐全、记录完整 |
`;

  const scenarios = `# 汽车行业场景映射

- 售前咨询：报价、配置、试驾预约
- 售后投诉：质量、交期、服务态度
- 保险理赔：出险、定损、赔付进度
- 配件与保养：预约、价格、原厂件说明
`;

  const report = `# 汽车行业客服质检报告

## 一、基本信息

| 字段 | 值 |
|------|-----|
| 对话 ID | {{DIALOGUE_ID}} |
| 客服 ID | {{AGENT_ID}} |
| 场景类型 | {{SCENARIO_TYPE}} |
| 质检时间 | {{INSPECTED_AT}} |

## 二、维度评分

| 维度 | 权重 | 得分 |
|------|------|------|
| 服务态度 | 20% | {{SCORE_ATTITUDE}} |
| 问题解决能力 | 25% | {{SCORE_RESOLUTION}} |
| 专业知识 | 25% | {{SCORE_KNOWLEDGE}} |
| 流程合规 | 30% | {{SCORE_COMPLIANCE}} |

## 三、明细点评

- 服务态度：{{COMMENT_ATTITUDE}}
- 问题解决：{{COMMENT_RESOLUTION}}
- 专业知识：{{COMMENT_KNOWLEDGE}}
- 流程合规：{{COMMENT_COMPLIANCE}}

## 四、风险与建议

{{RISKS_AND_SUGGESTIONS}}
`;

  return {
    draftId,
    skillCode,
    displayName: skillCode,
    purpose:
      '提供系统性的合规检查支持，帮助核查业务流程与话术是否符合规范，降低合规风险并提升稽核效率。',
    capabilities: [
      '自动提取对话中的合规要点',
      '按标准清单生成命中结果',
      '输出风险提示与改进建议',
    ],
    listDescription: '汽车行业客服会话合规质检：清单核对、评分报告与风险提示。',
    files: [
      { path: 'SKILL.md', content: skillMd },
      { path: 'assets/inspection_report_template.md', content: report },
      { path: 'references/compliance_checklist.md', content: checklist },
      { path: 'references/quality_inspection_criteria.md', content: criteria },
      { path: 'references/automotive_scenarios.md', content: scenarios },
    ],
  };
}

function buildClaimsDraft(prompt: string, draftId: string, skillCode: string): SkillStudioDraft {
  const skillMd = `---
name: ${skillCode}
description: 根据保单免赔额与就医票据测算预估赔付，并生成报案摘要。
---

# ${skillCode}

## 步骤

1. 解析保单免赔与条款要点（\`references/policy_rules.md\`）
2. 核对票据金额与项目
3. 输出预估赔付与材料清单（\`assets/claim_summary_template.md\`）

## 用户需求原文

${prompt.trim()}
`;

  return {
    draftId,
    skillCode,
    displayName: skillCode,
    purpose: '在客户询问理赔金额时，结合免赔与票据自动测算预估赔付，并生成可提交的报案摘要。',
    capabilities: ['解析保单免赔规则', '核算票据可赔金额', '生成报案摘要与材料清单'],
    listDescription: '理赔测算：免赔核算、预估赔付与报案摘要。',
    files: [
      { path: 'SKILL.md', content: skillMd },
      {
        path: 'assets/claim_summary_template.md',
        content: `# 报案摘要\n\n- 保单号：{{POLICY_NO}}\n- 预估赔付：{{ESTIMATED_PAYOUT}}\n- 所需材料：{{MATERIALS}}\n`,
      },
      {
        path: 'references/policy_rules.md',
        content: `# 免赔与条款要点\n\n- 年免赔额、次免赔额\n- 除外责任摘要\n- 材料齐全性检查\n`,
      },
    ],
  };
}

function buildGenericDraft(prompt: string, draftId: string, skillCode: string): SkillStudioDraft {
  const first = prompt.trim().split(/\n/)[0]?.slice(0, 48) || '自定义业务技能';
  const skillMd = `---
name: ${skillCode}
description: ${first}
---

# ${skillCode}

## 用途

${prompt.trim()}

## 步骤

1. 理解用户意图与必要输入
2. 参考 \`references/playbook.md\` 执行
3. 按 \`assets/output_template.md\` 组织结果
`;

  return {
    draftId,
    skillCode,
    displayName: skillCode,
    purpose: first.length > 80 ? `${first.slice(0, 80)}…` : first,
    capabilities: ['理解自然语言需求', '按剧本执行业务步骤', '输出结构化结果'],
    listDescription: prompt.trim().slice(0, 120) || '自定义技能',
    files: [
      { path: 'SKILL.md', content: skillMd },
      {
        path: 'assets/output_template.md',
        content: `# 输出模板\n\n## 结论\n\n{{CONCLUSION}}\n\n## 依据\n\n{{EVIDENCE}}\n`,
      },
      {
        path: 'references/playbook.md',
        content: `# 执行剧本\n\n1. 收集必要字段\n2. 校验完整性\n3. 调用工具或知识\n4. 返回结构化答复\n\n## 需求原文\n\n${prompt.trim()}\n`,
      },
    ],
  };
}

/** 根据自然语言需求生成技能草稿包 */
export function generateSkillDraftFromPrompt(prompt: string, prev?: SkillStudioDraft | null): SkillStudioDraft {
  const draftId = prev?.draftId ?? shortId(12);
  const skillCode = prev?.skillCode ?? `skill_${shortId(12)}`;
  const text = prompt.trim();
  if (isQcPrompt(text)) return buildQcDraft(text, draftId, skillCode);
  if (isClaimsPrompt(text)) return buildClaimsDraft(text, draftId, skillCode);
  return buildGenericDraft(text, draftId, skillCode);
}

export function newEmptyDraftMeta(): { draftId: string } {
  return { draftId: shortId(12) };
}

/** 将扁平 path 列表整理为目录树节点 */
export type SkillFileTreeNode =
  | { kind: 'dir'; name: string; children: SkillFileTreeNode[] }
  | { kind: 'file'; name: string; path: string };

export function buildFileTree(files: SkillStudioFile[]): SkillFileTreeNode[] {
  type Dir = { kind: 'dir'; name: string; children: SkillFileTreeNode[]; map: Map<string, Dir> };
  const root: Dir = { kind: 'dir', name: '', children: [], map: new Map() };

  const ensureDir = (parent: Dir, name: string): Dir => {
    let d = parent.map.get(name);
    if (!d) {
      d = { kind: 'dir', name, children: [], map: new Map() };
      parent.map.set(name, d);
      parent.children.push(d);
    }
    return d;
  };

  for (const f of files) {
    const parts = f.path.split('/');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = ensureDir(cur, parts[i]);
    }
    const fileName = parts[parts.length - 1];
    cur.children.push({ kind: 'file', name: fileName, path: f.path });
  }

  const strip = (nodes: SkillFileTreeNode[]): SkillFileTreeNode[] =>
    nodes.map((n) => {
      if (n.kind === 'file') return n;
      const d = n as Dir;
      return { kind: 'dir', name: d.name, children: strip(d.children) };
    });

  return strip(root.children);
}
