import type { EditorSkill } from "../config/editorSkills";

export async function generateVideoWithPrompt(
  body: {
    prompt: string;
    /** 已忽略：服务端生视频不再注入技能文档，仅使用 prompt */
    skill: Pick<EditorSkill, "id" | "title" | "description"> | null;
    referenceImageUrl?: string | null;
    videoModel?: string | null;
    durationSeconds?: number | null;
    resolution?: string | null;
  },
  options?: { signal?: AbortSignal }
): Promise<{ url: string }> {
  const res = await fetch("/api/videos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: body.prompt,
      skill: body.skill,
      referenceImageUrl: body.referenceImageUrl ?? undefined,
      videoModel: body.videoModel ?? undefined,
      durationSeconds: body.durationSeconds ?? undefined,
      resolution: body.resolution ?? undefined,
    }),
    signal: options?.signal,
  });

  const text = await res.text();
  let data = {} as { url?: string; error?: string };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error(
      text.trim()
        ? `视频接口失败 (${res.status})：${text.slice(0, 240)}`
        : `视频接口失败 (${res.status})`
    );
  }

  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" && data.error
        ? data.error
        : `视频生成失败 (${res.status})`
    );
  }
  if (!data.url) throw new Error("未返回视频地址");
  return { url: data.url };
}
