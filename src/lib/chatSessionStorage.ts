/** 侧栏对话本地持久化（与 chatSessionId / Creagic 会话对齐） */

export const CREAGIC_SESSION_LS_KEY = "creagic_session_id";

const THREAD_PREFIX = "lovart-chat-thread:";
const INDEX_KEY = "lovart-chat-sessions-index";
const MAX_INDEX = 80;

export type ChatSessionIndexRow = {
  id: string;
  title: string;
  updatedAt: number;
  /** 非空时表示该线程归属某编辑器项目（用于历史列表筛选、删除项目时清理） */
  projectId?: string;
};

export function loadSessionIndex(): ChatSessionIndexRow[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as ChatSessionIndexRow[];
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

export function upsertSessionIndex(row: ChatSessionIndexRow): void {
  try {
    const cur = loadSessionIndex().filter((x) => x.id !== row.id);
    cur.unshift(row);
    cur.sort((a, b) => b.updatedAt - a.updatedAt);
    localStorage.setItem(INDEX_KEY, JSON.stringify(cur.slice(0, MAX_INDEX)));
  } catch {
    /* ignore */
  }
}

export function deleteSessionFromIndex(id: string): void {
  try {
    const cur = loadSessionIndex().filter((x) => x.id !== id);
    localStorage.setItem(INDEX_KEY, JSON.stringify(cur));
    localStorage.removeItem(THREAD_PREFIX + id);
  } catch {
    /* ignore */
  }
}

/** 删除某项目下所有本地对话线程（含旧版「会话 id = 项目 id」单线程） */
export function deleteChatsForProject(projectId: string): void {
  const pid = projectId.trim();
  if (!pid) return;
  try {
    const rows = loadSessionIndex();
    const removeRow = (r: ChatSessionIndexRow) =>
      r.projectId === pid || (!r.projectId && r.id === pid);
    const keep = rows.filter((r) => !removeRow(r));
    for (const r of rows) {
      if (removeRow(r)) localStorage.removeItem(THREAD_PREFIX + r.id);
    }
    localStorage.setItem(INDEX_KEY, JSON.stringify(keep));
  } catch {
    /* ignore */
  }
}

/** 清空本机全部对话线程与索引（新建项目时用） */
export function clearAllPersistedChats(): void {
  try {
    for (const row of loadSessionIndex()) {
      localStorage.removeItem(THREAD_PREFIX + row.id);
    }
    localStorage.removeItem(INDEX_KEY);
  } catch {
    /* ignore */
  }
}

export function loadChatThreadJson(sessionId: string): string | null {
  try {
    return localStorage.getItem(THREAD_PREFIX + sessionId);
  } catch {
    return null;
  }
}

export function saveChatThreadJson(sessionId: string, json: string): void {
  try {
    localStorage.setItem(THREAD_PREFIX + sessionId, json);
  } catch {
    /* ignore */
  }
}

/**
 * 编辑器挂载时解析当前应加载的会话 id。
 * - 无项目：沿用 CREAGIC_SESSION_LS_KEY 或新建 UUID。
 * - 有项目：优先索引中该项目下最近更新的线程；否则退回项目 id（兼容旧数据仅存于 lovart-chat-thread:项目id）。
 */
export function resolveInitialChatSessionId(
  projectId: string | null | undefined
): string {
  const pid = projectId?.trim();
  if (!pid) {
    try {
      const existing = localStorage.getItem(CREAGIC_SESSION_LS_KEY);
      if (existing?.trim()) return existing.trim();
    } catch {
      /* fallthrough */
    }
    const id = crypto.randomUUID();
    try {
      localStorage.setItem(CREAGIC_SESSION_LS_KEY, id);
    } catch {
      /* ignore */
    }
    return id;
  }
  const rows = loadSessionIndex();
  const mine = rows
    .filter(
      (r) => r.projectId === pid || (!r.projectId && r.id === pid)
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  if (mine.length > 0) return mine[0].id;
  return pid;
}
