/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, RotateCcw, Trash2, X } from '@/lib/icons';
import { LIFECYCLE_TERMS } from '@/lib/platformTerminology';
import { cn } from '@/lib/utils';
import type { HiredAgent, KnowledgeBase, Skill } from '../../types';
import {
  buildAgentConfigVersions,
  VERSION_STATUS_META,
  type AgentVersionAction,
  type AgentVersionStatus,
} from '../../lib/agentVersions';

function VersionStatusBadge({ status }: { status: AgentVersionStatus }) {
  const meta = VERSION_STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0',
        meta.badge,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

const ACTION_META: Record<
  AgentVersionAction,
  { label: string; className: string; icon: React.ReactNode }
> = {
  view: {
    label: '查看',
    className: 'text-sky-600 hover:text-sky-700',
    icon: <Search size={11} />,
  },
  apply: {
    label: '应用',
    className: 'text-emerald-600 hover:text-emerald-700',
    icon: <RotateCcw size={11} />,
  },
  delete: {
    label: '删除',
    className: 'text-rose-500 hover:text-rose-600',
    icon: <Trash2 size={11} />,
  },
  discard: {
    label: '放弃更改',
    className: 'text-amber-600 hover:text-amber-700',
    icon: <X size={11} />,
  },
};

export interface AgentVersionPanelProps {
  agent: HiredAgent;
  knowledgeBases: KnowledgeBase[];
  skills: Skill[];
  isDirty: boolean;
  lastSavedAt: Date | null;
  previewSnapshotId: string | null;
  onPreview: (snapshotId: string) => void;
  onApplySnapshot: (snapshotId: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onDiscardDraft: () => void;
}

export const AgentVersionPanel: React.FC<AgentVersionPanelProps> = ({
  agent,
  knowledgeBases,
  skills,
  isDirty,
  lastSavedAt,
  previewSnapshotId,
  onPreview,
  onApplySnapshot,
  onDeleteSnapshot,
  onDiscardDraft,
}) => {
  const versions = buildAgentConfigVersions(agent, knowledgeBases, skills, {
    isDirty,
    lastSavedAt,
    previewSnapshotId,
  });

  const handleAction = (action: AgentVersionAction, snapshotId?: string) => {
    if (action === 'view' && snapshotId) onPreview(snapshotId);
    if (action === 'apply' && snapshotId) onApplySnapshot(snapshotId);
    if (action === 'delete' && snapshotId) onDeleteSnapshot(snapshotId);
    if (action === 'discard') onDiscardDraft();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0 bg-paper">
      <p className="text-[10px] text-neutral-500 leading-relaxed mb-3">
        保存后将写入培训存档。可「查看」历史{LIFECYCLE_TERMS.examVersion}预览左侧内容，「应用」切换为当前上岗版本。
      </p>

      <div className="flex items-center gap-1.5 mb-3">
        <span className="w-0.5 h-3.5 bg-emerald-500 rounded-full shrink-0" />
        <h3 className="text-xs font-semibold text-neutral-800">{LIFECYCLE_TERMS.examVersion}</h3>
        <span className="text-[10px] text-neutral-400 font-mono truncate">{agent.agentId}</span>
      </div>

      <div className="space-y-2">
        {versions.map((ver) => (
          <div
            key={ver.id}
            className={cn(
              'rounded-lg border bg-white px-3 py-2.5 transition-colors',
              ver.isPreviewing && 'border-sky-300 ring-1 ring-sky-100 bg-sky-50/40',
              ver.isPublished && !ver.isPreviewing && 'border-emerald-200 bg-emerald-50/20',
              !ver.isPreviewing && !ver.isPublished && 'border-neutral-200',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 truncate">{ver.title}</p>
                <p className="text-[10px] text-neutral-400 font-mono mt-1 truncate">{ver.code}</p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {ver.tag ? (
                    <>
                      <span className="text-neutral-500">{ver.tag}</span>
                      <span className="mx-1">·</span>
                    </>
                  ) : null}
                  {ver.time}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {ver.actions.length > 0 && (
                  <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
                    {ver.actions.map((action) => {
                      const meta = ACTION_META[action];
                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => handleAction(action, ver.snapshotId)}
                          className={cn(
                            'inline-flex items-center gap-0.5 text-[10px] font-semibold cursor-pointer',
                            meta.className,
                          )}
                        >
                          {meta.icon}
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <VersionStatusBadge status={ver.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
