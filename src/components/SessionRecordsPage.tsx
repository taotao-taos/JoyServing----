/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 办公室 · 接待记录 — 对齐 joyteam-workbench /data/sessions 筛选条件与会话列表
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronRight, ChevronDown, Search, Sliders, X } from '@/lib/icons';
import { ChatSession } from '../types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE, PANEL, MODAL_OVERLAY, MODAL_PANEL, badgeClass, FIELD, FIELD_CTRL, BTN_INK, BTN_OUTLINE } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { sessionAvatarUrl, sessionAvatarFallbackClass } from '@/src/lib/workspaceUi';
import { SegmentedTabs } from './common/SegmentedTabs';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';

type TimeRange = 'today' | 'week' | 'month';
type TriFilter = 'all' | 'true' | 'false';
type SatFilter = 'all' | 'satisfied' | 'neutral' | 'dissatisfied' | 'none';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateTimeLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function rangeFor(kind: TimeRange): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;
  if (kind === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (kind === 'week') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
  }
  return { from: formatDateTimeLocal(start), to: formatDateTimeLocal(end) };
}

function channelLabel(channel?: ChatSession['channel']) {
  if (channel === 'web') return 'webchat';
  if (channel === 'chat') return 'chat';
  if (channel === 'link') return 'link';
  return 'webchat';
}

function statusLabel(status: ChatSession['status']) {
  if (status === 'completed') return '结束';
  if (status === 'queued') return '排队';
  if (status === 'manual') return '人工中';
  return '接待中';
}

function transferSuccess(s: ChatSession): 'yes' | 'no' | null {
  if (!s.isTransferred) return null;
  return s.assignedStaffId ? 'yes' : 'no';
}

function satisfactionLabel(s: ChatSession) {
  if (!s.satisfaction) return '买家未评价';
  if (s.satisfaction === 'very_satisfied') return '非常满意';
  if (s.satisfaction === 'satisfied') return '满意';
  if (s.satisfaction === 'neutral') return '中立';
  return '不满意';
}

function userPin(s: ChatSession) {
  if (s.phoneOrEmail?.startsWith('jd_')) return s.phoneOrEmail;
  const seed = s.id.replace(/[^a-z0-9]/gi, '').slice(-10) || 'user';
  return `jd_${seed}`;
}

function formatSessionStamp(session: ChatSession, time: string) {
  if (time.includes('-') || time.includes('/')) return time;
  const datePart = session.createdAt.split(' ')[0] ?? '';
  const t = time.length === 5 ? `${time}:00` : time;
  return `${datePart} ${t}`.trim();
}

function estimateDuration(session: ChatSession): string {
  const times = session.messages
    .map((m) => formatSessionStamp(session, m.timestamp))
    .map((t) => Date.parse(t.replace(/-/g, '/')));
  const valid = times.filter((n) => !Number.isNaN(n));
  if (valid.length < 2) return '—';
  const sec = Math.max(0, Math.round((Math.max(...valid) - Math.min(...valid)) / 1000));
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}分${s}秒` : `${m}分钟`;
}

function startTimeText(session: ChatSession) {
  return session.createdAt.length <= 16 ? `${session.createdAt}:00` : session.createdAt;
}

function CopyableValue({ value, onCopy }: { value: string; onCopy: (v: string) => void }) {
  return (
    <span className="group/copy inline-flex items-center gap-1.5 min-w-0 max-w-full">
      <span className="font-mono text-[12px] text-neutral-800/90 break-all leading-snug">{value}</span>
      <button
        type="button"
        title="复制"
        onClick={() => onCopy(value)}
        className="shrink-0 h-5 w-5 rounded-md text-neutral-400/60 opacity-0 group-hover/copy:opacity-100 hover:text-neutral-800 hover:bg-neutral-100 inline-flex items-center justify-center cursor-pointer transition"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white/70 px-3.5 py-3 mb-3 last:mb-0">
      <h4 className="text-[11px] font-semibold text-neutral-500 mb-2 tracking-wide">{title}</h4>
      <dl>{children}</dl>
    </section>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.75rem_1fr] gap-x-3 py-2 text-[12px] items-start border-b border-neutral-200/55 last:border-b-0 last:pb-0">
      <dt className="text-neutral-500 pt-px shrink-0">{label}</dt>
      <dd className="text-neutral-800 min-w-0">{children}</dd>
    </div>
  );
}

/** 标签在上 — 对齐 joyteam 筛选条件卡片 */
function FilterField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 flex flex-col gap-1', className)}>
      <span className="text-[12px] text-neutral-800/80 font-medium leading-none flex items-center gap-0.5">
        {required ? <span className="text-red-500">*</span> : null}
        {label}
      </span>
      {children}
    </div>
  );
}

const inputClass = cn(FIELD, FIELD_CTRL, 'text-[12px] px-2.5 placeholder:text-neutral-500');

const selectTriggerClass = 'h-8 w-full bg-white border-neutral-200 text-[12px]';

const SESSION_CHAT_BUBBLE =
  'px-3 py-2 rounded-lg bg-white border border-neutral-200 text-xs leading-relaxed text-neutral-800 whitespace-pre-wrap break-words';

export type SessionRecordsPageProps = {
  /** 嵌入质检台等：去掉顶部分段导航与外层 PAGE 滚动外壳 */
  embedded?: boolean;
  /** 操作列文案，默认「查看记录」 */
  viewRecordLabel?: string;
};

export const SessionRecordsPage: React.FC<SessionRecordsPageProps> = ({
  embedded = false,
  viewRecordLabel = '查看记录',
}) => {
  const { sessions, hiredAgents, showToast, demoStep, setDemoStep, updateSession } = useApp();

  const initialRange = rangeFor('today');
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [sessionIdQuery, setSessionIdQuery] = useState('');
  const [transFilter, setTransFilter] = useState<TriFilter>('all');
  const [transSuccessFilter, setTransSuccessFilter] = useState<TriFilter>('all');
  const [satFilter, setSatFilter] = useState<SatFilter>('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const [caseLibraryFilter, setCaseLibraryFilter] = useState<TriFilter>('all');
  const [applied, setApplied] = useState({
    sessionIdQuery: '',
    transFilter: 'all' as TriFilter,
    transSuccessFilter: 'all' as TriFilter,
    satFilter: 'all' as SatFilter,
    employeeId: 'all',
    scenarioFilter: 'all',
    caseLibraryFilter: 'all' as TriFilter,
  });
  const [inspectIndex, setInspectIndex] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'rating'>('info');
  const [joinCaseOpen, setJoinCaseOpen] = useState(false);
  const [joinRemark, setJoinRemark] = useState('');
  const [detailRemarkDraft, setDetailRemarkDraft] = useState('');
  const listBusy = useMockLatency('sessions-table', 'pageList');

  const scenarioOptions = useMemo(() => {
    const set = new Set(sessions.map((s) => s.scenario).filter(Boolean));
    return Array.from(set);
  }, [sessions]);

  const handleTimeRange = (kind: TimeRange) => {
    setTimeRange(kind);
    const next = rangeFor(kind);
    setDateFrom(next.from);
    setDateTo(next.to);
  };

  const handleReset = () => {
    const next = rangeFor('today');
    setTimeRange('today');
    setDateFrom(next.from);
    setDateTo(next.to);
    setSessionIdQuery('');
    setTransFilter('all');
    setTransSuccessFilter('all');
    setSatFilter('all');
    setEmployeeId('all');
    setScenarioFilter('all');
    setCaseLibraryFilter('all');
    setApplied({
      sessionIdQuery: '',
      transFilter: 'all',
      transSuccessFilter: 'all',
      satFilter: 'all',
      employeeId: 'all',
      scenarioFilter: 'all',
      caseLibraryFilter: 'all',
    });
  };

  const handleQuery = () => {
    setApplied({
      sessionIdQuery: sessionIdQuery.trim(),
      transFilter,
      transSuccessFilter,
      satFilter,
      employeeId,
      scenarioFilter,
      caseLibraryFilter,
    });
    showToast('已按当前筛选条件刷新接待记录。');
  };

  const filteredLogs = useMemo(() => {
    return sessions.filter((s) => {
      if (applied.sessionIdQuery && !s.id.toLowerCase().includes(applied.sessionIdQuery.toLowerCase())) {
        return false;
      }
      if (applied.employeeId !== 'all' && s.assignedAgentId !== applied.employeeId) return false;
      if (applied.scenarioFilter !== 'all' && s.scenario !== applied.scenarioFilter) return false;
      if (applied.transFilter !== 'all' && s.isTransferred !== (applied.transFilter === 'true')) return false;
      const success = transferSuccess(s);
      if (applied.transSuccessFilter === 'true' && success !== 'yes') return false;
      if (applied.transSuccessFilter === 'false' && success !== 'no') return false;
      if (applied.satFilter !== 'all') {
        if (applied.satFilter === 'none' && s.satisfaction) return false;
        if (applied.satFilter === 'satisfied' && s.satisfaction !== 'very_satisfied' && s.satisfaction !== 'satisfied')
          return false;
        if (applied.satFilter === 'neutral' && s.satisfaction !== 'neutral') return false;
        if (applied.satFilter === 'dissatisfied' && s.satisfaction !== 'dissatisfied') return false;
      }
      if (applied.caseLibraryFilter === 'true' && !s.inCaseLibrary) return false;
      if (applied.caseLibraryFilter === 'false' && s.inCaseLibrary) return false;
      return true;
    });
  }, [sessions, applied]);

  const inspectSession = inspectIndex != null ? filteredLogs[inspectIndex] ?? null : null;
  const inspectAgent = inspectSession
    ? hiredAgents.find((a) => a.id === inspectSession.assignedAgentId)
    : undefined;

  useEffect(() => {
    if (inspectSession?.inCaseLibrary) {
      setDetailRemarkDraft(inspectSession.caseLibraryRemark ?? '');
    } else {
      setDetailRemarkDraft('');
    }
  }, [inspectSession?.id, inspectSession?.inCaseLibrary, inspectSession?.caseLibraryRemark]);

  const openInspect = (sessionId: string) => {
    const idx = filteredLogs.findIndex((s) => s.id === sessionId);
    if (idx >= 0) {
      setDetailTab('info');
      setJoinCaseOpen(false);
      setJoinRemark('');
      setInspectIndex(idx);
    }
  };

  const closeInspect = () => {
    setJoinCaseOpen(false);
    setJoinRemark('');
    setInspectIndex(null);
  };

  const openJoinCase = () => {
    if (!inspectSession || inspectSession.inCaseLibrary) return;
    setJoinRemark('');
    setJoinCaseOpen(true);
  };

  const submitJoinCase = () => {
    if (!inspectSession) return;
    const remark = joinRemark.trim();
    updateSession(inspectSession.id, {
      inCaseLibrary: true,
      caseLibraryRemark: remark || undefined,
    });
    setJoinCaseOpen(false);
    setJoinRemark('');
    showToast('已加入案例库');
  };

  const removeFromCaseLibrary = () => {
    if (!inspectSession?.inCaseLibrary) return;
    const id = inspectSession.id;
    updateSession(id, {
      inCaseLibrary: false,
      caseLibraryRemark: undefined,
    });
    showToast('已取消加入案例库');
    if (applied.caseLibraryFilter === 'true') {
      closeInspect();
    }
  };

  const saveDetailRemark = () => {
    if (!inspectSession?.inCaseLibrary) return;
    const next = detailRemarkDraft.trim();
    if (!next) {
      showToast('问题备注不能为空');
      setDetailRemarkDraft(inspectSession.caseLibraryRemark ?? '');
      return;
    }
    if (next === (inspectSession.caseLibraryRemark ?? '')) return;
    updateSession(inspectSession.id, { caseLibraryRemark: next });
    showToast('问题备注已更新');
  };

  const goPrev = () => {
    setDetailTab('info');
    setInspectIndex((i) => (i != null && i > 0 ? i - 1 : i));
  };

  const goNext = () => {
    setDetailTab('info');
    setInspectIndex((i) => (i != null && i < filteredLogs.length - 1 ? i + 1 : i));
  };

  useEffect(() => {
    if (inspectIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeInspect();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [inspectIndex, filteredLogs.length]);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showToast('已复制');
    } catch {
      showToast('复制失败，请手动选择');
    }
  };

  return (
    <div
      className={cn(
        embedded
          ? 'flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 bg-white text-neutral-800 font-sans text-xs antialiased'
          : cn(PAGE, 'overflow-y-auto custom-scrollbar'),
      )}
    >
      {!embedded && (
        <SegmentedTabs
          items={[
            { tab: 'dashboard', label: '员工业绩' },
            { tab: 'sessions', label: '接待记录' },
          ]}
        />
      )}

      {!embedded && demoStep === 'C1' && (
        <div className="mb-3 bg-neutral-800 text-white px-3 py-2 rounded-[13px] flex items-center justify-between text-[11px]">
          <span className="truncate">向下查看接待明细，点开单条会话复盘数字员工表现。</span>
          <button
            type="button"
            onClick={() => setDemoStep('C2')}
            className="bg-white text-black px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ml-2 cursor-pointer"
          >
            跳过
          </button>
        </div>
      )}

      {/* 筛选条件 — 对齐 joyteam：标题行 + 标签在上两行网格 */}
      <section className={cn(PANEL, 'px-4 py-3 mb-3')}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-[13px] font-bold text-neutral-800 flex items-center gap-1.5">
            <Sliders size={14} className="text-neutral-500" />
            筛选条件
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="h-8 px-2 text-[12px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
            >
              重置
            </button>
            <Button
              type="button"
              onClick={handleQuery}
              className={BTN_INK}
            >
              查询
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* 第一行：时间范围 | 会话ID | 是否转人工（桌面默认同行） */}
          <div className="grid grid-cols-[minmax(0,1.55fr)_minmax(168px,0.85fr)_minmax(132px,0.65fr)] max-md:grid-cols-1 gap-x-4 gap-y-3">
            <FilterField label="时间范围" required>
              <div className="flex items-center gap-1.5 min-w-0 flex-nowrap overflow-x-auto">
                {(
                  [
                    { id: 'today' as const, label: '今天' },
                    { id: 'week' as const, label: '最近一周' },
                    { id: 'month' as const, label: '最近一月' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTimeRange(item.id)}
                    className={cn(
                      'h-8 px-2.5 rounded-md border text-[12px] transition cursor-pointer shrink-0',
                      timeRange === item.id
                        ? 'border-sky-300 text-sky-700 bg-sky-50'
                        : 'border-neutral-200 text-neutral-500 hover:border-foreground/20 hover:text-neutral-800 bg-white',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
                <input
                  type="datetime-local"
                  step={1}
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setTimeRange('today');
                  }}
                  className={cn(inputClass, 'w-[10.75rem] shrink-0')}
                  aria-label="开始时间"
                />
                <span className="text-neutral-500 text-[12px] shrink-0">~</span>
                <input
                  type="datetime-local"
                  step={1}
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setTimeRange('today');
                  }}
                  className={cn(inputClass, 'w-[10.75rem] shrink-0')}
                  aria-label="结束时间"
                />
              </div>
            </FilterField>

            <FilterField label="会话ID">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                <input
                  type="text"
                  value={sessionIdQuery}
                  onChange={(e) => setSessionIdQuery(e.target.value)}
                  placeholder="请输入会话ID"
                  className={cn(inputClass, 'pl-8')}
                />
              </div>
            </FilterField>

            <FilterField label="是否转人工">
              <Select value={transFilter} onValueChange={(v) => v && setTransFilter(v as TriFilter)}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue>
                    {transFilter === 'all' ? '全部' : transFilter === 'true' ? '是' : '否'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="true">是</SelectItem>
                  <SelectItem value="false">否</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          {/* 第二行：筛选项（桌面默认同行） */}
          <div className="grid grid-cols-[repeat(5,minmax(0,1fr))] max-md:grid-cols-1 gap-x-4 gap-y-3">
            <FilterField label="转人工是否成功">
              <Select
                value={transSuccessFilter}
                onValueChange={(v) => v && setTransSuccessFilter(v as TriFilter)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue>
                    {transSuccessFilter === 'all'
                      ? '全部'
                      : transSuccessFilter === 'true'
                        ? '是'
                        : '否'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="true">是</SelectItem>
                  <SelectItem value="false">否</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="满意度评分">
              <Select value={satFilter} onValueChange={(v) => v && setSatFilter(v as SatFilter)}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue>
                    {satFilter === 'all'
                      ? '全部'
                      : satFilter === 'none'
                        ? '买家未评价'
                        : satFilter === 'satisfied'
                          ? '满意'
                          : satFilter === 'neutral'
                            ? '中立'
                            : '不满意'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="none">买家未评价</SelectItem>
                  <SelectItem value="satisfied">满意</SelectItem>
                  <SelectItem value="neutral">中立</SelectItem>
                  <SelectItem value="dissatisfied">不满意</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="数字员工">
              <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v)}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue>
                    {employeeId === 'all'
                      ? '全部'
                      : hiredAgents.find((a) => a.id === employeeId)?.name ?? '全部'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {hiredAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="业务场景">
              <Select value={scenarioFilter} onValueChange={(v) => v && setScenarioFilter(v)}>
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue>{scenarioFilter === 'all' ? '全部' : scenarioFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  {scenarioOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="案例库">
              <Select
                value={caseLibraryFilter}
                onValueChange={(v) => v && setCaseLibraryFilter(v as TriFilter)}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue>
                    {caseLibraryFilter === 'all'
                      ? '全部'
                      : caseLibraryFilter === 'true'
                        ? '已加入案例库'
                        : '未加入案例库'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="true">已加入案例库</SelectItem>
                  <SelectItem value="false">未加入案例库</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </div>
        </div>
      </section>

      {/* 会话列表 */}
      <section className={cn(PANEL, 'p-4')}>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-[14px] font-bold text-neutral-800">
            会话列表{' '}
            <span className="text-neutral-500 font-medium text-[12px]">
              共 {filteredLogs.length} 条记录
            </span>
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => showToast('已导出当前筛选范围内的接待明细。')}
            className="h-8 px-3 text-[12px] cursor-pointer gap-1"
          >
            导出
            <ChevronDown size={12} />
          </Button>
        </div>

        {listBusy ? (
          <ContentBusy busy size="panel" minHeight={240} />
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-xs text-neutral-500">暂无数据</span>
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-200 rounded-lg">
            <table className="w-full text-left border-collapse text-[12px] text-neutral-800 min-w-[1180px]">
              <thead>
                <tr className="bg-neutral-100/40 border-b border-neutral-200 text-[11px] text-neutral-500 font-medium">
                  <th className="px-3 py-2.5 whitespace-nowrap">会话ID</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">会话开始时间</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">用户PIN</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">数字员工</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">渠道</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">在线状态</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">是否转人工</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">转人工是否成功</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">满意度</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">业务场景</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">案例库</th>
                  <th className="px-3 py-2.5 whitespace-nowrap text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredLogs.map((s) => {
                  const agent = hiredAgents.find((a) => a.id === s.assignedAgentId);
                  const success = transferSuccess(s);
                  return (
                    <tr key={s.id} className="hover:bg-neutral-100/25 transition">
                      <td className="px-3 py-3 align-top">
                        <div className="flex items-start gap-1.5 max-w-[180px]">
                          <span className="font-mono text-[11px] text-neutral-800 break-all leading-snug">
                            {s.id}
                          </span>
                          <button
                            type="button"
                            title="复制"
                            onClick={() => void copyId(s.id)}
                            className="shrink-0 mt-0.5 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                              <path
                                d="M5 15V7a2 2 0 0 1 2-2h8"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-[11px] text-neutral-500 align-top">
                        {s.createdAt.length <= 16 ? `${s.createdAt}:00` : s.createdAt}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-[11px] align-top">
                        {userPin(s)}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="font-semibold text-neutral-800 leading-tight">
                          {agent?.name ?? '未分配'}
                        </div>
                        <div className="font-mono text-[10px] text-neutral-500 mt-0.5">
                          {s.assignedAgentId || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap align-top">{channelLabel(s.channel)}</td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200 whitespace-nowrap leading-none h-5">
                          {statusLabel(s.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span
                          className={cn(
                            'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap leading-none h-5',
                            s.isTransferred
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          )}
                        >
                          {s.isTransferred ? '是' : '否'}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top text-neutral-500 whitespace-nowrap">
                        {success === null ? (
                          '—'
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border font-medium whitespace-nowrap leading-none h-5',
                              success === 'yes'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-600 border-red-200',
                            )}
                          >
                            {success === 'yes' ? '是' : '否'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-neutral-500 whitespace-nowrap">
                        {satisfactionLabel(s)}
                      </td>
                      <td className="px-3 py-3 align-top text-neutral-500 max-w-[140px] truncate">
                        {s.scenario || '—'}
                      </td>
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {s.inCaseLibrary ? (
                          <span className={badgeClass('success')}>已加入</span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200 whitespace-nowrap leading-none h-5">
                            未加入
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openInspect(s.id)}
                          className="text-sky-600 hover:text-sky-700 font-semibold text-[12px] inline-flex items-center cursor-pointer"
                        >
                          {viewRecordLabel}
                          <ChevronRight size={12} className="ml-0.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {inspectSession && inspectIndex != null && (
        <div className={cn(MODAL_OVERLAY, 'p-3 sm:p-6')} onClick={closeInspect}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-detail-title"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              MODAL_PANEL,
              'relative max-w-[1120px] h-[min(820px,92vh)] p-0 overflow-hidden flex flex-col',
            )}
          >
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)]">
              <div className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-200 bg-white">
                <div className="px-4 py-2.5 border-b border-neutral-200 bg-white flex flex-col justify-center shrink-0 min-h-[54px]">
                  <p className="text-sm font-semibold text-neutral-800 leading-tight">
                    客服{inspectAgent?.name ?? '数字员工'}与客户的对话
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    会话时长: {estimateDuration(inspectSession)}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0 bg-white">
                  {inspectSession.messages.length === 0 ? (
                    <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-xs text-neutral-500">
                      <div className="h-10 w-10 rounded-full bg-neutral-100 mb-2" />
                      暂无对话内容
                    </div>
                  ) : (
                    inspectSession.messages.map((msg, idx) => {
                      if (msg.sender === 'system') {
                        return (
                          <div key={msg.id || idx} className="flex justify-center my-2 select-none">
                            <span className="bg-white text-neutral-500 text-[10.5px] px-3.5 py-1.5 rounded-full text-center border border-neutral-200 max-w-sm leading-relaxed block shadow-xs font-mono font-medium">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }
                      const isCust = msg.sender === 'customer';
                      const stamp = formatSessionStamp(inspectSession, msg.timestamp);
                      const custAvatarSrc = sessionAvatarUrl(inspectSession.avatarSeed);
                      return (
                        <div
                          key={msg.id || idx}
                          className={cn(
                            'flex gap-2.5 items-start py-0.5',
                            isCust ? 'justify-start' : 'justify-end',
                          )}
                        >
                          {isCust ? (
                            custAvatarSrc ? (
                              <img
                                src={custAvatarSrc}
                                alt=""
                                className="h-8 w-8 rounded-full border border-neutral-300 bg-white shrink-0 object-cover shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span
                                className={cn(
                                  'h-8 w-8 rounded-full border border-neutral-200 shrink-0 flex items-center justify-center text-[11px] font-semibold shadow-xs',
                                  sessionAvatarFallbackClass(inspectSession.avatarSeed),
                                )}
                              >
                                {inspectSession.customerName.charAt(0)}
                              </span>
                            )
                          ) : null}
                          <div
                            className={cn(
                              'flex flex-col max-w-[85%] gap-1',
                              isCust ? 'items-start' : 'items-end',
                            )}
                          >
                            <div
                              className={cn(
                                SESSION_CHAT_BUBBLE,
                                isCust ? 'rounded-tl-sm' : 'rounded-tr-sm',
                              )}
                            >
                              {msg.content}
                            </div>
                            <span className="text-[9px] text-neutral-400 font-mono tracking-wider px-1 font-bold tabular-nums">
                              {stamp}
                            </span>
                          </div>
                          {!isCust ? (
                            <div className="h-8 w-8 rounded-full bg-white border border-neutral-300 shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-black shadow-xs">
                              {inspectAgent?.avatar || (inspectAgent?.name ?? 'AI').slice(0, 1)}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="min-h-0 flex flex-col bg-white">
                <div className="h-[56px] px-5 border-b border-neutral-200 shrink-0 bg-white flex items-center justify-between gap-3">
                  <div className="flex items-end gap-6 min-w-0 h-full">
                    {(
                      [
                        { id: 'info' as const, label: '会话详情' },
                        { id: 'rating' as const, label: '评价信息' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setDetailTab(tab.id)}
                        className={cn(
                          'relative pb-2.5 text-[13px] font-semibold transition cursor-pointer shrink-0',
                          detailTab === tab.id
                            ? 'text-neutral-800'
                            : 'text-neutral-500 hover:text-neutral-800',
                        )}
                      >
                        <span id={tab.id === 'info' ? 'session-detail-title' : undefined}>{tab.label}</span>
                        {detailTab === tab.id ? (
                          <span className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full bg-foreground" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={closeInspect}
                    className="h-8 w-8 rounded-[7px] text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 inline-flex items-center justify-center cursor-pointer transition shrink-0"
                    aria-label="关闭"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
                  {detailTab === 'info' ? (
                    <>
                      <DetailSection title="会话信息">
                        <DetailRow label="会话ID">
                          <CopyableValue value={inspectSession.id} onCopy={copyId} />
                        </DetailRow>
                        <DetailRow label="用户PIN">
                          <CopyableValue value={userPin(inspectSession)} onCopy={copyId} />
                        </DetailRow>
                        <DetailRow label="渠道">{channelLabel(inspectSession.channel)}</DetailRow>
                        <DetailRow label="开始时间">
                          <span className="tabular-nums">{startTimeText(inspectSession)}</span>
                        </DetailRow>
                        <DetailRow label="结束时间">
                          <span className="text-neutral-500">—</span>
                        </DetailRow>
                        <DetailRow label="通话时长">
                          <span className="tabular-nums">{estimateDuration(inspectSession)}</span>
                        </DetailRow>
                        <DetailRow label="消息条数">{inspectSession.messages.length}条</DetailRow>
                      </DetailSection>

                      <DetailSection title="数字员工">
                        <DetailRow label="员工名称">
                          <span className="font-medium">{inspectAgent?.name ?? '—'}</span>
                        </DetailRow>
                        <DetailRow label="员工ID">
                          {inspectSession.assignedAgentId ? (
                            <CopyableValue value={inspectSession.assignedAgentId} onCopy={copyId} />
                          ) : (
                            <span className="text-neutral-500">—</span>
                          )}
                        </DetailRow>
                        <DetailRow label="在线状态">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                inspectSession.status === 'completed' ||
                                  inspectSession.status === 'queued'
                                  ? 'bg-neutral-400'
                                  : 'bg-emerald-500',
                              )}
                            />
                            {inspectSession.status === 'completed'
                              ? '结束'
                              : inspectSession.status === 'queued'
                                ? '排队'
                                : '在线'}
                          </span>
                        </DetailRow>
                      </DetailSection>

                      <DetailSection title="接待结果">
                        <DetailRow label="是否转人工">
                          <span
                            className={badgeClass(
                              inspectSession.isTransferred ? 'warning' : 'success',
                            )}
                          >
                            {inspectSession.isTransferred ? '是' : '否'}
                          </span>
                        </DetailRow>
                        <DetailRow label="转人工是否成功">
                          {transferSuccess(inspectSession) === null ? (
                            <span className="text-neutral-500">—</span>
                          ) : transferSuccess(inspectSession) === 'yes' ? (
                            '是'
                          ) : (
                            '否'
                          )}
                        </DetailRow>
                        <DetailRow label="满意度">
                          {inspectSession.satisfaction ? (
                            satisfactionLabel(inspectSession)
                          ) : (
                            <span className="text-neutral-500">未评价</span>
                          )}
                        </DetailRow>
                        <DetailRow label="业务场景">
                          {inspectSession.scenario || (
                            <span className="text-neutral-500">—</span>
                          )}
                        </DetailRow>
                      </DetailSection>

                      {inspectSession.inCaseLibrary ? (
                        <DetailSection title="案例库">
                          <DetailRow label="问题备注">
                            <textarea
                              value={detailRemarkDraft}
                              onChange={(e) => setDetailRemarkDraft(e.target.value)}
                              onBlur={saveDetailRemark}
                              rows={3}
                              className="w-full min-h-[72px] px-2.5 py-2 rounded-md border border-neutral-200 bg-white text-[12px] text-neutral-800 leading-relaxed outline-none focus:border-neutral-400 resize-y"
                              placeholder="请输入问题备注"
                            />
                          </DetailRow>
                        </DetailSection>
                      ) : null}
                    </>
                  ) : (
                    <div className="py-8 px-0.5">
                      {inspectSession.satisfaction ? (
                        <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-1.5">
                          <p className="text-[11px] text-neutral-500 font-medium">满意度评分</p>
                          <p className="text-lg font-bold text-neutral-800 tracking-tight">
                            {satisfactionLabel(inspectSession)}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-neutral-200 bg-white/60 py-14 text-center">
                          <div className="mx-auto h-9 w-9 rounded-full bg-neutral-100 mb-3" />
                          <p className="text-[13px] font-medium text-neutral-800">买家暂未评价</p>
                          <p className="text-[11px] text-neutral-500 mt-1">
                            会话结束后若有评价，将显示在这里
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-[56px] px-5 border-t border-neutral-200 flex items-center justify-between gap-3 shrink-0 bg-white">
              <span className="text-[12px] text-neutral-500 tabular-nums">
                数据记录：第{' '}
                <span className="text-neutral-800 font-semibold">{inspectIndex + 1}</span> 条 / 共{' '}
                {filteredLogs.length} 条
              </span>
              <div className="flex items-center gap-2">
                {inspectSession.inCaseLibrary ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={removeFromCaseLibrary}
                    className="group h-8 px-3.5 text-[12px] cursor-pointer bg-white min-w-[108px]"
                  >
                    <span className="group-hover:hidden">已加入案例库</span>
                    <span className="hidden group-hover:inline text-destructive">取消加入</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openJoinCase}
                    className="h-8 px-3.5 text-[12px] cursor-pointer bg-white"
                  >
                    加入案例库
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={inspectIndex <= 0}
                  onClick={goPrev}
                  className="h-8 px-3.5 text-[12px] cursor-pointer bg-white disabled:opacity-35"
                >
                  上一条
                </Button>
                <Button
                  type="button"
                  disabled={inspectIndex >= filteredLogs.length - 1}
                  onClick={goNext}
                  className="h-8 px-3.5 text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-35"
                >
                  下一条
                </Button>
              </div>
            </div>
          </div>

          {joinCaseOpen && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/35 p-4"
              onClick={() => setJoinCaseOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="join-case-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] rounded-lg bg-white border border-neutral-200 shadow-lg border border-neutral-200 p-5 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 id="join-case-title" className="text-sm font-bold text-neutral-800">
                    加入案例库
                  </h4>
                  <button
                    type="button"
                    onClick={() => setJoinCaseOpen(false)}
                    className="h-8 w-8 rounded-[7px] text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 inline-flex items-center justify-center cursor-pointer"
                    aria-label="关闭"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[12px] text-neutral-500 mb-1.5 block">会话 ID</label>
                    <div className="h-9 px-3 rounded-md border border-neutral-200 bg-neutral-100/40 text-[12px] font-mono text-neutral-800/80 flex items-center truncate">
                      {inspectSession.id}
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] text-neutral-800 mb-1.5 block">问题备注</label>
                    <textarea
                      value={joinRemark}
                      onChange={(e) => setJoinRemark(e.target.value)}
                      rows={4}
                      placeholder="可选填写备注（例如：客户反馈延迟发货、车险理赔细节不详等）"
                      className="w-full px-3 py-2.5 rounded-md border border-neutral-200 bg-white text-[12px] text-neutral-800 placeholder:text-neutral-500 leading-relaxed outline-none focus:border-neutral-400 resize-none"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setJoinCaseOpen(false)}
                    className="h-8 px-3.5 text-[12px] cursor-pointer"
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    onClick={submitJoinCase}
                    className="h-8 px-3.5 text-[12px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    确认提交
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
