/**
 * 调用 Python Creagic 侧车（FastAPI）。未配置 CREAGIC_PYTHON_URL 时所有方法返回 null。
 */
const CREAGIC_URL = (process.env.CREAGIC_PYTHON_URL || "").replace(/\/$/, "");

const CREAGIC_FETCH_TIMEOUT_MS = (() => {
  const n = Number(process.env.CREAGIC_FETCH_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 12_000;
})();

function creagicFetchSignal(): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(CREAGIC_FETCH_TIMEOUT_MS);
  } catch {
    return undefined;
  }
}

export async function creagicPost<T = unknown>(
  path: string,
  body: unknown
): Promise<T | null> {
  if (!CREAGIC_URL) return null;
  try {
    const r = await fetch(`${CREAGIC_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: creagicFetchSignal(),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function creagicGet<T = unknown>(path: string): Promise<T | null> {
  if (!CREAGIC_URL) return null;
  try {
    const r = await fetch(`${CREAGIC_URL}${path}`, {
      signal: creagicFetchSignal(),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export function isCreagicConfigured(): boolean {
  return Boolean(CREAGIC_URL);
}

export type CreagicPrepareResult = {
  memory_context?: string;
  memories_used?: number;
  session_id?: string;
};

export type CreagicToolsOpenAI = {
  tools?: Array<{
    type: string;
    function: { name: string; description?: string; parameters: Record<string, unknown> };
  }>;
};

export type CreagicValidateResult = {
  validation?: Record<string, unknown>;
  fix_suggestion?: { output?: string; records?: unknown[] };
};
