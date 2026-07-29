/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 质检工作台 — 按流程：概览指引 → 计划常驻 → 会话质检单
 * 侧栏架构对齐客服工作台
 */

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { agentAvatarForCard, RELAY_CARD_AVATARS } from '@/lib/agentAvatarDisplay';
import { isQcAgent } from '@/lib/jobFamily';
import { QC_TERMS } from '@/lib/platformTerminology';
import { RELAY_HOME_ASSETS } from '@/lib/relayHomeAssets';
import { BTN_INK, BTN_OUTLINE, BTN_SOFT, FIELD, LABEL, PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart3,
  ChevronDown,
  Home,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from '@/lib/icons';
import { QcCreatePlanModal } from './QcCreatePlanModal';
import { QcObserveConfigModal } from './QcObserveConfigModal';
import { SessionRecordsPage } from './SessionRecordsPage';
import {
  buildObservePanelData,
  createDefaultObserveConfig,
  observeWindowLabel,
  type QcObserveConfig,
} from '@/lib/qcObserveMock';
import {
  buildDefaultQcPlans,
  buildQcAuditTickets,
  formatPlanPeriod,
  resolveInspectorStandard,
  resolveQcFlowNextStep,
  sourceLabelOf,
  summarizeQcWorkspace,
  type QcAuditTicket,
  type QcAuditTicketStatus,
  type QcPlan,
  type QcPlanSource,
  type QcPlanStatus,
} from '@/lib/qcWorkspaceMock';

type QcRailTab = 'overview' | 'workspace';

type QcCollabMode = 'parallel' | 'by_capability' | 'serial';

const EXTERNAL_DATA_SOURCES = [
  { id: 'human_voice', label: '人工语音会话' },
  { id: 'human_online', label: '人工在线会话' },
  { id: 'fusion_online', label: '在线融合工作台会话' },
] as const;

const COLLAB_MODES: { id: QcCollabMode; label: string }[] = [
  { id: 'parallel', label: '并行全检' },
  { id: 'by_capability', label: '按能力拆分' },
  { id: 'serial', label: '串行复核' },
];

const COLLAB_LABEL: Record<QcCollabMode, string> = {
  parallel: '并行全检',
  by_capability: '按能力拆分',
  serial: '串行复核',
};

const STATUS_LABEL: Record<QcAuditTicketStatus, string> = {
  pending: '待处理',
  warning: '需关注',
  resolved: '已处理',
};

const PLAN_STATUS_LABEL: Record<QcPlanStatus, string> = {
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
};

function toDatetimeLocalValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string) {
  return value.replace('T', ' ');
}

export const QcWorkspacePage: React.FC = () => {
  const { hiredAgents, sessions, setActiveTab, showToast } = useApp();
  const [railTab, setRailTab] = useState<QcRailTab>('overview');
  const [plansSeeded, setPlansSeeded] = useState(false);

  const qcAgents = useMemo(() => hiredAgents.filter(isQcAgent), [hiredAgents]);

  /** 概览智能洞察：优先在岗质检员工，头像与「我的数字员工」同源 */
  const insightAgentVisual = useMemo(() => {
    const agent =
      qcAgents.find((a) => a.status === 'online') ?? qcAgents[0] ?? null;
    if (!agent) {
      return {
        name: '会话质检专员',
        online: true,
        render: {
          kind: 'image' as const,
          src: RELAY_CARD_AVATARS[0],
        },
      };
    }
    const idx = Math.max(
      0,
      hiredAgents.findIndex((a) => a.id === agent.id),
    );
    return {
      name: agent.name,
      online: agent.status === 'online',
      render: agentAvatarForCard(agent.avatar, idx, agent.avatarCustomized),
    };
  }, [qcAgents, hiredAgents]);
  const inspectableOnline = useMemo(
    () =>
      hiredAgents.filter((a) => a.status === 'online' && !isQcAgent(a)),
    [hiredAgents],
  );

  const [plans, setPlans] = useState<QcPlan[]>([]);

  useEffect(() => {
    if (plansSeeded || qcAgents.length === 0) return;
    const seeded = buildDefaultQcPlans(qcAgents);
    setPlans(seeded);
    setPlansSeeded(true);
  }, [qcAgents, plansSeeded]);

  const tickets = useMemo(
    () =>
      buildQcAuditTickets(
        sessions,
        qcAgents,
        plans,
        inspectableOnline.map((a) => a.id),
      ),
    [sessions, qcAgents, plans, inspectableOnline],
  );

  const [queueTab, setQueueTab] = useState<'pending' | 'warning' | 'resolved' | 'all'>('all');
  const [queueSearch, setQueueSearch] = useState('');
  const [planFilterId, setPlanFilterId] = useState<string | 'all'>('all');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (plans.length === 0) {
      if (planFilterId !== 'all') setPlanFilterId('all');
      return;
    }
    if (planFilterId === 'all' || !plans.some((p) => p.id === planFilterId)) {
      setPlanFilterId(plans[0].id);
    }
  }, [plans, planFilterId]);

  const [detailTab, setDetailTab] = useState<'session' | 'eval' | 'ai' | 'history'>('ai');
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [hitOverrides, setHitOverrides] = useState<Record<string, boolean>>({});
  const [ticketOverrides, setTicketOverrides] = useState<Record<string, QcAuditTicketStatus>>({});
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showObserveConfig, setShowObserveConfig] = useState(false);
  const [observeConfig, setObserveConfig] = useState<QcObserveConfig>(() =>
    createDefaultObserveConfig(),
  );
  const [selectedSystemMetricId, setSelectedSystemMetricId] = useState<string | null>(
    () => createDefaultObserveConfig().systemMetricIds[0] ?? null,
  );
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanInternalAgentIds, setNewPlanInternalAgentIds] = useState<string[]>([]);
  const [newPlanExternalSources, setNewPlanExternalSources] = useState<string[]>([]);
  const [newPlanCollab, setNewPlanCollab] = useState<QcCollabMode>('by_capability');
  const [newPlanInspectorIds, setNewPlanInspectorIds] = useState<string[]>([]);
  const [newPlanInspectorId, setNewPlanInspectorId] = useState('');

  const enrichedTickets = useMemo(
    () =>
      tickets.map((t) => ({
        ...t,
        status: ticketOverrides[t.id] ?? t.status,
      })),
    [tickets, ticketOverrides],
  );

  const observePanel = useMemo(
    () => buildObservePanelData(observeConfig),
    [observeConfig],
  );

  const summary = useMemo(
    () => summarizeQcWorkspace(enrichedTickets, plans, qcAgents),
    [enrichedTickets, plans, qcAgents],
  );

  const nextStep = useMemo(
    () =>
      resolveQcFlowNextStep({
        qcAgents,
        plans,
        warningCount: summary.warningTickets,
        pendingCount: summary.pendingTickets,
      }),
    [qcAgents, plans, summary.warningTickets, summary.pendingTickets],
  );

  const queueCounts = useMemo(() => {
    const base =
      planFilterId === 'all'
        ? enrichedTickets
        : enrichedTickets.filter((t) => t.planId === planFilterId);
    return {
      all: base.length,
      pending: base.filter((t) => t.status === 'pending').length,
      warning: base.filter((t) => t.status === 'warning').length,
      resolved: base.filter((t) => t.status === 'resolved').length,
    };
  }, [enrichedTickets, planFilterId]);

  const visibleTickets = useMemo(() => {
    let list =
      planFilterId === 'all'
        ? enrichedTickets
        : enrichedTickets.filter((t) => t.planId === planFilterId);
    if (queueTab !== 'all') list = list.filter((t) => t.status === queueTab);
    const q = queueSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.session.customerName.toLowerCase().includes(q) ||
        t.session.scenario.toLowerCase().includes(q) ||
        t.session.id.toLowerCase().includes(q) ||
        t.planName.toLowerCase().includes(q),
    );
  }, [enrichedTickets, planFilterId, queueTab, queueSearch]);

  const selectedTicket: QcAuditTicket | null = selectedTicketId
    ? enrichedTickets.find((t) => t.id === selectedTicketId) ?? null
    : null;

  useEffect(() => {
    if (!selectedTicketId) return;
    if (!enrichedTickets.some((t) => t.id === selectedTicketId)) {
      setSelectedTicketId(null);
    }
  }, [selectedTicketId, enrichedTickets]);

  useEffect(() => {
    setHitOverrides({});
    setDetailTab('ai');
    setSummaryCollapsed(false);
  }, [selectedTicketId]);

  const agentNameById = useMemo(
    () => new Map(hiredAgents.map((a) => [a.id, a.name])),
    [hiredAgents],
  );

  const ticketsByPlan = useMemo(() => {
    const map = new Map<string, typeof enrichedTickets>();
    for (const t of enrichedTickets) {
      const list = map.get(t.planId) ?? [];
      list.push(t);
      map.set(t.planId, list);
    }
    return map;
  }, [enrichedTickets]);

  const activePlan = useMemo(
    () => (planFilterId === 'all' ? null : plans.find((p) => p.id === planFilterId) ?? null),
    [plans, planFilterId],
  );

  const openPlanSessions = (planId: string, ticketId?: string) => {
    setPlanFilterId(planId);
    setQueueTab('all');
    setSelectedTicketId(ticketId ?? null);
    setRailTab('workspace');
  };

  const selectedTicketIndex = selectedTicket
    ? visibleTickets.findIndex((t) => t.id === selectedTicket.id)
    : -1;

  const goAdjacentTicket = (dir: -1 | 1) => {
    if (selectedTicketIndex < 0) return;
    const next = visibleTickets[selectedTicketIndex + dir];
    if (next) setSelectedTicketId(next.id);
  };

  const messageHitMap = useMemo(() => {
    const map = new Map<string, QcAuditTicket['audit']['hits']>();
    if (!selectedTicket) return map;
    for (const h of selectedTicket.audit.hits) {
      const needle = h.evidence.replace(/[….…]/g, ' ').trim().slice(0, 8);
      const matched =
        (needle
          ? selectedTicket.session.messages.find((m) => m.content.includes(needle.slice(0, 4)))
          : undefined) ??
        selectedTicket.session.messages.find((m) => m.sender !== 'customer');
      if (!matched) continue;
      const list = map.get(matched.id) ?? [];
      list.push(h);
      map.set(matched.id, list);
    }
    return map;
  }, [selectedTicket]);

  const scoreGrade = (score: number, passed: boolean) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (passed) return '合格';
    return '不合格';
  };

  const onlineQcAgents = useMemo(
    () => qcAgents.filter((a) => a.status === 'online'),
    [qcAgents],
  );

  useEffect(() => {
    if (newPlanInspectorIds.length === 0 && onlineQcAgents[0]) {
      setNewPlanInspectorIds([onlineQcAgents[0].id]);
      setNewPlanInspectorId(onlineQcAgents[0].id);
    }
  }, [onlineQcAgents, newPlanInspectorIds.length]);

  useEffect(() => {
    if (
      newPlanInternalAgentIds.length === 0 &&
      newPlanExternalSources.length === 0 &&
      inspectableOnline[0]
    ) {
      setNewPlanInternalAgentIds([inspectableOnline[0].id]);
    }
  }, [
    inspectableOnline,
    newPlanInternalAgentIds.length,
    newPlanExternalSources.length,
  ]);

  const createInspector =
    qcAgents.find((a) => newPlanInspectorIds.includes(a.id)) ??
    qcAgents.find((a) => a.id === newPlanInspectorId);
  const createStandard = resolveInspectorStandard(createInspector);

  const railNavClass = (active: boolean) =>
    cn(
      'group w-full flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-[10px] transition-all duration-200 cursor-pointer',
      active
        ? 'text-neutral-900 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/80'
        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/70',
    );

  const goNext = () => {
    if (nextStep.action === 'market') setActiveTab('market');
    else if (nextStep.action === 'employees') setActiveTab('employees');
    else if (nextStep.action === 'plans' || nextStep.action === 'sessions') {
      setRailTab('workspace');
    } else {
      setRailTab('workspace');
      if (plans[0]) setPlanFilterId(plans[0].id);
    }
  };

  const markResolved = (ticketId: string) => {
    setTicketOverrides((prev) => ({ ...prev, [ticketId]: 'resolved' }));
    showToast('已标记为已处理');
  };

  const resetCreatePlanForm = () => {
    setNewPlanName('');
    setNewPlanInternalAgentIds(
      inspectableOnline[0] ? [inspectableOnline[0].id] : [],
    );
    setNewPlanExternalSources([]);
    setNewPlanCollab('by_capability');
    setNewPlanInspectorIds(onlineQcAgents[0] ? [onlineQcAgents[0].id] : []);
    setNewPlanInspectorId(onlineQcAgents[0]?.id ?? '');
  };

  const openCreatePlan = () => {
    resetCreatePlanForm();
    setShowCreatePlan(true);
  };

  const handleCreatePlan = () => {
    const name = newPlanName.trim();
    if (!name) {
      showToast('请填写计划名称');
      return;
    }
    if (newPlanInternalAgentIds.length === 0 && newPlanExternalSources.length === 0) {
      showToast('请至少选择一个内部或外部数据源');
      return;
    }
    if (newPlanInspectorIds.length === 0) {
      showToast('请至少勾选一名上场数字员工');
      return;
    }
    const startAt = fromDatetimeLocalValue(toDatetimeLocalValue());
    const lead =
      qcAgents.find((a) => a.id === newPlanInspectorIds[0]) ??
      onlineQcAgents[0] ??
      qcAgents[0];
    if (!lead) {
      showToast('请先雇佣并上岗质检数字员工');
      return;
    }
    if (lead.status !== 'online') {
      showToast('请先让该质检员上岗后再创建计划');
      return;
    }
    const internalNames = newPlanInternalAgentIds
      .map((id) => inspectableOnline.find((a) => a.id === id)?.name)
      .filter(Boolean) as string[];
    const externalNames = EXTERNAL_DATA_SOURCES.filter((s) =>
      newPlanExternalSources.includes(s.id),
    ).map((s) => s.label);
    const sourceParts = [
      ...internalNames.map((n) => `内部·${n}`),
      ...externalNames.map((n) => `外部·${n}`),
    ];
    const mappedSource: QcPlanSource =
      newPlanInternalAgentIds.length > 0 ? 'platform_cs_sessions' : 'external';
    const inspectorNames = newPlanInspectorIds
      .map((id) => qcAgents.find((a) => a.id === id)?.name)
      .filter(Boolean) as string[];
    const { summary: standardSummary } = resolveInspectorStandard(lead);
    const hasSpecifiedTargets = newPlanInternalAgentIds.length > 0;
    const plan: QcPlan = {
      id: `plan-${Date.now()}`,
      name,
      status: 'paused',
      inspectorId: lead.id,
      inspectorName:
        inspectorNames.length > 1
          ? `${inspectorNames[0]} 等 ${inspectorNames.length} 人`
          : lead.name,
      source: mappedSource,
      sourceLabel: sourceParts.join(' · ') || sourceLabelOf(mappedSource),
      targetScope: hasSpecifiedTargets ? 'specified' : 'all_online_cs',
      scopeLabel: `${sourceParts.join(' + ')} · ${COLLAB_LABEL[newPlanCollab]}`,
      targetAgentIds: hasSpecifiedTargets ? [...newPlanInternalAgentIds] : [],
      standardSummary: `${COLLAB_LABEL[newPlanCollab]} · ${standardSummary}`,
      progress: 0,
      totalVolume: 0,
      inspectedVolume: 0,
      warningCount: 0,
      averageScore: 0,
      createdAt: startAt,
      startAt,
    };
    setPlans((prev) => [plan, ...prev]);
    resetCreatePlanForm();
    setShowCreatePlan(false);
    setPlanFilterId(plan.id);
    setRailTab('workspace');
    setQueueTab('all');
    showToast(`计划「${name}」已创建，点击「开始」运行`);
  };

  const startPlan = (planId: string) => {
    const now = fromDatetimeLocalValue(toDatetimeLocalValue());
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        return {
          ...p,
          status: 'running',
          startAt: p.startAt || now,
          endAt: undefined,
        };
      }),
    );
    showToast('计划已开始运行');
  };

  const endPlan = (planId: string) => {
    const now = fromDatetimeLocalValue(toDatetimeLocalValue());
    setPlans((prev) =>
      prev.map((p) =>
        p.id === planId ? { ...p, status: 'completed', endAt: now } : p,
      ),
    );
    showToast('计划已结束');
  };

  const deletePlan = (planId: string) => {
    setPlans((prev) => {
      const next = prev.filter((p) => p.id !== planId);
      if (planFilterId === planId) {
        setPlanFilterId(next[0]?.id ?? 'all');
        setSelectedTicketId(null);
      }
      return next;
    });
    showToast('计划已删除');
  };

  return (
    <div className="flex-1 flex bg-white text-neutral-800 h-screen overflow-hidden font-sans">
      {/* 左侧窄轨：参考精致图标轨（拉开间距、图标与文案分层） */}
      <div className="w-16 bg-neutral-50 border-r border-neutral-200/80 flex flex-col items-center justify-between py-4 shrink-0 z-10 select-none">
        <div className="flex flex-col items-center w-full px-1.5 gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            title="返回管理后台"
            className="h-9 w-9 flex items-center justify-center rounded-[10px] overflow-hidden transition duration-200 hover:bg-neutral-100 cursor-pointer"
          >
            <img
              src={RELAY_HOME_ASSETS.logo}
              alt="JoySupport"
              className="h-10 w-10 object-cover object-left select-none pointer-events-none"
              draggable={false}
            />
          </button>

          <div className="flex flex-col items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setRailTab('overview')}
              className={railNavClass(railTab === 'overview')}
              title={QC_TERMS.overview}
            >
              <Activity
                size={20}
                strokeWidth={railTab === 'overview' ? 2.25 : 1.75}
                className="shrink-0"
              />
              <span
                className={cn(
                  'text-[11px] leading-none tracking-tight',
                  railTab === 'overview' ? 'font-semibold' : 'font-medium',
                )}
              >
                {QC_TERMS.overview}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRailTab('workspace')}
              className={railNavClass(railTab === 'workspace')}
              title={QC_TERMS.plans}
            >
              <ShieldCheck
                size={20}
                strokeWidth={railTab === 'workspace' ? 2.25 : 1.75}
                className="shrink-0"
              />
              <span
                className={cn(
                  'text-[11px] leading-none tracking-tight',
                  railTab === 'workspace' ? 'font-semibold' : 'font-medium',
                )}
              >
                质检
              </span>
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-3 px-1.5">
          <div className="w-7 h-px bg-neutral-200" />
          <button
            type="button"
            className={railNavClass(false)}
            onClick={() => setActiveTab('employees')}
            title="返回管理后台"
          >
            <Home size={20} strokeWidth={1.75} className="shrink-0" />
            <span className="text-[11px] leading-none tracking-tight font-medium">返回</span>
          </button>
        </div>
      </div>

      {/* —— 概览：观测面板 + 产线指引 —— */}
      {railTab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-white animate-in fade-in duration-300">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className={cn(BTN_OUTLINE, 'h-8 px-3 text-[12px] gap-1.5')}
                  onClick={() => setShowObserveConfig(true)}
                >
                  <Settings2 size={14} />
                  指标设置
                </button>
                <button
                  type="button"
                  className={cn(BTN_INK, 'h-8 px-3 text-[12px]')}
                  onClick={() =>
                    showToast('观测面板已打开当前窗口数据')
                  }
                >
                  观测面板
                </button>
            </div>

            <section
              className={cn(
                PANEL,
                'relative overflow-hidden p-0',
              )}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-neutral-50 via-white to-white"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -left-10 -bottom-12 h-44 w-44 rounded-full bg-emerald-500/[0.07] blur-2xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute right-0 top-0 h-28 w-40 bg-[radial-gradient(ellipse_at_top_right,rgba(245,245,245)_0%,transparent_70%)]"
                aria-hidden
              />

              <div className="relative flex items-center gap-5 px-5 py-4">
                <div className="relative shrink-0">
                  <div
                    className="absolute inset-0 scale-[1.18] rounded-full bg-emerald-500/[0.08] blur-md"
                    aria-hidden
                  />
                  <div className="relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-sky-200/70 bg-white text-[28px] shadow-[0_2px_10px_rgba(31,35,41,0.06)]">
                    {insightAgentVisual.render.kind === 'image' ? (
                      <img
                        src={insightAgentVisual.render.src}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <span aria-hidden>{insightAgentVisual.render.emoji}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
                      insightAgentVisual.online
                        ? 'bg-emerald-500'
                        : 'bg-neutral-400',
                    )}
                    title={insightAgentVisual.online ? '已上岗' : '未上岗'}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold text-neutral-800 truncate">
                      {insightAgentVisual.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600">
                      <Sparkles size={11} className="text-amber-500 shrink-0" />
                      智能洞察
                    </span>
                    {insightAgentVisual.online ? (
                      <span className="text-[10px] font-medium text-emerald-700">
                        在岗观测中
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-neutral-400">
                        未上岗
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
                    {observePanel.insightOk
                      ? '当前运行正常，暂无异常洞察'
                      : '发现异常指标，请检查风险策略'}
                  </p>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
              <span className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 tabular-nums">
                观测窗口 · {observeWindowLabel(observeConfig.window)}
              </span>
              <span className="text-neutral-400">
                系统指标 {observePanel.systemMetrics.length} 项 · 业务指标{' '}
                {observePanel.bizCards.length} 项
              </span>
            </div>

            <section>
              <h3 className="text-xs font-semibold text-neutral-800 mb-2">系统指标</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                {observePanel.systemMetrics.map((m) => {
                  const active = selectedSystemMetricId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedSystemMetricId(m.id)}
                      className={cn(
                        'text-left rounded-[13px] border bg-white px-3 py-2.5 transition cursor-pointer',
                        active
                          ? 'border-neutral-800 ring-1 ring-neutral-800/10'
                          : 'border-neutral-200 hover:bg-neutral-50/60',
                      )}
                    >
                      <p className="text-[11px] text-neutral-500 truncate">{m.name}</p>
                      <p className="text-lg font-black text-neutral-800 tabular-nums mt-1">
                        {m.value}
                        {m.unit ? (
                          <span className="text-[11px] font-semibold text-neutral-500 ml-0.5">
                            {m.unit}
                          </span>
                        ) : null}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-[13px] border border-dashed border-neutral-200 bg-neutral-50/40 min-h-[160px] flex flex-col items-center justify-center text-center px-4 py-8">
                <div className="h-12 w-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center mb-2">
                  <BarChart3 size={20} className="text-neutral-400" />
                </div>
                <p className="text-xs text-neutral-500">暂无趋势数据</p>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-neutral-800 mb-2">业务指标</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {observePanel.bizCards.map((card) => (
                  <div
                    key={card.id}
                    className={cn(PANEL, 'p-4 border-neutral-800/20')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-black text-neutral-800 tabular-nums">
                          {card.code}{' '}
                          <span className="text-sm font-bold text-neutral-600">
                            {card.rate}
                          </span>
                        </p>
                        <p className="text-[11px] text-emerald-700 mt-0.5 inline-flex items-center gap-0.5">
                          <TrendingUp size={12} />
                          {card.deltaLabel}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="relative h-2 rounded-full bg-neutral-100">
                        <div
                          className="absolute top-0 left-0 h-full rounded-full bg-neutral-200"
                          style={{ width: `${card.threshold}%` }}
                        />
                        <span
                          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-neutral-800 border-2 border-white shadow-sm"
                          style={{ left: `calc(${card.current}% - 6px)` }}
                          title="当前"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-1.5">
                        <span>当前</span>
                        <span>阈值</span>
                      </div>
                    </div>
                  </div>
                ))}
                {observePanel.bizCards.length === 0 && (
                  <p className="text-xs text-neutral-500 col-span-full py-4 text-center border border-dashed border-neutral-200 rounded-[13px]">
                    暂无业务指标，请先在「指标设置」中配置
                  </p>
                )}
              </div>
            </section>

            <section className={cn(PANEL, 'p-4')}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-neutral-500">质检产线速览</h3>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-neutral-800 underline-offset-2 hover:underline cursor-pointer"
                  onClick={() => setRailTab('workspace')}
                >
                  去处理质检单
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: '运行中计划', value: summary.runningPlans },
                  { label: '入队质检单', value: summary.todayTickets },
                  { label: '需关注', value: summary.warningTickets },
                  { label: '待处理', value: summary.pendingTickets },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-neutral-200 px-3 py-2"
                  >
                    <p className="text-[10px] text-neutral-500">{m.label}</p>
                    <p className="text-lg font-black text-neutral-800 tabular-nums mt-0.5">
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 pt-3 border-t border-neutral-100">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-neutral-800">
                    {nextStep.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{nextStep.desc}</p>
                </div>
                <button
                  type="button"
                  className={cn(BTN_SOFT, 'h-8 px-3 shrink-0 text-[11px]')}
                  onClick={goNext}
                >
                  {nextStep.action === 'market' && '去市场雇佣'}
                  {nextStep.action === 'employees' && '去我的员工'}
                  {(nextStep.action === 'plans' || nextStep.action === 'sessions') &&
                    '去质检工作台'}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* —— 会话质检：左侧计划列表 → 右侧该计划下会话单 —— */}
      {railTab === 'workspace' && (
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="shrink-0 px-4 py-3 border-b border-neutral-200 bg-white flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-neutral-800 tracking-tight">质检计划与会话</h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">先创建计划，再持续查看会话质检单</p>
            </div>
            <button
              type="button"
              className={cn(BTN_INK, 'h-8 px-4 shrink-0')}
              onClick={openCreatePlan}
            >
              新建质检计划
            </button>
          </div>
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <aside className="w-[300px] shrink-0 border-r border-neutral-200 bg-white flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {plans.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-neutral-500">暂无质检计划</p>
                  <button
                    type="button"
                    className={cn(BTN_INK, 'px-3 text-[11px]')}
                    onClick={openCreatePlan}
                  >
                    去创建计划
                  </button>
                </div>
              ) : (
                <>
                  {plans.map((p) => {
                    const list = ticketsByPlan.get(p.id) ?? [];
                    const pending = list.filter((t) => t.status === 'pending').length;
                    const warning = list.filter((t) => t.status === 'warning').length;
                    const active = planFilterId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          'border-b border-neutral-200/80 transition',
                          active ? 'bg-neutral-100/70' : 'hover:bg-neutral-100/40',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setPlanFilterId(p.id);
                            setSelectedTicketId(null);
                            setQueueSearch('');
                          }}
                          className="w-full text-left px-3 py-2.5 cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-neutral-800 leading-snug">
                              {p.name}
                            </p>
                            <span
                              className={cn(
                                'shrink-0 text-[10px] font-bold',
                                p.status === 'running' && 'text-emerald-700',
                                p.status === 'paused' && 'text-amber-700',
                                p.status === 'completed' && 'text-neutral-500',
                              )}
                            >
                              {PLAN_STATUS_LABEL[p.status]}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-1 tabular-nums">
                            {formatPlanPeriod(p.startAt, p.endAt, p.status)}
                          </p>
                          <p className="text-[11px] text-neutral-500 mt-1 truncate">
                            {p.sourceLabel} · {p.inspectorName}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-500">
                            <span className="tabular-nums">共 {list.length} 单</span>
                            {warning > 0 && (
                              <span className="text-amber-700 font-semibold tabular-nums">
                                需关注 {warning}
                              </span>
                            )}
                            {pending > 0 && (
                              <span className="text-sky-700 font-semibold tabular-nums">
                                待处理 {pending}
                              </span>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center justify-between gap-1.5 px-3 pb-2.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={p.status === 'running'}
                            aria-label={p.status === 'running' ? '结束计划' : '开始计划'}
                            title={p.status === 'running' ? '结束' : '开始'}
                            onClick={() =>
                              p.status === 'running' ? endPlan(p.id) : startPlan(p.id)
                            }
                            className={cn(
                              'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer',
                              p.status === 'running' ? 'bg-emerald-500' : 'bg-neutral-300',
                            )}
                          >
                            <span
                              className={cn(
                                'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                                p.status === 'running' ? 'translate-x-4' : 'translate-x-0.5',
                              )}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePlan(p.id)}
                            className="h-6 px-2 text-[10px] font-semibold text-red-600 hover:bg-red-50 rounded-md inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={10} />
                            删除
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </aside>

          <main className="flex-1 min-w-0 flex flex-col bg-white min-h-0">
            {plans.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-neutral-500 px-6 text-center">
                请先创建并开启质检计划，会话才会按标准入队
              </div>
            ) : (
              <>
                <SessionRecordsPage embedded viewRecordLabel="查看会话" />
              </>
            )}
          </main>

          {selectedTicket &&
            createPortal(
              <div
                className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 p-4"
                onClick={() => setSelectedTicketId(null)}
              >
                <div
                  className="w-full max-w-[1100px] h-[min(860px,92vh)] bg-white rounded-[13px] shadow-xl border border-neutral-200 flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="shrink-0 h-12 px-4 border-b border-neutral-200 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-neutral-800">会话详情</h3>
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(null)}
                      className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer"
                      aria-label="关闭"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 flex">
                    {/* 左：会话 */}
                    <div className="w-[46%] border-r border-neutral-200 flex flex-col min-h-0 bg-white">
                      <div className="shrink-0 px-4 py-2.5 border-b border-neutral-200 bg-white">
                        <p className="text-xs font-semibold text-neutral-800">
                          客服
                          {agentNameById.get(selectedTicket.session.assignedAgentId) ||
                            selectedTicket.session.assignedAgentId}
                          与客户的对话
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          会话时长：{Math.max(60, selectedTicket.session.messages.length * 28)} 秒
                          {' · '}
                          {selectedTicket.session.customerName}
                        </p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {selectedTicket.session.messages.map((m) => {
                          const isCustomer = m.sender === 'customer';
                          const hits = messageHitMap.get(m.id) ?? [];
                          return (
                            <div key={m.id} className="space-y-1.5">
                              <div className={cn('flex', isCustomer ? 'justify-start' : 'justify-end')}>
                                <div
                                  className={cn(
                                    'max-w-[88%] rounded-lg px-3 py-2 text-xs leading-relaxed',
                                    isCustomer
                                      ? 'bg-sky-50 text-neutral-800 border border-sky-100'
                                      : 'bg-white border border-neutral-200 text-neutral-800',
                                  )}
                                >
                                  <p className="text-[10px] text-neutral-500 mb-0.5">
                                    {isCustomer ? m.name : `${m.name} · AI`} · {m.timestamp}
                                  </p>
                                  <p className="whitespace-pre-wrap">{m.content}</p>
                                </div>
                              </div>
                              {hits.map((h) => (
                                <div
                                  key={`${m.id}-${h.itemId}`}
                                  className={cn(
                                    'flex',
                                    isCustomer ? 'justify-start' : 'justify-end',
                                  )}
                                >
                                  <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-600 border border-red-100">
                                    命中：{h.categoryTitle} | {h.itemName}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 右：AI 结果 */}
                    <div className="flex-1 min-w-0 flex flex-col bg-white">
                      <div className="shrink-0 px-3 pt-2 border-b border-neutral-200 flex gap-1">
                        {(
                          [
                            { id: 'session' as const, label: '会话详情' },
                            { id: 'eval' as const, label: '评价信息' },
                            { id: 'ai' as const, label: 'AI结果' },
                            { id: 'history' as const, label: '历史记录' },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setDetailTab(tab.id)}
                            className={cn(
                              'px-3 py-2 text-[11px] font-semibold border-b-2 -mb-px cursor-pointer transition',
                              detailTab === tab.id
                                ? 'border-live text-live'
                                : 'border-transparent text-neutral-500 hover:text-neutral-800',
                            )}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {detailTab === 'ai' && (
                          <>
                            <section className="rounded-lg border border-neutral-200">
                              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200">
                                <h4 className="text-xs font-extrabold text-neutral-800">智能总结</h4>
                                <button
                                  type="button"
                                  onClick={() => setSummaryCollapsed((v) => !v)}
                                  className="inline-flex items-center gap-0.5 text-[11px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
                                >
                                  {summaryCollapsed ? '展开' : '折叠'}
                                  <ChevronDown
                                    size={12}
                                    className={cn(
                                      'transition-transform',
                                      summaryCollapsed && '-rotate-90',
                                    )}
                                  />
                                </button>
                              </div>
                              {!summaryCollapsed && (
                                <div className="px-3 py-2.5 space-y-2 text-[11px] leading-relaxed text-neutral-800">
                                  <p>
                                    <span className="font-semibold">客户核心意图：</span>
                                    {selectedTicket.session.scenario}相关诉求（如退款 / 方案变更 /
                                    收益说明等）。
                                  </p>
                                  <p>
                                    <span className="font-semibold">分析结果总结：</span>
                                    客服态度良好，对产品规则有基本回应
                                    {selectedTicket.audit.hits.length > 0
                                      ? '，但个别关键节点说明不够清晰。'
                                      : '，关键节点说明较完整。'}
                                  </p>
                                  <p>
                                    <span className="font-semibold">质检结果总结：</span>
                                    命中 {selectedTicket.audit.hits.length} 项，得分{' '}
                                    {selectedTicket.audit.score}，
                                    {selectedTicket.audit.passed ? '质检合格' : '未达及格线'}。
                                  </p>
                                  <p>
                                    <span className="font-semibold">改善意见：</span>
                                    {selectedTicket.audit.hits.length > 0
                                      ? `建议加强「${selectedTicket.audit.hits[0].itemName}」话术规范，并在承诺类表述前完成核验。`
                                      : '继续保持规范话术，可沉淀为优秀案例。'}
                                  </p>
                                </div>
                              )}
                            </section>

                            <section className="rounded-lg border border-neutral-200 p-3 space-y-3">
                              <h4 className="text-xs font-extrabold text-neutral-800">质检类结果</h4>
                              <div className="flex items-center gap-4">
                                <div className="relative w-[88px] h-[88px] shrink-0">
                                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                    <circle
                                      cx="18"
                                      cy="18"
                                      r="15.5"
                                      fill="none"
                                      className="stroke-border"
                                      strokeWidth="2.5"
                                    />
                                    <circle
                                      cx="18"
                                      cy="18"
                                      r="15.5"
                                      fill="none"
                                      className={
                                        selectedTicket.audit.passed
                                          ? 'stroke-emerald-500'
                                          : 'stroke-amber-500'
                                      }
                                      strokeWidth="2.5"
                                      strokeDasharray={`${(selectedTicket.audit.score / 100) * 97.4} 97.4`}
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-black tabular-nums text-neutral-800 leading-none">
                                      {selectedTicket.audit.score}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[11px] text-neutral-500">最终质检得分</p>
                                  <p className="text-sm font-extrabold text-neutral-800 mt-0.5">
                                    {scoreGrade(
                                      selectedTicket.audit.score,
                                      selectedTicket.audit.passed,
                                    )}
                                  </p>
                                  <p
                                    className={cn(
                                      'text-[11px] font-semibold mt-0.5',
                                      selectedTicket.audit.passed
                                        ? 'text-emerald-700'
                                        : 'text-amber-800',
                                    )}
                                  >
                                    {selectedTicket.audit.passed ? '质检合格' : '质检不合格'}
                                  </p>
                                </div>
                              </div>

                              <div className="overflow-x-auto border border-neutral-200 rounded-md">
                                <table className="w-full text-[11px] min-w-[520px]">
                                  <thead className="bg-neutral-100/40 text-neutral-500">
                                    <tr>
                                      <th className="text-left font-semibold px-2 py-2">一级项</th>
                                      <th className="text-left font-semibold px-2 py-2">二级项名称</th>
                                      <th className="text-left font-semibold px-2 py-2">结果</th>
                                      <th className="text-left font-semibold px-2 py-2">得分/扣分</th>
                                      <th className="text-left font-semibold px-2 py-2">命中原因</th>
                                      <th className="text-left font-semibold px-2 py-2">操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedTicket.audit.itemResults.map((r) => {
                                      const hit =
                                        hitOverrides[r.itemId] !== undefined
                                          ? hitOverrides[r.itemId]
                                          : r.hit;
                                      return (
                                        <tr key={r.itemId} className="border-t border-neutral-200/80">
                                          <td className="px-2 py-2 text-neutral-800 align-top">
                                            {r.categoryTitle}
                                          </td>
                                          <td className="px-2 py-2 text-neutral-800 align-top">
                                            {r.itemName}
                                          </td>
                                          <td className="px-2 py-2 align-top">
                                            <select
                                              value={hit ? 'hit' : 'miss'}
                                              onChange={(e) =>
                                                setHitOverrides((prev) => ({
                                                  ...prev,
                                                  [r.itemId]: e.target.value === 'hit',
                                                }))
                                              }
                                              className={cn(
                                                'h-7 rounded-md border px-1.5 text-[10px] font-semibold cursor-pointer',
                                                hit
                                                  ? 'border-red-200 bg-red-50 text-red-600'
                                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                              )}
                                            >
                                              <option value="hit">命中</option>
                                              <option value="miss">未命中</option>
                                            </select>
                                          </td>
                                          <td className="px-2 py-2 tabular-nums align-top text-neutral-800">
                                            {hit ? r.score || '-5' : '0'}
                                          </td>
                                          <td className="px-2 py-2 text-neutral-500 align-top max-w-[180px]">
                                            {hit ? r.evidence || '—' : '—'}
                                          </td>
                                          <td className="px-2 py-2 align-top">
                                            <button
                                              type="button"
                                              className="text-[10px] font-semibold text-live hover:underline cursor-pointer"
                                              onClick={() => showToast('操作备注已预留（原型）')}
                                            >
                                              操作备注
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </section>
                          </>
                        )}

                        {detailTab === 'session' && (
                          <div className="text-[11px] space-y-2 text-neutral-800">
                            <p>
                              <span className="text-neutral-500">会话 ID：</span>
                              {selectedTicket.session.id}
                            </p>
                            <p>
                              <span className="text-neutral-500">场景：</span>
                              {selectedTicket.session.scenario}
                            </p>
                            <p>
                              <span className="text-neutral-500">所属计划：</span>
                              {selectedTicket.planName}
                            </p>
                            <p>
                              <span className="text-neutral-500">质检员：</span>
                              {agentNameById.get(selectedTicket.inspectorId) ||
                                selectedTicket.inspectorId}
                            </p>
                          </div>
                        )}

                        {detailTab === 'eval' && (
                          <p className="text-[11px] text-neutral-500">
                            暂无人工评价信息（原型占位）
                          </p>
                        )}

                        {detailTab === 'history' && (
                          <p className="text-[11px] text-neutral-500">
                            暂无纠错 / 复检历史（原型占位）
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 h-14 px-4 border-t border-neutral-200 bg-white flex items-center justify-between gap-3">
                    <p className="text-[11px] text-neutral-500 tabular-nums">
                      数据记录：第 {Math.max(1, selectedTicketIndex + 1)} 条 / 共{' '}
                      {visibleTickets.length} 条
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={cn(BTN_OUTLINE, 'h-8 px-3 text-[11px]')}
                        onClick={() => setSelectedTicketId(null)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className={cn(BTN_SOFT, 'h-8 px-3 text-[11px]')}
                        disabled={selectedTicketIndex <= 0}
                        onClick={() => goAdjacentTicket(-1)}
                      >
                        上一条
                      </button>
                      <button
                        type="button"
                        className={cn(BTN_SOFT, 'h-8 px-3 text-[11px]')}
                        disabled={
                          selectedTicketIndex < 0 ||
                          selectedTicketIndex >= visibleTickets.length - 1
                        }
                        onClick={() => goAdjacentTicket(1)}
                      >
                        下一条
                      </button>
                      <button
                        type="button"
                        className="h-8 px-4 rounded-md bg-live text-white text-[11px] font-semibold hover:opacity-90 cursor-pointer disabled:opacity-50"
                        onClick={() => {
                          showToast('纠错已提交（原型）');
                          markResolved(selectedTicket.id);
                        }}
                      >
                        纠错
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body,
            )}
        </div>
        </div>
      )}

      <QcCreatePlanModal
        open={showCreatePlan}
        onClose={() => {
          setShowCreatePlan(false);
          resetCreatePlanForm();
        }}
        onSubmit={handleCreatePlan}
        planName={newPlanName}
        onPlanNameChange={setNewPlanName}
        inspectableOnline={inspectableOnline}
        internalAgentIds={newPlanInternalAgentIds}
        onInternalAgentIdsChange={setNewPlanInternalAgentIds}
        externalSources={newPlanExternalSources}
        onExternalSourcesChange={setNewPlanExternalSources}
        collab={newPlanCollab}
        onCollabChange={setNewPlanCollab}
        onlineQcAgents={onlineQcAgents}
        inspectorIds={newPlanInspectorIds}
        onInspectorIdsChange={(ids, leadId) => {
          setNewPlanInspectorIds(ids);
          setNewPlanInspectorId(leadId);
        }}
        createInspector={createInspector}
      />

      <QcObserveConfigModal
        open={showObserveConfig}
        initial={observeConfig}
        onClose={() => setShowObserveConfig(false)}
        onConfirm={(cfg) => {
          setObserveConfig(cfg);
          setShowObserveConfig(false);
          setSelectedSystemMetricId(cfg.systemMetricIds[0] ?? null);
          showToast('观测指标已更新');
        }}
      />

    </div>
  );
};
