export type RouteIntentMode =
  | "chat"
  | "image_gen"
  | "image_edit"
  | "plan"
  | "video";

export type RouteIntentResponse = {
  mode: RouteIntentMode;
  optimized_prompt?: string;
  reason?: string;
};

export async function routeUserIntent(
  body: {
    userText: string;
    hasReferenceImage: boolean;
    hasPriorGeneratedImage: boolean;
  },
  options?: { signal?: AbortSignal }
): Promise<RouteIntentResponse> {
  const res = await fetch("/api/route-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options?.signal,
  });
  const text = await res.text();
  let data = {} as RouteIntentResponse & { error?: string };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error(text.trim() ? text.slice(0, 280) : "路由接口返回非 JSON");
  }
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" && data.error
        ? data.error
        : `路由失败 (${res.status})`
    );
  }
  if (
    data.mode !== "chat" &&
    data.mode !== "image_gen" &&
    data.mode !== "image_edit" &&
    data.mode !== "plan" &&
    data.mode !== "video"
  ) {
    return { mode: "plan", reason: "fallback" };
  }
  return data;
}
