/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 质检入职培训 — 右侧能力测试：
 * 顶部汇总 · 主区自然语言对话 / 试跑明细 · 输入框上方浮现样例模块
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { HiredAgent, QcProfile } from '../../types';
import { createDefaultQcProfile, normalizeQcProfile } from '@/lib/jobFamily';
import {
  areAllQcStandardItemsComplete,
  countStandardItems,
  listQcStandardItems,
  QC_LLM_DIMENSIONS,
  QC_LLM_MODELS,
} from '@/lib/qcStandards';
import {
  auditSessionAgainstStandard,
  auditSessionBatch,
  dialogueTextToSession,
  listQcCapabilitySamples,
  resolveQcSampleMeta,
  type QcBatchAuditResult,
  type QcSessionAuditResult,
} from '@/lib/qcCapabilityMock';
import { OnboardingQcSingleRoundResult } from './OnboardingQcSingleRoundResult';
import { LIFECYCLE_TERMS, QC_TERMS } from '@/lib/platformTerminology';
import { SegmentedTabBar } from '../common/SegmentedTabs';
import { BTN_INK, BTN_SOFT, PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { pickMockLatencyMs } from '@/lib/mockLatency';
import { ChevronDown, Loader2, Plus, RotateCcw, Send, Sparkles } from '@/lib/icons';
const SAMPLE_PASTE = `客服：您放心，今天一定给您处理完，绝对没问题。
客户：那我等您消息。
客服：好的，我保证办妥。`;

const GREETING =
  '你好，我是质检数字员工。把一段客服会话贴到下方发送，或在上方勾选通用测试样例后点「按标准质检」。';

type ChatMsg =
  | { id: string; role: 'assistant'; text: string }
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'system'; text: string };

export interface OnboardingQcTestPanelProps {
  agent: HiredAgent;
  updateHiredAgent: (id: string, updates: Partial<HiredAgent>) => void;
  showToast: (message: string) => void;
}

export const OnboardingQcTestPanel: React.FC<OnboardingQcTestPanelProps> = ({
  agent,
  updateHiredAgent,
  showToast,
}) => {
  const profile = useMemo(
    () => normalizeQcProfile(agent.qcProfile ?? createDefaultQcProfile()),
    [agent.qcProfile],
  );
  const [tab, setTab] = useState<'chat' | 'summary'>('chat');
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => [
    { id: 'hi', role: 'assistant', text: GREETING },
  ]);
  const [input, setInput] = useState(SAMPLE_PASTE);
  const [spinning, setSpinning] = useState(false);
  const [latest, setLatest] = useState<QcSessionAuditResult | null>(null);
  const [batchSummary, setBatchSummary] = useState<QcBatchAuditResult | null>(null);
  const [samplesOpen, setSamplesOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testPool = useMemo(() => listQcCapabilitySamples(), []);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(() =>
    listQcCapabilitySamples().map((s) => s.id),
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  const standardsReady = areAllQcStandardItemsComplete(profile.standard);
  const counts = countStandardItems(profile.standard);
  const standardRows = listQcStandardItems(profile.standard);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, spinning, latest]);

  const resetChat = () => {
    setMsgs([{ id: `hi-${Date.now()}`, role: 'assistant', text: GREETING }]);
    setLatest(null);
    setBatchSummary(null);
    setInput(SAMPLE_PASTE);
    showToast('已重置会话');
  };

  const commitProfile = (patch: Partial<QcProfile>) => {
    updateHiredAgent(agent.id, {
      qcProfile: { ...profile, ...patch },
    });
  };

  const applyResult = (result: QcSessionAuditResult, userText: string) => {
    setLatest(result);
    setMsgs((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: userText },
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `本轮质检完成：综合评分 ${result.score} 分，${result.passed ? '已及格' : '未及格'}。下方可查看继续保持 / 有待改进，并打开质检报告。`,
      },
    ]);
  };

  const runTest = () => {
    const text = input.trim();
    if (!text || spinning) return;
    if (!standardsReady) {
      showToast('请先在左侧为每条质检标准配齐字段');
      return;
    }

    setInput('');
    setSpinning(true);
    window.setTimeout(() => {
      const session = dialogueTextToSession(text, { agentId: agent.id });
      const result = auditSessionAgainstStandard(session, profile.standard, profile.passScore);
      applyResult(result, text);
      setBatchSummary({
        results: [result],
        avgScore: result.score,
        hitSessionCount: result.hits.length > 0 ? 1 : 0,
        totalSessions: 1,
        passRate: result.passed ? 100 : 0,
      });
      commitProfile({
        trainingTestPassed: true,
        lastTestScore: result.score,
        standardConfigured: true,
      });
      setSpinning(false);
    }, pickMockLatencyMs('aiReply'));
  };

  const runBatchSamples = () => {
    if (!standardsReady) {
      showToast('请先在左侧为每条质检标准配齐字段');
      return;
    }
    const picked = testPool.filter((s) => selectedSessionIds.includes(s.id));
    if (picked.length === 0) {
      showToast('请至少勾选一条样例会话');
      return;
    }
    setSpinning(true);
    window.setTimeout(() => {
      const batch = auditSessionBatch(picked, profile.standard, profile.passScore);
      setBatchSummary(batch);
      const first = batch.results[0] ?? null;
      setLatest(first);
      setMsgs((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: 'system',
          text: `已按标准质检 ${batch.totalSessions} 条会话`,
        },
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text:
            batch.totalSessions === 1 && first
              ? `本轮质检完成：综合评分 ${first.score} 分。下方可查看继续保持 / 有待改进，并打开质检报告。`
              : `批量试跑完成：均分 ${batch.avgScore}，命中会话 ${batch.hitSessionCount}/${batch.totalSessions}，及格率 ${batch.passRate}%。下方已更新试跑结果。`,
        },
      ]);
      commitProfile({
        trainingTestPassed: true,
        lastTestScore: batch.avgScore,
        standardConfigured: true,
      });
      setSpinning(false);
      showToast(`会话质检完成：均分 ${batch.avgScore}，命中 ${batch.hitSessionCount} 条`);
    }, pickMockLatencyMs('aiReply'));
  };

  const handleLocalUpload = (file: File) => {
    const lower = file.name.toLowerCase();
    const okExt = ['.txt', '.md', '.csv', '.json', '.log'].some((ext) => lower.endsWith(ext));
    if (!okExt && file.type && !file.type.startsWith('text/') && file.type !== 'application/json') {
      showToast('请上传文本会话文件（.txt / .md / .csv / .json）');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '').trim();
      if (!text) {
        showToast('文件内容为空');
        return;
      }
      setInput(text);
      showToast(`已从「${file.name}」载入会话`);
    };
    reader.onerror = () => showToast('读取文件失败');
    reader.readAsText(file, 'UTF-8');
  };

  const toggleSample = (id: string, checked: boolean) => {
    setSelectedSessionIds((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id),
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper overflow-hidden text-neutral-800">
      <div className="px-4 py-2.5 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0 gap-2 min-h-[54px]">
        <SegmentedTabBar
          ariaLabel="质检能力测试面板"
          value={tab}
          onChange={(id) => setTab(id as 'chat' | 'summary')}
          items={[
            { id: 'chat', label: LIFECYCLE_TERMS.onboardTest },
            { id: 'summary', label: '配置摘要' },
          ]}
        />
        {tab === 'chat' ? (
          <button
            type="button"
            onClick={resetChat}
            className={cn(BTN_SOFT, 'h-7 text-[11px] gap-1')}
            title="重置会话"
          >
            <RotateCcw size={12} />
            重置会话
          </button>
        ) : null}
      </div>

      {tab === 'summary' ? (
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div className={cn(PANEL, 'p-4 space-y-2')}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-neutral-800">{QC_TERMS.standard}</h3>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  standardsReady ? 'text-emerald-700' : 'text-amber-700',
                )}
              >
                {counts.completeItems}/{counts.items} 已配齐
              </span>
            </div>
            {standardRows.length === 0 ? (
              <p className="text-[11px] text-neutral-500">左侧尚未配置二级质检项</p>
            ) : (
              <div className="space-y-2">
                {standardRows.map(({ item, categoryTitle }) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-neutral-200 bg-neutral-100/20 px-2.5 py-2 text-[11px]"
                  >
                    <p className="font-semibold text-neutral-800">
                      {categoryTitle} · {item.name || '未命名'}
                    </p>
                    <p className="text-neutral-500 mt-0.5 truncate">
                      {item.operatorType}
                      {' · '}
                      {QC_LLM_MODELS.find((m) => m.value === item.selectedModel)?.label ||
                        item.selectedModel ||
                        '未选模型'}
                      {' · '}
                      {QC_LLM_DIMENSIONS.find((d) => d.value === item.llmDimension)?.label ||
                        item.llmDimension}
                      {' · 分 '}
                      {item.score || '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-neutral-100">
          {/* 主区：对话 + 试跑结果 */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4"
          >
            <div className="max-w-3xl mx-auto space-y-4">
              {msgs.map((m) => {
                if (m.role === 'system') {
                  return (
                    <p key={m.id} className="text-center text-[11px] text-neutral-500">
                      {m.text}
                    </p>
                  );
                }
                if (m.role === 'user') {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-[13px] rounded-br-md bg-neutral-800 text-white px-3.5 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-neutral-800 text-white flex items-center justify-center shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <div
                      className={cn(
                        PANEL,
                        'max-w-[85%] px-3.5 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap shadow-none',
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}

              {spinning ? (
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 pl-10">
                  <Loader2 size={13} />
                  正在按标准试跑…
                </div>
              ) : null}

              {batchSummary ? (
                <div className="space-y-3">
                  {batchSummary.totalSessions === 1 && latest ? (
                    <OnboardingQcSingleRoundResult
                      agent={agent}
                      result={latest}
                      onRetry={() => {
                        setTab('chat');
                        showToast('可继续粘贴会话或勾选样例再测');
                      }}
                    />
                  ) : (
                    <>
                      <div className={cn(PANEL, 'p-3 space-y-2 shadow-none')}>
                        <h3 className="text-[11px] font-bold text-neutral-800">试跑结果</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="rounded-lg border border-neutral-200 bg-neutral-100/20 px-3 py-2">
                            <p className="text-[10px] text-neutral-500">会话数</p>
                            <p className="text-sm font-bold text-neutral-800">
                              {batchSummary.totalSessions}
                            </p>
                          </div>
                          <div className="rounded-lg border border-neutral-200 bg-neutral-100/20 px-3 py-2">
                            <p className="text-[10px] text-neutral-500">均分</p>
                            <p className="text-sm font-bold text-neutral-800">
                              {batchSummary.avgScore}
                            </p>
                          </div>
                          <div className="rounded-lg border border-neutral-200 bg-neutral-100/20 px-3 py-2">
                            <p className="text-[10px] text-neutral-500">命中会话</p>
                            <p className="text-sm font-bold text-neutral-800">
                              {batchSummary.hitSessionCount}
                            </p>
                          </div>
                          <div className="rounded-lg border border-neutral-200 bg-neutral-100/20 px-3 py-2">
                            <p className="text-[10px] text-neutral-500">及格率</p>
                            <p className="text-sm font-bold text-neutral-800">
                              {batchSummary.passRate}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {latest ? (
                        <div className={cn(PANEL, 'p-3 space-y-2 shadow-none')}>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[11px] font-bold text-neutral-800">逐项明细</h3>
                            <span
                              className={cn(
                                'text-[10px] font-semibold',
                                latest.passed ? 'text-emerald-700' : 'text-amber-700',
                              )}
                            >
                              {latest.score} 分 · {latest.passed ? '及格' : '未及格'}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {latest.itemResults.map((ir) => (
                              <div
                                key={ir.itemId}
                                className={cn(
                                  'rounded-md border px-2.5 py-2 space-y-1',
                                  ir.hit
                                    ? 'border-amber-200 bg-amber-50/40'
                                    : 'border-neutral-200 bg-white',
                                )}
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <p className="text-[11px] font-semibold text-neutral-800 leading-snug">
                                    {ir.categoryTitle} · {ir.itemName}
                                  </p>
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold shrink-0',
                                      ir.hit ? 'text-amber-800' : 'text-neutral-500',
                                    )}
                                  >
                                    {ir.hit ? `命中 ${ir.score}` : '未命中'}
                                  </span>
                                </div>
                                {ir.hit && ir.evidence ? (
                                  <p className="text-[10px] text-amber-900 leading-relaxed">
                                    依据：{ir.evidence}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          {/* 底部：样例浮层 + 输入 */}
          <div className="shrink-0 px-4 pb-3 pt-1">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* 输入框上方：样例会话小模块 */}
              <div
                className={cn(
                  PANEL,
                  'shadow-sm overflow-hidden border-neutral-200/80 bg-white/95 backdrop-blur-sm',
                )}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-neutral-200/70">
                  <button
                    type="button"
                    onClick={() => setSamplesOpen((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-800 cursor-pointer"
                  >
                    样例会话
                    <ChevronDown
                      size={12}
                      className={cn(
                        'text-neutral-500 transition-transform',
                        !samplesOpen && '-rotate-90',
                      )}
                    />
                    <span className="font-normal text-neutral-500">
                      已选 {selectedSessionIds.length}/{testPool.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={spinning || !standardsReady || selectedSessionIds.length === 0}
                    onClick={runBatchSamples}
                    className={cn(
                      BTN_INK,
                      'h-7 px-2.5 text-[11px]',
                      (spinning || !standardsReady || selectedSessionIds.length === 0) &&
                        'opacity-50',
                    )}
                  >
                    {spinning ? '质检中…' : '按标准质检'}
                  </button>
                </div>
                {samplesOpen ? (
                  <div className="px-2 py-2 flex gap-1.5 overflow-x-auto custom-scrollbar">
                    {testPool.map((s) => {
                      const checked = selectedSessionIds.includes(s.id);
                      const meta = resolveQcSampleMeta(s);
                      const title = meta?.sceneTitle
                        ?? s.scenario.replace(/^【样例】/, '').trim()
                        ?? s.id;
                      const subtitle = meta?.testFocus ?? '测标准命中与评分是否符合预期';
                      return (
                        <label
                          key={s.id}
                          className={cn(
                            'shrink-0 w-[188px] rounded-md border px-2 py-1.5 text-[11px] transition cursor-pointer',
                            checked
                              ? 'border-neutral-900/30 bg-neutral-100/40'
                              : 'border-neutral-200 bg-white hover:bg-neutral-100/20',
                          )}
                        >
                          <span className="flex items-start gap-1.5">
                            <input
                              type="checkbox"
                              className="accent-neutral-900 mt-0.5 shrink-0 cursor-pointer"
                              checked={checked}
                              onChange={(e) => toggleSample(s.id, e.target.checked)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1">
                                <span className="font-medium text-neutral-800 leading-snug line-clamp-2">
                                  {title}
                                </span>
                                <span className="shrink-0 text-[9px] px-1 py-px rounded border border-sky-200 bg-sky-50 text-sky-700">
                                  样例
                                </span>
                              </span>
                              <span className="block text-[10px] text-neutral-500 mt-1 leading-snug line-clamp-2">
                                {subtitle}
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div
                className={cn(
                  PANEL,
                  'p-3 space-y-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30',
                )}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      runTest();
                    }
                  }}
                  rows={3}
                  placeholder="粘贴客服对话，或点 + 本地上传会话文件…"
                  className="w-full resize-none bg-transparent text-[12px] outline-none leading-relaxed placeholder:text-neutral-500 min-h-[72px]"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".txt,.md,.csv,.json,.log,text/plain,application/json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) handleLocalUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={spinning}
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center cursor-pointer shrink-0 border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100 transition',
                        spinning && 'opacity-50 cursor-not-allowed',
                      )}
                      title="本地上传"
                      aria-label="本地上传"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-[10px] text-neutral-500">本地上传 · ⌘/Ctrl + Enter 发送</span>
                  </div>
                  <button
                    type="button"
                    onClick={runTest}
                    disabled={!input.trim() || spinning}
                    className={cn(
                      'h-9 w-9 rounded-full flex items-center justify-center cursor-pointer shrink-0',
                      input.trim() && !spinning
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-100 text-neutral-500',
                    )}
                    title="发送"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
