/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import type { HiredAgent } from '../types';
import { resolveInspectorStandard } from '@/lib/qcWorkspaceMock';
import { BTN_INK, BTN_SOFT, FIELD, LABEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { Modal } from './common/Modal';
import { ChevronDown, Search } from '@/lib/icons';

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

export interface QcCreatePlanModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  planName: string;
  onPlanNameChange: (value: string) => void;
  inspectableOnline: HiredAgent[];
  internalAgentIds: string[];
  onInternalAgentIdsChange: (ids: string[]) => void;
  externalSources: string[];
  onExternalSourcesChange: (ids: string[]) => void;
  collab: QcCollabMode;
  onCollabChange: (mode: QcCollabMode) => void;
  onlineQcAgents: HiredAgent[];
  inspectorIds: string[];
  onInspectorIdsChange: (ids: string[], leadId: string) => void;
  createInspector?: HiredAgent;
}

export const QcCreatePlanModal: React.FC<QcCreatePlanModalProps> = ({
  open,
  onClose,
  onSubmit,
  planName,
  onPlanNameChange,
  inspectableOnline,
  internalAgentIds,
  onInternalAgentIdsChange,
  externalSources,
  onExternalSourcesChange,
  collab,
  onCollabChange,
  onlineQcAgents,
  inspectorIds,
  onInspectorIdsChange,
  createInspector,
}) => {
  const [showInternalPicker, setShowInternalPicker] = useState(false);
  const [showInspectorPicker, setShowInspectorPicker] = useState(false);
  const [internalQuery, setInternalQuery] = useState('');
  const [inspectorQuery, setInspectorQuery] = useState('');
  const createStandard = resolveInspectorStandard(createInspector);
  const selectedInternalNames = useMemo(
    () =>
      inspectableOnline
        .filter((a) => internalAgentIds.includes(a.id))
        .map((a) => a.name),
    [inspectableOnline, internalAgentIds],
  );
  const selectedInspectorNames = useMemo(
    () =>
      onlineQcAgents
        .filter((a) => inspectorIds.includes(a.id))
        .map((a) => a.name),
    [onlineQcAgents, inspectorIds],
  );
  const filteredInternalAgents = useMemo(() => {
    const q = internalQuery.trim().toLowerCase();
    if (!q) return inspectableOnline;
    return inspectableOnline.filter((a) => a.name.toLowerCase().includes(q));
  }, [inspectableOnline, internalQuery]);
  const filteredInspectorAgents = useMemo(() => {
    const q = inspectorQuery.trim().toLowerCase();
    if (!q) return onlineQcAgents;
    return onlineQcAgents.filter((a) => a.name.toLowerCase().includes(q));
  }, [onlineQcAgents, inspectorQuery]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新建质检计划"
      maxWidth="max-w-lg"
      footer={
        <>
          <button type="button" className={cn(BTN_SOFT, 'h-8 px-3')} onClick={onClose}>
            取消
          </button>
          <button type="button" className={cn(BTN_INK, 'h-8 px-3')} onClick={onSubmit}>
            创建计划
          </button>
        </>
      }
    >
      <p className="text-[11px] text-neutral-500 -mt-2 mb-4 leading-relaxed">
        选择内部或外部数据源，并让多个数字员工一起上场
      </p>

      <div className="space-y-3.5">
        <div>
          <label className={LABEL}>计划名称</label>
          <input
            value={planName}
            onChange={(e) => onPlanNameChange(e.target.value)}
            className={cn(FIELD, 'h-8 py-1.5')}
            placeholder="例如：本周全渠道合规协同抽检"
            autoFocus
          />
        </div>

        <div>
          <label className={LABEL}>数据源（可多选）</label>
          <div className="mt-1.5 space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[11px] font-semibold text-neutral-800">
                内部 · 平台已上线数字员工
                </p>
                <button
                  type="button"
                  onClick={() => setShowInternalPicker((v) => !v)}
                  className="h-7 px-2 rounded-md border border-neutral-200 bg-white text-[10px] font-semibold text-neutral-700 inline-flex items-center gap-1 cursor-pointer hover:bg-neutral-100/40"
                >
                  {showInternalPicker ? '收起' : '选择'}
                  <ChevronDown
                    size={12}
                    className={cn('transition-transform', !showInternalPicker && '-rotate-90')}
                  />
                </button>
              </div>
              {inspectableOnline.length === 0 ? (
                <p className="text-[11px] text-neutral-500 rounded-lg border border-dashed border-neutral-200 px-3 py-2">
                  暂无已上线的客服数字员工
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-neutral-500">
                    已选 {selectedInternalNames.length} 个
                    {selectedInternalNames.length > 0
                      ? `：${selectedInternalNames.slice(0, 2).join('、')}${selectedInternalNames.length > 2 ? '…' : ''}`
                      : ''}
                  </p>
                  {showInternalPicker ? (
                    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                      <div className="relative border-b border-neutral-200 px-2 py-1.5">
                        <Search
                          size={12}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                        />
                        <input
                          value={internalQuery}
                          onChange={(e) => setInternalQuery(e.target.value)}
                          className={cn(FIELD, 'h-7 pl-6 py-1 text-[11px]')}
                          placeholder="搜索内部数字员工"
                        />
                      </div>
                      <div className="max-h-[160px] overflow-y-auto custom-scrollbar divide-y divide-neutral-200">
                        {filteredInternalAgents.map((agent) => {
                          const selected = internalAgentIds.includes(agent.id);
                          return (
                            <label
                              key={agent.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-100/40"
                            >
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-neutral-800 truncate">
                                  {agent.name}
                                </p>
                                <p className="text-[10px] text-emerald-600 mt-0.5">已上线</p>
                              </div>
                              <input
                                type="checkbox"
                                className="accent-neutral-900 shrink-0"
                                checked={selected}
                                onChange={(e) =>
                                  onInternalAgentIdsChange(
                                    e.target.checked
                                      ? [...internalAgentIds, agent.id]
                                      : internalAgentIds.filter((id) => id !== agent.id),
                                  )
                                }
                              />
                            </label>
                          );
                        })}
                        {filteredInternalAgents.length === 0 ? (
                          <p className="px-3 py-3 text-[11px] text-neutral-500">无匹配结果</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <p className="text-[11px] font-semibold text-neutral-800 mb-1.5">
                外部 · 外部会话接入
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EXTERNAL_DATA_SOURCES.map((src) => {
                  const selected = externalSources.includes(src.id);
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() =>
                        onExternalSourcesChange(
                          selected
                            ? externalSources.filter((id) => id !== src.id)
                            : [...externalSources, src.id],
                        )
                      }
                      className={cn(
                        'text-left rounded-lg border px-2.5 py-2 cursor-pointer transition',
                        selected
                          ? 'bg-neutral-800 text-white border-neutral-900'
                          : 'bg-white border-neutral-200 hover:bg-neutral-100/40 text-neutral-800',
                      )}
                    >
                      <p className="text-[11px] font-semibold leading-snug">{src.label}</p>
                      <p
                        className={cn(
                          'text-[10px] mt-0.5',
                          selected ? 'text-white/70' : 'text-neutral-500',
                        )}
                      >
                        同步中
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className={LABEL}>协同模式</label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {COLLAB_MODES.map((m) => {
              const selected = collab === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onCollabChange(m.id)}
                  className={cn(
                    'h-7 px-2.5 rounded-md text-[11px] font-semibold border cursor-pointer',
                    selected
                      ? 'bg-neutral-800 text-white border-neutral-900'
                      : 'bg-white text-neutral-500 border-neutral-200 hover:text-neutral-800',
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <label className={LABEL}>上场数字员工（可多选）</label>
            <button
              type="button"
              onClick={() => setShowInspectorPicker((v) => !v)}
              className="h-7 px-2 rounded-md border border-neutral-200 bg-white text-[10px] font-semibold text-neutral-700 inline-flex items-center gap-1 cursor-pointer hover:bg-neutral-100/40"
            >
              {showInspectorPicker ? '收起' : '选择'}
              <ChevronDown
                size={12}
                className={cn('transition-transform', !showInspectorPicker && '-rotate-90')}
              />
            </button>
          </div>
          {onlineQcAgents.length === 0 ? (
            <p className="mt-1 text-[11px] text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              暂无已上岗质检数字员工，请先完成培训并上岗。
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] text-neutral-500">
                已选 {selectedInspectorNames.length} 个
                {selectedInspectorNames.length > 0
                  ? `：${selectedInspectorNames.slice(0, 2).join('、')}${selectedInspectorNames.length > 2 ? '…' : ''}`
                  : ''}
              </p>
              {showInspectorPicker ? (
                <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
                  <div className="relative border-b border-neutral-200 px-2 py-1.5">
                    <Search
                      size={12}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
                    />
                    <input
                      value={inspectorQuery}
                      onChange={(e) => setInspectorQuery(e.target.value)}
                      className={cn(FIELD, 'h-7 pl-6 py-1 text-[11px]')}
                      placeholder="搜索上场数字员工"
                    />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto custom-scrollbar divide-y divide-neutral-200">
                    {filteredInspectorAgents.map((a) => {
                      const checked = inspectorIds.includes(a.id);
                      const std = resolveInspectorStandard(a);
                      return (
                        <label
                          key={a.id}
                          className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-neutral-100/30"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[12px] font-bold text-neutral-800">{a.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700 font-medium">
                                合规检查
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                              {std.summary}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            className="accent-neutral-900 mt-0.5 shrink-0"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...inspectorIds, a.id]
                                : inspectorIds.filter((id) => id !== a.id);
                              onInspectorIdsChange(next, next[0] ?? '');
                            }}
                          />
                        </label>
                      );
                    })}
                    {filteredInspectorAgents.length === 0 ? (
                      <p className="px-3 py-3 text-[11px] text-neutral-500">无匹配结果</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {createStandard.configured ? (
            <p className="text-[10px] text-neutral-500 mt-1">
              将引用已选员工的培训标准：{createStandard.summary}
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
