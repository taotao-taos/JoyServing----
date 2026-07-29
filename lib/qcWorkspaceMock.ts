/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 质检工作台 mock：计划（来源/对象/质检员标准）→ 会话质检单
 */

import type { ChatSession, HiredAgent, QcProfile, QcStandardTree } from '@/src/types';
import {
  auditSessionAgainstStandard,
  listCapabilityTestSessions,
  type QcSessionAuditResult,
} from '@/lib/qcCapabilityMock';
import {
  countStandardItems,
  createExampleStandardTree,
  isQcStandardConfigured,
} from '@/lib/qcStandards';
import { createDefaultQcProfile, isQcAgent, normalizeQcProfile } from '@/lib/jobFamily';
import { QC_TERMS } from '@/lib/platformTerminology';

export type QcPlanStatus = 'running' | 'paused' | 'completed';
export type QcPlanSource = 'platform_cs_sessions' | 'external';
export type QcPlanTargetScope = 'all_online_cs' | 'specified';

export type QcPlan = {
  id: string;
  name: string;
  status: QcPlanStatus;
  /** 执行质检员（引用其培训标准） */
  inspectorId: string;
  inspectorName: string;
  source: QcPlanSource;
  sourceLabel: string;
  targetScope: QcPlanTargetScope;
  scopeLabel: string;
  targetAgentIds: string[];
  /** 标准摘要（来自质检员培训配置） */
  standardSummary: string;
  progress: number;
  totalVolume: number;
  inspectedVolume: number;
  warningCount: number;
  averageScore: number;
  createdAt: string;
  /** 计划开始时间 */
  startAt: string;
  /** 计划结束时间（结束后写入） */
  endAt?: string;
};

export type QcAuditTicketStatus = 'pending' | 'warning' | 'resolved';

export type QcAuditTicket = {
  id: string;
  planId: string;
  planName: string;
  session: ChatSession;
  inspectorId: string;
  status: QcAuditTicketStatus;
  audit: QcSessionAuditResult;
  createdAt: string;
};

export function resolveInspectorStandard(agent: HiredAgent | undefined): {
  tree: QcStandardTree;
  passScore: number;
  summary: string;
  configured: boolean;
} {
  const profile: QcProfile = normalizeQcProfile(agent?.qcProfile ?? createDefaultQcProfile());
  const configured = isQcStandardConfigured(profile.standard);
  const tree = configured ? profile.standard : createExampleStandardTree();
  const counts = countStandardItems(tree);
  const summary = configured
    ? `${counts.categories} 类 / ${counts.items} 项 · 及格线 ${profile.passScore}`
    : `示例标准（未配置）· ${counts.categories} 类 / ${counts.items} 项`;
  return { tree, passScore: profile.passScore || 80, summary, configured };
}

export function sourceLabelOf(source: QcPlanSource): string {
  return source === 'platform_cs_sessions'
    ? QC_TERMS.sourcePlatformCs
    : QC_TERMS.sourceExternal;
}

export function scopeLabelOf(scope: QcPlanTargetScope): string {
  return scope === 'all_online_cs' ? QC_TERMS.targetAllOnline : QC_TERMS.targetSpecified;
}

export function formatPlanPeriod(
  startAt: string,
  endAt?: string,
  status?: QcPlanStatus,
): string {
  const fmt = (raw: string) => {
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return raw.slice(0, 16);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const start = fmt(startAt);
  if (endAt) return `${start} ~ ${fmt(endAt)}`;
  if (status === 'completed') return `${start} ~ 已结束`;
  if (status === 'running') return `${start} ~ 进行中`;
  return `${start} ~ 未开始`;
}

export function buildDefaultQcPlans(qcAgents: HiredAgent[]): QcPlan[] {
  const lead = qcAgents.find((a) => a.status === 'online') ?? qcAgents[0];
  if (!lead) return [];
  const { summary } = resolveInspectorStandard(lead);
  return [
    {
      id: 'plan-daily-cs',
      name: '本平台客服会话 · 日常抽检',
      status: 'running',
      inspectorId: lead.id,
      inspectorName: lead.name,
      source: 'platform_cs_sessions',
      sourceLabel: sourceLabelOf('platform_cs_sessions'),
      targetScope: 'all_online_cs',
      scopeLabel: scopeLabelOf('all_online_cs'),
      targetAgentIds: [],
      standardSummary: summary,
      progress: 62,
      totalVolume: 48,
      inspectedVolume: 30,
      warningCount: 7,
      averageScore: 81,
      createdAt: '2026-07-22 09:00',
      startAt: '2026-07-22 09:00',
    },
    {
      id: 'plan-high-risk',
      name: '高投诉场景 · 全检',
      status: 'paused',
      inspectorId: lead.id,
      inspectorName: lead.name,
      source: 'platform_cs_sessions',
      sourceLabel: sourceLabelOf('platform_cs_sessions'),
      targetScope: 'specified',
      scopeLabel: scopeLabelOf('specified'),
      targetAgentIds: [],
      standardSummary: summary,
      progress: 28,
      totalVolume: 20,
      inspectedVolume: 6,
      warningCount: 3,
      averageScore: 74,
      createdAt: '2026-07-18 14:20',
      startAt: '2026-07-18 14:20',
      endAt: '2026-07-25 18:00',
    },
  ];
}

function sessionMatchesPlan(
  session: ChatSession,
  plan: QcPlan,
  inspectableOnlineIds: Set<string>,
): boolean {
  if (plan.source === 'external') {
    // 原型：外部源暂用样例会话
    return session.id.startsWith('qc_sample_');
  }
  if (plan.targetScope === 'specified' && plan.targetAgentIds.length > 0) {
    return plan.targetAgentIds.includes(session.assignedAgentId);
  }
  // 全部已上岗：会话坐席在可检名单，或样例会话
  if (session.id.startsWith('qc_sample_')) return true;
  return inspectableOnlineIds.has(session.assignedAgentId);
}

/** 仅运行中计划产出质检单；按该计划质检员标准打分 */
export function buildQcAuditTickets(
  sessions: ChatSession[],
  qcAgents: HiredAgent[],
  plans: QcPlan[],
  inspectableOnlineIds: string[],
): QcAuditTicket[] {
  const onlineSet = new Set(inspectableOnlineIds);
  const running = plans.filter((p) => p.status === 'running');
  if (running.length === 0) return [];

  const pool = listCapabilityTestSessions(sessions);
  const tickets: QcAuditTicket[] = [];

  for (const plan of running) {
    const inspector = qcAgents.find((a) => a.id === plan.inspectorId) ?? qcAgents[0];
    const { tree, passScore } = resolveInspectorStandard(inspector);
    const matched = pool.filter((s) => sessionMatchesPlan(s, plan, onlineSet)).slice(0, 6);
    for (const session of matched) {
      const audit = auditSessionAgainstStandard(session, tree, passScore);
      const status: QcAuditTicketStatus =
        audit.hits.length > 0 ? 'warning' : 'pending';
      tickets.push({
        id: `ticket-${plan.id}-${session.id}`,
        planId: plan.id,
        planName: plan.name,
        session,
        inspectorId: plan.inspectorId,
        status,
        audit,
        createdAt: session.createdAt,
      });
    }
  }
  return tickets;
}

export function summarizeQcWorkspace(
  tickets: QcAuditTicket[],
  plans: QcPlan[],
  qcAgents: HiredAgent[],
) {
  const runningPlans = plans.filter((p) => p.status === 'running').length;
  const pausedPlans = plans.filter((p) => p.status === 'paused').length;
  const todayTickets = tickets.length;
  const warningTickets = tickets.filter((t) => t.status === 'warning').length;
  const pendingTickets = tickets.filter((t) => t.status === 'pending').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved').length;
  const avgScore =
    tickets.length === 0
      ? 0
      : Math.round(tickets.reduce((s, t) => s + t.audit.score, 0) / tickets.length);
  const onlineQc = qcAgents.filter((a) => a.status === 'online' && isQcAgent(a)).length;
  return {
    runningPlans,
    pausedPlans,
    todayTickets,
    warningTickets,
    pendingTickets,
    resolvedTickets,
    avgScore,
    onlineQc,
  };
}

/** 概览下一步：按流程给出主 CTA */
export type QcFlowNextStep =
  | { kind: 'hire'; title: string; desc: string; action: 'market' }
  | { kind: 'online'; title: string; desc: string; action: 'employees' }
  | { kind: 'create_plan'; title: string; desc: string; action: 'plans' }
  | { kind: 'process'; title: string; desc: string; action: 'sessions' }
  | { kind: 'healthy'; title: string; desc: string; action: 'sessions' };

export function resolveQcFlowNextStep(input: {
  qcAgents: HiredAgent[];
  plans: QcPlan[];
  warningCount: number;
  pendingCount: number;
}): QcFlowNextStep {
  const { qcAgents, plans, warningCount, pendingCount } = input;
  if (qcAgents.length === 0) {
    return {
      kind: 'hire',
      title: '先雇佣质检数字员工',
      desc: '市场雇佣「会话质检专员」，完成培训后上岗。',
      action: 'market',
    };
  }
  if (!qcAgents.some((a) => a.status === 'online')) {
    return {
      kind: 'online',
      title: '让质检员上岗',
      desc: '培训完成后，在员工卡片点击「上岗」，才能执行计划。',
      action: 'employees',
    };
  }
  if (plans.length === 0) {
    return {
      kind: 'create_plan',
      title: '创建第一条质检计划',
      desc: '选定会话来源、可检对象，并引用质检员培训标准，开启常驻检测。',
      action: 'plans',
    };
  }
  if (!plans.some((p) => p.status === 'running')) {
    return {
      kind: 'create_plan',
      title: '启动一条运行中的计划',
      desc: '计划暂停时不会入队新质检单。继续运行或新建计划。',
      action: 'plans',
    };
  }
  if (warningCount > 0 || pendingCount > 0) {
    return {
      kind: 'process',
      title: '处理会话质检单',
      desc: `当前有 ${warningCount} 单需关注、${pendingCount} 单待处理。`,
      action: 'sessions',
    };
  }
  return {
    kind: 'healthy',
    title: '产线运行正常',
    desc: '运行中的计划持续入队；可到会话质检查看明细。',
    action: 'sessions',
  };
}
