/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 实时处理过程 — 披露每一句会话「如何回答」的链路；无法闭环转入待办（不转人工）。
 * 卡片默认折叠，展开后查看完整过程。
 */

import React, { useState } from 'react';
import type { ThoughtStep } from '../../types';
import type { LiveReasoningItem, LiveReasoningStatus } from '../../lib/liveReasoningFeed';
import { resolveWorkLogResource } from '../../lib/workLogUi';
import { STEP_LABELS } from '../../lib/replyLogs';
import { cn } from '@/lib/utils';
import { ChevronDown } from '@/lib/icons';

function StatusBadge({ status }: { status: LiveReasoningStatus }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-medium text-sky-700 bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded-full">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500" />
        </span>
        回答中
      </span>
    );
  }
  if (status === 'todo') {
    return (
      <span className="text-[8px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-full">
        已转待办
      </span>
    );
  }
  return (
    <span className="text-[8px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-full">
      已回复
    </span>
  );
}

function ResourceChip({ step }: { step: ThoughtStep }) {
  const meta = resolveWorkLogResource(step);
  if (!meta) return null;
  return (
    <span className="inline-flex items-center gap-1 max-w-full rounded-md bg-amber-50 text-amber-900/80 border border-amber-100 px-1.5 py-0.5 text-[9px] leading-snug">
      <span className="text-amber-700/70 shrink-0">{meta.kindLabel}</span>
      <span className="font-medium truncate">{meta.name}</span>
      {meta.tag ? <span className="text-amber-700/60 shrink-0">· {meta.tag}</span> : null}
    </span>
  );
}

function ReplyProcessSteps({ steps }: { steps: ThoughtStep[] }) {
  const process = steps.filter((s) => s.type !== 'output');

  return (
    <ol className="space-y-1.5 mt-0.5">
      {process.map((step, idx) => {
        const isResource = step.type === 'search' || step.type === 'tool';
        return (
          <li key={step.id} className="flex gap-1.5 min-w-0">
            <span className="shrink-0 w-3.5 text-[8px] font-mono text-neutral-400 pt-0.5 tabular-nums">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[9px] text-neutral-500 font-medium leading-none">
                {STEP_LABELS[step.type]}
              </p>
              {isResource ? (
                <ResourceChip step={step} />
              ) : (
                <p className="text-[10px] text-neutral-800/85 leading-relaxed">{step.message}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function processSummary(steps: ThoughtStep[]): string {
  const process = steps.filter((s) => s.type !== 'output');
  const n = process.length;
  if (!n) return '暂无过程';
  const kinds = process.map((s) => STEP_LABELS[s.type]);
  const uniq = [...new Set(kinds)];
  return `${n} 步 · ${uniq.slice(0, 3).join(' / ')}`;
}

function FeedCard({
  item,
  selected,
  onSelectSession,
  onOpenTodos,
}: {
  item: LiveReasoningItem;
  selected: boolean;
  onSelectSession?: (sessionId: string) => void;
  onOpenTodos?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const stepCount = item.steps.filter((s) => s.type !== 'output').length;

  return (
    <div
      className={cn(
        'w-full rounded-lg border px-2.5 py-2 transition-colors',
        selected
          ? 'border-sky-300 bg-sky-50/70 shadow-xs'
          : 'border-neutral-200 bg-white hover:border-neutral-300',
      )}
    >
      <button
        type="button"
        className="w-full text-left cursor-pointer"
        onClick={() => onSelectSession?.(item.sessionId)}
      >
        <div className="flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-neutral-800 truncate">
              {item.customerName}
            </p>
            <p className="text-[9px] text-neutral-500 truncate mt-0.5">
              {item.agentName}
              <span className="mx-1 opacity-40">·</span>
              {item.time}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-[9px] text-neutral-500 line-clamp-1 mt-1.5 leading-snug">
          {item.query}
        </p>
      </button>

      <button
        type="button"
        className="mt-1.5 w-full flex items-center justify-between gap-1 rounded-md px-1.5 py-1 text-left hover:bg-neutral-100/60 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-[9px] text-neutral-500 truncate">
          回答过程 · {processSummary(item.steps)}
        </span>
        <ChevronDown
          size={12}
          className={cn(
            'shrink-0 text-neutral-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="mt-1 pt-1.5 border-t border-neutral-200/70">
          {stepCount > 0 ? (
            <ReplyProcessSteps steps={item.steps} />
          ) : (
            <p className="text-[9px] text-neutral-500 py-1">暂无过程明细</p>
          )}

          {item.status === 'done' && (
            <p className="mt-2 text-[9px] text-emerald-700/90 font-medium">已完成本轮回复</p>
          )}
          {item.status === 'todo' && (
            <div className="mt-2 rounded-md border border-amber-200/80 bg-amber-50/60 px-2 py-1.5">
              <p className="text-[9px] text-amber-900 font-medium">无法闭环 · 已转入待办</p>
              {item.todoTitles.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {item.todoTitles.map((title) => (
                    <li key={title} className="text-[9px] text-amber-900/80 leading-snug">
                      · {title}
                    </li>
                  ))}
                </ul>
              )}
              {onOpenTodos && (
                <button
                  type="button"
                  className="mt-1.5 text-[8px] font-medium text-amber-800 underline underline-offset-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTodos();
                  }}
                >
                  查看待办
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LiveReasoningFeedProps {
  items: LiveReasoningItem[];
  activeSessionId?: string | null;
  onSelectSession?: (sessionId: string) => void;
  onOpenTodos?: () => void;
}

export const LiveReasoningFeed: React.FC<LiveReasoningFeedProps> = ({
  items,
  activeSessionId,
  onSelectSession,
  onOpenTodos,
}) => {
  if (!items.length) {
    return (
      <div className="py-8 text-center text-neutral-500 text-[10px] leading-relaxed px-3">
        <p>暂无回答过程</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 min-h-0 custom-scrollbar">
      {items.map((item) => (
        <FeedCard
          key={item.key}
          item={item}
          selected={item.sessionId === activeSessionId}
          onSelectSession={onSelectSession}
          onOpenTodos={onOpenTodos}
        />
      ))}
    </div>
  );
};
