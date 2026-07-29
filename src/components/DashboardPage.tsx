/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 办公室 · 员工业绩 — 对齐 joyteam-workbench /data/operation
 */

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  HelpCircle,
  Users,
  Cpu,
  Headphones,
  Wifi,
  Clock,
  Zap,
  CheckCircle2,
  Smile,
} from '@/lib/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PAGE, PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { PageHeader } from './common/PageHeader';
import { SparklineArea } from './dashboard/ChartPrimitives';
import { SegmentedTabs } from './common/SegmentedTabs';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';

function CompactToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-[7px] border border-neutral-200 bg-neutral-100/40 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={cn(
            'px-2 py-1 rounded-[5px] text-[10px] font-semibold transition cursor-pointer',
            value === opt.id
              ? 'bg-white text-neutral-800 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-800',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** 演示数据（对齐 joyteam 运营核心指标语义） */
const OPS = {
  inbound: 24821,
  aiReception: 19250,
  transfer: 5571,
  humanReception: 5241,
  transferFailed: 330,
  transferRate: 22.4,
  humanPickupRate: 94.1,
  realtimeAi: 86,
  realtimeHuman: 42,
  aiSaturation: 68,
  humanSaturation: 54,
  avgHandleSec: 222,
  responseMs: 820,
  respond30sRate: 91.6,
  resolve72h: 87.3,
  satisfaction: 94.2,
  goodRate: 71.5,
  recall: 82.4,
  precision: 79.1,
  f1: 80.7,
  parseRate: 96.3,
};

const TOKEN_TREND = [420, 480, 510, 490, 560, 610, 580, 640, 700, 680, 720, 760, 740, 800];
const CORE_TREND_ROWS = [
  { date: '07-16', inbound: 3120, ai: 2410, transfer: 710, human: 668, fail: 42 },
  { date: '07-17', inbound: 2980, ai: 2305, transfer: 675, human: 640, fail: 35 },
  { date: '07-18', inbound: 3410, ai: 2680, transfer: 730, human: 690, fail: 40 },
  { date: '07-19', inbound: 3560, ai: 2750, transfer: 810, human: 762, fail: 48 },
  { date: '07-20', inbound: 3290, ai: 2550, transfer: 740, human: 701, fail: 39 },
  { date: '07-21', inbound: 3820, ai: 2960, transfer: 860, human: 812, fail: 48 },
  { date: '07-22', inbound: 3641, ai: 2595, transfer: 1046, human: 968, fail: 78 },
];

const AI_BIZ = [
  { name: '保障范围咨询', count: 4820 },
  { name: '保费方案测算', count: 3610 },
  { name: '理赔材料指引', count: 2980 },
  { name: '找不到申请入口', count: 1240 },
  { name: '金额争议', count: 860 },
];

const TRANSFER_BIZ = [
  { name: '情绪升级转人工', count: 1680 },
  { name: '拒赔争议', count: 920 },
  { name: '复杂核保', count: 780 },
  { name: '材料错/过保', count: 650 },
  { name: '特殊材料核实', count: 420 },
];

function Tip({ text }: { text: string }) {
  return (
    <span title={text} className="inline-flex">
      <HelpCircle size={12} className="text-neutral-400/50 shrink-0" />
    </span>
  );
}

function SectionTitle({
  title,
  english,
  right,
}: {
  title: string;
  english?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div>
        <h2 className="text-sm font-extrabold text-neutral-900 tracking-tight">{title}</h2>
        {english ? (
          <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-semibold mt-0.5">
            {english}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

function MetricTile({
  label,
  value,
  unit,
  tip,
  sub,
  highlight,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tip?: string;
  sub?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        PANEL,
        'p-3 flex flex-col gap-1.5 min-h-[96px]',
        highlight && 'border border-neutral-300 bg-neutral-100/40',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] text-neutral-500 font-medium flex items-center gap-1">
          {icon}
          {label}
          {tip ? <Tip text={tip} /> : null}
        </span>
      </div>
      <div className="flex items-baseline gap-1 mt-auto">
        <span className="text-[22px] font-bold text-neutral-800 tabular-nums leading-none">{value}</span>
        {unit ? <span className="text-[11px] text-neutral-500">{unit}</span> : null}
      </div>
      {sub ? <p className="text-[10px] text-neutral-500 leading-snug">{sub}</p> : null}
    </div>
  );
}

function FunnelNode({
  label,
  value,
  tip,
  tone = 'default',
}: {
  label: string;
  value: string;
  tip?: string;
  tone?: 'default' | 'ai' | 'human' | 'warn';
}) {
  const toneClass =
    tone === 'ai'
      ? 'border-sky-200 bg-sky-50/60'
      : tone === 'human'
        ? 'border-emerald-200 bg-emerald-50/60'
        : tone === 'warn'
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-neutral-200 bg-white';
  return (
    <div
      className={cn(
        'w-[200px] p-3 rounded-[13px] border shadow-[0_2px_10px_rgba(31,35,41,0.02)] flex flex-col items-center justify-center text-center',
        toneClass,
      )}
    >
      <span className="text-[10px] text-neutral-500 font-bold mb-1 flex items-center gap-1">
        {label}
        {tip ? <Tip text={tip} /> : null}
      </span>
      <span className="text-xl font-extrabold text-neutral-800 tabular-nums">{value}</span>
    </div>
  );
}

function FunnelArrow({ caption }: { caption?: string }) {
  return (
    <div className="flex flex-col items-center py-1 text-neutral-500">
      <div className="w-px h-4 bg-neutral-200" />
      {caption ? <span className="text-[9px] font-medium my-0.5">{caption}</span> : null}
      <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-neutral-200" />
    </div>
  );
}

export const DashboardPage: React.FC = () => {
  const { hiredAgents, showToast } = useApp();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const metricsBusy = useMockLatency(
    `dashboard-${selectedEmployeeId}`,
    'pageList',
  );
  const [trendRange, setTrendRange] = useState<'today' | 'week'>('week');
  const [trendView, setTrendView] = useState<'table' | 'chart'>('table');

  const selectedLabel = useMemo(() => {
    if (selectedEmployeeId === 'all') return '全部数字员工';
    const agent = hiredAgents.find((a) => a.id === selectedEmployeeId);
    return agent ? agent.name : '选择数字员工';
  }, [selectedEmployeeId, hiredAgents]);

  const scale = selectedEmployeeId === 'all' ? 1 : 0.28;
  const n = (v: number) => Math.max(1, Math.round(v * scale));
  const pct = (v: number) => `${(v * (scale >= 1 ? 1 : 0.98)).toFixed(1)}%`;

  const inbound = n(OPS.inbound);
  const ai = n(OPS.aiReception);
  const transfer = n(OPS.transfer);
  const human = n(OPS.humanReception);
  const fail = n(OPS.transferFailed);

  return (
    <div className={cn(PAGE, 'overflow-y-auto custom-scrollbar')}>
      <SegmentedTabs
        items={[
          { tab: 'dashboard', label: '员工业绩' },
          { tab: 'sessions', label: '接待记录' },
        ]}
      />

      <PageHeader
        icon={<BarChart3 />}
        title="员工业绩"
        description="运营核心指标与人机协同全景"
        actionsPlacement="below"
      >
        <Select value={selectedEmployeeId} onValueChange={(v) => v && setSelectedEmployeeId(v)}>
          <SelectTrigger className="min-w-[160px] bg-white border-neutral-200 h-8 text-xs">
            <SelectValue placeholder="选择数字员工">{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">全部数字员工</SelectItem>
            {hiredAgents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      <ContentBusy busy={metricsBusy} size="panel" minHeight={420}>
      {/* 运营核心指标 + 分流链路 */}
      <section className="mb-5">
        <SectionTitle title="运营核心指标" english="Core Operating Metrics" />
        <div className={cn(PANEL, 'p-4 bg-neutral-100/30')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <Wifi size={13} className="text-neutral-500" />
              人机协同分流链路图
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">实时全景监控</span>
          </div>

          <div className="flex flex-col items-center py-2">
            <FunnelNode
              label="进线量"
              value={inbound.toLocaleString()}
              tip="统计时间内，所有入口接入的初始会话请求总量。"
            />
            <FunnelArrow caption="智能路由保障中" />
            <FunnelNode
              label="数字员工接待量"
              value={ai.toLocaleString()}
              tip="由 AI 数字员工承接并开始有效回复且未转人工的会话数。计算逻辑：总接待量-转人工量"
              tone="ai"
            />
            <div className="flex items-start gap-8 mt-1">
              <div className="flex flex-col items-center">
                <FunnelArrow caption="智能自主闭环" />
                <div className="text-[10px] text-sky-700 font-semibold bg-sky-50 border border-sky-100 px-2 py-1 rounded-md">
                  闭环完成
                </div>
              </div>
              <div className="flex flex-col items-center">
                <FunnelArrow caption="客服转接线路" />
                <FunnelNode
                  label="转人工量"
                  value={transfer.toLocaleString()}
                  tip="会话过程中触发转人工逻辑的总人次（含成功与失败）。"
                  tone="warn"
                />
                <div className="flex gap-3 mt-2">
                  <FunnelNode
                    label="人工接待量"
                    value={human.toLocaleString()}
                    tip="人工坐席实际成功接起并产生交互的会话量。"
                    tone="human"
                  />
                  <FunnelNode
                    label="转人工失败量"
                    value={fail.toLocaleString()}
                    tip="因资源饱和、下班或异常导致转接中断。计算逻辑：转人工量-人工接待量"
                    tone="warn"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-neutral-200">
            <MetricTile
              label="转人工率"
              value={pct(OPS.transferRate)}
              tip="转人工量/进线量"
            />
            <MetricTile
              label="人工接起率"
              value={pct(OPS.humanPickupRate)}
              tip="人工接待量/转人工量"
            />
            <MetricTile
              label="数字员工饱和度"
              value={pct(OPS.aiSaturation)}
              tip="实时并行会话数/数字员工并发上限"
            />
            <MetricTile
              label="人工饱和度"
              value={pct(OPS.humanSaturation)}
              tip="实时并行会话数/人工接待上限"
            />
          </div>
        </div>
      </section>

      {/* TOKEN + 核心趋势 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
        <section className={cn(PANEL, 'p-4 xl:col-span-1')}>
          <SectionTitle
            title="TOKEN 消耗趋势"
            english="Token Consumption Trend"
            right={
              <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded font-mono">
                AVG: <span className="text-neutral-800 ml-0.5">612</span>
              </span>
            }
          />
          <div className="h-28 w-full border border-neutral-200/60 rounded-[13px] overflow-hidden px-1 pt-2">
            <SparklineArea data={TOKEN_TREND.map((v) => Math.round(v * scale))} height={96} />
          </div>
          <p className="text-[10px] text-neutral-500 mt-2">近 14 日 TOKEN 消耗（演示数据）</p>
        </section>

        <section className={cn(PANEL, 'p-4 xl:col-span-2')}>
          <SectionTitle
            title="核心指标趋势"
            english="Core Metrics History"
            right={
              <div className="flex items-center gap-2">
                <CompactToggle
                  value={trendRange}
                  onChange={setTrendRange}
                  options={[
                    { id: 'today', label: '当日趋势' },
                    { id: 'week', label: '七日趋势' },
                  ]}
                />
                <CompactToggle
                  value={trendView}
                  onChange={setTrendView}
                  options={[
                    { id: 'table', label: '表格视图' },
                    { id: 'chart', label: '图表趋势' },
                  ]}
                />
              </div>
            }
          />

          {trendView === 'chart' ? (
            <div className="h-40 border border-neutral-200/60 rounded-[13px] px-2 pt-3">
              <SparklineArea
                data={CORE_TREND_ROWS.map((r) => Math.round(r.inbound * scale))}
                height={140}
              />
            </div>
          ) : (
            <div className="overflow-x-auto border border-neutral-200 rounded-lg">
              <table className="w-full text-left text-[11px] text-neutral-800">
                <thead>
                  <tr className="bg-neutral-100/50 text-[10px] text-neutral-500 font-medium">
                    <th className="px-2.5 py-2">日期</th>
                    <th className="px-2.5 py-2">进线量</th>
                    <th className="px-2.5 py-2">数字员工接待</th>
                    <th className="px-2.5 py-2">转人工</th>
                    <th className="px-2.5 py-2">人工接待</th>
                    <th className="px-2.5 py-2">转人工失败</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {(trendRange === 'today' ? CORE_TREND_ROWS.slice(-1) : CORE_TREND_ROWS).map((row) => (
                    <tr key={row.date} className="hover:bg-neutral-100/30">
                      <td className="px-2.5 py-1.5 font-mono text-neutral-500">{row.date}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{n(row.inbound).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{n(row.ai).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{n(row.transfer).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{n(row.human).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 tabular-nums">{n(row.fail).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* 数字员工运营指标 */}
      <section className="mb-5">
        <SectionTitle title="数字员工运营指标" english="Digital Employee Metrics" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <div className="col-span-2">
            <MetricTile
              label="实时接待量"
              value={n(OPS.realtimeAi)}
              unit="人"
              tip="系统当前窗口内正在进行中的活动会话总数"
              sub={`饱和度 ${pct(OPS.aiSaturation)} · 昨日 ${n(OPS.realtimeAi + 12)}`}
              highlight
              icon={<Cpu size={12} />}
            />
          </div>
          <MetricTile
            label="平均处理时长"
            value={OPS.avgHandleSec}
            unit="秒"
            tip="单个会话从开始到挂断的平均持续时间"
            icon={<Clock size={12} />}
          />
          <MetricTile
            label="响应速度"
            value={OPS.responseMs}
            unit="ms"
            tip="系统从接收消息到发出反馈的平均时延（首 token）"
            icon={<Zap size={12} />}
          />
          <MetricTile
            label="30秒响应率"
            value={pct(OPS.respond30sRate)}
            tip="首句回复或关键步骤响应时间在 30 秒内的比例"
          />
          <MetricTile
            label="解决率"
            value={pct(OPS.resolve72h)}
            tip="72H 一解率：1-重复进线 PIN 量/总 PIN 量"
            icon={<CheckCircle2 size={12} />}
          />
          <MetricTile
            label="满意度"
            value={pct(OPS.satisfaction)}
            tip="(满意+非常满意)/总评价数"
            sub={`好评率 ${pct(OPS.goodRate)}`}
            icon={<Smile size={12} />}
          />
        </div>

        <div className={cn(PANEL, 'p-3 mt-3')}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-semibold text-neutral-800">处理业务场景</h3>
            <span className="text-[10px] text-neutral-500">处理业务量</span>
          </div>
          <div className="space-y-1.5">
            {AI_BIZ.map((item) => {
              const count = n(item.count);
              const max = n(AI_BIZ[0].count);
              return (
                <div key={item.name} className="flex items-center gap-2 text-[11px]">
                  <span className="w-28 shrink-0 text-neutral-500 truncate">{item.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-neutral-800/80 rounded-full"
                      style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right tabular-nums font-medium">{count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 知识库 + 人工 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-5">
        <section>
          <SectionTitle title="知识库及解析指标" english="Knowledge & Parsing" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { name: '召回率', short: 'Recall', value: pct(OPS.recall), tip: '检索到的相关知识数量/知识库中所有相关知识总数' },
              { name: '精准率', short: 'Precision', value: pct(OPS.precision), tip: '检索到的相关知识数量/检索到的总知识数量' },
              { name: 'F1分数', short: 'F1 Score', value: pct(OPS.f1), tip: 'F1 分数' },
              { name: '解析率', short: 'Resolution', value: pct(OPS.parseRate), tip: '' },
            ].map((item) => (
              <div
                key={item.name}
                className="bg-neutral-100/40 hover:bg-neutral-100/60 border border-neutral-200 p-2.5 rounded-lg flex flex-col justify-center gap-1 text-center"
              >
                <span className="text-[10px] text-neutral-500 font-medium flex items-center justify-center gap-0.5">
                  {item.name}
                  {item.tip ? <Tip text={item.tip} /> : null}
                </span>
                <span className="text-lg font-extrabold tabular-nums text-neutral-800">{item.value}</span>
                <span className="text-[9px] font-mono text-neutral-500">{item.short}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="人工服务全景指标" english="Human Service Metrics" />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <MetricTile
                label="实时接待量"
                value={n(OPS.realtimeHuman)}
                unit="人"
                tip="当前人工坐席活动会话快照"
                sub={`饱和度 ${pct(OPS.humanSaturation)}`}
                highlight
                icon={<Users size={12} />}
              />
            </div>
            <MetricTile label="通接量" value={human.toLocaleString()} tip="人工坐席成功应答总数" icon={<Headphones size={12} />} />
            <MetricTile label="转挂量" value={fail.toLocaleString()} tip="转人工失败量" />
          </div>
        </section>
      </div>

      {/* 转人工分流详情 */}
      <section className="mb-2">
        <SectionTitle
          title="转人工分流详情"
          english="Transfer Path Metrics"
          right={<span className="text-[10px] text-neutral-500 font-mono">链路转化指标</span>}
        />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch mb-3">
          <div className={cn(PANEL, 'md:col-span-4 p-3 flex flex-col items-center justify-center min-h-[110px]')}>
            <span className="text-[10px] text-neutral-500 font-bold mb-1">转人工率</span>
            <span className="text-2xl font-extrabold tabular-nums text-emerald-700">{pct(OPS.transferRate)}</span>
            <span className="text-[10px] text-neutral-500 mt-1">同比 +1.2%</span>
          </div>
          <div className={cn(PANEL, 'md:col-span-4 p-3 flex flex-col items-center justify-center min-h-[110px]')}>
            <span className="text-[10px] text-neutral-500 font-bold mb-1">人工接起率</span>
            <span className="text-2xl font-extrabold tabular-nums text-neutral-800">{pct(OPS.humanPickupRate)}</span>
            <span className="text-[10px] text-neutral-500 mt-1">同比 -0.4%</span>
          </div>
          <div className={cn(PANEL, 'md:col-span-4 p-3 flex flex-col items-center justify-center min-h-[110px]')}>
            <span className="text-[10px] text-neutral-500 font-bold mb-1">转人工量</span>
            <span className="text-2xl font-extrabold tabular-nums text-neutral-800">{transfer.toLocaleString()}</span>
            <span className="text-[10px] text-neutral-500 mt-1">
              成功 {human.toLocaleString()} · 失败 {fail.toLocaleString()}
            </span>
          </div>
        </div>

        <div className={cn(PANEL, 'p-3')}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-semibold text-neutral-800">转人工业务场景</h3>
            <button
              type="button"
              className="text-[10px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
              onClick={() => showToast('已按演示数据刷新转人工场景分布。')}
            >
              刷新
            </button>
          </div>
          <div className="space-y-1.5">
            {TRANSFER_BIZ.map((item) => {
              const count = n(item.count);
              const max = n(TRANSFER_BIZ[0].count);
              return (
                <div key={item.name} className="flex items-center gap-2 text-[11px]">
                  <span className="w-28 shrink-0 text-neutral-500 truncate">{item.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-500/80 rounded-full"
                      style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right tabular-nums font-medium">{count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      </ContentBusy>
    </div>
  );
};
