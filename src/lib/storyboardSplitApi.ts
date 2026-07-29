/**
 * 服务端将上一则助手分镜正文拆成多条提示词（无编号时走 LLM）
 */
export async function requestStoryboardSplitFromApi(
  body: {
    assistantText: string;
    userHint?: string;
    targetCount?: number;
  },
  signal?: AbortSignal
): Promise<{ shots: string[]; error?: string }> {
  const res = await fetch("/api/storyboard/split", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  let data: { shots?: unknown; error?: unknown } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { shots: [], error: "拆条接口返回非 JSON" };
  }
  const err =
    typeof data.error === "string" && data.error.trim()
      ? data.error.trim()
      : undefined;
  const shots = Array.isArray(data.shots)
    ? data.shots.filter(
        (s): s is string =>
          typeof s === "string" && s.replace(/\s/g, "").length > 0
      )
    : [];
  if (!res.ok) {
    return {
      shots: [],
      error: err || `拆条失败（HTTP ${res.status}）`,
    };
  }
  return { shots, error: err };
}
