/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ChatMessage, ChatSession } from '../types';

/** 首字色底 — 客户头像统一用姓名首字 + 柔和多色渐变（无真实头像） */
const AVATAR_FALLBACK_TONES = [
  'bg-gradient-to-br from-cyan-300 via-sky-400 to-violet-400 text-white',
  'bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-400 text-white',
  'bg-gradient-to-br from-teal-300 via-cyan-400 to-sky-500 text-white',
  'bg-gradient-to-br from-violet-300 via-fuchsia-300 to-rose-300 text-white',
  'bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 text-white',
  'bg-gradient-to-br from-emerald-300 via-teal-400 to-cyan-500 text-white',
  'bg-gradient-to-br from-indigo-300 via-sky-400 to-cyan-300 text-white',
  'bg-gradient-to-br from-rose-300 via-violet-300 to-sky-400 text-white',
] as const;

/**
 * 产品无法获取客户真实头像，统一返回 undefined，走姓名首字色底。
 */
export function sessionAvatarUrl(_seed: number): string | undefined {
  return undefined;
}

export function sessionAvatarFallbackClass(seed: number): string {
  return AVATAR_FALLBACK_TONES[Math.abs(seed) % AVATAR_FALLBACK_TONES.length];
}

export function sessionListTimestamp(session: ChatSession): string {
  const last = session.messages[session.messages.length - 1];
  if (session.createdAt.includes(' ')) {
    const datePart = session.createdAt.split(' ')[0];
    const time = last?.timestamp ?? session.createdAt.split(' ')[1] ?? '00:00:00';
    return `${datePart} ${time.length <= 8 ? time : time.slice(0, 8)}`;
  }
  return last?.timestamp ?? session.createdAt;
}

export function filterSessionsByQueueTab(
  sessions: ChatSession[],
  tab: 'serving' | 'queued' | 'transferred',
): ChatSession[] {
  if (tab === 'serving') {
    return sessions.filter(
      (s) =>
        (s.status === 'auto' || s.status === 'manual') &&
        s.status !== 'completed' &&
        !s.isTransferred,
    );
  }
  if (tab === 'queued') return sessions.filter((s) => s.status === 'queued');
  return sessions.filter((s) => s.isTransferred && s.status !== 'completed');
}

export function countByQueueTab(
  sessions: ChatSession[],
  tab: 'serving' | 'queued' | 'transferred',
): number {
  return filterSessionsByQueueTab(sessions, tab).length;
}

/** 从会话创建时间推算已服务秒数 */
export function serviceElapsedSeconds(session: ChatSession): number {
  const base = session.createdAt.replace(' ', 'T');
  const start = Date.parse(base.length > 16 ? base : `${base}:00`);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export type ChatRenderItem =
  | { kind: 'date'; label: string; key: string }
  | { kind: 'message'; message: ChatMessage; index: number; key: string };

export function buildChatRenderItems(messages: ChatMessage[]): ChatRenderItem[] {
  const items: ChatRenderItem[] = [];
  let lastDateKey = '';

  messages.forEach((message, index) => {
    const ts = message.timestamp;
    const dateKey = ts.includes(':') ? ts.slice(0, 5) : ts;
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      items.push({
        kind: 'date',
        label: formatDateSeparator(ts, index === 0),
        key: `date_${dateKey}_${index}`,
      });
    }
    items.push({ kind: 'message', message, index, key: `msg_${message.id ?? index}` });
  });

  return items;
}

function formatDateSeparator(timestamp: string, isFirst: boolean): string {
  if (isFirst && timestamp.includes(':')) {
    const now = new Date();
    return `${now.getMonth() + 1}月${now.getDate()}日 ${timestamp}`;
  }
  return timestamp;
}
