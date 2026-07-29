import { creagicPost, isCreagicConfigured } from "../creagicClient";

export type MemoryPayload = {
  sessionId: string | null;
  userId: string;
  userText: string;
  assistantText: string;
  skillId?: string | null;
  taskType?: string;
  generatedImageUrls?: string[];
};

export async function writeMemory(payload: MemoryPayload): Promise<void> {
  if (!payload.sessionId || !isCreagicConfigured()) return;
  try {
    await creagicPost("/engine/postprocess", {
      session_id: payload.sessionId,
      user_id: payload.userId,
      user_text: payload.userText.slice(0, 12000),
      assistant_text: payload.assistantText.slice(0, 120000),
      metadata: {
        skill_id: payload.skillId,
        task_type: payload.taskType,
        image_count: payload.generatedImageUrls?.length ?? 0,
      },
    });
  } catch {
    // 记忆写入失败不影响主流程
  }
}
