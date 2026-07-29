/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 质检观测配置：系统指标 → 业务指标 → 风险策略
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  QC_CAPABILITY_LABEL,
  QC_STAT_METHOD_LABEL,
  QC_SYSTEM_METRICS,
  observeWindowLabel,
  type QcBizMetricRow,
  type QcObserveConfig,
  type QcObserveWindow,
  type QcRiskRule,
  type QcSystemMetricId,
} from '@/lib/qcObserveMock';
import { BTN_INK, BTN_OUTLINE, BTN_SOFT, FIELD, FIELD_CTRL, LABEL, MODAL_OVERLAY } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { Check, HelpCircle, Plus, X } from '@/lib/icons';

const STEPS = [
  { id: 1, label: '系统指标配置' },
  { id: 2, label: '业务指标配置' },
  { id: 3, label: '风险策略配置' },
] as const;

const WINDOW_OPTIONS: { id: QcObserveWindow; label: string }[] = [
  { id: '1h', label: '1小时' },
  { id: '24h', label: '24小时' },
  { id: '7d', label: '7天' },
];

export interface QcObserveConfigModalProps {
  open: boolean;
  initial: QcObserveConfig;
  onClose: () => void;
  onConfirm: (config: QcObserveConfig) => void;
}

export const QcObserveConfigModal: React.FC<QcObserveConfigModalProps> = ({
  open,
  initial,
  onClose,
  onConfirm,
}) => {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<QcObserveConfig>(initial);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraft(initial);
  }, [open, initial]);

  if (!open) return null;

  const allSelected = QC_SYSTEM_METRICS.every((m) =>
    draft.systemMetricIds.includes(m.id),
  );

  const toggleAll = (checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      systemMetricIds: checked ? QC_SYSTEM_METRICS.map((m) => m.id) : [],
    }));
  };

  const toggleMetric = (id: QcSystemMetricId) => {
    setDraft((prev) => {
      const has = prev.systemMetricIds.includes(id);
      return {
        ...prev,
        systemMetricIds: has
          ? prev.systemMetricIds.filter((x) => x !== id)
          : [...prev.systemMetricIds, id],
      };
    });
  };

  const patchBiz = (id: string, patch: Partial<QcBizMetricRow>) => {
    setDraft((prev) => ({
      ...prev,
      bizMetrics: prev.bizMetrics.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    }));
  };

  const addBiz = () => {
    setDraft((prev) => ({
      ...prev,
      bizMetrics: [
        ...prev.bizMetrics,
        {
          id: `biz-${Date.now()}`,
          judge: '',
          metric: '',
          sampleRatio: '1',
          sampleCap: '1',
          statMethod: 'pass_rate',
        },
      ],
    }));
  };

  const removeBiz = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      bizMetrics: prev.bizMetrics.filter((r) => r.id !== id),
    }));
  };

  const patchRisk = (id: string, patch: Partial<QcRiskRule>) => {
    setDraft((prev) => ({
      ...prev,
      riskRules: prev.riskRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const toggleCapability = (ruleId: string, cap: 'prompt' | 'knowledge') => {
    setDraft((prev) => ({
      ...prev,
      riskRules: prev.riskRules.map((r) => {
        if (r.id !== ruleId) return r;
        const has = r.capabilities.includes(cap);
        return {
          ...r,
          capabilities: has
            ? r.capabilities.filter((c) => c !== cap)
            : [...r.capabilities, cap],
        };
      }),
    }));
  };

  const canNext =
    step === 1
      ? draft.systemMetricIds.length > 0
      : step === 2
        ? draft.bizMetrics.length > 0
        : draft.prelabelAgent.trim().length > 0;

  return createPortal(
    <div className={cn(MODAL_OVERLAY, 'z-[130]')} onClick={onClose}>
      <div
        className="bg-white text-neutral-900 rounded-[13px] w-full max-w-3xl shadow-lg ring-1 ring-black/10 p-5 animate-in fade-in zoom-in-95 duration-200 max-h-[min(860px,92vh)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="观测配置"
      >
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
              观测配置
            </h2>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600">
              <span className="text-neutral-500">观测窗口：</span>
              <select
                value={draft.window}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    window: e.target.value as QcObserveWindow,
                  }))
                }
                className={cn(FIELD, FIELD_CTRL, 'w-auto min-w-[96px] py-0 text-[11px]')}
              >
                {WINDOW_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 cursor-pointer"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 mb-4 shrink-0">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                        done || active
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-100 text-neutral-500',
                      )}
                    >
                      {done ? <Check size={12} /> : s.id}
                    </span>
                    <span
                      className={cn(
                        'text-[12px] truncate',
                        active || done
                          ? 'font-semibold text-neutral-800'
                          : 'text-neutral-500',
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px bg-neutral-200 mx-3 min-w-[24px]" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
          {step === 1 && (
            <div className="space-y-3">
              <label className="inline-flex items-center gap-2 text-[12px] text-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="rounded border-neutral-300"
                />
                全选
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QC_SYSTEM_METRICS.map((m) => {
                  const selected = draft.systemMetricIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMetric(m.id)}
                      className={cn(
                        'relative text-left rounded-[13px] border px-3.5 py-3 transition cursor-pointer',
                        selected
                          ? 'border-neutral-800 bg-neutral-50/80'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50/60',
                      )}
                    >
                      {selected && (
                        <span className="absolute top-2.5 left-2.5 h-4 w-4 rounded bg-neutral-800 text-white flex items-center justify-center">
                          <Check size={10} />
                        </span>
                      )}
                      <p
                        className={cn(
                          'text-[13px] font-semibold text-neutral-800',
                          selected && 'pl-5',
                        )}
                      >
                        {m.name}
                      </p>
                      <p className={cn('text-[11px] text-neutral-500 mt-1 leading-relaxed', selected && 'pl-5')}>
                        {m.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full text-[11px] min-w-[640px]">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      <th className="text-left font-semibold px-3 py-2">裁判</th>
                      <th className="text-left font-semibold px-3 py-2">指标</th>
                      <th className="text-left font-semibold px-3 py-2">
                        <span className="inline-flex items-center gap-1">
                          样本比例
                          <HelpCircle size={12} className="text-neutral-400" />
                        </span>
                      </th>
                      <th className="text-left font-semibold px-3 py-2">样本上限</th>
                      <th className="text-left font-semibold px-3 py-2">统计方式</th>
                      <th className="text-left font-semibold px-3 py-2 w-16">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.bizMetrics.map((row) => (
                      <tr key={row.id} className="border-t border-neutral-100">
                        <td className="px-2 py-2">
                          <input
                            value={row.judge}
                            onChange={(e) => patchBiz(row.id, { judge: e.target.value })}
                            className={cn(FIELD, FIELD_CTRL, 'w-full')}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row.metric}
                            onChange={(e) => patchBiz(row.id, { metric: e.target.value })}
                            className={cn(FIELD, FIELD_CTRL, 'w-full')}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="relative">
                            <input
                              value={row.sampleRatio}
                              onChange={(e) =>
                                patchBiz(row.id, { sampleRatio: e.target.value })
                              }
                              className={cn(FIELD, FIELD_CTRL, 'w-full pr-6')}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400">
                              %
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            value={row.sampleCap}
                            onChange={(e) =>
                              patchBiz(row.id, { sampleCap: e.target.value })
                            }
                            className={cn(FIELD, FIELD_CTRL, 'w-full')}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            value={row.statMethod}
                            onChange={(e) =>
                              patchBiz(row.id, {
                                statMethod: e.target.value as QcBizMetricRow['statMethod'],
                              })
                            }
                            className={cn(FIELD, FIELD_CTRL, 'w-full')}
                          >
                            {Object.entries(QC_STAT_METHOD_LABEL).map(([id, label]) => (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeBiz(row.id)}
                            className="text-red-600 hover:underline cursor-pointer"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addBiz}
                className={cn(
                  BTN_OUTLINE,
                  'w-full h-9 border-dashed text-[12px] gap-1 justify-center',
                )}
              >
                <Plus size={14} /> 添加指标
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-neutral-200 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-800">
                    自动触发进化任务
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.autoEvolve}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, autoEvolve: !prev.autoEvolve }))
                    }
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer',
                      draft.autoEvolve ? 'bg-emerald-500' : 'bg-neutral-300',
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                        draft.autoEvolve ? 'translate-x-4' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>
                <div>
                  <label className={cn(LABEL, 'inline-flex items-center gap-1')}>
                    <span className="text-red-500">*</span> 预标注 Agent
                    <HelpCircle size={12} className="text-neutral-400" />
                  </label>
                  <select
                    value={draft.prelabelAgent}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, prelabelAgent: e.target.value }))
                    }
                    className={cn(FIELD, FIELD_CTRL, 'mt-1')}
                  >
                    <option value={draft.prelabelAgent}>{draft.prelabelAgent}</option>
                    <option value="会话质检专员 · 默认预标注">
                      会话质检专员 · 默认预标注
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-neutral-800 mb-2">风险触发</p>
                <div className="space-y-3">
                  {draft.riskRules.map((rule, idx) => (
                    <div
                      key={rule.id}
                      className="rounded-lg border border-neutral-200 p-3 space-y-2.5"
                    >
                      <p className="text-[11px] font-bold text-neutral-500 tabular-nums">
                        {String(idx + 1).padStart(2, '0')} · {rule.title || '未命名'}
                      </p>
                      <div>
                        <p className={LABEL}>触发条件</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <select
                            value={rule.triggerType}
                            onChange={(e) =>
                              patchRisk(rule.id, {
                                triggerType: e.target.value as QcRiskRule['triggerType'],
                              })
                            }
                            className={cn(FIELD, FIELD_CTRL, 'w-[120px]')}
                          >
                            <option value="redline">红线命中</option>
                            <option value="deviation">指标偏离</option>
                          </select>
                          {rule.triggerType === 'redline' ? (
                            <>
                              <select
                                value={rule.operator}
                                onChange={(e) =>
                                  patchRisk(rule.id, {
                                    operator: e.target.value as QcRiskRule['operator'],
                                  })
                                }
                                className={cn(FIELD, FIELD_CTRL, 'w-[110px]')}
                              >
                                <option value="lte">小于等于</option>
                                <option value="gte">大于等于</option>
                                <option value="eq">等于</option>
                              </select>
                              <input
                                value={rule.threshold}
                                onChange={(e) =>
                                  patchRisk(rule.id, { threshold: e.target.value })
                                }
                                className={cn(FIELD, FIELD_CTRL, 'w-20')}
                              />
                            </>
                          ) : (
                            <>
                              <input
                                value={rule.threshold}
                                onChange={(e) =>
                                  patchRisk(rule.id, { threshold: e.target.value })
                                }
                                className={cn(FIELD, FIELD_CTRL, 'w-20')}
                              />
                              <input
                                value={rule.deviationLabel ?? '偏离阈值'}
                                onChange={(e) =>
                                  patchRisk(rule.id, { deviationLabel: e.target.value })
                                }
                                className={cn(FIELD, FIELD_CTRL, 'w-[120px]')}
                                placeholder="偏离阈值"
                              />
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className={LABEL}>进化能力</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {(['prompt', 'knowledge'] as const).map((cap) => {
                            const on = rule.capabilities.includes(cap);
                            return (
                              <button
                                key={cap}
                                type="button"
                                onClick={() => toggleCapability(rule.id, cap)}
                                className={cn(
                                  'h-7 px-2.5 rounded-md text-[11px] font-semibold border cursor-pointer transition',
                                  on
                                    ? 'bg-neutral-800 text-white border-neutral-800'
                                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50',
                                )}
                              >
                                {QC_CAPABILITY_LABEL[cap]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mt-5 pt-3 border-t border-neutral-100 shrink-0">
          {step === 1 ? (
            <button type="button" className={cn(BTN_SOFT, 'h-8 px-3')} onClick={onClose}>
              取消
            </button>
          ) : (
            <>
              {step === 3 && (
                <button type="button" className={cn(BTN_SOFT, 'h-8 px-3')} onClick={onClose}>
                  取消
                </button>
              )}
              <button
                type="button"
                className={cn(BTN_OUTLINE, 'h-8 px-3')}
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                上一步
              </button>
            </>
          )}
          {step < 3 ? (
            <button
              type="button"
              className={cn(BTN_INK, 'h-8 px-3')}
              disabled={!canNext}
              onClick={() => setStep((s) => Math.min(3, s + 1))}
            >
              下一步
            </button>
          ) : (
            <button
              type="button"
              className={cn(BTN_INK, 'h-8 px-3')}
              disabled={!canNext}
              onClick={() => onConfirm(draft)}
            >
              确定
            </button>
          )}
        </div>

        <p className="sr-only">
          当前观测窗口 {observeWindowLabel(draft.window)}
        </p>
      </div>
    </div>,
    document.body,
  );
};
