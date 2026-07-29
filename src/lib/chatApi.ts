import type { EditorSkill } from "../config/editorSkills";

/** 须带技能 id，供服务端读取 manifest.workflow */
export type ChatSkillPayload = Pick<
  EditorSkill,
  "id" | "title" | "description"
>;

export type ChatApiMessage = { role: "user" | "assistant"; content: string };

export type ChatRequestBody = {
  messages: ChatApiMessage[];
  /** 当前回合参考图（可选）：用于多模态理解与工具调用默认参考 */
  referenceImageUrls?: string[];
  /** 已废弃：服务端固定 CHAT_MODEL，传值会被忽略 */
  modelId?: string;
  modelAuto?: boolean;
  skill: ChatSkillPayload | null;
  /** Creagic Python 侧车会话 ID */
  sessionId?: string | null;
  userId?: string | null;
  /** 多阶段编排：intent / opening / analyze 为轻量单轮；final 或未传走完整对话 */
  orchestrationStage?: "intent" | "opening" | "analyze" | "final";
  /** analyze 阶段：画面/参考 或 需求与约束 */
  analyzeFocus?: "image" | "requirement";
  /** 传入终稿阶段，注入 system 供对齐 */
  priorPipelineOutputs?: {
    intent?: string;
    opening?: string;
    analysis?: string;
  };
  /** 深度推理：服务端在 system 中追加逐步推理指引 */
  deepThink?: boolean;
  /** 单轮快速对话，不挂载侧车工具 */
  quickChat?: boolean;
};

export type ChatResponseBody = {
  content?: string;
  model?: string;
  error?: string;
  type?: "task_plan";
  plan?: {
    type?: string;
    summary?: string;
    totalCount?: number;
    tasks?: Array<{ label?: string }>;
    needsConfirmation?: boolean;
  };
  message?: string;
  needsConfirmation?: boolean;
  /** 已由服务端从 ```cta``` 解析 */
  ctas?: string[];
  creagic?: Record<string, unknown>;
  orchestrationStage?: string;
  source?: "agent";
};

export async function sendChatCompletion(
  body: ChatRequestBody,
  options?: { signal?: AbortSignal }
): Promise<ChatResponseBody> {
  const res = await fetch("/api/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  const text = await res.text();
  let data = {} as ChatResponseBody & { error?: string; detail?: string };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    if (!res.ok) {
      const hint =
        res.status === 500 || res.status === 502
          ? "若刚启动前端，请在项目根目录另开终端执行 npm run server（默认监听 3847），或使用 npm run dev:full 同时启动 API 与页面。"
          : "";
      throw new Error(
        text.trim()
          ? `请求失败 (${res.status})：${text.slice(0, 280)}`
          : `请求失败 (${res.status})。${hint}`
      );
    }
    throw new Error("无法解析服务器响应");
  }

  if (!res.ok) {
    const base =
      typeof data.error === "string" && data.error ? data.error : `请求失败 (${res.status})`;
    const detail =
      typeof data.detail === "string" && data.detail.trim() ? data.detail.trim() : "";
    throw new Error(detail ? `${base}（${detail}）` : base);
  }

  return { ...data, source: "agent" };
}

export async function getChatHealth(): Promise<{
  ok: boolean;
  configured: boolean;
}> {
  try {
    const r = await fetch("/api/health");
    const j = (await r.json()) as { configured?: boolean };
    return { ok: r.ok, configured: Boolean(j.configured) };
  } catch {
    return { ok: false, configured: false };
  }
}
