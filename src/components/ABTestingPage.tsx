/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ABTest } from '../types';
import {
  Plus,
  Pencil,
  Trash2,
  Link2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Split,
  Play,
  Pause,
} from '@/lib/icons';
import { SegmentedTabs } from './common/SegmentedTabs';
import { Modal } from './common/Modal';
import { PAGE, PANEL, BTN_INK, BTN_OUTLINE, FIELD, LABEL } from '@/lib/ui';
import { ABTEST_COPY } from '@/lib/platformTerminology';
import { cn } from '@/lib/utils';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';

const TRAINING_TABS = [
  { tab: 'kb', label: '员工知识' },
  { tab: 'skills', label: '员工技能' },
  { tab: 'abTest', label: '员工比拼' },
];

type TimeRange = 'today' | '7d' | '30d' | 'custom';

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: 'custom', label: '自定义' },
];

const TIME_SCALE: Record<TimeRange, number> = {
  today: 0.04,
  '7d': 0.22,
  '30d': 1,
  custom: 1,
};

function shortId(id: string) {
  return id.replace(/^ab_/, '').slice(0, 8);
}

function pctDelta(a: number, b: number) {
  if (b === 0) return a === 0 ? 0 : 100;
  return ((a - b) / b) * 100;
}

function formatHandleTime(minutes: number) {
  if (minutes <= 0) return '-';
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return `${m}m ${s}s`;
}

/** 演示用：把秒级字段映射为分钟展示 */
function toHandleMinutes(seconds: number) {
  return seconds < 60 ? seconds * 10 : seconds / 60;
}

function responseRate30s(avgSeconds: number) {
  return Math.max(0, Math.min(100, Math.round(100 - avgSeconds * 8)));
}

function resolution72h(satisfaction: number) {
  return Math.max(0, Math.min(100, Math.round(satisfaction * 0.85 - 78)));
}

function buildTrendSeries(test: ABTest, points: number, scale: number) {
  const seed = test.id.split('').reduce((n, c) => n + c.charCodeAt(0), 0);
  const labels: string[] = [];
  const seriesA: number[] = [];
  const seriesB: number[] = [];
  const baseA = Math.max(1, test.sessionsCountA * scale * 0.02);
  const baseB = Math.max(1, test.sessionsCountB * scale * 0.02);

  for (let i = 0; i < points; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (points - 1 - i));
    labels.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    const wave = Math.sin((i + seed % 7) * 0.55) * 0.35 + 1;
    const spike = i === Math.floor(points * 0.35) ? 2.8 : 1;
    seriesA.push(Number((baseA * wave * spike).toFixed(1)));
    seriesB.push(Number((baseB * wave * spike * (0.92 + (seed % 5) * 0.02)).toFixed(1)));
  }
  return { labels, seriesA, seriesB };
}

function TrendChart({
  labels,
  seriesA,
  seriesB,
}: {
  labels: string[];
  seriesA: number[];
  seriesB: number[];
}) {
  const width = 720;
  const height = 200;
  const pad = { t: 12, r: 12, b: 28, l: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(...seriesA, ...seriesB, 1);

  const toX = (i: number) => pad.l + (i / Math.max(labels.length - 1, 1)) * innerW;
  const toY = (v: number) => pad.t + innerH - (v / max) * innerH;

  const lineA = seriesA.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ');
  const lineB = seriesB.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[200px]">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + innerH * (1 - t);
        const val = (max * t).toFixed(1);
        return (
          <g key={t}>
            <line x1={pad.l} y1={y} x2={width - pad.r} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={4} y={y + 3} className="fill-neutral-400 text-[9px]">
              {val}
            </text>
          </g>
        );
      })}
      <path d={lineA} fill="none" stroke="#3b82f6" strokeWidth="2" />
      <path d={lineB} fill="none" stroke="#8b5cf6" strokeWidth="2" />
      {labels.map((label, i) =>
        i % Math.ceil(labels.length / 6) === 0 || i === labels.length - 1 ? (
          <text
            key={label + i}
            x={toX(i)}
            y={height - 6}
            textAnchor="middle"
            className="fill-neutral-400 text-[9px]"
          >
            {label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function statusMeta(status: ABTest['status']) {
  if (status === 'running') return { label: '运行中', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'completed') return { label: '已完成', className: 'bg-neutral-100 text-neutral-600 border-neutral-200' };
  return { label: '已暂停', className: 'bg-amber-50 text-amber-700 border-amber-200' };
}

function KpiCompareCard({
  title,
  valueA,
  valueB,
  delta,
  higherIsBetter = true,
}: {
  title: string;
  valueA: string;
  valueB: string;
  delta: number;
  higherIsBetter?: boolean;
}) {
  const improved = higherIsBetter ? delta < 0 : delta > 0;
  const worse = higherIsBetter ? delta > 0 : delta < 0;
  return (
    <div className="rounded-[13px] border border-neutral-200 bg-neutral-50/50 px-3 py-2 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[10px] font-semibold text-neutral-600 truncate">{title}</p>
        <span
          className={cn(
            'text-[10px] font-bold tabular-nums shrink-0',
            Math.abs(delta) < 0.05 ? 'text-neutral-400' : improved ? 'text-emerald-600' : worse ? 'text-rose-500' : 'text-neutral-500',
          )}
        >
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)}%
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white border border-sky-100 px-2 py-1.5">
          <p className="text-[9px] font-bold text-sky-600 mb-0.5">组 A</p>
          <p className="text-[13px] font-bold text-neutral-900 tabular-nums leading-none">{valueA}</p>
        </div>
        <div className="rounded-lg bg-white border border-sky-100 px-2 py-1.5">
          <p className="text-[9px] font-bold text-sky-600 mb-0.5">组 B</p>
          <p className="text-[13px] font-bold text-neutral-900 tabular-nums leading-none">{valueB}</p>
        </div>
      </div>
    </div>
  );
}

export const ABTestingPage: React.FC = () => {
  const {
    abTests,
    hiredAgents,
    createABTest,
    updateABTest,
    deleteABTest,
    demoStep,
    setDemoStep,
    showToast,
  } = useApp();

  const [selectedId, setSelectedId] = useState<string>(() => abTests[0]?.id ?? '');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTest, setEditingTest] = useState<ABTest | null>(null);
  const [testName, setTestName] = useState('');
  const [agentA, setAgentA] = useState('');
  const [agentB, setAgentB] = useState('');
  const [sliderRatio, setSliderRatio] = useState(50);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [simProgress, setSimProgress] = useState(0);
  const listBusy = useMockLatency('ab-list', 'pageList');
  const detailBusy = useMockLatency(selectedId || 'ab-empty', 'panelSwitch');

  useEffect(() => {
    if (!abTests.some((t) => t.id === selectedId)) {
      setSelectedId(abTests[0]?.id ?? '');
    }
  }, [abTests, selectedId]);

  const selected = abTests.find((t) => t.id === selectedId) ?? abTests[0];
  const scale = TIME_SCALE[timeRange];

  const empA = hiredAgents.find((a) => a.id === selected?.agentAId);
  const empB = hiredAgents.find((a) => a.id === selected?.agentBId);

  const trend = useMemo(() => {
    if (!selected) return { labels: [], seriesA: [], seriesB: [] };
    const points = timeRange === 'today' ? 12 : timeRange === '7d' ? 7 : 28;
    return buildTrendSeries(selected, points, scale);
  }, [selected, timeRange, scale]);

  const metrics = useMemo(() => {
    if (!selected) return null;
    const sessionsA = selected.sessionsCountA * scale;
    const sessionsB = selected.sessionsCountB * scale;
    const timeA = toHandleMinutes(selected.avgResponseTimeA);
    const timeB = toHandleMinutes(selected.avgResponseTimeB);
    const resA = responseRate30s(selected.avgResponseTimeA);
    const resB = responseRate30s(selected.avgResponseTimeB);
    const fixA = resolution72h(selected.satisfactionA);
    const fixB = resolution72h(selected.satisfactionB);
    return {
      sessionsA: sessionsA.toFixed(1),
      sessionsB: sessionsB.toFixed(1),
      sessionsDelta: pctDelta(sessionsA, sessionsB),
      timeA: formatHandleTime(timeA),
      timeB: formatHandleTime(timeB),
      timeDelta: pctDelta(timeA, timeB),
      fixA: `${fixA.toFixed(1)}%`,
      fixB: `${fixB.toFixed(1)}%`,
      fixDelta: pctDelta(fixA, fixB),
      transferA: `${selected.transferRateA.toFixed(1)}%`,
      transferB: `${selected.transferRateB.toFixed(1)}%`,
      transferDelta: pctDelta(selected.transferRateA, selected.transferRateB),
      resA: `${resA.toFixed(1)}%`,
      resB: `${resB.toFixed(1)}%`,
      resDelta: pctDelta(resA, resB),
    };
  }, [selected, scale]);

  const openCreate = () => {
    setEditingTest(null);
    setTestName('');
    setAgentA('');
    setAgentB('');
    setSliderRatio(50);
    setIsCreating(true);
  };

  const openEdit = (test: ABTest) => {
    setEditingTest(test);
    setTestName(test.name);
    setAgentA(test.agentAId);
    setAgentB(test.agentBId);
    setSliderRatio(test.ratioA);
    setIsCreating(true);
  };

  const handleSaveTest = () => {
    if (!testName.trim() || !agentA || !agentB) {
      showToast('请填写实验名称，并选好 A、B 两名数字员工。');
      return;
    }
    if (editingTest) {
      updateABTest(editingTest.id, {
        name: testName.trim(),
        agentAId: agentA,
        agentBId: agentB,
        ratioA: sliderRatio,
        ratioB: 100 - sliderRatio,
      });
      showToast('实验配置已更新。');
    } else {
      createABTest(testName.trim(), agentA, agentB, sliderRatio);
      showToast('新实验已创建。');
    }
    setIsCreating(false);
    setEditingTest(null);
  };

  const handleDelete = (test: ABTest) => {
    if (!confirm(`确定删除实验「${test.name}」吗？`)) return;
    deleteABTest(test.id);
    showToast('实验已删除。');
  };

  const startSimulation = (id: string) => {
    setSimulatingId(id);
    setSimProgress(0);
    const interval = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          const targetTest = abTests.find((t) => t.id === id);
          if (targetTest) {
            updateABTest(id, {
              status: 'completed',
              sessionsCountA: targetTest.sessionsCountA + Math.floor(400 + Math.random() * 200),
              sessionsCountB: targetTest.sessionsCountB + Math.floor(400 + Math.random() * 200),
              satisfactionA: Math.round(80 + Math.random() * 8),
              satisfactionB: Math.round(92 + Math.random() * 6),
              transferRateA: Math.round(30 + Math.random() * 10),
              transferRateB: Math.round(15 + Math.random() * 8),
              avgResponseTimeA: 2.1,
              avgResponseTimeB: 1.1,
            });
          }
          setSimulatingId(null);
          if (demoStep === 'C2') setDemoStep('C3');
          showToast('仿真完成，可对比组 A / 组 B 指标差异。');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const shareUrl = selected
    ? `https://joysupport.example/ab/${shortId(selected.id)}`
    : '';

  return (
    <div className={PAGE}>
      <SegmentedTabs items={TRAINING_TABS} />

      {demoStep === 'C2' && (
        <div className="mb-3 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-[13px] flex items-center justify-between text-[11px] text-emerald-800">
          <div className="flex items-center gap-1.5 font-medium min-w-0">
            <AlertCircle size={14} className="shrink-0" />
            <span className="truncate">选中实验后，点击「运行仿真」快速生成对比数据。</span>
          </div>
          <button
            type="button"
            onClick={() => setDemoStep('C3')}
            className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 cursor-pointer"
          >
            跳过
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 lg:items-start lg:max-h-[calc(100vh-9.5rem)]">
        {/* 左侧：比拼列表 */}
        <aside className={cn(PANEL, 'w-full lg:w-[220px] shrink-0 shadow-[0_2px_10px_rgba(31,35,41,0.03)] flex flex-col overflow-hidden lg:max-h-full')}>
          <div className="px-3 py-2 border-b border-neutral-100 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] font-bold text-neutral-900">{ABTEST_COPY.experimentList}</span>
            <button
              type="button"
              onClick={openCreate}
              className="h-6 px-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition"
            >
              <Plus size={11} strokeWidth={2.5} />
              新增
            </button>
          </div>

          <div className="overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar min-h-0 flex-1">
            <ContentBusy busy={listBusy} size="slot" minHeight={160}>
            {abTests.length === 0 ? (
              <p className="text-[11px] text-neutral-500 text-center py-8 px-2">{ABTEST_COPY.emptyList}</p>
            ) : (
              abTests.map((test) => {
                const a = hiredAgents.find((h) => h.id === test.agentAId);
                const b = hiredAgents.find((h) => h.id === test.agentBId);
                const active = test.id === selected?.id;
                const status = statusMeta(test.status);
                return (
                  <div
                    key={test.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(test.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedId(test.id);
                      }
                    }}
                    className={cn(
                      'group rounded-lg border p-2 cursor-pointer transition-all text-left relative',
                      active
                        ? 'border-sky-400 bg-sky-50/40 shadow-sm'
                        : 'border-neutral-200/80 hover:border-neutral-300 bg-white',
                    )}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p
                        className="text-[11px] font-bold text-neutral-900 line-clamp-2 leading-snug pr-12"
                        title={test.name}
                      >
                        {test.name}
                      </p>
                      <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(test);
                          }}
                          className="h-6 w-6 rounded border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:bg-neutral-50 cursor-pointer"
                          title="修改"
                        >
                          <Pencil size={10} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(test);
                          }}
                          className="h-6 w-6 rounded border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="删除"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    <span className={cn('inline-flex text-[9px] font-semibold px-1.5 py-px rounded-full border mb-1.5', status.className)}>
                      {status.label}
                    </span>
                    <div className="space-y-0.5 text-[9px] text-neutral-500">
                      <p className="truncate">
                        <span className="font-bold text-sky-600">A</span> {a?.name ?? '—'} · {test.ratioA}%
                      </p>
                      <p className="truncate">
                        <span className="font-bold text-sky-600">B</span> {b?.name ?? '—'} · {test.ratioB}%
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            </ContentBusy>
          </div>
        </aside>

        {/* 右侧：实验详情（单卡片整合） */}
        <main className="flex-1 min-w-0 lg:max-h-full flex flex-col min-h-[480px]">
          {!selected ? (
            <div className={cn(PANEL, 'flex-1 flex items-center justify-center text-neutral-500 text-sm')}>
              请选择或新建实验
            </div>
          ) : (
            <ContentBusy busy={detailBusy} size="panel" minHeight={400} className="flex-1 min-h-0">
            <div className={cn(PANEL, 'flex flex-col flex-1 min-h-0 shadow-[0_2px_10px_rgba(31,35,41,0.03)] overflow-hidden')}>
              {/* 顶栏 */}
              <div className="px-4 py-3 border-b border-neutral-100 shrink-0 space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-[14px] font-extrabold text-neutral-900 leading-tight">{selected.name}</h2>
                      <span className={cn('text-[9px] font-semibold px-1.5 py-px rounded-full border', statusMeta(selected.status).className)}>
                        {statusMeta(selected.status).label}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500">
                      ID {shortId(selected.id)} · 创建于 {selected.createdAt}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 max-w-[200px]">
                        <span className="font-bold shrink-0">A</span>
                        <span className="truncate">{empA?.name ?? '—'}</span>
                        <span className="shrink-0 tabular-nums">{selected.ratioA}%</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100 max-w-[200px]">
                        <span className="font-bold shrink-0">B</span>
                        <span className="truncate">{empB?.name ?? '—'}</span>
                        <span className="shrink-0 tabular-nums">{selected.ratioB}%</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selected.status === 'running' ? (
                      <button
                        type="button"
                        onClick={() => updateABTest(selected.id, { status: 'paused' })}
                        className="h-8 w-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                        title="暂停比拼"
                      >
                        <Pause size={14} />
                      </button>
                    ) : selected.status !== 'completed' ? (
                      <button
                        type="button"
                        onClick={() => updateABTest(selected.id, { status: 'running' })}
                        className="h-8 w-8 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                        title="启动比拼"
                      >
                        <Play size={14} />
                      </button>
                    ) : null}
                    {selected.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => startSimulation(selected.id)}
                        disabled={simulatingId !== null}
                        className={cn(BTN_INK, 'h-8 px-2.5 text-[10px] disabled:opacity-50')}
                      >
                        {simulatingId === selected.id ? (
                          <Loader2 size={12} />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        运行仿真
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                  <div className="inline-flex bg-neutral-100/60 p-0.5 rounded-lg">
                    {TIME_RANGES.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTimeRange(key)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer',
                          timeRange === key
                            ? 'bg-white text-neutral-800 shadow-sm border border-neutral-200'
                            : 'text-neutral-500 hover:text-neutral-800',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(shareUrl);
                      showToast('分享链接已复制。');
                    }}
                    className="h-8 px-2.5 rounded-lg border border-neutral-200 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Link2 size={12} />
                    复制分享链接
                  </button>
                </div>

                {simulatingId === selected.id && (
                  <div className="pt-1">
                    <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
                      <span>仿真进行中…</span>
                      <span className="tabular-nums">{simProgress}%</span>
                    </div>
                    <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-neutral-800 rounded-full transition-all" style={{ width: `${simProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* KPI */}
              {metrics && (
                <div className="px-4 py-3 border-b border-neutral-100 shrink-0 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                  <KpiCompareCard title="实时接待量" valueA={metrics.sessionsA} valueB={metrics.sessionsB} delta={metrics.sessionsDelta} higherIsBetter />
                  <KpiCompareCard title="平均处理时长" valueA={metrics.timeA} valueB={metrics.timeB} delta={metrics.timeDelta} higherIsBetter={false} />
                  <KpiCompareCard title="72H 一解率" valueA={metrics.fixA} valueB={metrics.fixB} delta={metrics.fixDelta} higherIsBetter />
                  <KpiCompareCard title="转人工率" valueA={metrics.transferA} valueB={metrics.transferB} delta={metrics.transferDelta} higherIsBetter={false} />
                  <KpiCompareCard title="30 秒响应率" valueA={metrics.resA} valueB={metrics.resB} delta={metrics.resDelta} higherIsBetter />
                </div>
              )}

              {/* 趋势图 */}
              <div className="flex-1 min-h-[220px] px-4 py-3 flex flex-col overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
                  <h3 className="text-[12px] font-bold text-neutral-900">实时接待量趋势</h3>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-sky-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                      组 A
                    </span>
                    <span className="flex items-center gap-1 text-sky-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                      组 B
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <TrendChart labels={trend.labels} seriesA={trend.seriesA} seriesB={trend.seriesB} />
                </div>
              </div>

              {selected.status === 'completed' && (
                <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 shrink-0">
                  组 B 满意度 +{(selected.satisfactionB - selected.satisfactionA).toFixed(1)}%，转人工率 -{(selected.transferRateA - selected.transferRateB).toFixed(1)} 个百分点，可考虑提高 B 组流量。
                </div>
              )}
            </div>
            </ContentBusy>
          )}
        </main>
      </div>

      <Modal
        open={isCreating}
        onClose={() => {
          setIsCreating(false);
          setEditingTest(null);
        }}
        icon={<Split size={16} />}
        title={editingTest ? ABTEST_COPY.edit : ABTEST_COPY.create}
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" onClick={() => setIsCreating(false)} className={BTN_OUTLINE}>
              取消
            </button>
            <button type="button" onClick={handleSaveTest} className={BTN_INK}>
              {editingTest ? '保存' : '创建'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={LABEL}>实验名称 *</label>
            <input
              type="text"
              placeholder="如：企微客服新模型对比测试"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className={FIELD}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>组 A 数字员工 *</label>
              <select value={agentA} onChange={(e) => setAgentA(e.target.value)} className={FIELD}>
                <option value="">请选择</option>
                {hiredAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>组 B 数字员工 *</label>
              <select value={agentB} onChange={(e) => setAgentB(e.target.value)} className={FIELD}>
                <option value="">请选择</option>
                {hiredAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-bold text-neutral-500 mb-1">
              <span>流量分配</span>
              <span>
                A {sliderRatio}% / B {100 - sliderRatio}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={sliderRatio}
              onChange={(e) => setSliderRatio(Number(e.target.value))}
              className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
