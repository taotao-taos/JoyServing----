/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 质检数字员工 — 入职培训配置
 * 穿梭框：左侧层级树 · 右侧当前项配置
 */

import React, { useEffect, useMemo, useState } from 'react';
import type {
  HiredAgent,
  QcProfile,
  QcStandardCategory,
  QcStandardItem,
} from '../../types';
import { createDefaultQcProfile, normalizeQcProfile } from '@/lib/jobFamily';
import {
  areAllQcStandardItemsComplete,
  countStandardItems,
  createExampleStandardTree,
  createStandardCategory,
  createStandardItem,
  isQcStandardConfigured,
  isQcStandardItemComplete,
  listQcStandardItems,
  QC_LLM_DIMENSIONS,
  QC_LLM_MODELS,
  QC_OPERATOR_TYPES,
  QC_PROMPT_PRESETS,
} from '@/lib/qcStandards';
import { QC_TERMS } from '@/lib/platformTerminology';
import { BTN_INK, FIELD, FIELD_CTRL, LABEL, PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronDown, FileText, Plus, Trash2, X } from '@/lib/icons';
import { RELAY_CARD_AVATARS } from '@/lib/agentAvatarDisplay';
import { useApp } from '../../context/AppContext';
import { OnboardingAgentTopBar } from './OnboardingConfigPanel';
import {
  QcLabelAnalysisPanel,
  QcMultiAnalysisPanel,
} from './OnboardingQcAnalysisPanels';

export interface OnboardingQcConfigPanelProps {
  agent: HiredAgent;
  updateHiredAgent: (id: string, updates: Partial<HiredAgent>) => void;
  showToast: (message: string) => void;
  onSaved?: () => void;
  lastSavedAt?: Date | null;
  relayAvatarIndex?: number;
  onConfigStateChange?: (state: { isDirty: boolean; lastSavedAt: Date | null }) => void;
}

type Selection =
  | { kind: 'category'; categoryId: string }
  | { kind: 'item'; categoryId: string; itemId: string }
  | null;

export const OnboardingQcConfigPanel: React.FC<OnboardingQcConfigPanelProps> = ({
  agent,
  updateHiredAgent,
  showToast,
  onSaved,
  lastSavedAt = null,
  relayAvatarIndex = 0,
  onConfigStateChange,
}) => {
  const { hiredAgents } = useApp();
  const profile = useMemo(
    () => normalizeQcProfile(agent.qcProfile ?? createDefaultQcProfile()),
    [agent.qcProfile],
  );

  const [selection, setSelection] = useState<Selection>(() => {
    const first = profile.standard.categories.find((c) => c.indicatorType === '质检类');
    const firstItem = first?.children[0];
    if (firstItem && first) return { kind: 'item', categoryId: first.id, itemId: firstItem.id };
    if (first) return { kind: 'category', categoryId: first.id };
    return null;
  });
  const [standardOpen, setStandardOpen] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    onConfigStateChange?.({ isDirty, lastSavedAt: lastSavedAt ?? null });
  }, [isDirty, lastSavedAt, onConfigStateChange]);

  const commit = (next: QcProfile) => {
    updateHiredAgent(agent.id, {
      qcProfile: {
        ...next,
        standardConfigured: isQcStandardConfigured(next.standard),
      },
    });
    setIsDirty(true);
  };

  const setCategories = (categories: QcStandardCategory[]) => {
    commit({
      ...profile,
      standard: { categories },
    });
  };

  const updateCategory = (categoryId: string, patch: Partial<QcStandardCategory>) => {
    setCategories(
      profile.standard.categories.map((c) =>
        c.id === categoryId ? { ...c, ...patch } : c,
      ),
    );
  };

  const replaceCategory = (next: QcStandardCategory) => {
    setCategories(
      profile.standard.categories.map((c) => (c.id === next.id ? next : c)),
    );
  };

  const updateItem = (
    categoryId: string,
    itemId: string,
    patch: Partial<QcStandardItem>,
  ) => {
    setCategories(
      profile.standard.categories.map((c) => {
        if (c.id !== categoryId) return c;
        return {
          ...c,
          children: c.children.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        };
      }),
    );
  };

  const addCategory = (indicatorType: QcStandardCategory['indicatorType'] = '质检类') => {
    if (indicatorType === '分类标签') {
      const exists = profile.standard.categories.some((c) => c.indicatorType === '分类标签');
      if (exists) {
        const cat = profile.standard.categories.find((c) => c.indicatorType === '分类标签')!;
        setSelection({ kind: 'category', categoryId: cat.id });
        showToast('已有分类标签，可在右侧继续配置');
        return;
      }
    }
    if (indicatorType === '多维度评分类') {
      const exists = profile.standard.categories.some((c) => c.indicatorType === '多维度评分类');
      if (exists) {
        const cat = profile.standard.categories.find((c) => c.indicatorType === '多维度评分类')!;
        setSelection({ kind: 'category', categoryId: cat.id });
        showToast('已有多维度评分，可在右侧继续配置');
        return;
      }
    }
    const cat = createStandardCategory(indicatorType);
    if (indicatorType === '质检类') cat.title = '未命名一级项';
    setCategories([...profile.standard.categories, cat]);
    setSelection({ kind: 'category', categoryId: cat.id });
  };

  const addItem = (categoryId: string) => {
    const item = createStandardItem();
    item.name = '未命名二级项';
    setCategories(
      profile.standard.categories.map((c) =>
        c.id === categoryId ? { ...c, children: [...c.children, item] } : c,
      ),
    );
    setSelection({ kind: 'item', categoryId, itemId: item.id });
  };

  const removeCategory = (categoryId: string) => {
    setCategories(profile.standard.categories.filter((c) => c.id !== categoryId));
    if (
      selection &&
      ((selection.kind === 'category' && selection.categoryId === categoryId) ||
        (selection.kind === 'item' && selection.categoryId === categoryId))
    ) {
      setSelection(null);
    }
  };

  const removeItem = (categoryId: string, itemId: string) => {
    setCategories(
      profile.standard.categories.map((c) =>
        c.id === categoryId
          ? { ...c, children: c.children.filter((it) => it.id !== itemId) }
          : c,
      ),
    );
    if (selection?.kind === 'item' && selection.itemId === itemId) {
      setSelection({ kind: 'category', categoryId });
    }
  };

  const loadExample = () => {
    const tree = createExampleStandardTree();
    commit({ ...profile, standard: tree });
    const cat = tree.categories[0];
    const item = cat?.children[0];
    if (item && cat) setSelection({ kind: 'item', categoryId: cat.id, itemId: item.id });
    else if (cat) setSelection({ kind: 'category', categoryId: cat.id });
    showToast('已载入示例标准，可按业务删改');
  };

  const handleSave = () => {
    const configured = isQcStandardConfigured(profile.standard);
    const allComplete = areAllQcStandardItemsComplete(profile.standard);
    commit({ ...profile, standardConfigured: configured });
    if (!configured) {
      showToast('请至少新增并配齐一条二级质检项');
      return;
    }
    if (!allComplete) {
      const incomplete = listQcStandardItems(profile.standard)
        .filter(({ item }) => !isQcStandardItemComplete(item))
        .map(({ item, categoryTitle }) => `${categoryTitle}/${item.name || '未命名'}`)
        .slice(0, 3);
      const more =
        listQcStandardItems(profile.standard).filter(
          ({ item }) => !isQcStandardItemComplete(item),
        ).length > 3
          ? '…'
          : '';
      showToast(
        `还有未配齐的标准：${incomplete.join('、')}${more}（需名称/分数/算子/模型/维度/提示词）`,
      );
      return;
    }
    showToast('质检培训配置已保存');
    setIsDirty(false);
    onSaved?.();
  };

  const counts = countStandardItems(profile.standard);
  const allStandardsComplete = areAllQcStandardItemsComplete(profile.standard);
  const qcCategories = profile.standard.categories.filter((c) => c.indicatorType === '质检类');
  const tagCategories = profile.standard.categories.filter((c) => c.indicatorType === '分类标签');
  const multiCategories = profile.standard.categories.filter(
    (c) => c.indicatorType === '多维度评分类',
  );

  const selectedCategory =
    selection &&
    profile.standard.categories.find((c) => c.id === selection.categoryId);
  const selectedItem =
    selection?.kind === 'item' && selectedCategory
      ? selectedCategory.children.find((it) => it.id === selection.itemId)
      : undefined;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      <OnboardingAgentTopBar
        agent={agent}
        hiredAgents={hiredAgents}
        relayAvatarIndex={relayAvatarIndex}
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        onSave={handleSave}
        onRename={(name) => {
          updateHiredAgent(agent.id, { name });
          setIsDirty(true);
        }}
        onAvatarChange={(avatar) => {
          const defaultUrl =
            RELAY_CARD_AVATARS[relayAvatarIndex % RELAY_CARD_AVATARS.length];
          if (avatar === defaultUrl) {
            updateHiredAgent(agent.id, { avatar: defaultUrl, avatarCustomized: false });
          } else {
            updateHiredAgent(agent.id, { avatar, avatarCustomized: true });
          }
          setIsDirty(true);
        }}
      />

      <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-2 custom-scrollbar">
        {/* 质检模板配置 */}
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setTemplateOpen((v) => !v)}
            className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-neutral-100/40 transition cursor-pointer text-left"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800 min-w-0">
              <FileText size={13} className="text-neutral-500 shrink-0" />
              <span className="truncate">质检模板配置</span>
            </span>
            <ChevronDown
              size={14}
              className={cn(
                'text-neutral-500 transition-transform shrink-0',
                !templateOpen && '-rotate-90',
              )}
            />
          </button>

          {templateOpen ? (
            <div className="px-3 pb-3 space-y-3 border-t border-neutral-100 pt-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-medium text-neutral-500">
                    基础分配置 (Base Score)
                  </label>
                  <span className="text-[10px] text-neutral-400">满分通常为100</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={profile.baseScore}
                  onChange={(e) =>
                    commit({
                      ...profile,
                      baseScore: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={cn(FIELD, FIELD_CTRL)}
                  placeholder="例如: 100"
                />
              </div>

              <div className={cn(PANEL, 'p-3 space-y-2 shadow-none')}>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[12px] font-bold text-neutral-800">
                    分数等级配置 (全局通用)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const id = `grade_${Date.now()}`;
                      commit({
                        ...profile,
                        scoreGrades: [
                          ...profile.scoreGrades,
                          { id, label: '' },
                        ],
                      });
                    }}
                    className="inline-flex items-center gap-0.5 h-7 px-2 rounded-[7px] text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100 cursor-pointer"
                  >
                    <Plus size={12} />
                    新增等级
                  </button>
                </div>
                {profile.scoreGrades.length === 0 ? (
                  <p className="text-[11px] text-neutral-500 py-1">
                    暂未配置分数等级，点击「新增等级」添加
                  </p>
                ) : (
                <div className="space-y-2">
                  {profile.scoreGrades.map((grade, index) => (
                    <div key={grade.id} className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={grade.min ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const min = raw === '' ? undefined : Number(raw);
                          commit({
                            ...profile,
                            scoreGrades: profile.scoreGrades.map((g, i) =>
                              i === index ? { ...g, min } : g,
                            ),
                          });
                        }}
                        className={cn(FIELD, FIELD_CTRL, 'w-14 px-1.5 text-center shrink-0')}
                        placeholder="起"
                      />
                      <span className="text-[11px] text-neutral-500 shrink-0">-</span>
                      <input
                        type="number"
                        value={grade.max ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const max = raw === '' ? undefined : Number(raw);
                          commit({
                            ...profile,
                            scoreGrades: profile.scoreGrades.map((g, i) =>
                              i === index ? { ...g, max } : g,
                            ),
                          });
                        }}
                        className={cn(FIELD, FIELD_CTRL, 'w-14 px-1.5 text-center shrink-0')}
                        placeholder="止"
                      />
                      <span className="text-[11px] text-neutral-500 shrink-0">分</span>
                      <input
                        type="text"
                        value={grade.label}
                        onChange={(e) => {
                          const label = e.target.value;
                          commit({
                            ...profile,
                            scoreGrades: profile.scoreGrades.map((g, i) =>
                              i === index ? { ...g, label } : g,
                            ),
                          });
                        }}
                        className={cn(FIELD, FIELD_CTRL, 'flex-1 min-w-0')}
                        placeholder="等级名称，如：优秀"
                      />
                      <button
                        type="button"
                        aria-label="删除等级"
                        onClick={() =>
                          commit({
                            ...profile,
                            scoreGrades: profile.scoreGrades.filter((_, i) => i !== index),
                          })
                        }
                        className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-[7px] text-neutral-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                )}
              </div>

              <div className={cn(PANEL, 'p-3 space-y-3 shadow-none')}>
                <h4 className="text-[12px] font-bold text-neutral-800">评分逻辑配置</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>扣分制最高分</label>
                    <input
                      type="number"
                      value={profile.scoreMax}
                      onChange={(e) =>
                        commit({
                          ...profile,
                          scoreMax: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={cn(FIELD, FIELD_CTRL)}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>扣分制最低分</label>
                    <input
                      type="number"
                      value={profile.scoreMin}
                      onChange={(e) =>
                        commit({
                          ...profile,
                          scoreMin: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={cn(FIELD, FIELD_CTRL)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setStandardOpen((v) => !v)}
            className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-neutral-100/40 transition cursor-pointer text-left"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800 min-w-0">
              <FileText size={13} className="text-neutral-500 shrink-0" />
              <span className="truncate">
                {QC_TERMS.standard}
                <span className="text-destructive ml-0.5">*</span>
              </span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              {allStandardsComplete ? (
                <span className="text-xs text-neutral-500 flex items-center gap-0.5">
                  <CheckCircle2 size={10} />
                  {counts.completeItems}/{counts.items}
                </span>
              ) : (
                <span className="text-xs text-amber-700">
                  {counts.completeItems}/{counts.items || 0}
                </span>
              )}
              {counts.categories === 0 ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    loadExample();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      loadExample();
                    }
                  }}
                  className="text-xs text-primary font-medium cursor-pointer"
                >
                  载入示例
                </span>
              ) : null}
              <ChevronDown
                size={14}
                className={cn(
                  'text-neutral-500 transition-transform',
                  standardOpen && 'rotate-180',
                )}
              />
            </span>
          </button>

          {standardOpen ? (
            <div className="border-t border-neutral-200">
              <p className="px-3 pt-2 text-[11px] text-neutral-500 leading-relaxed">
                {QC_TERMS.standardItemFieldsHint}
              </p>
              <div className="flex flex-col sm:flex-row min-h-[320px]">
                {/* 左侧：层级树 */}
                <div className="sm:w-[200px] shrink-0 border-b sm:border-b-0 sm:border-r border-neutral-200 bg-neutral-100/20 p-2 space-y-3 overflow-y-auto max-h-[480px]">
                  <TreeSection
                    title="质检类"
                    onAdd={() => addCategory('质检类')}
                    addLabel="一级项"
                  >
                    {qcCategories.map((cat) => (
                      <CategoryBlock
                        key={cat.id}
                        cat={cat}
                        selection={selection}
                        onSelectCategory={() =>
                          setSelection({ kind: 'category', categoryId: cat.id })
                        }
                        onSelectItem={(itemId) =>
                          setSelection({ kind: 'item', categoryId: cat.id, itemId })
                        }
                        onAddItem={() => addItem(cat.id)}
                        onRemoveCategory={() => removeCategory(cat.id)}
                        onRemoveItem={(itemId) => removeItem(cat.id, itemId)}
                        onRenameCategory={(title) => updateCategory(cat.id, { title })}
                      />
                    ))}
                  </TreeSection>

                  <TreeSection
                    title="分类标签"
                    tone="emerald"
                    onAdd={() => addCategory('分类标签')}
                    addLabel="新增"
                  >
                    {tagCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelection({ kind: 'category', categoryId: cat.id })}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md text-[11px] font-medium cursor-pointer',
                          selection?.kind === 'category' && selection.categoryId === cat.id
                            ? 'bg-emerald-600 text-white'
                            : 'text-neutral-700 hover:bg-emerald-50',
                        )}
                      >
                        {cat.title || '未命名'}
                      </button>
                    ))}
                  </TreeSection>

                  <TreeSection
                    title="多维度评分类"
                    tone="amber"
                    onAdd={() => addCategory('多维度评分类')}
                    addLabel="新增"
                  >
                    {multiCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelection({ kind: 'category', categoryId: cat.id })}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md text-[11px] font-medium cursor-pointer',
                          selection?.kind === 'category' && selection.categoryId === cat.id
                            ? 'bg-amber-600 text-white'
                            : 'text-neutral-700 hover:bg-amber-50',
                        )}
                      >
                        {cat.title || '未命名'}
                      </button>
                    ))}
                  </TreeSection>
                </div>

                {/* 右侧：当前项配置 */}
                <div className="flex-1 min-w-0 p-3 overflow-y-auto max-h-[480px] space-y-3">
                  {!selectedCategory ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center px-4">
                      <p className="text-sm font-semibold text-neutral-500">
                        请选择或新增左侧层级项
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        配置分数、大模型算子与质检提示词
                      </p>
                      <button
                        type="button"
                        onClick={() => addCategory('质检类')}
                        className={cn(BTN_INK, 'h-8 px-3 mt-3')}
                      >
                        新增一级质检项
                      </button>
                      {counts.categories === 0 ? (
                        <button
                          type="button"
                          onClick={loadExample}
                          className="mt-2 text-[11px] font-semibold text-neutral-800 underline-offset-2 hover:underline cursor-pointer"
                        >
                          或载入示例标准
                        </button>
                      ) : null}
                    </div>
                  ) : selectedCategory.indicatorType === '分类标签' ? (
                    <QcLabelAnalysisPanel
                      category={selectedCategory}
                      onChange={replaceCategory}
                      onRemove={() => removeCategory(selectedCategory.id)}
                      showToast={showToast}
                    />
                  ) : selectedCategory.indicatorType === '多维度评分类' ? (
                    <QcMultiAnalysisPanel
                      category={selectedCategory}
                      onChange={replaceCategory}
                      onRemove={() => removeCategory(selectedCategory.id)}
                      showToast={showToast}
                    />
                  ) : selection?.kind === 'category' ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                        基础字段（一级）
                      </h4>
                      <div>
                        <label className={LABEL}>质检大类名称</label>
                        <input
                          value={selectedCategory.title}
                          onChange={(e) =>
                            updateCategory(selectedCategory.id, { title: e.target.value })
                          }
                          className={cn(FIELD, FIELD_CTRL)}
                          placeholder="请输入一级项名称"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        类型：质检类 — 在左侧「追加二级项」配置具体质检点
                      </p>
                      <div>
                        <label className={LABEL}>及格线（分）</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={profile.passScore}
                          onChange={(e) =>
                            commit({
                              ...profile,
                              passScore: Math.max(
                                0,
                                Math.min(100, Number(e.target.value) || 0),
                              ),
                            })
                          }
                          className={cn(FIELD, 'h-8 py-1.5 max-w-[120px]')}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCategory(selectedCategory.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={12} /> 删除此项
                      </button>
                    </div>
                  ) : selectedItem ? (
                    <div className="space-y-3">
                      <div
                        className={cn(
                          'rounded-lg border px-3 py-2 text-[11px]',
                          isQcStandardItemComplete(selectedItem)
                            ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
                            : 'border-amber-200 bg-amber-50/60 text-amber-900',
                        )}
                      >
                        <p className="font-semibold mb-1.5">
                          {isQcStandardItemComplete(selectedItem)
                            ? '本条标准字段已配齐，可用于会话质检'
                            : '本条标准尚未配齐，请补全以下字段'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            [
                              { ok: !!selectedItem.name.trim(), label: '二级项名称' },
                              {
                                ok: !!String(selectedItem.score ?? '').trim(),
                                label: '分数配置',
                              },
                              { ok: !!selectedItem.operatorType, label: '算子' },
                              {
                                ok: !!selectedItem.selectedModel?.trim(),
                                label: '执行模型',
                              },
                              { ok: !!selectedItem.llmDimension, label: '质检维度' },
                              { ok: !!selectedItem.prompt?.trim(), label: '提示词' },
                            ] as const
                          ).map((f) => (
                            <span
                              key={f.label}
                              className={cn(
                                'px-1.5 py-0.5 rounded border text-[10px] font-medium',
                                f.ok
                                  ? 'border-emerald-300 bg-white text-emerald-800'
                                  : 'border-amber-300 bg-white text-amber-800',
                              )}
                            >
                              {f.ok ? '✓' : '○'} {f.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className={LABEL}>二级项名称</label>
                        <input
                          value={selectedItem.name}
                          onChange={(e) =>
                            updateItem(selection!.categoryId, selectedItem.id, {
                              name: e.target.value,
                            })
                          }
                          className={cn(FIELD, FIELD_CTRL)}
                          placeholder="请输入二级项名称"
                        />
                      </div>

                      <div className={cn(PANEL, 'p-3 space-y-2 shadow-none')}>
                        <h4 className="text-[11px] font-bold text-neutral-800 uppercase tracking-wide">
                          基础字段（二级）
                        </h4>
                        <div>
                          <label className={LABEL}>分数配置</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={selectedItem.score}
                            onChange={(e) =>
                              updateItem(selection!.categoryId, selectedItem.id, {
                                score: e.target.value.trim(),
                              })
                            }
                            placeholder="如 -10（命中扣分）"
                            className={cn(FIELD, FIELD_CTRL)}
                          />
                        </div>
                      </div>

                      <div className={cn(PANEL, 'p-3 space-y-3 shadow-none')}>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-[11px] font-bold text-neutral-800 uppercase tracking-wide">
                            算子编排与逻辑执行
                          </h4>
                          <select
                            value={selectedItem.operatorType}
                            onChange={(e) =>
                              updateItem(selection!.categoryId, selectedItem.id, {
                                operatorType: e.target
                                  .value as QcStandardItem['operatorType'],
                              })
                            }
                            className={cn(FIELD, 'h-7 py-0 w-auto text-[11px]')}
                          >
                            {QC_OPERATOR_TYPES.map((op) => (
                              <option
                                key={op.value}
                                value={op.value}
                                disabled={op.disabled}
                              >
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedItem.operatorType === '大模型质检' ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className={LABEL}>执行模型</label>
                                <select
                                  value={selectedItem.selectedModel || ''}
                                  onChange={(e) =>
                                    updateItem(selection!.categoryId, selectedItem.id, {
                                      selectedModel: e.target.value,
                                    })
                                  }
                                  className={cn(FIELD, FIELD_CTRL, "text-[11px]")}
                                >
                                  <option value="">请选择执行模型...</option>
                                  {QC_LLM_MODELS.map((m) => (
                                    <option key={m.value} value={m.value}>
                                      {m.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className={LABEL}>质检维度</label>
                                <select
                                  value={selectedItem.llmDimension || 'session'}
                                  onChange={(e) =>
                                    updateItem(selection!.categoryId, selectedItem.id, {
                                      llmDimension: e.target
                                        .value as QcStandardItem['llmDimension'],
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
                            </div>

                            <div>
                              <label className={LABEL}>大模型质检提示词</label>
                              <textarea
                                value={selectedItem.prompt || ''}
                                onChange={(e) =>
                                  updateItem(selection!.categoryId, selectedItem.id, {
                                    prompt: e.target.value,
                                  })
                                }
                                rows={5}
                                placeholder="请输入大模型质检提示词..."
                                className={cn(
                                  FIELD,
                                  'min-h-[100px] resize-y text-[11px] leading-relaxed',
                                )}
                              />
                            </div>

                            <div className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-[11px] text-sky-900 leading-relaxed">
                              大模型按提示词输出结论。系统仅将「违规 / 命中」记为命中，其余视为未命中。
                            </div>

                            <div>
                              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide mb-1.5">
                                参考模板（填入当前项提示词）
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {QC_PROMPT_PRESETS.map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    title={preset.prompt}
                                    onClick={() =>
                                      updateItem(selection!.categoryId, selectedItem.id, {
                                        prompt: preset.prompt,
                                      })
                                    }
                                    className="px-2 py-1 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer"
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-500">
                            工作流质检暂未开放
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(selection!.categoryId, selectedItem.id)
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-rose-600 cursor-pointer"
                      >
                        <Trash2 size={12} /> 删除二级项
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

function TreeSection({
  title,
  tone = 'neutral',
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  tone?: 'neutral' | 'emerald' | 'amber';
  onAdd: () => void;
  addLabel: string;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === 'emerald'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-neutral-600';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className={cn('text-[10px] font-bold uppercase tracking-wide', toneCls)}>
          {title}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            'inline-flex items-center gap-0.5 text-[10px] font-semibold cursor-pointer',
            toneCls,
          )}
        >
          <Plus size={10} /> {addLabel}
        </button>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function CategoryBlock({
  cat,
  selection,
  onSelectCategory,
  onSelectItem,
  onAddItem,
  onRemoveCategory,
  onRemoveItem,
  onRenameCategory,
}: {
  cat: QcStandardCategory;
  selection: Selection;
  onSelectCategory: () => void;
  onSelectItem: (itemId: string) => void;
  onAddItem: () => void;
  onRemoveCategory: () => void;
  onRemoveItem: (itemId: string) => void;
  onRenameCategory: (title: string) => void;
}) {
  const catActive = selection?.kind === 'category' && selection.categoryId === cat.id;
  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-1.5 py-1 cursor-pointer',
          catActive ? 'bg-neutral-800 text-white' : 'hover:bg-neutral-100 text-neutral-800',
        )}
        onClick={onSelectCategory}
      >
        <input
          value={cat.title}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onRenameCategory(e.target.value)}
          className={cn(
            'flex-1 min-w-0 bg-transparent text-[11px] font-semibold outline-none',
            catActive ? 'text-white placeholder:text-white/50' : 'text-neutral-800',
          )}
          placeholder="一级项名称"
        />
        <button
          type="button"
          title="删除"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveCategory();
          }}
          className={cn(
            'opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer',
            catActive ? 'text-white/80' : 'text-neutral-400',
          )}
        >
          <Trash2 size={10} />
        </button>
      </div>
      <div className="pl-2 space-y-0.5">
        {cat.children.map((item) => {
          const active =
            selection?.kind === 'item' &&
            selection.categoryId === cat.id &&
            selection.itemId === item.id;
          return (
            <div
              key={item.id}
              className={cn(
                'group flex items-center gap-1 rounded-md px-2 py-1 cursor-pointer',
                active ? 'bg-sky-600 text-white' : 'text-neutral-600 hover:bg-sky-50',
              )}
              onClick={() => onSelectItem(item.id)}
            >
              <span className="flex-1 min-w-0 text-[11px] truncate">
                {item.name || '未命名二级项'}
              </span>
              {!isQcStandardItemComplete(item) ? (
                <span
                  className={cn(
                    'shrink-0 text-[9px] font-bold',
                    active ? 'text-amber-100' : 'text-amber-600',
                  )}
                >
                  未齐
                </span>
              ) : (
                <span
                  className={cn(
                    'shrink-0 text-[9px] font-bold',
                    active ? 'text-emerald-100' : 'text-emerald-600',
                  )}
                >
                  齐
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveItem(item.id);
                }}
                className={cn(
                  'opacity-0 group-hover:opacity-100 p-0.5 cursor-pointer',
                  active ? 'text-white/80' : 'text-neutral-400',
                )}
              >
                <Trash2 size={10} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAddItem}
          className="w-full text-left px-2 py-1 text-[10px] font-semibold text-neutral-500 hover:text-neutral-800 cursor-pointer inline-flex items-center gap-0.5"
        >
          <Plus size={9} /> 追加二级项
        </button>
      </div>
    </div>
  );
}
