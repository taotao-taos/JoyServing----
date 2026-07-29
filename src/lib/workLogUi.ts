/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ThoughtStep, WorkLogResourceKind } from '../types';

/** 工作日志展示用 AI 名称 */
export const WORKLOG_AGENT_NAME = '京小灵';

const KIND_LABELS: Record<WorkLogResourceKind, string> = {
  tool: '工具',
  kb: '员工知识',
  doc: '文档',
  skill: '技能',
  component: '组件',
};

export interface WorkLogResourceMeta {
  kind: WorkLogResourceKind;
  kindLabel: string;
  name: string;
  tag?: string;
}

export function workLogKindLabel(kind: WorkLogResourceKind): string {
  return KIND_LABELS[kind];
}

/** 解析步骤对应的可展示资源（优先结构化字段，回退到 message 推断） */
export function resolveWorkLogResource(step: ThoughtStep): WorkLogResourceMeta | null {
  if (step.type !== 'search' && step.type !== 'tool') return null;

  if (step.resourceKind && step.resourceName) {
    return {
      kind: step.resourceKind,
      kindLabel: workLogKindLabel(step.resourceKind),
      name: step.resourceName,
      tag: step.resourceTag,
    };
  }

  const msg = step.message;

  if (step.type === 'search') {
    const doc = msg.match(/[《「]([^》」]+)[》」]/)?.[1];
    if (doc) {
      return { kind: 'doc', kindLabel: '文档', name: doc };
    }
    if (/订单|明细|单据/.test(msg)) {
      const order = msg.match(/#\d+|订单[^，。]*/)?.[0] ?? '业务单据';
      return { kind: 'doc', kindLabel: '文档', name: order };
    }
    const kb = msg.match(/员工知识[：:]?\s*([^，。]+)/)?.[1]?.trim();
    if (kb) {
      return { kind: 'kb', kindLabel: '员工知识', name: kb.slice(0, 24) };
    }
    return { kind: 'kb', kindLabel: '员工知识', name: 'FAQ 售后政策' };
  }

  if (/技能|计算器|测算/.test(msg)) {
    const skill = msg.match(/\[([^\]]+)\]/)?.[1] ?? msg.match(/调用[「「]?([^，。；]+)/)?.[1]?.trim();
    return {
      kind: 'skill',
      kindLabel: '技能',
      name: skill?.slice(0, 22) ?? '业务技能',
    };
  }
  if (/情绪|NLP|敏感|预警|监测/.test(msg)) {
    return {
      kind: 'component',
      kindLabel: '组件',
      name: 'NLP 情绪感知组件',
      tag: /极敏感|高敏|愤怒/.test(msg) ? '极敏感型情绪' : undefined,
    };
  }
  if (/待办|工单/.test(msg)) {
    return { kind: 'tool', kindLabel: '工具', name: '待办工单' };
  }
  if (/转人工|转接|队列/.test(msg)) {
    return { kind: 'tool', kindLabel: '工具', name: '待办工单' };
  }

  const tool = msg.match(/调用[「「]?([^，。；]+)/)?.[1]?.trim();
  return {
    kind: 'tool',
    kindLabel: '工具',
    name: tool?.slice(0, 22) ?? msg.slice(0, 16),
  };
}

export function isResourceStep(step: ThoughtStep): boolean {
  return resolveWorkLogResource(step) !== null;
}
