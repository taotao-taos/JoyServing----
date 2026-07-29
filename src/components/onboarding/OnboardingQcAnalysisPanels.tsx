/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 分类标签 / 多维度评分类 — 对齐产品截图的大模型分析 + 映射配置
 */

import React from 'react';
import type {
  QcAnalysisConfig,
  QcAnalysisMappingRow,
  QcStandardCategory,
} from '../../types';
import {
  createDefaultLabelAnalysisConfig,
  createDefaultMultiAnalysisConfig,
  createMappingRow,
  QC_LABEL_PROMPT_PRESETS,
  QC_LLM_DIMENSIONS,
  QC_LLM_MODELS,
  QC_MULTI_PROMPT_PRESETS,
} from '@/lib/qcStandards';
import { BTN_SOFT, FIELD, FIELD_CTRL, LABEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import {
  BrainCircuit,
  ListTree,
  Plus,
  Settings2,
  Trash2,
} from '@/lib/icons';

type Props = {
  category: QcStandardCategory;
  onChange: (next: QcStandardCategory) => void;
  onRemove: () => void;
  showToast: (message: string) => void;
};

function ensureConfig(cat: QcStandardCategory): QcAnalysisConfig {
  if (cat.analysisConfig) return cat.analysisConfig;
  return cat.indicatorType === '分类标签'
    ? createDefaultLabelAnalysisConfig()
    : createDefaultMultiAnalysisConfig();
}

export const QcLabelAnalysisPanel: React.FC<Props> = ({
  category,
  onChange,
  onRemove,
  showToast,
}) => {
  const cfg = ensureConfig(category);
  const patch = (next: Partial<QcAnalysisConfig>) =>
    onChange({ ...category, analysisConfig: { ...cfg, ...next } });

  const updateMap = (id: string, rowPatch: Partial<QcAnalysisMappingRow>) => {
    patch({
      labelMappings: cfg.labelMappings.map((r) =>
        r.id === id ? { ...r, ...rowPatch } : r,
      ),
    });
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden space-y-0">
      <div className="px-3 py-2.5 border-b border-neutral-200 flex items-center justify-between gap-2">
        <input
          value={category.title}
          onChange={(e) => onChange({ ...category, title: e.target.value })}
          className="text-sm font-bold text-neutral-800 bg-transparent outline-none flex-1 min-w-0"
          placeholder="分类标签名称"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] text-rose-600 cursor-pointer inline-flex items-center gap-1"
        >
          <Trash2 size={12} /> 移除
        </button>
      </div>

      <div className="p-3 space-y-3">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-neutral-800 inline-flex items-center gap-1.5">
              <BrainCircuit size={14} className="text-live" />
              1. 大模型分析
            </h4>
            <button
              type="button"
              className="text-[11px] font-semibold text-live cursor-pointer"
              onClick={() => showToast('外部知识库导入已预留（原型）')}
            >
              导入外部知识库
            </button>
          </div>
          <div className="rounded-lg bg-neutral-100/40 border border-neutral-200 p-2.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={LABEL}>分析维度</label>
                <select
                  value={cfg.llmDimension}
                  onChange={(e) =>
                    patch({
                      llmDimension: e.target.value as QcAnalysisConfig['llmDimension'],
                    })
                  }
                  className={cn(FIELD, FIELD_CTRL, "text-[11px]")}
                >
                  {QC_LLM_DIMENSIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>选择模型</label>
                <select
                  value={cfg.selectedModel}
                  onChange={(e) => patch({ selectedModel: e.target.value })}
                  className={cn(FIELD, FIELD_CTRL, "text-[11px]")}
                >
                  {QC_LLM_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>大模型分析提示词</label>
              <textarea
                value={cfg.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
                rows={7}
                className={cn(FIELD, 'min-h-[140px] resize-y text-[11px] leading-relaxed font-mono')}
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QC_LABEL_PROMPT_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => patch({ prompt: p.prompt })}
                    className={cn(
                      'px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer',
                      cfg.prompt === p.prompt
                        ? 'border-foreground/20 bg-neutral-100 text-neutral-800'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-bold text-neutral-800 inline-flex items-center gap-1.5">
            <ListTree size={14} className="text-live" />
            2. 分析映射
          </h4>
          <div className="rounded-lg border border-neutral-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_28px] gap-1 bg-neutral-100/40 px-2 py-1.5 text-[10px] font-semibold text-neutral-500">
              <span>输出字段</span>
              <span>分类展示名称</span>
              <span>输出原因字段</span>
              <span />
            </div>
            {cfg.labelMappings.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_1fr_1fr_28px] gap-1 px-2 py-1.5 border-t border-neutral-200 items-center"
              >
                <input
                  value={row.outputField}
                  onChange={(e) => updateMap(row.id, { outputField: e.target.value })}
                  placeholder="例: INTENT_A"
                  className={cn(FIELD, "h-7 py-1 text-[11px]")}
                />
                <input
                  value={row.displayName}
                  onChange={(e) => updateMap(row.id, { displayName: e.target.value })}
                  placeholder="例: 愤怒"
                  className={cn(FIELD, "h-7 py-1 text-[11px]")}
                />
                <input
                  value={row.reasonField || ''}
                  onChange={(e) => updateMap(row.id, { reasonField: e.target.value })}
                  placeholder="例: REASON_A"
                  className={cn(FIELD, "h-7 py-1 text-[11px]")}
                />
                <button
                  type="button"
                  className="text-neutral-500 hover:text-rose-600 cursor-pointer"
                  onClick={() =>
                    patch({
                      labelMappings: cfg.labelMappings.filter((r) => r.id !== row.id),
                    })
                  }
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={cn(BTN_SOFT, 'h-8 w-full text-[11px] gap-1 border border-dashed')}
            onClick={() =>
              patch({
                labelMappings: [...cfg.labelMappings, createMappingRow()],
              })
            }
          >
            <Plus size={12} /> 添加一行映射配置
          </button>
        </section>
      </div>
    </div>
  );
};

export const QcMultiAnalysisPanel: React.FC<Props> = ({
  category,
  onChange,
  onRemove,
  showToast,
}) => {
  const cfg = ensureConfig(category);
  const total = cfg.totalMapping ?? createMappingRow();
  const patch = (next: Partial<QcAnalysisConfig>) =>
    onChange({ ...category, analysisConfig: { ...cfg, ...next } });

  const updateClass = (id: string, rowPatch: Partial<QcAnalysisMappingRow>) => {
    patch({
      classMappings: cfg.classMappings.map((r) =>
        r.id === id ? { ...r, ...rowPatch } : r,
      ),
    });
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <div className="px-3 py-2.5 border-b border-neutral-200 flex items-center justify-between gap-2">
        <input
          value={category.title}
          onChange={(e) => onChange({ ...category, title: e.target.value })}
          className="text-sm font-bold text-neutral-800 bg-transparent outline-none flex-1 min-w-0"
          placeholder="多维度评分名称"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-[11px] text-rose-600 cursor-pointer inline-flex items-center gap-1"
        >
          <Trash2 size={12} /> 移除
        </button>
      </div>

      <div className="p-3 space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-neutral-800 inline-flex items-center gap-1.5">
              <BrainCircuit size={14} className="text-live" />
              1. 大模型分析
            </h4>
            <button
              type="button"
              className="text-[11px] font-semibold text-live cursor-pointer"
              onClick={() => showToast('外部知识库导入已预留（原型）')}
            >
              导入外部知识库
            </button>
          </div>
          <div className="rounded-lg bg-neutral-100/40 border border-neutral-200 p-2.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={LABEL}>分析维度</label>
                <select
                  value={cfg.llmDimension}
                  onChange={(e) =>
                    patch({
                      llmDimension: e.target.value as QcAnalysisConfig['llmDimension'],
                    })
                  }
                  className={cn(FIELD, FIELD_CTRL, "text-[11px]")}
                >
                  {QC_LLM_DIMENSIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL}>选择模型</label>
                <select
                  value={cfg.selectedModel}
                  onChange={(e) => patch({ selectedModel: e.target.value })}
                  className={cn(FIELD, FIELD_CTRL, "text-[11px]")}
                >
                  {QC_LLM_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={LABEL}>大模型分析提示词</label>
              <textarea
                value={cfg.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
                rows={7}
                className={cn(FIELD, 'min-h-[140px] resize-y text-[11px] leading-relaxed font-mono')}
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QC_MULTI_PROMPT_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => patch({ prompt: p.prompt })}
                    className={cn(
                      'px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer',
                      cfg.prompt === p.prompt
                        ? 'border-foreground/20 bg-neutral-100 text-neutral-800'
                        : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-bold text-neutral-800 inline-flex items-center gap-1.5">
            <Settings2 size={14} className="text-live" />
            总映射配置
          </h4>
          <div className="rounded-lg border border-neutral-200 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-5 gap-1 bg-neutral-100/40 px-2 py-1.5 text-[10px] font-semibold text-neutral-500">
                <span>输出字段</span>
                <span>分类展示名称</span>
                <span>满分分值</span>
                <span>输出分值字段</span>
                <span>输出原因字段</span>
              </div>
              <div className="grid grid-cols-5 gap-1 px-2 py-1.5 border-t border-neutral-200">
                {(
                  [
                    ['outputField', 'TOTAL_RES'],
                    ['displayName', '服务质量评价'],
                    ['maxScore', '100'],
                    ['scoreField', 'OVERALL_SCORE'],
                    ['reasonField', 'OVERALL_REASON'],
                  ] as const
                ).map(([key, ph]) => (
                  <input
                    key={key}
                    value={String(total[key] ?? '')}
                    onChange={(e) =>
                      patch({ totalMapping: { ...total, [key]: e.target.value } })
                    }
                    placeholder={ph}
                    className={cn(FIELD, "h-7 py-1 text-[11px]")}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-bold text-neutral-800 inline-flex items-center gap-1.5">
            <ListTree size={14} className="text-live" />
            2. 类映射配置
          </h4>
          <div className="rounded-lg border border-neutral-200 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[1fr_1fr_0.7fr_1fr_1fr_28px] gap-1 bg-neutral-100/40 px-2 py-1.5 text-[10px] font-semibold text-neutral-500">
                <span>输出字段</span>
                <span>分类展示名称</span>
                <span>满分分值</span>
                <span>输出分值字段</span>
                <span>输出原因字段</span>
                <span />
              </div>
              {cfg.classMappings.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1fr_1fr_0.7fr_1fr_1fr_28px] gap-1 px-2 py-1.5 border-t border-neutral-200 items-center"
                >
                  <input
                    value={row.outputField}
                    onChange={(e) => updateClass(row.id, { outputField: e.target.value })}
                    placeholder="例: INTENT"
                    className={cn(FIELD, "h-7 py-1 text-[11px]")}
                  />
                  <input
                    value={row.displayName}
                    onChange={(e) => updateClass(row.id, { displayName: e.target.value })}
                    placeholder="例: 服务态度"
                    className={cn(FIELD, "h-7 py-1 text-[11px]")}
                  />
                  <input
                    value={row.maxScore || ''}
                    onChange={(e) => updateClass(row.id, { maxScore: e.target.value })}
                    placeholder="例: 100"
                    className={cn(FIELD, "h-7 py-1 text-[11px]")}
                  />
                  <input
                    value={row.scoreField || ''}
                    onChange={(e) => updateClass(row.id, { scoreField: e.target.value })}
                    placeholder="例: SCORE_A"
                    className={cn(FIELD, "h-7 py-1 text-[11px]")}
                  />
                  <input
                    value={row.reasonField || ''}
                    onChange={(e) => updateClass(row.id, { reasonField: e.target.value })}
                    placeholder="例: REASON_A"
                    className={cn(FIELD, "h-7 py-1 text-[11px]")}
                  />
                  <button
                    type="button"
                    className="text-neutral-500 hover:text-rose-600 cursor-pointer"
                    onClick={() =>
                      patch({
                        classMappings: cfg.classMappings.filter((r) => r.id !== row.id),
                      })
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={cn(BTN_SOFT, 'h-8 w-full text-[11px] gap-1 border border-dashed')}
            onClick={() =>
              patch({
                classMappings: [...cfg.classMappings, createMappingRow()],
              })
            }
          >
            <Plus size={12} /> 添加一行映射配置
          </button>
        </section>

        <section className="space-y-2 rounded-lg border border-neutral-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-neutral-800">启用图表展示</span>
            <button
              type="button"
              role="switch"
              aria-checked={!!cfg.chartEnabled}
              onClick={() => patch({ chartEnabled: !cfg.chartEnabled })}
              className={cn(
                'relative h-5 w-9 rounded-full transition cursor-pointer',
                cfg.chartEnabled ? 'bg-live' : 'bg-neutral-100',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition',
                  cfg.chartEnabled ? 'left-4' : 'left-0.5',
                )}
              />
            </button>
          </div>
          {cfg.chartEnabled ? (
            <div>
              <p className="text-[10px] text-neutral-500 mb-1.5">选择展示图表类型</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'radar' as const, label: '雷达图' },
                    { id: 'bar' as const, label: '柱状图' },
                    { id: 'pie' as const, label: '饼状图' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ chartType: opt.id })}
                    className={cn(
                      'h-7 px-3 rounded-md text-[11px] font-semibold border cursor-pointer',
                      cfg.chartType === opt.id
                        ? 'bg-live text-white border-live'
                        : 'bg-white text-neutral-500 border-neutral-200 hover:text-neutral-800',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};
