/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 根据数字员工绑定的员工知识 / 技能 / 入职标签配置，规划单轮回复所参考的资源。
 * 逻辑与 EmployeeManagePage 入职测试、岗前入职测试保持一致。
 */

import type { ChatMessage, HiredAgent, KnowledgeBase, Skill, ThoughtStep } from '../types';

export type ReplyIntent = 'angry' | 'claim' | 'product' | 'vip' | 'general';

export interface AgentReplyPlan {
  intent: ReplyIntent;
  infoMessage: string;
  knowledgeBases: KnowledgeBase[];
  documents: string[];
  skills: Skill[];
  useEmotionComponent: boolean;
  emotionSkillName?: string;
  emotionTag?: string;
  useTransferTool: boolean;
  decisionMessage: string;
}

const KB_HINTS: Record<string, ReplyIntent[]> = {
  kb_faq: ['general'],
  kb_product: ['product', 'general'],
  kb_claim: ['claim', 'general'],
  kb_vip: ['vip', 'product'],
};

const SKILL_HINTS: Record<string, ReplyIntent[]> = {
  s_claim: ['claim'],
  s_emotion: ['angry'],
  s_crm: ['vip', 'product'],
  s_outbound: ['general'],
};

export function detectReplyIntent(content: string): ReplyIntent {
  if (/投诉|土匪|垃圾|黑猫|💢|愤怒|经理|举报|不给|生气|糟糕|不管/.test(content)) {
    return 'angry';
  }
  if (/VIP|黑金|总裁|董事长|合同|折扣|续费|网关|商务/.test(content)) {
    return 'vip';
  }
  if (/理赔|赔|退|账|折旧|金额|算|钱|医疗|吃坏|中毒|退款|退货/.test(content)) {
    return 'claim';
  }
  if (/保|范围|保费|价格|保障|多少钱|产品|手册/.test(content)) {
    return 'product';
  }
  return 'general';
}

function boundKbs(agent: HiredAgent, all: KnowledgeBase[]): KnowledgeBase[] {
  const set = new Set(agent.knowledgeBases ?? []);
  return all.filter((k) => set.has(k.id));
}

function boundSkills(agent: HiredAgent, all: Skill[]): Skill[] {
  const set = new Set(agent.skills ?? []);
  return all.filter((s) => set.has(s.id));
}

function pickKbsForIntent(kbs: KnowledgeBase[], intent: ReplyIntent): KnowledgeBase[] {
  const scored = kbs.map((kb) => {
    const hints = KB_HINTS[kb.id] ?? ['general'];
    const score = hints.includes(intent) ? (hints[0] === intent ? 2 : 1) : intent === 'general' ? 0 : -1;
    return { kb, score };
  });
  const matched = scored.filter((x) => x.score >= 0).sort((a, b) => b.score - a.score);
  if (matched.length) return matched.slice(0, intent === 'claim' ? 2 : 1).map((x) => x.kb);
  return kbs.slice(0, 1);
}

function pickSkillsForIntent(skills: Skill[], intent: ReplyIntent): Skill[] {
  const matched = skills.filter((sk) => {
    const hints = SKILL_HINTS[sk.id] ?? [];
    return hints.includes(intent);
  });
  if (matched.length) return matched.slice(0, intent === 'angry' ? 1 : 2);
  if (intent === 'general' && skills.length) return [skills[0]];
  return [];
}

function defaultDocForIntent(intent: ReplyIntent, customerName: string): string | null {
  if (intent === 'claim') return `订单明细 · ${customerName}`;
  if (intent === 'vip') return 'VIP 服务标准与折扣条款';
  if (intent === 'product') return '产品说明手册摘录';
  return null;
}

/** 基于数字员工配置生成本轮回复计划 */
export function buildAgentReplyPlan(
  agent: HiredAgent,
  customerMessage: string,
  customerName: string,
  scenario: string,
  allKbs: KnowledgeBase[],
  allSkills: Skill[],
): AgentReplyPlan {
  const intent = detectReplyIntent(customerMessage);
  const kbs = boundKbs(agent, allKbs);
  const skills = boundSkills(agent, allSkills);
  const selectedKbs = pickKbsForIntent(kbs, intent);
  const selectedSkills = pickSkillsForIntent(skills, intent);
  const emotionSkill = skills.find((s) => s.id === 's_emotion');
  const useEmotionComponent = intent === 'angry' && !!emotionSkill;
  const useTransferTool = intent === 'angry';

  const personaHint = agent.persona?.slice(0, 36) ?? agent.description.slice(0, 36);

  let infoMessage = `数字员工【${agent.name}】接收外部客户 ${customerName} 的消息，场景：${scenario}。`;
  if (personaHint) {
    infoMessage += ` 按入职标签「${personaHint}${agent.persona && agent.persona.length > 36 ? '…' : ''}」理解诉求。`;
  }

  let decisionMessage = '员工知识与技能执行完毕，生成回复草稿。';
  if (intent === 'claim') {
    decisionMessage = '已结合员工知识与理赔技能完成核算，组织回复说明。';
  } else if (intent === 'angry') {
    decisionMessage = '判定：情绪风险超出 AI 授权，拦截自动回复并转入人工队列。';
  } else if (intent === 'vip') {
    decisionMessage = '高价值客户诉求需商务确认，建议人工跟进或转接。';
  } else if (intent === 'product') {
    decisionMessage = '已从员工知识检索条款，组织标准说明。';
  }

  const doc = defaultDocForIntent(intent, customerName);

  return {
    intent,
    infoMessage,
    knowledgeBases: selectedKbs,
    documents: doc ? [doc] : [],
    skills: useEmotionComponent ? selectedSkills.filter((s) => s.id !== 's_emotion') : selectedSkills,
    useEmotionComponent,
    emotionSkillName: emotionSkill?.name,
    emotionTag: useEmotionComponent ? '极敏感型情绪' : undefined,
    useTransferTool,
    decisionMessage,
  };
}

export function planToThoughtSteps(
  plan: AgentReplyPlan,
  triggerMessageId: string,
  time = new Date().toTimeString().split(' ')[0],
): ThoughtStep[] {
  const steps: ThoughtStep[] = [];
  let seq = 0;
  const id = () => `plan_${triggerMessageId}_${seq++}`;

  steps.push({
    id: id(),
    time,
    type: 'info',
    message: plan.infoMessage,
    triggerMessageId,
  });

  for (const kb of plan.knowledgeBases) {
    steps.push({
      id: id(),
      time,
      type: 'search',
      message: `检索员工知识：${kb.name}`,
      resourceKind: 'kb',
      resourceName: kb.name,
      resourceId: kb.id,
      triggerMessageId,
    });
  }

  for (const doc of plan.documents) {
    steps.push({
      id: id(),
      time,
      type: 'search',
      message: `索引文档：${doc}`,
      resourceKind: 'doc',
      resourceName: doc,
      triggerMessageId,
    });
  }

  if (plan.useEmotionComponent) {
    steps.push({
      id: id(),
      time,
      type: 'tool',
      message: `调用员工技能：${plan.emotionSkillName ?? '食安投诉情绪监测与升级转人工'}`,
      resourceKind: 'component',
      resourceName: plan.emotionSkillName ?? 'NLP 情绪感知组件',
      resourceTag: plan.emotionTag,
      resourceId: 's_emotion',
      triggerMessageId,
    });
  }

  for (const skill of plan.skills) {
    steps.push({
      id: id(),
      time,
      type: 'tool',
      message: `调用员工技能：${skill.name}`,
      resourceKind: 'skill',
      resourceName: skill.name,
      resourceId: skill.id,
      triggerMessageId,
    });
  }

  steps.push({
    id: id(),
    time,
    type: 'decision',
    message: plan.decisionMessage,
    triggerMessageId,
  });

  if (plan.useTransferTool) {
    steps.push({
      id: id(),
      time,
      type: 'tool',
      message: '触发转人工',
      resourceKind: 'tool',
      resourceName: '闪电转人工流程',
      triggerMessageId,
    });
  }

  steps.push({
    id: id(),
    time,
    type: 'output',
    message: plan.useTransferTool ? '关闭 AI 托管，等待坐席接起' : '已完成回复',
    triggerMessageId,
  });

  return steps;
}

/** 展示层：按数字员工当前绑定配置生成工作日志（与入职测试逻辑一致） */
export function buildDisplayStepsFromAgent(
  customerMessage: ChatMessage,
  session: { customerName: string; scenario: string },
  agent: HiredAgent,
  allKbs: KnowledgeBase[],
  allSkills: Skill[],
  existingSteps?: ThoughtStep[],
): ThoughtStep[] {
  const plan = buildAgentReplyPlan(
    agent,
    customerMessage.content,
    customerMessage.name || session.customerName,
    session.scenario,
    allKbs,
    allSkills,
  );
  return planToThoughtSteps(
    plan,
    customerMessage.id,
    existingSteps?.[0]?.time ?? new Date().toTimeString().split(' ')[0],
  );
}
