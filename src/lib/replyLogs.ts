/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChatMessage, ChatSession, ThoughtStep } from '../types';

export const STEP_LABELS: Record<ThoughtStep['type'], string> = {
  info: '理解',
  search: '检索',
  tool: '工具',
  decision: '判断',
  output: '回复',
};

export interface ReplyLogGroup {
  message: ChatMessage;
  steps: ThoughtStep[];
}

/** 按客户消息分组 AI 回复过程日志 */
export function buildReplyLogGroups(session: ChatSession): ReplyLogGroup[] {
  const customerMsgs = session.messages.filter((m) => m.sender === 'customer');
  const byTrigger = new Map<string, ThoughtStep[]>();
  const orphans: ThoughtStep[] = [];

  for (const step of session.thoughtTrace) {
    if (step.triggerMessageId) {
      const list = byTrigger.get(step.triggerMessageId) ?? [];
      list.push(step);
      byTrigger.set(step.triggerMessageId, list);
    } else {
      orphans.push(step);
    }
  }

  const groups: ReplyLogGroup[] = [];

  for (const msg of customerMsgs) {
    const steps = byTrigger.get(msg.id);
    if (steps?.length) {
      groups.push({ message: msg, steps });
    }
  }

  if (orphans.length) {
    let chunk: ThoughtStep[] = [];
    let orphanIdx = 0;

    const flush = (msg: ChatMessage | undefined) => {
      if (!chunk.length) return;
      const target =
        msg ??
        customerMsgs[groups.length] ??
        customerMsgs[customerMsgs.length - 1];
      if (target) {
        groups.push({ message: target, steps: [...chunk] });
      }
      chunk = [];
    };

    for (const step of orphans) {
      chunk.push(step);
      if (step.type === 'output' || (step.type === 'decision' && step.message.includes('转'))) {
        flush(customerMsgs[orphanIdx]);
        orphanIdx += 1;
      }
    }
    flush(customerMsgs[orphanIdx]);
  }

  const seen = new Set<string>();
  return groups.filter((g) => {
    const key = `${g.message.id}:${g.steps.map((s) => s.id).join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
