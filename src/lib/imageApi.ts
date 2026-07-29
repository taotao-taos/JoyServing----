import type { EditorSkill } from "../config/editorSkills";
import { normalizeAspectBucketFromText, resolveImageGenerationSizeForRequest } from "./chatRefImage";

export async function generateImageWithPrompt(
  body: {
    prompt: string;
    /** 已忽略：服务端生图不再注入技能文档，仅使用 prompt */
    skill: Pick<EditorSkill, "id" | "title" | "description"> | null;
    /** data: URL 或 http(s) 可拉取的图片，走服务端 images/edits（失败则增强 prompt 再文生图） */
    referenceImageUrl?: string | null;
    /** 文生图尺寸，如 1024x1024、1792x1024、1024x1792；未传时由 prompt + userPlainForSizeHint 推断 */
    imageSize?: string | null;
    /** 用户本回合纯文本（建议 strip 参考 chip 噪声），用于与 prompt 合并推断画幅 */
    userPlainForSizeHint?: string | null;
    /** 可选：画幅 bucket（优先交由服务端按 imageModel 选择最终 size，尤其 SD3.5 系列） */
    imageAspectBucket?: string | null;
    /** 上游 images/generations 的 model，缺省由服务端环境变量决定 */
    imageModel?: string | null;
    /** 一次生成张数（1～10），可与 prompt 中「四张」等同时生效 */
    imageCount?: number | null;
  },
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ url: string; urls?: string[]; billedBytes?: number }> {
  const timeoutMs = Math.max(1_000, options?.timeoutMs ?? 90_000);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(
      new DOMException(`图像生成超时（>${Math.round(timeoutMs / 1000)}s）`, "TimeoutError")
    );
  }, timeoutMs);
  const onUpstreamAbort = () => {
    controller.abort(options?.signal?.reason ?? new DOMException("请求已取消", "AbortError"));
  };
  if (options?.signal) {
    if (options.signal.aborted) onUpstreamAbort();
    else options.signal.addEventListener("abort", onUpstreamAbort, { once: true });
  }

  const bucketResolved =
    body.imageAspectBucket?.trim() ||
    (body.userPlainForSizeHint
      ? normalizeAspectBucketFromText(body.userPlainForSizeHint)
      : null);

  // 若明确传入 bucket，则让服务端按 imageModel 决策 size（尤其 SD3.5 白名单）。
  const imageSizeResolved = bucketResolved
    ? null
    : body.userPlainForSizeHint?.trim()
      ? resolveImageGenerationSizeForRequest({
          prompt: body.prompt,
          userPlainForSizeHint: body.userPlainForSizeHint,
        })
      : body.imageSize?.trim() ||
        resolveImageGenerationSizeForRequest({ prompt: body.prompt });

  if (import.meta.env.DEV) {
    const pe = body.prompt.length > 160 ? `${body.prompt.slice(0, 160)}…` : body.prompt;
    console.info(
      "[creagic][images] 请求快照（复现不一致时请对照 Network 里 POST /api/images 的请求体）",
      JSON.stringify({
        promptExcerpt: pe,
        imageSize: imageSizeResolved,
        imageAspectBucket: bucketResolved ?? undefined,
        hasRef: Boolean(body.referenceImageUrl?.trim()),
        imageCount: body.imageCount ?? undefined,
        imageModel: body.imageModel ?? undefined,
      })
    );
  }

  try {
    const res = await fetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: body.prompt,
        skill: body.skill,
        referenceImageUrl: body.referenceImageUrl ?? undefined,
        imageSize: imageSizeResolved ?? undefined,
        imageAspectBucket: bucketResolved ?? undefined,
        userPlainForSizeHint: body.userPlainForSizeHint?.trim() || undefined,
        imageModel: body.imageModel ?? undefined,
        imageCount: body.imageCount ?? undefined,
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    let data = {} as {
      url?: string;
      urls?: string[];
      billedBytes?: number;
      error?: string;
      detail?: string;
    };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      const hint =
        /Cannot POST\s+\/api\//i.test(text)
          ? "（请在本机运行后端：npm run server，或与前端一起 npm run dev:full；若 .env 里配置了 PORT，需与 Vite 代理端口一致。）"
          : "";
      throw new Error(
        text.trim()
          ? `图像接口失败 (${res.status})：${text.slice(0, 240)}${hint}`
          : `图像接口失败 (${res.status})`
      );
    }

    if (!res.ok) {
      const base =
        typeof data.error === "string" && data.error
          ? data.error
          : `图像生成失败 (${res.status})`;
      const detail =
        typeof data.detail === "string" && data.detail.trim() ? data.detail.trim() : "";
      throw new Error(detail ? `${base}（${detail}）` : base);
    }

    const list =
      Array.isArray(data.urls) && data.urls.length > 0
        ? data.urls.filter(
            (u): u is string => typeof u === "string" && u.trim().length > 0
          )
        : typeof data.url === "string" && data.url.trim()
          ? [data.url.trim()]
          : [];
    if (list.length === 0) {
      throw new Error("未返回图片地址");
    }

    return {
      url: list[0]!,
      urls: list.length > 1 ? list : undefined,
      billedBytes:
        typeof data.billedBytes === "number" && Number.isFinite(data.billedBytes)
          ? data.billedBytes
          : undefined,
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      throw new Error(`图像生成超时（>${Math.round(timeoutMs / 1000)}s），请重试或简化提示词`);
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
    if (options?.signal) {
      options.signal.removeEventListener("abort", onUpstreamAbort);
    }
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("无法将图片转为 data URL"));
    reader.readAsDataURL(blob);
  });
}

/**
 * 抠图/质感增强：服务端拉 https 私链易 403，故在浏览器侧统一转为 data:image 再 POST。
 * - data:image → 原样
 * - blob: → 读为 data URL
 * - http(s) → fetch 后转 data URL（受 CORS/防盗链限制时给出明确提示）
 */
async function resolveImageUrlForLiblibApi(imageUrl: string): Promise<string> {
  const s = String(imageUrl || "").trim();
  if (!s) throw new Error("imageUrl 不能为空");
  if (s.startsWith("data:image/")) {
    return s;
  }
  if (s.startsWith("blob:")) {
    const r = await fetch(s);
    const blob = await r.blob();
    return blobToDataUrl(blob);
  }
  if (/^https?:\/\//i.test(s)) {
    let r: Response;
    try {
      r = await fetch(s, { mode: "cors", credentials: "omit", cache: "no-store" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        `无法在浏览器内拉取该图片（${msg}）。请改用「导出/插入本地图」或截图粘贴到画布后再试（跨域/防盗链会阻止转为 data:image）。`
      );
    }
    if (!r.ok) {
      throw new Error(
        `拉取图片失败（HTTP ${r.status}）。请导出图片到本地再插入画布，或使用截图，以便使用 data:image 上传。`
      );
    }
    const blob = await r.blob();
    return blobToDataUrl(blob);
  }
  throw new Error("不支持的图片地址，请使用 http(s)、blob: 或 data:image");
}

export async function removeBackgroundWithLiblib(
  imageUrl: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ url: string; generateUuid?: string }> {
  const src = await resolveImageUrlForLiblibApi(String(imageUrl || "").trim());
  if (!src) throw new Error("imageUrl 不能为空");
  const timeoutMs = Math.max(2_000, options?.timeoutMs ?? 120_000);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(
      new DOMException(`移除背景超时（>${Math.round(timeoutMs / 1000)}s）`, "TimeoutError")
    );
  }, timeoutMs);
  const onUpstreamAbort = () => {
    controller.abort(options?.signal?.reason ?? new DOMException("请求已取消", "AbortError"));
  };
  if (options?.signal) {
    if (options.signal.aborted) onUpstreamAbort();
    else options.signal.addEventListener("abort", onUpstreamAbort, { once: true });
  }
  try {
    const res = await fetch("/api/images/remove-bg", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: src }),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = {} as { url?: string; generateUuid?: string; error?: string; detail?: string };
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      throw new Error(
        text.trim()
          ? `移除背景接口失败 (${res.status})：${text.slice(0, 240)}`
          : `移除背景接口失败 (${res.status})`
      );
    }
    if (!res.ok) {
      const base =
        typeof data.error === "string" && data.error
          ? data.error
          : `移除背景失败 (${res.status})`;
      const detail =
        typeof data.detail === "string" && data.detail.trim() ? data.detail.trim() : "";
      throw new Error(detail ? `${base}（${detail}）` : base);
    }
    const out = typeof data.url === "string" ? data.url.trim() : "";
    if (!out) throw new Error("移除背景未返回图片地址");
    return { url: out, generateUuid: data.generateUuid };
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      throw new Error(`移除背景超时（>${Math.round(timeoutMs / 1000)}s），请重试`);
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
    if (options?.signal) {
      options.signal.removeEventListener("abort", onUpstreamAbort);
    }
  }
}

export async function enhanceImageWithLiblib(
  imageUrl: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<{ url: string; generateUuid?: string }> {
  const src = await resolveImageUrlForLiblibApi(String(imageUrl || "").trim());
  if (!src) throw new Error("imageUrl 不能为空");
  const timeoutMs = Math.max(2_000, options?.timeoutMs ?? 180_000);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort(
      new DOMException(`质感增强超时（>${Math.round(timeoutMs / 1000)}s）`, "TimeoutError")
    );
  }, timeoutMs);
  const onUpstreamAbort = () => {
    controller.abort(options?.signal?.reason ?? new DOMException("请求已取消", "AbortError"));
  };
  if (options?.signal) {
    if (options.signal.aborted) onUpstreamAbort();
    else options.signal.addEventListener("abort", onUpstreamAbort, { once: true });
  }
  try {
    const res = await fetch("/api/images/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: src }),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = {} as { url?: string; generateUuid?: string; error?: string; detail?: string };
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      throw new Error(
        text.trim()
          ? `质感增强接口失败 (${res.status})：${text.slice(0, 240)}`
          : `质感增强接口失败 (${res.status})`
      );
    }
    if (!res.ok) {
      const base =
        typeof data.error === "string" && data.error
          ? data.error
          : `质感增强失败 (${res.status})`;
      const detail =
        typeof data.detail === "string" && data.detail.trim() ? data.detail.trim() : "";
      throw new Error(detail ? `${base}（${detail}）` : base);
    }
    const out = typeof data.url === "string" ? data.url.trim() : "";
    if (!out) throw new Error("质感增强未返回图片地址");
    return { url: out, generateUuid: data.generateUuid };
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      throw new Error(`质感增强超时（>${Math.round(timeoutMs / 1000)}s），请重试`);
    }
    throw e;
  } finally {
    window.clearTimeout(timeoutId);
    if (options?.signal) {
      options.signal.removeEventListener("abort", onUpstreamAbort);
    }
  }
}
