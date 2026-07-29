/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 对话气泡内的「处理过程」折叠 — 对齐 JoyServing 设计规范；
 * 短标题纯文本；参数/结果等过长内容用 PANEL 卡片 + JSON 块承载。
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { ThoughtStep } from '../../types';
import { resolveWorkLogResource } from '../../lib/workLogUi';
import { WORKSPACE_COPY } from '@/lib/platformTerminology';
import { PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { CheckCircle2, ChevronDown, Copy, FileText, Settings, UserCheck } from '@/lib/icons';
import { MatrixLoader } from './MatrixLoader';

/** 超过该字数视为过长，用卡片承载 */
const LONG_FIELD_CHARS = 42;

export interface ExecutionProcessFoldProps {
  steps: ThoughtStep[];
  status: 'running' | 'done';
  userQuery?: string;
  /** 本轮执行 runId */
  runId?: string;
  onCopyRunId?: (runId: string) => void;
  className?: string;
}

type ActionDetail = {
  params: Record<string, unknown>;
  result: Record<string, unknown>;
  /** 展示用技术名 / skill id */
  techName?: string;
  /** 步骤视觉类型 */
  variant?: 'default' | 'skill-rw' | 'transfer' | 'rag' | 'read-file';
};

type DisplayStep =
  | { kind: 'reasoning'; id: string; text: string; detail?: string }
  | { kind: 'action'; id: string; text: string; detail?: ActionDetail };

function slugify(input: string): string {
  return input
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .toLowerCase() || 'resource';
}

function agentWorkspacePrefix(triggerId?: string): string {
  const seed = triggerId?.replace(/^msg_/, '').slice(0, 12) ?? 'fc1d91d39923';
  return `~/.joypi/workspace/agent_${seed}`;
}

function isLongField(text: string): boolean {
  return text.length > LONG_FIELD_CHARS || text.includes('\n');
}

function summarizeReasoning(text: string): { text: string; detail?: string } {
  const agent = text.match(/数字员工【([^】]+)】/)?.[1];
  const scenario = text.match(/场景：([^。]+)/)?.[1];
  const persona = text.match(/入职标签「([^」]+)/)?.[1];
  const parts: string[] = [];
  if (agent) parts.push(`激活 ${agent}`);
  if (scenario) parts.push(scenario);
  const line = parts.join(' · ') || '理解用户诉求';
  const detail = persona
    ? `按入职标签「${persona}${persona.length >= 36 ? '…' : ''}」理解诉求。`
    : undefined;
  return { text: line, detail };
}

/** Skill 读写：读 SKILL.md + 结构化调用，参数/结果都较丰满 */
function buildSkillReadWriteDetail(
  skillLabel: string,
  skillId: string,
  workspace: string,
  userQuery?: string,
): ActionDetail {
  const skillSlug = slugify(skillLabel);
  const skillPath = `${workspace}/skills/${skillId || skillSlug}/SKILL.md`;
  const utterance = userQuery?.trim() || '请帮我处理一下';

  return {
    techName: skillId || skillSlug,
    variant: 'skill-rw',
    params: {
      operation: 'skill_read_write',
      skill_id: skillId || skillSlug,
      skill_name: skillLabel,
      file_path: skillPath,
      read: {
        sections: ['metadata', 'steps', 'parameters', 'guardrails'],
        encoding: 'utf-8',
      },
      write_context: {
        user_utterance_verbatim: utterance,
        turn_index: 1,
        session_channel: 'onboard_test',
      },
      invoke: {
        input: {
          query: utterance,
          locale: 'zh-CN',
          require_evidence: true,
        },
        options: {
          dry_run: false,
          timeout_ms: 8000,
        },
      },
    },
    result: {
      status: 'success',
      isError: false,
      content: [
        {
          type: 'text',
          text:
            `已读取技能「${skillLabel}」定义并完成一次调用。\n` +
            `步骤：1) 校验入参 2) 匹配业务规则 3) 生成结构化结果 4) 回写执行摘要。`,
        },
      ],
      skill_meta: {
        name: skillLabel,
        version: 'v4_9',
        path: skillPath,
      },
      writeback: {
        summary_path: `${workspace}/runs/latest/skill_${skillId || skillSlug}.json`,
        bytes_written: 1842,
        fields: ['input_snapshot', 'rule_hits', 'output_draft', 'latency_ms'],
      },
      metrics: {
        read_ms: 42,
        invoke_ms: 318,
        write_ms: 27,
        total_ms: 387,
      },
    },
  };
}

function buildTransferDetail(userQuery?: string): ActionDetail {
  const utterance = userQuery?.trim() || '转人工';
  return {
    techName: 'explicit_transfer_request_after_threshold',
    variant: 'transfer',
    params: {
      preconditions_check: {
        current_turn_has_explicit_intent: /转人工|人工|坐席/.test(utterance),
        not_in_clarification_phase: true,
        threshold_quotes_met: false,
        channel_allows_transfer: true,
      },
      reason: 'explicit_transfer_request_after_threshold',
      user_utterance_verbatim: utterance,
      evidence_quotes: [
        {
          turn_index: 1,
          quote: utterance,
        },
      ],
      confidence: 1,
      text_alternatives_ruled_out:
        '用户已明确表达转人工诉求；在能力测试场景下仍需满足多轮证据阈值，优先尝试文本安抚与澄清。',
    },
    result: {
      isError: true,
      content: [
        {
          type: 'text',
          text:
            '转人工未执行：证据阈值未满足（需要至少来自不同轮次的 3 条引用，当前仅 1 条）。' +
            '请继续用文本安抚并收集关键信息，暂勿重复调用本工具。',
        },
      ],
    },
  };
}

function buildDisplaySteps(steps: ThoughtStep[], userQuery?: string): DisplayStep[] {
  const processSteps = steps.filter((s) => s.type !== 'output');
  if (!processSteps.length && steps.length === 0) return [];

  const triggerId = processSteps[0]?.triggerMessageId;
  const workspace = agentWorkspacePrefix(triggerId);
  const out: DisplayStep[] = [];
  let injectedRag = false;
  let injectedSkillRw = false;

  for (const step of processSteps) {
    if (step.type === 'decision') continue;

    if (step.type === 'info') {
      const { text, detail } = summarizeReasoning(step.message);
      out.push({ kind: 'reasoning', id: step.id, text, detail });
      continue;
    }

    if (step.type === 'search') {
      if (userQuery && !injectedRag) {
        injectedRag = true;
        const rewritten = userQuery.length > 18
          ? `我想查询${userQuery.replace(/[？?]/g, '')}的相关情况`
          : userQuery;
        out.push({
          kind: 'action',
          id: `${step.id}_rag`,
          text: '改写查询',
          detail: {
            techName: 'rag_rewrite_query',
            variant: 'rag',
            params: { question: userQuery },
            result: { content: [{ text: rewritten, type: 'text' }] },
          },
        });
      }

      const meta = resolveWorkLogResource(step);
      const resourceId = step.resourceId ?? slugify(meta?.name ?? 'doc');
      const label = meta?.name ?? step.message.replace(/^检索员工知识：|^索引文档：/, '');
      const isDoc = meta?.kind === 'doc';
      const filePath = isDoc
        ? `${workspace}/docs/${slugify(label)}.md`
        : `${workspace}/knowledge/${resourceId}/${slugify(label)}.md`;

      out.push({
        kind: 'action',
        id: step.id,
        text: `检索 ${label}`,
        detail: {
          techName: 'read_file',
          variant: 'read-file',
          params: { file_path: filePath },
          result: {
            content: [
              {
                type: 'text',
                text: `已检索「${label}」相关片段，并写入本轮上下文。`,
              },
            ],
          },
        },
      });
      continue;
    }

    if (step.type === 'tool') {
      const meta = resolveWorkLogResource(step);
      const label = meta?.name ?? step.message.replace(/^调用员工技能：/, '');
      const skillId = step.resourceId ?? slugify(label);
      const isTransfer = meta?.kind === 'tool' || /转人工|transfer/i.test(label);

      // 在首次技能调用前插入「Skill 读写」——参数/结果都较完整
      if (!injectedSkillRw && !isTransfer) {
        injectedSkillRw = true;
        out.push({
          kind: 'action',
          id: `${step.id}_skill_rw`,
          text: 'Skill 读写',
          detail: buildSkillReadWriteDetail(label, skillId, workspace, userQuery),
        });
      }

      if (isTransfer) {
        out.push({
          kind: 'action',
          id: step.id,
          text: '转人工',
          detail: buildTransferDetail(userQuery),
        });
        continue;
      }

      out.push({
        kind: 'action',
        id: step.id,
        text: `调用 ${label}`,
        detail: {
          techName: skillId,
          variant: 'default',
          params: {
            skill_id: skillId,
            skill_name: label,
            input: {
              query: userQuery ?? step.message,
              locale: 'zh-CN',
            },
            options: { timeout_ms: 5000 },
          },
          result: {
            status: 'success',
            isError: false,
            content: [
              {
                type: 'text',
                text: `技能「${label}」执行完成，已生成可回复草稿。`,
              },
            ],
            ...(meta?.tag ? { tag: meta.tag } : {}),
          },
        },
      });
    }
  }

  // 若本轮只有检索、没有技能工具，也补一条 Skill 读写示例（便于演示）
  if (!injectedSkillRw) {
    const faqOrFirst = processSteps.find((s) => s.type === 'search' || s.type === 'tool');
    const fallbackId = faqOrFirst?.resourceId ?? 'skill_demo';
    const fallbackName = faqOrFirst?.resourceName ?? '业务技能';
    out.push({
      kind: 'action',
      id: `skill_rw_${triggerId ?? 'demo'}`,
      text: 'Skill 读写',
      detail: buildSkillReadWriteDetail(fallbackName, fallbackId, workspace, userQuery),
    });
  }

  return out;
}

function JsonCard({ value }: { value: Record<string, unknown> }) {
  return (
    <div className={cn(PANEL, 'bg-neutral-50 px-2.5 py-2 max-h-48 overflow-y-auto custom-scrollbar')}>
      {/* 等宽技术内容：10px，对齐规范「最微字 / ID」 */}
      <pre className="text-[10px] leading-relaxed text-neutral-800 font-mono whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function ParamsResultDetail({ detail }: { detail: ActionDetail }) {
  const resultOk = detail.result.isError !== true;

  return (
    <div className="space-y-2.5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-500 mb-1">参数</p>
        <JsonCard value={detail.params} />
      </div>
      <div className="min-w-0">
        <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-neutral-500">
          结果
          {resultOk ? (
            <>
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span className="text-emerald-700">成功</span>
            </>
          ) : (
            <span className="text-rose-600">未达成</span>
          )}
        </p>
        <JsonCard value={detail.result} />
      </div>
    </div>
  );
}

/** 简单键值详情（短字段）；过长值仍用卡片 */
function SimpleDetailFields({ detail }: { detail: ActionDetail }) {
  const rows: { label: string; value: string }[] = [];
  const q = detail.params.question;
  if (typeof q === 'string') rows.push({ label: '问', value: q });
  const path = detail.params.file_path;
  if (typeof path === 'string') rows.push({ label: '文件', value: path });
  const content = detail.result.content;
  if (Array.isArray(content) && content[0] && typeof content[0] === 'object' && content[0] !== null) {
    const text = (content[0] as { text?: string }).text;
    if (text) rows.push({ label: '结果', value: text });
  }
  if (!rows.length) {
    return <ParamsResultDetail detail={detail} />;
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value.slice(0, 12)}`} className="min-w-0">
          <p className="text-xs font-medium text-neutral-500 mb-1">{row.label}</p>
          {isLongField(row.value) ? (
            <div className={cn(PANEL, 'bg-neutral-50 px-2.5 py-2')}>
              <p className="text-xs/relaxed text-neutral-800 whitespace-pre-wrap break-words font-mono">
                {row.value}
              </p>
            </div>
          ) : (
            <p className="text-xs/relaxed text-neutral-800 break-words">{row.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function LongTextCard({ text }: { text: string }) {
  return (
    <div className={cn(PANEL, 'px-2.5 py-2')}>
      <p className="text-xs/relaxed text-neutral-800 whitespace-pre-wrap break-words">
        {text}
      </p>
    </div>
  );
}

function StepIcon({ variant }: { variant?: ActionDetail['variant'] }) {
  if (variant === 'transfer') {
    return <UserCheck size={12} className="text-sky-600 shrink-0" />;
  }
  if (variant === 'skill-rw') {
    return <Settings size={12} className="text-violet-600 shrink-0" />;
  }
  if (variant === 'read-file') {
    return <FileText size={12} className="text-sky-600 shrink-0" />;
  }
  return null;
}

function FlowLine({
  text,
  detail,
}: {
  text: string;
  detail?: string | ActionDetail;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const hasDetail = Boolean(detail);
  const titleIsLong = isLongField(text);
  const actionDetail = typeof detail === 'object' && detail ? detail : undefined;
  const useRichJson =
    actionDetail &&
    (actionDetail.variant === 'skill-rw' ||
      actionDetail.variant === 'transfer' ||
      Object.keys(actionDetail.params).length > 3);

  // Skill 读写默认展开，方便看到参数/结果
  useEffect(() => {
    if (actionDetail?.variant === 'skill-rw') {
      setShowDetail(true);
    }
  }, [actionDetail?.variant]);

  return (
    <div className="min-w-0 space-y-1.5">
      {titleIsLong ? (
        <button
          type="button"
          disabled={!hasDetail}
          onClick={() => hasDetail && setShowDetail((v) => !v)}
          className={cn('w-full text-left', hasDetail && 'cursor-pointer')}
        >
          <LongTextCard text={text} />
          {hasDetail && (
            <span className="mt-1 inline-block text-xs text-neutral-500 hover:text-neutral-800">
              {showDetail ? '收起详情' : '查看详情'}
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled={!hasDetail}
          onClick={() => hasDetail && setShowDetail((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 max-w-full text-left text-xs/relaxed',
            hasDetail
              ? 'text-neutral-800 hover:text-neutral-950 cursor-pointer'
              : 'text-neutral-800 cursor-default',
          )}
        >
          <StepIcon variant={actionDetail?.variant} />
          <span className="truncate font-medium">{text}</span>
          {actionDetail?.techName && (
            <span className="truncate text-[10px] font-medium text-neutral-400 font-mono max-w-[40%]">
              {actionDetail.techName}
            </span>
          )}
          {hasDetail && (
            <span className="shrink-0 text-neutral-400">
              {showDetail ? <ChevronDown size={12} /> : <ChevronDown size={12} className="-rotate-90" />}
            </span>
          )}
        </button>
      )}

      {hasDetail && showDetail && (
        <div className={cn(PANEL, 'px-2.5 py-2.5')}>
          {typeof detail === 'string' ? (
            <p
              className={cn(
                'text-xs/relaxed whitespace-pre-wrap break-words',
                isLongField(detail) ? 'text-neutral-800' : 'text-neutral-600',
              )}
            >
              {detail}
            </p>
          ) : actionDetail ? (
            useRichJson ? (
              <ParamsResultDetail detail={actionDetail} />
            ) : (
              <SimpleDetailFields detail={actionDetail} />
            )
          ) : null}
        </div>
      )}
    </div>
  );
}

export const ExecutionProcessFold: React.FC<ExecutionProcessFoldProps> = ({
  steps,
  status,
  userQuery,
  runId,
  onCopyRunId,
  className,
}) => {
  const displaySteps = useMemo(
    () => buildDisplaySteps(steps, userQuery),
    [steps, userQuery],
  );
  const stepCount = Math.max(displaySteps.length, 1);
  const [open, setOpen] = useState(status === 'running');

  useEffect(() => {
    setOpen(status === 'running');
  }, [status]);

  const title =
    status === 'running'
      ? `${WORKSPACE_COPY.processSteps}中…`
      : `${WORKSPACE_COPY.processSteps} · ${stepCount} 步`;

  return (
    <div className={cn('w-full min-w-0 font-sans', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition duration-200 cursor-pointer select-none py-0.5"
      >
        {status === 'running' ? (
          <MatrixLoader size={14} className="shrink-0" />
        ) : (
          <ChevronDown
            size={14}
            className={cn(
              'shrink-0 text-neutral-400 transition-transform duration-200',
              !open && '-rotate-90',
            )}
          />
        )}
        <span className="shrink-0">{title}</span>
        {status === 'done' && (
          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-1.5 space-y-2">
          {runId && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 text-[10px] font-medium text-neutral-400">runId</span>
              <span
                className="min-w-0 truncate text-[10px] font-medium text-neutral-500 font-mono"
                title={runId}
              >
                {runId}
              </span>
              {onCopyRunId && (
                <button
                  type="button"
                  onClick={() => onCopyRunId(runId)}
                  className="shrink-0 p-0.5 rounded-[7px] text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition duration-200 cursor-pointer"
                  title="复制 runId"
                >
                  <Copy size={12} />
                </button>
              )}
            </div>
          )}
          {displaySteps.map((step) => (
            <FlowLine
              key={step.id}
              text={step.text}
              detail={step.detail}
            />
          ))}
          {status === 'running' && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <MatrixLoader size={14} />
              继续处理中…
            </div>
          )}
        </div>
      )}
    </div>
  );
};
