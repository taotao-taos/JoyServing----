/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 工作日志 — 京小灵回复链路：思考 → 员工知识/文档/技能/工具 → 完成
 */

import React from 'react';
import type { ThoughtStep } from '../../types';
import type { ReplyLogGroup } from '../../lib/replyLogs';
import { WORKLOG_AGENT_NAME, resolveWorkLogResource } from '../../lib/workLogUi';

function AgentAvatar() {
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-500 to-neutral-800 flex items-center justify-center shrink-0 ring-2 ring-white shadow-sm z-10">
      <span className="text-[11px] font-bold text-white leading-none select-none">京</span>
    </div>
  );
}

function HexToolIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path
        d="M8 1.2L13.2 4.2v5.6L8 13.8 2.8 9.8V4.2L8 1.2z"
        fill="currentColor"
        opacity="0.9"
      />
      <circle cx="8" cy="8" r="1.6" fill="white" />
    </svg>
  );
}

function ResourcePill({ step }: { step: ThoughtStep }) {
  const meta = resolveWorkLogResource(step);
  if (!meta) return null;

  return (
    <div className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg bg-[#F3EBE3] text-[#7C5C3A] px-2 py-1 text-[10px] font-medium w-fit max-w-full leading-snug">
      <HexToolIcon />
      <span className="text-[#A8845C] shrink-0">{meta.kindLabel}</span>
      <span className="text-[#5C4030] font-semibold truncate max-w-[140px]">{meta.name}</span>
      {meta.tag && (
        <>
          <span className="text-[#C4A574]">·</span>
          <span className="text-[#7C5C3A] shrink-0">{meta.tag}</span>
        </>
      )}
      <span className="text-[#A8845C] shrink-0 ml-0.5">已完成</span>
    </div>
  );
}

function ReplyFlow({ steps, agentName }: { steps: ThoughtStep[]; agentName?: string }) {
  const outputStep = steps.find((s) => s.type === 'output');
  const processSteps = steps.filter((s) => s.type !== 'output');

  if (!processSteps.length && !outputStep) return null;

  const hasConnector = Boolean(outputStep && processSteps.length);

  const agentSubtitle = agentName ? (
    <p className="text-[10px] text-neutral-500 mb-1.5 -mt-0.5">
      数字员工 · {agentName}
    </p>
  ) : null;

  return (
    <div className="relative">
      {processSteps.length > 0 && (
        <div className="flex gap-2.5 relative">
          <div className="flex flex-col items-center shrink-0">
            <AgentAvatar />
            {hasConnector && <div className="w-px flex-1 bg-neutral-200 min-h-[16px] mt-1" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5 pb-3">
            <p className="text-[13px] font-semibold text-neutral-800 tracking-tight mb-1.5">
              {WORKLOG_AGENT_NAME}
            </p>
            {agentSubtitle}
            <div className="space-y-2">
              {processSteps.map((step) => {
                if (step.type === 'info' || step.type === 'decision') {
                  return (
                    <p
                      key={step.id}
                      className="text-[11px] text-neutral-800/85 leading-relaxed whitespace-pre-wrap"
                    >
                      {step.message}
                    </p>
                  );
                }
                if (step.type === 'search' || step.type === 'tool') {
                  return (
                    <div key={step.id}>
                      <ResourcePill step={step} />
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      )}

      {outputStep && (
        <div className="flex gap-2.5 relative">
          <AgentAvatar />
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[13px] font-semibold text-neutral-800 tracking-tight mb-1">
              {WORKLOG_AGENT_NAME}
            </p>
            {agentSubtitle}
            <p className="text-[11px] text-neutral-800/85 leading-relaxed">已完成回复</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface WorkLogTimelineProps {
  groups: ReplyLogGroup[];
  agentName?: string;
}

export const WorkLogTimeline: React.FC<WorkLogTimelineProps> = ({ groups, agentName }) => {
  if (!groups.length) {
    return (
      <div className="py-8 text-center text-neutral-500 text-[10px] leading-relaxed px-3">
        <p>暂无执行日志</p>
        <p className="text-[9px] mt-1">
          {WORKLOG_AGENT_NAME} 回复时将展示调用的知识库、文档、技能与工具
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-1">
      {groups.map(({ message, steps }, index) => (
        <div key={message.id}>
          {index > 0 && <div className="border-t border-neutral-200/50 mb-5" />}
          <p className="text-[9px] text-neutral-500 leading-snug line-clamp-2 mb-3">
            <span className="font-medium text-neutral-800/70">{message.name}</span>
            <span className="mx-1 opacity-40">·</span>
            {message.content}
          </p>
          <ReplyFlow steps={steps} agentName={agentName} />
        </div>
      ))}
    </div>
  );
};
