/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 单轮会话质检结果：摘要卡 + 质检报告弹层
 */

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { HiredAgent } from '../../types';
import {
  buildQcEncourageLine,
  buildQcSummaryText,
  splitQcResultTags,
  type QcScoreTag,
  type QcSessionAuditResult,
} from '@/lib/qcCapabilityMock';
import { MODAL_OVERLAY } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { Check, Smile, X } from '@/lib/icons';

function isEmojiAvatar(avatar: string): boolean {
  return Boolean(avatar) && !avatar.startsWith('http') && !avatar.startsWith('data:') && !avatar.startsWith('/');
}

function ScoreTagPill({
  tag,
  tone,
}: {
  tag: QcScoreTag;
  tone: 'keep' | 'improve';
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-[11px] leading-snug',
        tone === 'keep'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-amber-50 text-amber-900',
      )}
    >
      <span className="min-w-0 truncate font-medium">{tag.name}</span>
      <span className="shrink-0 font-bold tabular-nums">{tag.scoreLabel}</span>
    </div>
  );
}

export interface OnboardingQcSingleRoundResultProps {
  agent: HiredAgent;
  result: QcSessionAuditResult;
  onRetry?: () => void;
}

export const OnboardingQcSingleRoundResult: React.FC<OnboardingQcSingleRoundResultProps> = ({
  agent,
  result,
  onRetry,
}) => {
  const [reportOpen, setReportOpen] = useState(false);
  const { keep, improve } = useMemo(() => splitQcResultTags(result), [result]);
  const encourage = useMemo(() => buildQcEncourageLine(result), [result]);
  const summary = useMemo(() => buildQcSummaryText(result), [result]);
  const roleLabel =
    agent.description?.trim().slice(0, 18) ||
    agent.persona?.trim().slice(0, 18) ||
    '质检数字员工';

  useEffect(() => {
    if (!reportOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReportOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reportOpen]);

  return (
    <>
      <div className="rounded-[20px] bg-gradient-to-br from-sky-50 via-white to-indigo-50/40 p-3 sm:p-4 space-y-3 border border-sky-100/80 shadow-[0_8px_28px_rgba(31,35,41,0.04)]">
        {/* 头卡：头像 + 评分 */}
        <div className="rounded-[18px] bg-white/90 border border-neutral-200/70 px-3.5 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 rounded-2xl overflow-hidden border border-sky-100 bg-sky-50 flex items-center justify-center text-2xl shadow-sm">
              {isEmojiAvatar(agent.avatar) ? (
                <span aria-hidden>{agent.avatar || '🧑‍💼'}</span>
              ) : (
                <img
                  src={agent.avatar}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-neutral-900 leading-tight truncate">
                {agent.name}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1 truncate">{roleLabel}</p>
            </div>

            <div className="shrink-0 text-right pl-2">
              <p className="text-[40px] font-bold leading-none tabular-nums text-orange-500 tracking-tight">
                {result.score}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1">综合质检评分</p>
            </div>
          </div>
        </div>

        {/* 明细卡 */}
        <div className="rounded-[18px] bg-white border border-neutral-200/70 px-3.5 py-3.5 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <p className="text-center text-[12px] font-semibold text-neutral-800">继续保持</p>
              {keep.length === 0 ? (
                <p className="text-[11px] text-neutral-500 text-center py-2">暂无加分亮点</p>
              ) : (
                <div className="space-y-1.5">
                  {keep.map((tag) => (
                    <ScoreTagPill key={tag.itemId} tag={tag} tone="keep" />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-center text-[12px] font-semibold text-neutral-800">有待改进</p>
              {improve.length === 0 ? (
                <p className="text-[11px] text-neutral-500 text-center py-2">暂无扣分项</p>
              ) : (
                <div className="space-y-1.5">
                  {improve.map((tag) => (
                    <ScoreTagPill key={tag.itemId} tag={tag} tone="improve" />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[10px] bg-neutral-800 text-white text-[12px] font-semibold hover:opacity-90 cursor-pointer"
            >
              <Check size={14} />
              质检报告
            </button>
          </div>
        </div>
      </div>

      {reportOpen
        ? createPortal(
            <div
              className={cn(MODAL_OVERLAY, 'z-[140] p-4')}
              onClick={() => setReportOpen(false)}
            >
              <div
                className="relative w-full max-w-[380px] max-h-[min(86vh,640px)] overflow-hidden rounded-[32px] bg-white shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="质检报告"
              >
                <button
                  type="button"
                  aria-label="关闭"
                  onClick={() => setReportOpen(false)}
                  className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 inline-flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-7 pt-9 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[56px] font-bold leading-none tabular-nums text-orange-500">
                        {result.score}
                      </p>
                      <p className="text-[16px] font-semibold text-neutral-900 mt-2">
                        {encourage}
                      </p>
                    </div>
                    <div className="relative shrink-0 w-20 h-20 mt-1" aria-hidden>
                      <span className="absolute left-2 top-3 h-2 w-2 rounded-sm bg-emerald-400 rotate-12" />
                      <span className="absolute right-3 top-2 h-2 w-2 rounded-sm bg-orange-400 -rotate-6" />
                      <span className="absolute right-1 top-8 h-1.5 w-1.5 rounded-sm bg-sky-400 rotate-45" />
                      <span className="absolute left-1 bottom-5 h-1.5 w-1.5 rounded-sm bg-violet-400" />
                      <span className="absolute right-4 bottom-3 h-2 w-2 rounded-sm bg-amber-300 rotate-12" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-14 w-14 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center shadow-sm">
                          <Smile size={28} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[22px] font-bold text-neutral-900 tabular-nums leading-none">
                        {result.dialogueRounds}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-2">对话轮次</p>
                    </div>
                    <div>
                      <p className="text-[22px] font-bold text-neutral-900 tabular-nums leading-none">
                        {result.hits.length}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-2">标签命中</p>
                    </div>
                    <div>
                      <p className="text-[22px] font-bold text-neutral-900 tabular-nums leading-none">
                        {result.avgResponseSec}s
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-2">平均响应时长</p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl bg-neutral-100/80 px-4 py-4 max-h-[220px] overflow-y-auto custom-scrollbar">
                    <p className="text-center text-[13px] font-bold text-neutral-900 mb-3">
                      服务质检总结
                    </p>
                    <p className="text-[12px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
                      {summary}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 px-7 pb-7 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportOpen(false);
                      onRetry?.();
                    }}
                    className="w-full h-12 rounded-full bg-blue-600 text-white text-[15px] font-semibold shadow-[0_8px_20px_rgba(37,99,235,0.28)] hover:bg-blue-700 cursor-pointer"
                  >
                    再次体验
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
};
