/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 客服工作台右侧：披露每一句回复的聊天过程（理解→检索/工具→判断→回复/待办）。
 * 无法闭环时可转入待办，不转人工。
 */

import type { ChatSession, HiredAgent, ThoughtStep } from '../types';
import { buildReplyLogGroups } from './replyLogs';

export type LiveReasoningStatus = 'running' | 'done' | 'todo';

export interface LiveReasoningItem {
  key: string;
  sessionId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  /** 客户本轮原话 */
  query: string;
  steps: ThoughtStep[];
  status: LiveReasoningStatus;
  time: string;
  scenario: string;
  sessionStatus: ChatSession['status'];
  /** 本轮沉淀的待办标题 */
  todoTitles: string[];
}

function deriveStatus(steps: ThoughtStep[], todoTitles: string[]): LiveReasoningStatus {
  if (todoTitles.length > 0) return 'todo';
  const joined = steps.map((s) => s.message).join(' ');
  if (/待办|交回待办|生成待办|无法闭环/.test(joined)) return 'todo';
  const hasOutput = steps.some((s) => s.type === 'output');
  return hasOutput ? 'done' : 'running';
}

function timeKey(time: string): string {
  return time.replace(/[^\d]/g, '').padEnd(6, '0');
}

/** 跨会话汇总每一轮回复的处理过程（按时间倒序） */
export function buildLiveReasoningFeed(
  sessions: ChatSession[],
  agents: HiredAgent[],
  filterAgentId?: string | null,
): LiveReasoningItem[] {
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? '数字员工';

  const items: LiveReasoningItem[] = [];

  for (const session of sessions) {
    if (filterAgentId && session.assignedAgentId !== filterAgentId) continue;
    if (session.status === 'completed') continue;

    const groups = buildReplyLogGroups(session);
    if (!groups.length) continue;

    for (const group of groups) {
      const lastStep = group.steps[group.steps.length - 1];
      const todoTitles = (session.todos ?? [])
        .filter((t) => t.triggerMessageId === group.message.id)
        .map((t) => t.title);

      items.push({
        key: `${session.id}_${group.message.id}`,
        sessionId: session.id,
        customerName: session.customerName,
        agentId: session.assignedAgentId,
        agentName: agentName(session.assignedAgentId),
        query: group.message.content,
        steps: group.steps,
        status: deriveStatus(group.steps, todoTitles),
        time: lastStep?.time ?? session.createdAt.slice(-8),
        scenario: session.scenario,
        sessionStatus: session.status,
        todoTitles,
      });
    }
  }

  return items.sort((a, b) => {
    const statusRank = (s: LiveReasoningStatus) =>
      s === 'running' ? 0 : s === 'todo' ? 1 : 2;
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    return timeKey(b.time).localeCompare(timeKey(a.time));
  });
}
