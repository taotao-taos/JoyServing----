/**
 * 本地 API：转发 AIhubMix OpenAI 兼容接口 + 可选 Creagic Python 侧车
 */
import "dotenv/config";
import { createHmac, createHash, randomBytes } from "node:crypto";
import type { ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  STORYBOARD_FINAL_REPLY_RULES,
} from "./creagic-engine";
import {
  creagicGet,
  creagicPost,
  isCreagicConfigured,
  type CreagicPrepareResult,
  type CreagicToolsOpenAI,
  type CreagicValidateResult,
} from "./creagicClient";
import {
  formatAiReplyToHtml,
} from "../src/lib/formatAiChatHtml";
import { parseCtaFromAiContent } from "../src/lib/parseCtaFromAiContent";
import {
  inferRequestedImageCountFromPlain,
  resolveImageGenerationSizeForRequest,
} from "../src/lib/chatRefImage";
import {
  getCosReferenceProxyStatus,
  parseImageDataUrl,
  presignCosHttpUrlForVolcengineFetch,
  proxyReferenceImageUrlToCos,
} from "./cosClient";
import { ensureLiblibHostedImageUrl } from "./liblibHostedImage";
import { getSkillWorkflowById } from "./skillWorkflow";

/** 官方文档 Base，用于修正 .env 漏写 /v1 或与轮询域名不一致导致的 404 */
const AIHUBMIX_CANON_API_BASE = "https://aihubmix.com/v1";

function normalizeAihubmixBaseUrl(raw: string): string {
  const fallback = AIHUBMIX_CANON_API_BASE;
  const s = (raw?.trim() || fallback).replace(/\/+$/, "");
  if (!s) return fallback;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/aihubmix\.com$/i.test(u.hostname)) {
      return s;
    }
    let p = u.pathname.replace(/\/+$/, "") || "/";
    if (p === "/" || p === "") {
      u.pathname = "/v1";
    } else {
      let np = p;
      while (/\/v1\/v1/i.test(np)) {
        np = np.replace(/\/v1\/v1/gi, "/v1");
      }
      if (np === "/" || np === "") np = "/v1";
      u.pathname = np;
    }
    return `${u.origin}${u.pathname}`.replace(/\/+$/, "");
  } catch {
    return fallback;
  }
}

export const BASE = normalizeAihubmixBaseUrl(
  process.env.AIHUBMIX_BASE_URL || AIHUBMIX_CANON_API_BASE
);

function videoApiBasesForPoll(): string[] {
  const a = BASE.replace(/\/+$/, "");
  const b = AIHUBMIX_CANON_API_BASE.replace(/\/+$/, "");
  return a === b ? [a] : [a, b];
}
export const KEY = process.env.AIHUBMIX_API_KEY?.trim();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY?.trim();
const GOOGLE_IMAGE_MODEL =
  process.env.GOOGLE_IMAGE_MODEL?.trim() || "gemini-flash-latest";
const IMAGE_PROVIDER = (process.env.IMAGE_PROVIDER?.trim() || "volcengine").toLowerCase();
const VOLCENGINE_IMAGE_API_URL = process.env.VOLCENGINE_IMAGE_API_URL?.trim() || "";
const VOLCENGINE_API_KEY = process.env.VOLCENGINE_API_KEY?.trim() || "";
const VOLCENGINE_IMAGE_MODEL = process.env.VOLCENGINE_IMAGE_MODEL?.trim() || "";
const VOLCENGINE_IMAGE_RESULT_API_URL =
  process.env.VOLCENGINE_IMAGE_RESULT_API_URL?.trim() || "";
const VOLCENGINE_API_KEY_HEADER =
  process.env.VOLCENGINE_API_KEY_HEADER?.trim() || "Authorization";
const VOLCENGINE_API_KEY_PREFIX =
  process.env.VOLCENGINE_API_KEY_PREFIX?.trim() || "Bearer ";
const VOLCENGINE_ALLOW_FALLBACK =
  /^(1|true|yes)$/i.test(process.env.VOLCENGINE_ALLOW_FALLBACK?.trim() || "");
const VOLCENGINE_ACCESS_KEY = process.env.VOLCENGINE_ACCESS_KEY?.trim() || "";
const VOLCENGINE_SECRET_KEY = process.env.VOLCENGINE_SECRET_KEY?.trim() || "";
const VOLCENGINE_REGION = process.env.VOLCENGINE_REGION?.trim() || "cn-north-1";
const VOLCENGINE_SERVICE = process.env.VOLCENGINE_SERVICE?.trim() || "cv";
const VOLCENGINE_POLL_INTERVAL_MS = Number(
  process.env.VOLCENGINE_POLL_INTERVAL_MS || 3000
);
const VOLCENGINE_POLL_MAX_ROUNDS = Number(
  process.env.VOLCENGINE_POLL_MAX_ROUNDS || 20
);
const VOLCENGINE_POLL_RETRY_DELAY_MS = Number(
  process.env.VOLCENGINE_POLL_RETRY_DELAY_MS || 10000
);
const VOLCENGINE_POLL_RETRY_PASSES = Number(
  process.env.VOLCENGINE_POLL_RETRY_PASSES || 3
);
const VOLCENGINE_CALLBACK_URL = process.env.VOLCENGINE_CALLBACK_URL?.trim() || "";
const VOLCENGINE_USE_CALLBACK_ONLY =
  /^(1|true|yes)$/i.test(process.env.VOLCENGINE_USE_CALLBACK_ONLY?.trim() || "");
const LIBLIB_COMFY_BASE =
  (process.env.LIBLIB_COMFY_BASE_URL?.trim() || "https://openapi.liblibai.cloud").replace(/\/+$/, "");
const LIBLIB_COMFY_KEY = process.env.LIBLIB_COMFY_API_KEY?.trim() || "";
const LIBLIB_COMFY_ACCESS_KEY = process.env.LIBLIB_COMFY_ACCESS_KEY?.trim() || "";
const LIBLIB_COMFY_SECRET_KEY = process.env.LIBLIB_COMFY_SECRET_KEY?.trim() || "";
const LIBLIB_COMFY_AUTH_HEADER =
  process.env.LIBLIB_COMFY_AUTH_HEADER?.trim() || "Authorization";
const LIBLIB_COMFY_AUTH_PREFIX =
  process.env.LIBLIB_COMFY_AUTH_PREFIX?.trim() || "Bearer ";
/** 官方工作流页：https://www.liblib.art/apis/workflow?uuid=574a938681da4e8ba2e1c24d55784edf&modelInfoPath=9c298d00c4eb4c7c92b6d8c582352e58 */
const LIBLIB_DEFAULT_REMOVE_BG_WORKFLOW_UUID =
  "574a938681da4e8ba2e1c24d55784edf";
const LIBLIB_DEFAULT_REMOVE_BG_MODEL_INFO_PATH =
  "9c298d00c4eb4c7c92b6d8c582352e58";

const LIBLIB_COMFY_REMOVE_BG_UUID =
  process.env.LIBLIB_COMFY_REMOVE_BG_UUID?.trim() || "";
const LIBLIB_COMFY_REMOVE_BG_MODEL_INFO_PATH =
  process.env.LIBLIB_COMFY_REMOVE_BG_MODEL_INFO_PATH?.trim() ||
  LIBLIB_DEFAULT_REMOVE_BG_MODEL_INFO_PATH;
/** Liblib 开放平台「Comfy 应用」templateUuid（与官方工作流页 uuid 对齐） */
const LIBLIB_DEFAULT_REMOVE_BG_TEMPLATE_UUID = "574a938681da4e8ba2e1c24d55784edf";
const LIBLIB_DEFAULT_ENHANCE_TEMPLATE_UUID = "c44f310cd0df4771be5bddfea6350c3a";
/** 可选：两功能共用同一 Comfy 应用时设此项，会覆盖下方各功能默认（兼容旧 .env） */
const LIBLIB_COMFY_TEMPLATE_UUID_SHARED = process.env.LIBLIB_COMFY_TEMPLATE_UUID?.trim();
const LIBLIB_COMFY_REMOVE_BG_TEMPLATE_UUID =
  process.env.LIBLIB_COMFY_REMOVE_BG_TEMPLATE_UUID?.trim() ||
  LIBLIB_COMFY_TEMPLATE_UUID_SHARED ||
  LIBLIB_DEFAULT_REMOVE_BG_TEMPLATE_UUID;
const LIBLIB_COMFY_ENHANCE_TEMPLATE_UUID =
  process.env.LIBLIB_COMFY_ENHANCE_TEMPLATE_UUID?.trim() ||
  LIBLIB_COMFY_TEMPLATE_UUID_SHARED ||
  LIBLIB_DEFAULT_ENHANCE_TEMPLATE_UUID;
const LIBLIB_COMFY_REMOVE_BG_WORKFLOW_UUID =
  process.env.LIBLIB_COMFY_REMOVE_BG_WORKFLOW_UUID?.trim() ||
  LIBLIB_COMFY_REMOVE_BG_UUID ||
  LIBLIB_DEFAULT_REMOVE_BG_WORKFLOW_UUID;
/** 抠图工作流：LoadImage 节点（Liblib 说明里常见节点 ID=10），generateParams 下 key 即节点 ID，inputs.image 为输入图 URL */
const LIBLIB_COMFY_REMOVE_BG_IMAGE_NODE_ID =
  process.env.LIBLIB_COMFY_REMOVE_BG_IMAGE_NODE_ID?.trim() || "10";
const LIBLIB_COMFY_REMOVE_BG_GENERATE_PARAMS_JSON =
  process.env.LIBLIB_COMFY_REMOVE_BG_GENERATE_PARAMS_JSON?.trim() || "";
/** 多 Save 节点时仅采用指定 nodeId 的输出（与 Liblib images[].nodeId 一致）；空则不筛选 */
const LIBLIB_COMFY_REMOVE_BG_OUTPUT_NODE_ID =
  process.env.LIBLIB_COMFY_REMOVE_BG_OUTPUT_NODE_ID?.trim() || "";

/** 官方工作流页 part-2：https://www.liblib.art/apis/workflow?uuid=c44f310cd0df4771be5bddfea6350c3a&modelInfoPath=27a99630c078483182e7b8fdd116a3a7#part-2 */
const LIBLIB_DEFAULT_ENHANCE_WORKFLOW_UUID = "c44f310cd0df4771be5bddfea6350c3a";
const LIBLIB_DEFAULT_ENHANCE_MODEL_INFO_PATH =
  "27a99630c078483182e7b8fdd116a3a7";

/** 质感增强 | 高清放大（与 Liblib 工作流详情 uuid= / modelInfoPath= 一致；可与 LIBLIB_COMFY_WORKFLOW_UUID 等别名共用） */
const LIBLIB_COMFY_ENHANCE_WORKFLOW_UUID =
  process.env.LIBLIB_COMFY_ENHANCE_WORKFLOW_UUID?.trim() ||
  process.env.LIBLIB_COMFY_WORKFLOW_UUID?.trim() ||
  LIBLIB_DEFAULT_ENHANCE_WORKFLOW_UUID;
const LIBLIB_COMFY_ENHANCE_MODEL_INFO_PATH =
  process.env.LIBLIB_COMFY_ENHANCE_MODEL_INFO_PATH?.trim() ||
  process.env.LIBLIB_COMFY_MODEL_INFO_PATH?.trim() ||
  LIBLIB_DEFAULT_ENHANCE_MODEL_INFO_PATH;
/** 高清修复/质感增强工作流：LoadImage 节点（Liblib 说明里常见节点 ID=131），inputs.image 为输入图 URL */
const LIBLIB_COMFY_ENHANCE_IMAGE_NODE_ID =
  process.env.LIBLIB_COMFY_ENHANCE_IMAGE_NODE_ID?.trim() ||
  process.env.LIBLIB_COMFY_IMAGE_NODE_ID?.trim() ||
  "131";
const LIBLIB_COMFY_ENHANCE_LORA_NODE_ID =
  process.env.LIBLIB_COMFY_ENHANCE_LORA_NODE_ID?.trim() ||
  process.env.LIBLIB_COMFY_LORA_NODE_ID?.trim() ||
  "205";
const LIBLIB_COMFY_ENHANCE_LORA_NAME =
  process.env.LIBLIB_COMFY_ENHANCE_LORA_NAME?.trim() ||
  "0cf6cf2b87bc43f48603b5905dc6c2c5";
const LIBLIB_COMFY_ENHANCE_LORA_STRENGTH_MODEL = Number(
  process.env.LIBLIB_COMFY_ENHANCE_LORA_STRENGTH_MODEL?.trim() || "1"
);
const LIBLIB_COMFY_ENHANCE_OUTPUT_NODE_ID =
  process.env.LIBLIB_COMFY_ENHANCE_OUTPUT_NODE_ID?.trim() ||
  process.env.LIBLIB_COMFY_OUTPUT_NODE_ID?.trim() ||
  "229";
const LIBLIB_COMFY_ENHANCE_GENERATE_PARAMS_JSON =
  process.env.LIBLIB_COMFY_ENHANCE_GENERATE_PARAMS_JSON?.trim() || "";
const LIBLIB_COMFY_POLL_INTERVAL_MS = Number(
  process.env.LIBLIB_COMFY_POLL_INTERVAL_MS || 2500
);
const LIBLIB_COMFY_POLL_MAX_ROUNDS = Number(
  process.env.LIBLIB_COMFY_POLL_MAX_ROUNDS || 80
);

/** 逗号分隔，默认仅 5（任务成功）。多图工作流在未完成时也可能带图，必须等成功态再取结果。 */
function parseLiblibPollAcceptStatuses(): Set<number> {
  const raw = process.env.LIBLIB_COMFY_POLL_ACCEPT_STATUSES?.trim();
  if (!raw) return new Set([5]);
  const nums = raw
    .split(/[,，\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return new Set(nums.length ? nums : [5]);
}
const LIBLIB_COMFY_POLL_ACCEPT_STATUSES = parseLiblibPollAcceptStatuses();

/** 多节点 Comfy 常返回多张图（预览/中间结果 + 最终 Save）；默认取最后一张。first | last | 0-based 索引 */
function parseLiblibRemoveBgOutputPick(): "first" | "last" | number {
  const raw = (
    process.env.LIBLIB_COMFY_REMOVE_BG_OUTPUT_IMAGE_INDEX?.trim() || "last"
  ).toLowerCase();
  if (raw === "first" || raw === "last") return raw;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return "last";
}
const LIBLIB_COMFY_REMOVE_BG_OUTPUT_PICK = parseLiblibRemoveBgOutputPick();

function parseLiblibEnhanceOutputPick(): "first" | "last" | number {
  const raw = (
    process.env.LIBLIB_COMFY_ENHANCE_OUTPUT_IMAGE_INDEX?.trim() || "last"
  ).toLowerCase();
  if (raw === "first" || raw === "last") return raw;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return "last";
}
const LIBLIB_COMFY_ENHANCE_OUTPUT_PICK = parseLiblibEnhanceOutputPick();

function toBase64UrlSafe(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/** 已配置 AK/SK 时 URL 已带签名；再附带 API Key 易导致开放平台侧账号/应用不一致，业务码 200000。默认不附带，需混用时设 LIBLIB_COMFY_ATTACH_API_KEY_WITH_SIGNATURE=1 */
function liblibComfyAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const hasUrlSignature = !!(LIBLIB_COMFY_ACCESS_KEY && LIBLIB_COMFY_SECRET_KEY);
  const attachApiKeyWithSignature = /^(1|true|yes)$/i.test(
    process.env.LIBLIB_COMFY_ATTACH_API_KEY_WITH_SIGNATURE?.trim() || ""
  );
  if (
    LIBLIB_COMFY_KEY &&
    (!hasUrlSignature || attachApiKeyWithSignature)
  ) {
    headers[LIBLIB_COMFY_AUTH_HEADER] = `${LIBLIB_COMFY_AUTH_PREFIX}${LIBLIB_COMFY_KEY}`;
    headers["X-API-Key"] = LIBLIB_COMFY_KEY;
  }
  return headers;
}

/** 与 liblib-javascript 等官方示例一致；可通过 LIBLIB_COMFY_STATUS_PATH 覆盖 */
function liblibComfyStatusEndpointPath(): string {
  const p = process.env.LIBLIB_COMFY_STATUS_PATH?.trim();
  if (p && p.startsWith("/")) return p;
  return "/api/generate/comfyui/status";
}

function buildLiblibSignedUrl(pathWithQuery: string): string {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  // 优先使用你提供的 AccessKey/SecretKey URL 签名方案
  if (LIBLIB_COMFY_ACCESS_KEY && LIBLIB_COMFY_SECRET_KEY) {
    const timestamp = Date.now();
    const signatureNonce = randomBytes(8).toString("hex");
    const raw = `${path}&${timestamp}&${signatureNonce}`;
    const signature = toBase64UrlSafe(
      createHmac("sha1", LIBLIB_COMFY_SECRET_KEY).update(raw).digest("base64")
    );
    const sep = path.includes("?") ? "&" : "?";
    return `${LIBLIB_COMFY_BASE}${path}${sep}AccessKey=${encodeURIComponent(
      LIBLIB_COMFY_ACCESS_KEY
    )}&Signature=${encodeURIComponent(signature)}&Timestamp=${timestamp}&SignatureNonce=${encodeURIComponent(
      signatureNonce
    )}`;
  }
  return `${LIBLIB_COMFY_BASE}${path}`;
}

function volcDefaultResultApiUrl(): string {
  try {
    const u = new URL(VOLCENGINE_IMAGE_API_URL);
    u.searchParams.set("Action", "CVSync2AsyncGetResult");
    u.searchParams.set("Version", "2022-08-31");
    return u.toString();
  } catch {
    return "https://visual.volcengineapi.com?Action=CVSync2AsyncGetResult&Version=2022-08-31";
  }
}

function normalizeVolcGetResultUrl(rawUrl: string): string {
  const fallback = volcDefaultResultApiUrl();
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;
  try {
    const u = new URL(trimmed);
    u.searchParams.set("Action", "CVSync2AsyncGetResult");
    u.searchParams.set("Version", "2022-08-31");
    return u.toString();
  } catch {
    return fallback;
  }
}

/** 浏览器无法为 <video src> 带 Bearer，将把需鉴权的成片 URL 换成本机同域代理 */
const VIDEO_PROXY_TTL_MS = 2 * 60 * 60 * 1000;
const VIDEO_PROXY_MAX_SLOTS = 500;
type VideoProxySlot = { url: string; exp: number };
const videoProxySlots = new Map<string, VideoProxySlot>();

function pruneVideoProxySlots(): void {
  const now = Date.now();
  for (const [k, v] of videoProxySlots) {
    if (v.exp < now) videoProxySlots.delete(k);
  }
  while (videoProxySlots.size > VIDEO_PROXY_MAX_SLOTS) {
    const first = videoProxySlots.keys().next().value;
    if (first === undefined) break;
    videoProxySlots.delete(first);
  }
}

function videoUrlNeedsBrowserProxy(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (!/\/videos\//i.test(u.pathname || "")) return false;
    const base = new URL(
      /^https?:\/\//i.test(BASE) ? BASE : `https://${BASE}`
    );
    if (u.origin === base.origin) return true;
    const h = u.hostname.toLowerCase();
    return h === "aihubmix.com" || h.endsWith(".aihubmix.com");
  } catch {
    return false;
  }
}

function registerVideoProxySlot(upstreamUrl: string): string {
  pruneVideoProxySlots();
  const id = randomBytes(16).toString("hex");
  videoProxySlots.set(id, {
    url: upstreamUrl,
    exp: Date.now() + VIDEO_PROXY_TTL_MS,
  });
  return id;
}

function applyPublicVideoUrlToBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  const u = body.url;
  if (typeof u !== "string") return body;
  const t = u.trim();
  if (!t || !videoUrlNeedsBrowserProxy(t)) return body;
  const token = registerVideoProxySlot(t);
  return { ...body, url: `/api/videos/raw/${token}` };
}

export async function handleVideoRawStream(
  slotId: string,
  res: ServerResponse
): Promise<void> {
  if (!KEY) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("no api key");
    return;
  }
  pruneVideoProxySlots();
  const slot = videoProxySlots.get(slotId);
  if (!slot || slot.exp < Date.now()) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("expired or unknown video token");
    return;
  }
  try {
    const upstream = await fetch(slot.url, {
      headers: { Authorization: `Bearer ${KEY}` },
      redirect: "follow",
    });
    if (!upstream.ok) {
      const txt = await upstream.text();
      res.statusCode = 502;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(txt.slice(0, 4000));
      return;
    }
    res.statusCode = 200;
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/octet-stream"
    );
    const len = upstream.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);
    res.setHeader("Cache-Control", "private, max-age=300");
    const webBody = upstream.body;
    if (!webBody) {
      res.end(Buffer.from(await upstream.arrayBuffer()));
      return;
    }
    const nodeReadable = Readable.fromWeb(
      webBody as unknown as import("stream/web").ReadableStream
    );
    await pipeline(nodeReadable, res);
  } catch (e) {
    if (!res.writableEnded) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(e instanceof Error ? e.message : "proxy failed");
    }
  }
}

const modelFlash = process.env.AIHUBMIX_MODEL_FLASH || "qwen3-vl-flash-2026-01-22";

/** 快捷对话默认模型；编排默认与之相同（可通过 AIHUBMIX_ORCHESTRATION_MODEL 单独覆盖） */
export const CHAT_MODEL =
  process.env.AIHUBMIX_CHAT_MODEL?.trim() || "qwen3-vl-flash-2026-01-22";

const ROUTER_MODEL =
  process.env.AIHUBMIX_ROUTER_MODEL?.trim() || "qwen3-vl-flash-2026-01-22";

/** 默认与 CHAT 一致，避免「快捷对话可用、多段编排报参数错」两套模型权限不一致 */
export const ORCHESTRATION_MODEL =
  process.env.AIHUBMIX_ORCHESTRATION_MODEL?.trim() || CHAT_MODEL;

export type RouteIntentBody = {
  userText?: string;
  hasReferenceImage?: boolean;
  hasPriorGeneratedImage?: boolean;
};

export async function handleRouteIntentRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!KEY) {
    return {
      status: 503,
      body: { error: "服务端未配置 AIHUBMIX_API_KEY" },
    };
  }
  const body = reqBody as RouteIntentBody;
  const userText = String(body.userText ?? "").trim().slice(0, 4000);
  if (!userText) {
    return { status: 400, body: { error: "userText 必填" } };
  }
  const hasRef = Boolean(body.hasReferenceImage);
  const hasPrior = Boolean(body.hasPriorGeneratedImage);

  const system = `你是 Creagic AI 内置的「意图路由器」，只输出一个 JSON 对象，不要 markdown，不要解释。
JSON schema：
{"mode":"chat"|"image_gen"|"image_edit"|"plan"|"video","optimized_prompt":"string","reason":"string"}

mode 含义：
- chat：极短寒暄、身份问答、一两句闲聊，且无创作任务。
- video：分镜脚本、故事板、短视频/宣传片/动效/逐帧或时间轴类**音视频叙事**。**勿**将用户一句话未经确认就直接打成「侧栏仅一次 HTTP 文生图」；应先走多轮文字策划与分镜对齐。说明：文生图 API **不能**直接返回 MP4，但可在用户确认后于**后续轮次**用对话内工具逐帧生成**关键帧静图**，或引导用户到画布「生视频」。路由为 video = 使用多轮编排，不等于承诺单轮已出成片。
- plan：需要分步策划、多交付物、品牌/活动全案、或已挂载「技能文档」时用户目标尚模糊、需**渐进式披露**（先问清再决定出图/对话/分镜）；含「帮我做个方案」但说不清媒介时用这个。
- image_gen：用户**明确要单张静态图**（海报/主视觉/插画/封面静帧等），且不是以上视频/策划优先场景。
- image_edit：在既有图基础上改构图/风格/配色/比例/换元素；用户已贴参考图(${hasRef}) 或存在可编辑的上一张图(${hasPrior}) 时，若用户诉求是改图，优先 image_edit。

optimized_prompt：给下游文生图/编辑链路的指令（中文）。**必须保留用户原文中的主体、场景、风格、关键物体与动作**；只允许补充光影、构图、镜头、分辨率、材质等技术层描述，**禁止**把用户主题改写成无关题材。
若 hasReferenceImage 为 true：用户已上传参考图，optimized_prompt 须假定下游会看到该图，**不得忽略用户文字**；不得仅写泛泛的「高质量插画」而丢掉用户指定的内容。
若无需改写则可与 userText 实质等价（可轻度润色）。
reason：极短中文，仅供调试。`;

  const userMsg = hasRef
    ? `【本回合用户已上传参考图；请结合图中视觉信息理解意图；optimized_prompt 必须保留下列用户文字中的主体与细节，禁止改成无关主题。】\n${userText}`
    : userText;

  const openaiMessages: Record<string, unknown>[] = [
    { role: "system", content: system },
    { role: "user", content: userMsg },
  ];

  try {
    const payload: Record<string, unknown> = {
      model: ROUTER_MODEL,
      messages: openaiMessages,
      temperature: 0.15,
      max_tokens: 500,
    };
    payload.response_format = { type: "json_object" };

    let r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let raw = await r.text();
    if (!r.ok && /response_format|json_object/i.test(raw)) {
      delete payload.response_format;
      r = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      raw = await r.text();
    }

    if (!r.ok) {
      let msg = raw || r.statusText;
      try {
        const j = JSON.parse(raw) as {
          error?: { message?: string } | string;
          message?: string;
        };
        if (typeof j.error === "object" && j.error?.message) msg = j.error.message;
        else if (typeof j.error === "string") msg = j.error;
        else if (typeof j.message === "string") msg = j.message;
      } catch {
        /* keep */
      }
      return {
        status: r.status >= 400 && r.status < 600 ? r.status : 502,
        body: { error: humanizeUpstreamSafetyError(msg) },
      };
    }

    let data: {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return { status: 502, body: { error: "路由接口上游返回非 JSON" } };
    }

    const txt = data.choices?.[0]?.message?.content ?? "";
    let parsed: {
      mode?: string;
      optimized_prompt?: string;
      reason?: string;
    };
    try {
      parsed = JSON.parse(txt) as typeof parsed;
    } catch {
      return {
        status: 200,
        body: {
          mode: "plan",
          optimized_prompt: userText,
          reason: "router_json_parse_fallback",
        },
      };
    }

    const m = parsed.mode;
    const mode =
      m === "chat" ||
      m === "image_gen" ||
      m === "image_edit" ||
      m === "plan" ||
      m === "video"
        ? m
        : "plan";

    return {
      status: 200,
      body: {
        mode,
        optimized_prompt:
          typeof parsed.optimized_prompt === "string"
            ? parsed.optimized_prompt
            : userText,
        reason: typeof parsed.reason === "string" ? parsed.reason : undefined,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "网络错误";
    return { status: 502, body: { error: humanizeUpstreamSafetyError(msg) } };
  }
}

/** 默认 Stable-Diffusion-3-5-Large；账户无权限时请在 .env 设置 AIHUBMIX_IMAGE_MODEL 为模型广场可用 ID */
const IMAGE_MODEL =
  process.env.AIHUBMIX_IMAGE_MODEL?.trim() || "Stable-Diffusion-3-5-Large";
/** 主模型失败且上游提示参数/尺寸问题时，改用它再请求一次（聚合线路常见可用） */
const IMAGE_FALLBACK_MODEL =
  process.env.AIHUBMIX_IMAGE_FALLBACK_MODEL?.trim() || "dall-e-2";
/**
 * /v1/images/edits 多数聚合商仅对部分模型开放（如 dall-e-2、gpt-image）；
 * FLUX 等常不支持编辑接口。缺省与 IMAGE_FALLBACK_MODEL 相同，主模型编辑失败时自动换用。
 */
const IMAGE_EDIT_MODEL =
  process.env.AIHUBMIX_IMAGE_EDIT_MODEL?.trim() || IMAGE_FALLBACK_MODEL;
/** 默认用文档列出的 wan2.6-t2v；豆包等可在 .env 设 AIHUBMIX_VIDEO_MODEL */
const VIDEO_MODEL =
  process.env.AIHUBMIX_VIDEO_MODEL?.trim() || "wan2.6-t2v";
/** 主模型连续 Invalid parameter 时，最后用该 ID 试一次（与 https://docs.aihubmix.com/cn/api/Video-Gen 一致） */
const VIDEO_CREATE_FALLBACK_MODEL =
  process.env.AIHUBMIX_VIDEO_FALLBACK_MODEL?.trim() || "wan2.6-t2v";

type ImageModelSizeFamily =
  | "gpt_image"
  | "dalle3"
  | "dalle2"
  | "flux_like"
  | "sd35_family";

function imageModelSizeFamily(model: string): ImageModelSizeFamily {
  const x = model.toLowerCase();
  if (/gpt-?image|gpt_image/i.test(x)) return "gpt_image";
  if (/dall-e-2|dalle-2|dalle2/i.test(x)) return "dalle2";
  if (/dall-e|dalle/i.test(x)) return "dalle3";
  if (
    /stable[-\s]?diffusion[-\s]?3(?:\.|\s*[-_])?5|sd\s*3(?:\.|\s*)?5|sd3\.?5/i.test(
      x
    )
  ) {
    return "sd35_family";
  }
  // FLUX、SDXL、多数聚合「OpenAI 兼容」文生图线路常用 1024 / 1792 档位，勿默认走 gpt-image 的 1536 与 auto
  if (
    /flux|seedream|sdxl|stable-diffusion|stable\s*diffusion|\bsd[-\s]?3\b|playground|midjourney|recraft|wanx|wan2\.|jimeng|qwen|kling|imagen|\bv[_-]?2\b/i.test(
      x
    )
  ) {
    return "flux_like";
  }
  return "flux_like";
}

function parseSizeWh(input: string): { w: number; h: number } | null {
  const s = input.trim().replace(/×/gi, "x").replace(/\s/g, "");
  const m = /^(\d+)x(\d+)$/i.exec(s);
  if (!m) return null;
  const w = parseInt(m[1]!, 10);
  const h = parseInt(m[2]!, 10);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 8 || h < 8)
    return null;
  return { w, h };
}

/**
 * 将前端/用户描述规范化为当前 imageModel 支持的 size。
 * gpt-image 系列：1024x1024、1536x1024、1024x1536、auto（勿传 1792x1024）。
 */
function normalizeImageGenerationSize(input: unknown, model: string): string {
  const raw = String(input ?? "").trim();
  const fam = imageModelSizeFamily(model);
  const s = raw.toLowerCase().replace(/×/g, "x");

  if (fam === "sd35_family") {
    /**
     * Stable-Diffusion-3.5-Large 更偏 1MP 原生；这里选择接近 1MP 且宽高可被 64 整除的一组白名单。
     * 目标：社交媒体 3:4 / 9:16 / 16:9 不再被上游兜底回 1:1。
     */
    const allowed = new Set([
      "1024x1024", // 1:1
      "1344x768", // 16:9
      "768x1344", // 9:16
      "1152x864", // 4:3
      "864x1152", // 3:4
      "1216x832", // 3:2 (备用)
      "832x1216", // 2:3 (备用)
    ]);

    if (allowed.has(s)) return s;

    // 允许调用侧传入 bucket 或比例文本（例如 "3:4" / "16:9" / "portrait_3_4"）
    if (/3\s*:\s*4|portrait[_-]?3[_-]?4|3[_-]?4/.test(s)) return "864x1152";
    if (/4\s*:\s*3|landscape[_-]?4[_-]?3|4[_-]?3/.test(s)) return "1152x864";
    if (/9\s*:\s*16|portrait[_-]?9[_-]?16|9[_-]?16/.test(s)) return "768x1344";
    if (/16\s*:\s*9|landscape[_-]?16[_-]?9|16[_-]?9/.test(s)) return "1344x768";
    if (/1\s*:\s*1|square|方/.test(s)) return "1024x1024";

    const wh = parseSizeWh(s);
    if (wh) {
      const r = wh.w / wh.h;
      if (Math.abs(r - 1) <= 0.06) return "1024x1024";
      // 3:4 更常用于小红书笔记封面/主图；优先给 3:4 档位而非 9:16
      if (Math.abs(r - 3 / 4) < 0.06) return "864x1152";
      if (Math.abs(r - 4 / 3) < 0.06) return "1152x864";
      if (Math.abs(r - 16 / 9) < 0.07) return "1344x768";
      if (Math.abs(r - 9 / 16) < 0.07) return "768x1344";
      if (r > 1) return "1344x768";
      return "768x1344";
    }

    return "1024x1024";
  }

  if (fam === "gpt_image") {
    const allowed = new Set([
      "1024x1024",
      "1536x1024",
      "1024x1536",
      "auto",
    ]);
    if (allowed.has(s)) return s;
    if (s === "1792x1024") return "1536x1024";
    if (s === "1024x1792") return "1024x1536";
    const wh = parseSizeWh(s);
    if (wh) {
      const r = wh.w / wh.h;
      if (Math.abs(r - 1) <= 0.06) return "1024x1024";
      if (r > 1) return "1536x1024";
      return "1024x1536";
    }
    return "auto";
  }

  if (fam === "dalle3" || fam === "flux_like") {
    const allowed = new Set(["1024x1024", "1792x1024", "1024x1792"]);
    if (allowed.has(s)) return s;
    // 前端/兼容层常传 gpt-image 档位，映射到多数线路可接受的 1792 横竖版
    if (fam === "flux_like") {
      if (s === "1536x1024") return "1792x1024";
      if (s === "1024x1536") return "1024x1792";
    }
    const wh = parseSizeWh(s);
    if (wh) {
      const r = wh.w / wh.h;
      if (Math.abs(r - 1) <= 0.06) return "1024x1024";
      if (r > 1) return "1792x1024";
      return "1024x1792";
    }
    return "1024x1024";
  }

  const d2 = new Set(["256x256", "512x512", "1024x1024"]);
  if (d2.has(s)) return s;
  const wh2 = parseSizeWh(s);
  if (wh2) {
    const px = wh2.w * wh2.h;
    if (px <= 300_000) return "512x512";
    return "1024x1024";
  }
  return "1024x1024";
}

function generationSizeFallbacks(model: string, primary: string): string[] {
  const fam = imageModelSizeFamily(model);
  const out: string[] = [];
  const push = (x: string) => {
    if (x && !out.includes(x)) out.push(x);
  };
  push(primary);
  if (fam === "sd35_family") {
    // 只在白名单内轮换，避免回退到上游不支持的 1792 档导致兜底 1:1。
    push("864x1152");
    push("768x1344");
    push("1344x768");
    push("1152x864");
    push("1024x1024");
  } else if (fam === "gpt_image") {
    if (primary !== "auto") push("auto");
    push("1536x1024");
    push("1024x1536");
    push("1024x1024");
  } else if (fam === "dalle3" || fam === "flux_like") {
    push("1792x1024");
    push("1024x1792");
    push("1024x1024");
  } else {
    push("1024x1024");
    push("512x512");
    push("256x256");
  }
  return out;
}

function parseUpstreamErrorText(r: Response, raw: string): string {
  let msg = raw || r.statusText;
  try {
    const j = JSON.parse(raw) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof j.error === "object" && j.error?.message) msg = j.error.message;
    else if (typeof j.error === "string") msg = j.error;
    else if (typeof j.message === "string") msg = j.message;
  } catch {
    /* keep */
  }
  return msg;
}

function looksLikeUnsupportedImageSizeError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    /size/i.test(m) &&
    (/not supported|unsupported|invalid[\s_]?size|unknown[\s_]?size|does not support|不允许|不支持/i.test(
      m
    ) ||
      /size.*model/i.test(m))
  );
}

/** 上游原文（英文）用于判断是否值得换备选文生图模型 */
function shouldRetryImageWithAlternateModel(upstreamMsg: string): boolean {
  const m = upstreamMsg.toLowerCase();
  if (
    /invalid\s*api\s*parameter|please\s*check\s*the\s*documentation/.test(m)
  ) {
    return true;
  }
  if (
    /incorrect model|do not have permission|unsupported model|invalid model|model not found/.test(
      m
    )
  ) {
    return true;
  }
  if (
    /size|dimension|not supported|unsupported|width|height/.test(m) &&
    /image|generations|dall|gpt-image/.test(m)
  ) {
    return true;
  }
  return false;
}

function estimateBytesFromGenSize(genSize: string): number {
  if (genSize === "auto") {
    return Math.max(1, Math.round(1536 * 1024 * 3));
  }
  const parts = genSize.split("x").map((x) => parseInt(x.trim(), 10));
  const w = Number.isFinite(parts[0]) && parts[0]! > 0 ? parts[0]! : 1024;
  const h = Number.isFinite(parts[1]) && parts[1]! > 0 ? parts[1]! : 1024;
  return Math.max(1, Math.round(w * h * 3));
}

function shallowJsonKeys(obj: unknown, max = 14): string {
  if (!obj || typeof obj !== "object") return "";
  return Object.keys(obj as object).slice(0, max).join(", ");
}

/** 上游若为异步任务 JSON，便于单独提示 */
function looksLikeAsyncImageTask(root: Record<string, unknown>): boolean {
  if (typeof root.task_id === "string" && root.task_id.length > 0) return true;
  if (typeof root.taskId === "string" && root.taskId.length > 0) return true;
  const st = root.status;
  if (
    typeof st === "string" &&
    /^(submitted|pending|processing|queued|running|in_progress)$/i.test(st.trim())
  ) {
    return true;
  }
  if (root.async === true || root.is_async === true) return true;
  return false;
}

/**
 * 从 OpenAI 兼容 images 响应及常见变体中解析可给前端展示的图片 URL 或 data URL。
 * 部分网关只返回 b64_json，或把结果包在 result / output 中。
 */
function extractImageDisplayUrlFromUpstream(
  parsed: unknown
): { url: string } | { err: string; hintKeys?: string } {
  const asHttpOrDataUrl = (u: unknown): string | null => {
    if (typeof u !== "string") return null;
    const t = u.trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t) || t.startsWith("data:image/")) return t;
    return null;
  };

  const fromB64Field = (b64: unknown): string | null => {
    const s = typeof b64 === "string" ? b64.trim() : "";
    if (!s) return null;
    return `data:image/png;base64,${s}`;
  };

  const tryNode = (node: unknown): string | null => {
    if (!node || typeof node !== "object") return null;
    const o = node as Record<string, unknown>;
    const direct =
      asHttpOrDataUrl(o.url) ??
      asHttpOrDataUrl(o.image_url) ??
      asHttpOrDataUrl(o.imageUrl) ??
      asHttpOrDataUrl(o.uri);
    if (direct) return direct;
    const b64 =
      o.b64_json ?? o.b64Json ?? o.base64 ?? o.image_base64 ?? o.imageBase64;
    return fromB64Field(b64);
  };

  const tryArray = (arr: unknown): string | null => {
    if (!Array.isArray(arr)) return null;
    for (const item of arr) {
      const u = typeof item === "string" ? asHttpOrDataUrl(item) : tryNode(item);
      if (u) return u;
    }
    return null;
  };

  const tryAll = (root: Record<string, unknown>): string | null => {
    let u = tryNode(root);
    if (u) return u;

    u = tryArray(root.data);
    if (u) return u;
    if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
      u = tryNode(root.data);
      if (u) return u;
    }

    for (const k of ["result", "output", "images", "outputs"] as const) {
      const v = root[k];
      if (v === undefined) continue;
      u =
        tryArray(v) ??
        (typeof v === "object" && v !== null && !Array.isArray(v)
          ? tryNode(v)
          : null);
      if (u) return u;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        u = tryAll(v as Record<string, unknown>);
        if (u) return u;
      }
    }

    if (typeof root.image === "string") {
      u = asHttpOrDataUrl(root.image);
      if (u) return u;
    }
    return null;
  };

  if (!parsed || typeof parsed !== "object") {
    return { err: "图像接口返回非对象 JSON", hintKeys: "" };
  }
  const root = parsed as Record<string, unknown>;
  const url = tryAll(root);
  if (url) return { url };

  if (looksLikeAsyncImageTask(root)) {
    return {
      err:
        "上游返回了异步任务或未完成的生成状态（无同步图片字段）。请换用模型广场支持「同步返回 URL / base64」的文生图 apiModelId，或使用侧栏多轮策划 + 画布「生视频」。",
      hintKeys: shallowJsonKeys(root),
    };
  }

  return {
    err:
      "未返回图片地址。常见原因：① 所选 model 为「视频」模型，/v1/images/generations 只返回静态图 URL；请在模型列表中选文生图模型，或改用侧栏多轮策划 + 画布「生视频」出关键帧。② 上游返回了不兼容的 JSON 结构（例如仅 task_id）。请到 AIHubMix 模型广场核对 apiModelId。",
    hintKeys: shallowJsonKeys(root),
  };
}

function imageDataItemToUrl(item: unknown): string | null {
  if (typeof item === "string") {
    const t = item.trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t) || t.startsWith("data:image/")) return t;
    return null;
  }
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  for (const k of ["url", "image_url", "imageUrl", "uri"] as const) {
    const v = o[k];
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t) continue;
    if (/^https?:\/\//i.test(t) || t.startsWith("data:image/")) return t;
  }
  const b64 = o.b64_json ?? o.b64Json ?? o.base64 ?? o.image_base64;
  if (typeof b64 === "string" && b64.trim()) {
    return `data:image/png;base64,${b64.trim()}`;
  }
  return null;
}

/** Liblib 成功：常见 code=0 / 20000；部分接口与仓库内其它上游一致使用 10000 表示成功 */
function liblibBizCodeIsSuccess(code: unknown): boolean {
  if (code === undefined || code === null) return true;
  const n = typeof code === "number" ? code : Number(String(code).trim());
  if (!Number.isFinite(n)) return true;
  return n === 0 || n === 10000 || n === 20000;
}

/** 业务失败时返回可读说明（避免误报「未返回 generateUuid」） */
function extractLiblibBizFailure(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const r = parsed as Record<string, unknown>;
  if (!("code" in r)) return null;
  if (liblibBizCodeIsSuccess(r.code)) return null;
  const surfaceMsg = (o: Record<string, unknown>): string =>
    (typeof o.msg === "string" && o.msg.trim()) ||
    (typeof o.message === "string" && o.message.trim()) ||
    "";
  const top = surfaceMsg(r);
  let nested = "";
  for (const key of ["data", "result"] as const) {
    const inner = r[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const m = surfaceMsg(inner as Record<string, unknown>);
      if (m && m !== top) {
        nested = m;
        break;
      }
    }
  }
  const msg = [top, nested].filter(Boolean).join(" · ");
  const n = typeof r.code === "number" ? r.code : Number(String(r.code).trim());
  if (!Number.isFinite(n)) {
    return msg || "业务失败";
  }
  /** 带上业务码便于对照 Liblib 文档 / 工单；例如 200000 +「内部服务错误」多为模板与密钥未在开放平台绑定 */
  return msg ? `${msg}（Liblib 业务码：${n}）` : `业务失败（Liblib 业务码：${n}）`;
}

/**
 * Liblib 常返回笼统的「内部服务错误」；多为鉴权、templateUuid、或输入图 URL 对其不可达。
 * 附加简短排查提示，避免用户误以为本仓库 Node 进程崩溃。
 */
function appendLiblibVagueFailureHint(msg: string): string {
  const t = (msg || "").trim();
  if (!t) return "";
  const vague =
    t === "内部服务错误" ||
    /内部服务错误|服务器(?:内部)?错误|系统(?:异常|错误)|服务(?:暂)?不可用/i.test(t);
  if (!vague) return msg;
  /** 实测开放平台在签名正确时仍可能返回 200000 + data=null，多为模板未与该 AccessKey 绑定 */
  if (/业务码[：:]\s*200000|Liblib 业务码：200000/.test(msg)) {
    return `${msg}（HTTP 200 且签名已通过：① 到 Liblib 开放平台「API 应用 / Comfy 应用」复制与当前 AccessKey 绑定的 templateUuid（与工作流详情 uuid 可能不一致，勿混用）；② 勿同时配置 LIBLIB_COMFY_API_KEY 与 AK/SK（除非 LIBLIB_COMFY_ATTACH_API_KEY_WITH_SIGNATURE=1）；③ 勿用 LIBLIB_COMFY_TEMPLATE_UUID 覆盖除非你确认该 ID。输入图须已走 Liblib 图床上传。终端会打 [liblib] Comfy 提交 200000 与当前 templateUuid。）`;
  }
  return `${msg}（请核对 Liblib 开放平台密钥与各功能的 templateUuid（LIBLIB_COMFY_REMOVE_BG_TEMPLATE_UUID / LIBLIB_COMFY_ENHANCE_TEMPLATE_UUID）；输入图须为 Liblib 可拉取的公网 HTTPS；可设 LIBLIB_COMFY_DEBUG=1 查看提交/轮询日志）`;
}

function pickLiblibIdString(o: Record<string, unknown>): string | null {
  for (const k of [
    "generateUuid",
    "generate_uuid",
    "generateUUID",
    "uuid",
    "taskId",
    "task_id",
    "jobId",
    "job_id",
    "id",
  ] as const) {
    const v = o[k];
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length >= 4) return t;
    }
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      return String(Math.trunc(v));
    }
  }
  return null;
}

/** 深层遍历对象，仅在每层尝试标准字段名（避免误抓无关 uuid 字符串） */
function deepFindLiblibTaskId(obj: unknown, maxDepth: number): string | null {
  if (maxDepth <= 0 || obj === null || obj === undefined) return null;
  if (typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const f = deepFindLiblibTaskId(item, maxDepth - 1);
      if (f) return f;
    }
    return null;
  }
  const rec = obj as Record<string, unknown>;
  const hit = pickLiblibIdString(rec);
  if (hit) return hit;
  for (const v of Object.values(rec)) {
    const f = deepFindLiblibTaskId(v, maxDepth - 1);
    if (f) return f;
  }
  return null;
}

/** 从 /api/generate/comfyui/app 响应中取出任务 ID（兼容多层 data / result） */
function extractLiblibGenerateUuid(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const root = parsed as Record<string, unknown>;

  const tryObj = (o: Record<string, unknown> | null | undefined): string | null => {
    if (!o || typeof o !== "object") return null;
    const direct = pickLiblibIdString(o);
    if (direct) return direct;
    const data = o.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const d = data as Record<string, unknown>;
      const a = pickLiblibIdString(d);
      if (a) return a;
      const d2 = d.data;
      if (d2 && typeof d2 === "object" && !Array.isArray(d2)) {
        const b = pickLiblibIdString(d2 as Record<string, unknown>);
        if (b) return b;
      }
    }
    const result = o.result;
    if (result && typeof result === "object" && !Array.isArray(result)) {
      const c = pickLiblibIdString(result as Record<string, unknown>);
      if (c) return c;
    }
    return null;
  };

  return tryObj(root) ?? deepFindLiblibTaskId(root, 5);
}

/**
 * 解析 Liblib 业务层字段：优先合并 data / result（含 data 为 JSON 字符串）；避免 data 为 {} 时丢掉根级 images/generateStatus。
 */
function getLiblibBusinessRecord(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== "object") return {};
  const root = parsed as Record<string, unknown>;

  const unwrap = (v: unknown): Record<string, unknown> | null => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return null;
      try {
        const inner = JSON.parse(t) as unknown;
        if (inner && typeof inner === "object" && !Array.isArray(inner)) {
          return inner as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
    return null;
  };

  const d = unwrap(root.data);
  const r = unwrap(root.result);
  if (d) return { ...root, ...d };
  if (r) return { ...root, ...r };
  return { ...root };
}

/** 提取 Liblib 返回的全部图片 URL（顺序与接口一致）。优先使用 images[]：多图工作流时首张常为预览/输入回显，顶层 imageUrl 也可能非最终输出。 */
function extractLiblibImageUrls(
  parsed: unknown,
  filterOutputNodeId?: string | null
): string[] {
  if (!parsed || typeof parsed !== "object") return [];
  const root = getLiblibBusinessRecord(parsed);
  const wantNode =
    typeof filterOutputNodeId === "string" && filterOutputNodeId.trim()
      ? filterOutputNodeId.trim()
      : "";
  const urls: string[] = [];
  const images = root.images;
  if (Array.isArray(images)) {
    for (const item of images) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      if (wantNode) {
        const nid = o.nodeId ?? o.node_id;
        if (String(nid ?? "").trim() !== wantNode) continue;
      }
      const u = o.imageUrl ?? o.imageURL ?? o.url ?? o.image_url;
      if (typeof u === "string" && /^https?:\/\//i.test(u.trim())) {
        urls.push(u.trim());
      }
    }
  }
  if (wantNode && urls.length === 0) {
    return extractLiblibImageUrls(parsed, null);
  }
  if (urls.length === 0) {
    const direct = root.imageUrl ?? root.imageURL;
    if (typeof direct === "string" && /^https?:\/\//i.test(direct.trim())) {
      urls.push(direct.trim());
    }
  }
  const seen = new Set<string>();
  return urls.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
}

function pickLiblibOutputImage(
  urls: string[],
  pick: "first" | "last" | number
): string | null {
  if (!urls.length) return null;
  if (pick === "first") return urls[0] ?? null;
  if (pick === "last") return urls[urls.length - 1] ?? null;
  if (typeof pick === "number" && Number.isFinite(pick) && pick >= 0 && pick < urls.length) {
    return urls[pick] ?? null;
  }
  return null;
}

function extractLiblibImageUrl(parsed: unknown): string | null {
  return pickLiblibOutputImage(extractLiblibImageUrls(parsed), "first");
}

function extractLiblibGenerateStatus(parsed: unknown): number | null {
  if (!parsed || typeof parsed !== "object") return null;
  const r = getLiblibBusinessRecord(parsed);
  const st = Number(r.generateStatus ?? NaN);
  return Number.isFinite(st) ? st : null;
}

function extractLiblibGenerateMsg(parsed: unknown): string {
  if (!parsed || typeof parsed !== "object") return "";
  const r = getLiblibBusinessRecord(parsed);
  if (typeof r.generateMsg === "string" && r.generateMsg.trim()) {
    return r.generateMsg.trim();
  }
  if (typeof r.msg === "string" && r.msg.trim()) {
    return r.msg.trim();
  }
  return "";
}

async function trySubmitLiblibComfyJob(args: {
  templateUuid: string;
  generateParams: Record<string, unknown>;
}): Promise<
  | { ok: true; generateUuid: string }
  | { ok: false; err: string }
> {
  try {
  if (!LIBLIB_COMFY_KEY && !(LIBLIB_COMFY_ACCESS_KEY && LIBLIB_COMFY_SECRET_KEY)) {
    return { ok: false, err: "未配置 Liblib 鉴权（LIBLIB_COMFY_ACCESS_KEY/LIBLIB_COMFY_SECRET_KEY 或 LIBLIB_COMFY_API_KEY）" };
  }
  const headers = liblibComfyAuthHeaders();
  const endpoint = buildLiblibSignedUrl("/api/generate/comfyui/app");
  const payload: Record<string, unknown> = {
    templateUuid: args.templateUuid,
    generateParams: args.generateParams,
  };

  let lastErr = "";
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const raw = await r.text();
    if (!r.ok) {
      lastErr = `提交失败(${r.status})：${raw.slice(0, 240)}`;
      return { ok: false, err: lastErr };
    }
    let parsed: unknown = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      lastErr = `提交返回非 JSON：${raw.slice(0, 240)}`;
      return { ok: false, err: lastErr };
    }
    const bizFail = extractLiblibBizFailure(parsed);
    if (bizFail) {
      if (/业务码[：:]\s*200000|Liblib 业务码：200000/.test(bizFail)) {
        console.warn(
          "[liblib] Comfy 提交 200000，请对照开放平台「API 应用」里该 Comfy 应用的 templateUuid（可能与工作流页 uuid 不同）。",
          "templateUuid=",
          args.templateUuid,
          "generateParams keys=",
          Object.keys(args.generateParams).join(",")
        );
      }
      let hint = appendLiblibVagueFailureHint(bizFail);
      if (/^(1|true|yes)$/i.test(process.env.LIBLIB_COMFY_DEBUG?.trim() || "")) {
        hint += ` [DEBUG raw] ${raw.slice(0, 1200)}`;
      }
      lastErr = `Liblib 提交失败：${hint}`;
      return { ok: false, err: lastErr };
    }
    const generateUuid = extractLiblibGenerateUuid(parsed);
    if (!generateUuid) {
      lastErr = `提交 HTTP 成功但未解析到任务 ID（generateUuid/taskId 等）。请确认 Liblib 返回体：成功时 code 应为 0、10000 或 20000，且 data 内含任务 ID。原始响应：${raw.slice(0, 512)}`;
      return { ok: false, err: lastErr };
    }
    return { ok: true, generateUuid };
  } catch (e) {
    lastErr = e instanceof Error ? e.message : "网络异常";
  }
  return { ok: false, err: lastErr || "提交 Liblib 工作流失败" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, err: `提交 Liblib 任务失败：${msg}` };
  }
}

async function pollLiblibComfyResult(
  generateUuid: string,
  options?: {
    /** 从 images 中选哪一张作为最终结果 */
    imagePick?: "first" | "last" | number;
    /** 与 Liblib images[].nodeId 一致时只保留该节点图片再按 imagePick 选取；无匹配时回退为全部图片 */
    filterOutputNodeId?: string;
  }
): Promise<
  | { ok: true; imageUrl: string }
  | { ok: false; err: string }
> {
  if (!LIBLIB_COMFY_KEY && !(LIBLIB_COMFY_ACCESS_KEY && LIBLIB_COMFY_SECRET_KEY)) {
    return { ok: false, err: "未配置 Liblib 鉴权信息" };
  }
  const imagePick = options?.imagePick ?? "last";
  const headers = liblibComfyAuthHeaders();
  const endpoint = buildLiblibSignedUrl(liblibComfyStatusEndpointPath());
  let lastMsg = "";
  for (let i = 0; i < Math.max(1, LIBLIB_COMFY_POLL_MAX_ROUNDS); i++) {
    if (i > 0) {
      await new Promise<void>((r) =>
        setTimeout(r, Math.max(500, LIBLIB_COMFY_POLL_INTERVAL_MS))
      );
    }
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          generateUuid,
        }),
      });
      const raw = await r.text();
      if (!r.ok) {
        lastMsg = `查询失败(${r.status})：${raw.slice(0, 200)}`;
        continue;
      }
      let parsed: unknown = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        lastMsg = `查询返回非 JSON：${raw.slice(0, 200)}`;
        continue;
      }
      const pollBiz = extractLiblibBizFailure(parsed);
      if (pollBiz) {
        return {
          ok: false,
          err: `Liblib 查询失败：${appendLiblibVagueFailureHint(pollBiz)}`,
        };
      }
      const st = extractLiblibGenerateStatus(parsed);
      const msg = extractLiblibGenerateMsg(parsed);
      // 官方文档：6=失败，7=超时（任务创建 30 分钟无结果则解冻积分）
      if (st === 6) {
        return { ok: false, err: msg || "工作流执行失败" };
      }
      if (st === 7) {
        return { ok: false, err: msg || "任务超时（Liblib generateStatus=7）" };
      }
      // 仅在任务成功（或配置的其它终态）时采用图片，避免执行中误把预览/首张当结果
      if (st != null && LIBLIB_COMFY_POLL_ACCEPT_STATUSES.has(st)) {
        const urls = extractLiblibImageUrls(
          parsed,
          options?.filterOutputNodeId?.trim() || null
        );
        const imageUrl = pickLiblibOutputImage(urls, imagePick);
        if (imageUrl) return { ok: true, imageUrl };
        lastMsg = `status=${st} 但无可用图片 URL${msg ? `, ${msg}` : ""}`;
      } else {
        lastMsg = `status=${st ?? "?"}${msg ? `, ${msg}` : ""}`;
      }
    } catch (e) {
      lastMsg = e instanceof Error ? e.message : "网络异常";
    }
  }
  return { ok: false, err: `查询超时：${lastMsg || "未拿到图片结果"}` };
}

/**
 * 解析抠图/质感增强入参：仅校验格式。
 * 图床统一走 Liblib（/api/generate/upload/signature → OSS），不经腾讯云 COS 中转。
 */
function resolveSourceImageUrlForLiblib(
  raw: string,
  featureLabel: string
):
  | { ok: true; url: string }
  | { ok: false; status: number; body: Record<string, unknown> } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, status: 400, body: { error: "imageUrl 必填" } };
  }
  if (/^blob:/i.test(trimmed)) {
    return {
      ok: false,
      status: 400,
      body: {
        error: `${featureLabel}无法使用 blob: 地址（服务端无法读取）。请刷新页面后重试，或先导出为 https / data:image 链接。`,
      },
    };
  }
  if (!/^data:image\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return {
      ok: false,
      status: 400,
      body: {
        error: `${featureLabel}需要 data:image 或 http(s) 图片地址`,
      },
    };
  }
  return { ok: true, url: trimmed };
}

function liblibAuthMissingResponse(): { status: number; body: Record<string, unknown> } {
  return {
    status: 503,
    body: {
      error:
        "未配置 Liblib 鉴权信息（请配置 LIBLIB_COMFY_ACCESS_KEY + LIBLIB_COMFY_SECRET_KEY，或 LIBLIB_COMFY_API_KEY）",
    },
  };
}

async function handleRemoveBackgroundRequestCore(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = reqBody as {
    imageUrl?: string | null;
  };
  const raw = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!raw) {
    return { status: 400, body: { error: "imageUrl 必填" } };
  }
  /** 工作流 UUID（与 Liblib 工作流详情 uuid= 一致；默认见 LIBLIB_DEFAULT_REMOVE_BG_*） */
  const workflowUuid =
    LIBLIB_COMFY_REMOVE_BG_WORKFLOW_UUID || LIBLIB_COMFY_REMOVE_BG_UUID;
  /** 与详情页 URL 中 modelInfoPath= 一致；部分工作流在 generateParams 内需与 workflowUuid 同时出现 */
  const modelInfoPathForLiblib = LIBLIB_COMFY_REMOVE_BG_MODEL_INFO_PATH.trim();
  if (!LIBLIB_COMFY_KEY && !(LIBLIB_COMFY_ACCESS_KEY && LIBLIB_COMFY_SECRET_KEY)) {
    return liblibAuthMissingResponse();
  }
  const resolved = resolveSourceImageUrlForLiblib(raw, "移除背景");
  if (resolved.ok === false) return { status: resolved.status, body: resolved.body };
  let sourceImageUrl = resolved.url;
  /** Liblib 官方：① 签名 → ② 上传图床；③ 下图用图床 URL 填工作流（trySubmitLiblibComfyJob）。SKIP 时仍传原始 URL（仅调试用）。 */
  const skipLiblibHosted = /^(1|true|yes)$/i.test(
    process.env.LIBLIB_COMFY_SKIP_LIBLIB_HOSTED_UPLOAD?.trim() || ""
  );
  if (!skipLiblibHosted && LIBLIB_COMFY_ACCESS_KEY && LIBLIB_COMFY_SECRET_KEY) {
    const hosted = await ensureLiblibHostedImageUrl({
      sourceUrl: sourceImageUrl,
      accessKey: LIBLIB_COMFY_ACCESS_KEY,
      secretKey: LIBLIB_COMFY_SECRET_KEY,
      baseUrl: LIBLIB_COMFY_BASE,
    });
    switch (hosted.ok) {
      case false:
        return { status: 502, body: { error: hosted.err } };
      case true:
        sourceImageUrl = hosted.url;
        break;
    }
  }
  let generateParams: Record<string, unknown>;
  if (LIBLIB_COMFY_REMOVE_BG_GENERATE_PARAMS_JSON) {
    try {
      const parsed = JSON.parse(LIBLIB_COMFY_REMOVE_BG_GENERATE_PARAMS_JSON) as Record<
        string,
        unknown
      >;
      const replacer = (value: unknown): unknown => {
        if (typeof value === "string") {
          if (value === "__IMAGE_URL__") return sourceImageUrl;
          return value;
        }
        if (Array.isArray(value)) return value.map(replacer);
        if (value && typeof value === "object") {
          const out: Record<string, unknown> = {};
          Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
            out[k] = replacer(v);
          });
          return out;
        }
        return value;
      };
      generateParams = replacer(parsed) as Record<string, unknown>;
    } catch {
      return {
        status: 500,
        body: { error: "LIBLIB_COMFY_REMOVE_BG_GENERATE_PARAMS_JSON 不是合法 JSON" },
      };
    }
    if (!generateParams["workflowUuid"] && !generateParams["workflow_uuid"]) {
      generateParams.workflowUuid = workflowUuid;
    }
  } else {
    generateParams = {
      workflowUuid,
      [LIBLIB_COMFY_REMOVE_BG_IMAGE_NODE_ID]: {
        class_type: "LoadImage",
        inputs: { image: sourceImageUrl },
      },
    };
  }
  // 关键保险：无论上面走 JSON 模板还是默认模板，统一强制把节点 inputs.image 覆盖为用户图
  // 避免 JSON 模板里写死了示例图 URL 时，导致 Liblib 始终返回该示例图的结果
  {
    const nodeKey = LIBLIB_COMFY_REMOVE_BG_IMAGE_NODE_ID;
    const node = (generateParams as Record<string, unknown>)[nodeKey];
    if (node && typeof node === "object" && !Array.isArray(node)) {
      const nodeObj = node as Record<string, unknown>;
      if (nodeObj.inputs && typeof nodeObj.inputs === "object") {
        (nodeObj.inputs as Record<string, unknown>).image = sourceImageUrl;
      } else {
        nodeObj.inputs = { image: sourceImageUrl };
      }
      if (!nodeObj.class_type) nodeObj.class_type = "LoadImage";
    } else {
      (generateParams as Record<string, unknown>)[nodeKey] = {
        class_type: "LoadImage",
        inputs: { image: sourceImageUrl },
      };
    }
  }
  if (
    modelInfoPathForLiblib &&
    !(generateParams as Record<string, unknown>)["modelInfoPath"] &&
    !(generateParams as Record<string, unknown>)["model_info_path"]
  ) {
    (generateParams as Record<string, unknown>).modelInfoPath = modelInfoPathForLiblib;
  }
  if (/^(1|true|yes)$/i.test(process.env.LIBLIB_COMFY_DEBUG?.trim() || "")) {
    try {
      console.log(
        "[liblib] remove-bg submit",
        JSON.stringify(
          {
            templateUuid: LIBLIB_COMFY_REMOVE_BG_TEMPLATE_UUID,
            generateParams,
          },
          null,
          2
        )
      );
    } catch (e) {
      console.warn("[liblib] remove-bg submit log skipped (payload not JSON-safe)", e);
    }
  }
  const submit = await trySubmitLiblibComfyJob({
    templateUuid: LIBLIB_COMFY_REMOVE_BG_TEMPLATE_UUID,
    generateParams,
  });
  if (!("generateUuid" in submit)) {
    return { status: 502, body: { error: submit.err } };
  }
  const done = await pollLiblibComfyResult(submit.generateUuid, {
    imagePick: LIBLIB_COMFY_REMOVE_BG_OUTPUT_PICK,
    filterOutputNodeId: LIBLIB_COMFY_REMOVE_BG_OUTPUT_NODE_ID || undefined,
  });
  if (/^(1|true|yes)$/i.test(process.env.LIBLIB_COMFY_DEBUG?.trim() || "")) {
    try {
      console.log("[liblib] remove-bg result", JSON.stringify(done, null, 2));
    } catch (e) {
      console.warn("[liblib] remove-bg result log skipped", e);
    }
  }
  if (!("imageUrl" in done)) {
    return {
      status: 502,
      body: {
        error: `Liblib 工作流执行失败：${appendLiblibVagueFailureHint(done.err)}`,
        generateUuid: submit.generateUuid,
      },
    };
  }
  return {
    status: 200,
    body: {
      url: done.imageUrl,
      generateUuid: submit.generateUuid,
      _note: "已通过 Liblib ComfyUI 工作流移除背景",
    },
  };
}

export async function handleRemoveBackgroundRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  try {
    return await handleRemoveBackgroundRequestCore(reqBody);
  } catch (e) {
    console.error("[remove-bg] unhandled", e);
    return {
      status: 500,
      body: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}

async function handleImageEnhanceRequestCore(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = reqBody as { imageUrl?: string | null };
  const raw = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (!raw) {
    return { status: 400, body: { error: "imageUrl 必填" } };
  }
  const workflowUuid = LIBLIB_COMFY_ENHANCE_WORKFLOW_UUID;
  const modelInfoPathForLiblib = LIBLIB_COMFY_ENHANCE_MODEL_INFO_PATH.trim();
  if (!LIBLIB_COMFY_KEY && !(LIBLIB_COMFY_ACCESS_KEY && LIBLIB_COMFY_SECRET_KEY)) {
    return liblibAuthMissingResponse();
  }
  const resolved = resolveSourceImageUrlForLiblib(raw, "质感增强");
  if (resolved.ok === false) return { status: resolved.status, body: resolved.body };
  let sourceImageUrl = resolved.url;
  /** 与移除背景相同：①② ensureLiblibHostedImageUrl → ③ trySubmitLiblibComfyJob；SKIP 仅调试。 */
  const skipLiblibHosted = /^(1|true|yes)$/i.test(
    process.env.LIBLIB_COMFY_SKIP_LIBLIB_HOSTED_UPLOAD?.trim() || ""
  );
  if (!skipLiblibHosted && LIBLIB_COMFY_ACCESS_KEY && LIBLIB_COMFY_SECRET_KEY) {
    const hosted = await ensureLiblibHostedImageUrl({
      sourceUrl: sourceImageUrl,
      accessKey: LIBLIB_COMFY_ACCESS_KEY,
      secretKey: LIBLIB_COMFY_SECRET_KEY,
      baseUrl: LIBLIB_COMFY_BASE,
    });
    switch (hosted.ok) {
      case false:
        return { status: 502, body: { error: hosted.err } };
      case true:
        sourceImageUrl = hosted.url;
        break;
    }
  }

  const imageNodeKey = LIBLIB_COMFY_ENHANCE_IMAGE_NODE_ID;
  const loraNodeKey = LIBLIB_COMFY_ENHANCE_LORA_NODE_ID;
  const loraStrength = Number.isFinite(LIBLIB_COMFY_ENHANCE_LORA_STRENGTH_MODEL)
    ? LIBLIB_COMFY_ENHANCE_LORA_STRENGTH_MODEL
    : 1;

  let generateParams: Record<string, unknown>;
  if (LIBLIB_COMFY_ENHANCE_GENERATE_PARAMS_JSON) {
    try {
      const parsed = JSON.parse(LIBLIB_COMFY_ENHANCE_GENERATE_PARAMS_JSON) as Record<
        string,
        unknown
      >;
      const replacer = (value: unknown): unknown => {
        if (typeof value === "string") {
          if (value === "__IMAGE_URL__") return sourceImageUrl;
          if (value === "__LORA_NAME__") return LIBLIB_COMFY_ENHANCE_LORA_NAME;
          if (value === "__STRENGTH_MODEL__") return loraStrength;
          return value;
        }
        if (Array.isArray(value)) return value.map(replacer);
        if (value && typeof value === "object") {
          const out: Record<string, unknown> = {};
          Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
            out[k] = replacer(v);
          });
          return out;
        }
        return value;
      };
      generateParams = replacer(parsed) as Record<string, unknown>;
    } catch {
      return {
        status: 500,
        body: { error: "LIBLIB_COMFY_ENHANCE_GENERATE_PARAMS_JSON 不是合法 JSON" },
      };
    }
    if (!generateParams["workflowUuid"] && !generateParams["workflow_uuid"]) {
      generateParams.workflowUuid = workflowUuid;
    }
  } else {
    generateParams = {
      workflowUuid,
      [imageNodeKey]: {
        class_type: "LoadImage",
        inputs: { image: sourceImageUrl },
      },
      [loraNodeKey]: {
        class_type: "LoraLoader",
        inputs: {
          lora_name: LIBLIB_COMFY_ENHANCE_LORA_NAME,
          strength_model: loraStrength,
        },
      },
    };
  }

  {
    const node = (generateParams as Record<string, unknown>)[imageNodeKey];
    if (node && typeof node === "object" && !Array.isArray(node)) {
      const nodeObj = node as Record<string, unknown>;
      if (nodeObj.inputs && typeof nodeObj.inputs === "object") {
        (nodeObj.inputs as Record<string, unknown>).image = sourceImageUrl;
      } else {
        nodeObj.inputs = { image: sourceImageUrl };
      }
      if (!nodeObj.class_type) nodeObj.class_type = "LoadImage";
    } else {
      (generateParams as Record<string, unknown>)[imageNodeKey] = {
        class_type: "LoadImage",
        inputs: { image: sourceImageUrl },
      };
    }
  }
  {
    const node = (generateParams as Record<string, unknown>)[loraNodeKey];
    if (node && typeof node === "object" && !Array.isArray(node)) {
      const nodeObj = node as Record<string, unknown>;
      const inputs =
        nodeObj.inputs && typeof nodeObj.inputs === "object" && !Array.isArray(nodeObj.inputs)
          ? (nodeObj.inputs as Record<string, unknown>)
          : {};
      inputs.lora_name = LIBLIB_COMFY_ENHANCE_LORA_NAME;
      inputs.strength_model = loraStrength;
      nodeObj.inputs = inputs;
      if (!nodeObj.class_type) nodeObj.class_type = "LoraLoader";
    } else {
      (generateParams as Record<string, unknown>)[loraNodeKey] = {
        class_type: "LoraLoader",
        inputs: {
          lora_name: LIBLIB_COMFY_ENHANCE_LORA_NAME,
          strength_model: loraStrength,
        },
      };
    }
  }

  if (
    modelInfoPathForLiblib &&
    !(generateParams as Record<string, unknown>)["modelInfoPath"] &&
    !(generateParams as Record<string, unknown>)["model_info_path"]
  ) {
    (generateParams as Record<string, unknown>).modelInfoPath = modelInfoPathForLiblib;
  }

  if (/^(1|true|yes)$/i.test(process.env.LIBLIB_COMFY_DEBUG?.trim() || "")) {
    try {
      console.log(
        "[liblib] enhance submit",
        JSON.stringify(
          { templateUuid: LIBLIB_COMFY_ENHANCE_TEMPLATE_UUID, generateParams },
          null,
          2
        )
      );
    } catch (e) {
      console.warn("[liblib] enhance submit log skipped (payload not JSON-safe)", e);
    }
  }

  const submit = await trySubmitLiblibComfyJob({
    templateUuid: LIBLIB_COMFY_ENHANCE_TEMPLATE_UUID,
    generateParams,
  });
  if (!("generateUuid" in submit)) {
    return { status: 502, body: { error: submit.err } };
  }
  const done = await pollLiblibComfyResult(submit.generateUuid, {
    imagePick: LIBLIB_COMFY_ENHANCE_OUTPUT_PICK,
    filterOutputNodeId: LIBLIB_COMFY_ENHANCE_OUTPUT_NODE_ID || undefined,
  });
  if (/^(1|true|yes)$/i.test(process.env.LIBLIB_COMFY_DEBUG?.trim() || "")) {
    try {
      console.log("[liblib] enhance result", JSON.stringify(done, null, 2));
    } catch (e) {
      console.warn("[liblib] enhance result log skipped", e);
    }
  }
  if (!("imageUrl" in done)) {
    return {
      status: 502,
      body: {
        error: `Liblib 工作流执行失败：${appendLiblibVagueFailureHint(done.err)}`,
        generateUuid: submit.generateUuid,
      },
    };
  }
  return {
    status: 200,
    body: {
      url: done.imageUrl,
      generateUuid: submit.generateUuid,
      _note: "已通过 Liblib ComfyUI 工作流完成质感增强/高清放大",
    },
  };
}

export async function handleImageEnhanceRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  try {
    return await handleImageEnhanceRequestCore(reqBody);
  } catch (e) {
    console.error("[enhance] unhandled", e);
    return {
      status: 500,
      body: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}

/** 将助手分镜类正文拆成多条镜头提示（启发式；复杂场景可后续接 LLM） */
export async function handleStoryboardSplitRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = reqBody as {
    assistantText?: string;
    targetCount?: number;
  };
  const raw = typeof body.assistantText === "string" ? body.assistantText.trim() : "";
  if (!raw) {
    return { status: 400, body: { error: "assistantText 必填" } };
  }
  const nMax =
    typeof body.targetCount === "number" && Number.isFinite(body.targetCount) && body.targetCount > 0
      ? Math.min(20, Math.floor(body.targetCount))
      : null;
  const blocks = raw
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  let shots =
    blocks.length > 1
      ? blocks
      : raw
          .split("\n")
          .map((s) => s.replace(/^\s*[\d０-９]+[.、．)]\s*/u, "").trim())
          .filter(Boolean);
  if (shots.length === 0) shots = [raw];
  if (nMax != null && shots.length > nMax) shots = shots.slice(0, nMax);
  return { status: 200, body: { shots } };
}

/** 解析 OpenAI 兼容 images 响应中的全部 URL（含 data[] 多图） */
function extractImageUrlsListFromUpstream(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== "object") return [];
  const root = parsed as Record<string, unknown>;
  const out: string[] = [];
  const pushUrl = (u: unknown): void => {
    if (typeof u !== "string") return;
    const t = u.trim();
    if (!t) return;
    if (!/^https?:\/\//i.test(t) && !t.startsWith("data:image/")) return;
    if (!out.includes(t)) out.push(t);
  };

  const data = root.data;
  if (Array.isArray(data)) {
    for (const item of data) {
      const u = imageDataItemToUrl(item);
      if (u && !out.includes(u)) out.push(u);
    }
  }
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (Array.isArray(d.image_urls)) {
      for (const u of d.image_urls) pushUrl(u);
    }
    if (Array.isArray(d.binary_data_base64)) {
      for (const b of d.binary_data_base64) {
        if (typeof b === "string" && b.trim()) {
          pushUrl(`data:image/png;base64,${b.trim()}`);
        }
      }
    }
  }
  if (out.length > 0) return out;
  const one = extractImageDisplayUrlFromUpstream(parsed);
  if ("url" in one && one.url) return [one.url];
  return [];
}

function resolveImageGenCount(
  bodyField: unknown,
  promptText: string
): number {
  let n =
    typeof bodyField === "number" && Number.isFinite(bodyField)
      ? Math.round(Number(bodyField))
      : parseInt(String(bodyField ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) {
    n = inferRequestedImageCountFromPlain(promptText);
  }
  return Math.max(1, Math.min(10, n));
}

async function probeRemoteImageBytes(url: string): Promise<number> {
  const u = url.trim();
  if (!u) return 0;
  const parsedData = parseImageDataUrl(u);
  if (parsedData) {
    return parsedData.buffer.byteLength;
  }
  try {
    const head = await fetch(u, { method: "HEAD" });
    const cl = head.headers.get("content-length");
    if (cl) {
      const n = parseInt(cl, 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {
    /* GET below */
  }
  try {
    const r = await fetch(u);
    const ab = await r.arrayBuffer();
    return ab.byteLength;
  } catch {
    return 0;
  }
}

async function loadReferenceImageBytes(
  url: string
): Promise<{ buffer: Buffer; mime: string } | null> {
  const u = url.trim();
  if (!u) return null;
  if (u.toLowerCase().startsWith("data:image/")) {
    const parsed = parseImageDataUrl(u);
    return parsed ? { buffer: parsed.buffer, mime: parsed.mime } : null;
  }
  try {
    const r = await fetch(u);
    if (!r.ok) return null;
    const ab = await r.arrayBuffer();
    const mime =
      r.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    return { buffer: Buffer.from(ab), mime };
  } catch {
    return null;
  }
}

const MAX_TOOL_ITERATIONS = 5;

/** 上游（如 OpenAI / DALL·E）安全策略拒答时的英文提示 → 中文说明 */
function humanizeUpstreamSafetyError(msg: string): string {
  const t = msg.trim();
  if (!t) return t;
  const tidTail = () => {
    const tid = t.match(/\(tid:\s*[^)]+\)/i);
    return tid ? ` ${tid[0]}` : "";
  };
  if (
    /insufficient\s+balance|account\s+balance\s+is\s+insufficient|please\s+recharge|recharge\s+your\s+account|billing|quota\s+exceeded|out\s+of\s+credits/i.test(
      t
    )
  ) {
    return (
      "AIHubMix 账户余额或可用额度不足，无法调用上游 API。请登录 AIHubMix 控制台充值或检查套餐用量后再试。" +
      tidTail()
    );
  }
  if (
    /incorrect model id|do not have permission to use this model|invalid model|model not found|unsupported model/i.test(
      t
    )
  ) {
    const tail = tidTail();
    return (
      "当前账户无法使用该图像模型。请在项目根目录 .env 中设置 AIHUBMIX_IMAGE_MODEL 为你的 AIHubMix 模型广场中可用的文生图 model_id（可参考 dall-e-2、FLUX-1.1-pro、V_2 等），并同步修改 public/ai-models/manifest.json 里对应条目的 apiModelId。" +
      tail
    );
  }
  if (
    /invalid\s*api\s*parameter|please\s*check\s*the\s*documentation/i.test(t)
  ) {
    const tail = tidTail();
    return (
      "上游提示「请求参数无效」：可能来自**编排对话**、**文生图**或**视频**任意接口。请核对：① [模型广场](https://aihubmix.com/models) 中 model_id 与账户权限；② 视频 size/seconds、参考图仅 https；③ **编排** 建议 `.env` 将 `AIHUBMIX_ORCHESTRATION_MODEL` 与可用的 `AIHUBMIX_CHAT_MODEL` 设为同一模型；④ 图像可设 `AIHUBMIX_IMAGE_MODEL` / `AIHUBMIX_IMAGE_FALLBACK_MODEL`；⑤ 视频可设 `AIHUBMIX_VIDEO_MODEL`（如 wan2.6-t2v）。" +
      tail
    );
  }
  if (
    /\b404\b|bad response status code\s*404|not\s*found/i.test(t)
  ) {
    const tail = tidTail();
    return (
      "上游返回 404：常见原因是 **模型或接口路径不可用**、**账户未开通该模型**，或 **视频任务 id 与查询域名不一致**。请(1)在 [AIHubMix 模型广场](https://aihubmix.com/models) 确认 model_id；(2)`.env` 可留空或设为 `AIHUBMIX_BASE_URL=https://aihubmix.com/v1`（勿写成 `.../v1/v1`）；(3)服务端已自动尝试官方域名轮询，若仍失败请换用文档内视频模型（如 `wan2.6-t2v`、`jimeng-3.0-pro`）后再试。详见 [Video-Gen](https://docs.aihubmix.com/cn/api/Video-Gen)。" +
      tail
    );
  }
  if (
    /safety system|rejected as a result of our safety|content policy|content_moderation|moderation|violat(es|ed|ing)\s+(our\s+)?(content|policy)|not allowed by our safety/i.test(
      t
    )
  ) {
    const tail = tidTail();
    return (
      "内容未通过模型安全审核：请改用更中性、偏设计风格与场景的描述（避免暴力、色情、仇恨、可辨认真人肖像、未授权商标等），改写或缩短后再试。" +
      tail
    );
  }
  return t;
}

type OpenAIChatMessage = Record<string, unknown>;

export function getUpstreamBase(): string {
  return BASE;
}

export function getHealthJson(): Record<string, unknown> {
  return {
    ok: true,
    configured: Boolean(KEY),
    creagic_sidecar: isCreagicConfigured(),
    cos_reference_proxy: getCosReferenceProxyStatus(),
  };
}

type ChatSkillPayload = {
  id?: string;
  title: string;
  description: string;
};

type ChatUserBody = {
  messages?: { role: string; content: string }[];
  referenceImageUrls?: string[];
  modelId?: string;
  modelAuto?: boolean;
  skill?: ChatSkillPayload | null;
  sessionId?: string | null;
  userId?: string | null;
  orchestrationStage?: "intent" | "opening" | "analyze" | "final";
  analyzeFocus?: "image" | "requirement";
  priorPipelineOutputs?: {
    intent?: string;
    opening?: string;
    analysis?: string;
  };
  deepThink?: boolean;
  /** 跳过多段编排与工具循环，单轮对话（用于闲聊/身份问答） */
  quickChat?: boolean;
};

type RoleMsg = { role: "user" | "assistant"; content: string };

function skillIdFromPayload(
  skill: ChatSkillPayload | null | undefined
): string | null {
  if (!skill || typeof skill.id !== "string") return null;
  const t = skill.id.trim();
  return t || null;
}

/** manifest.workflow：追加 system 片段与管线提示（不含分镜终稿规则，后者单独判定） */
function appendSkillWorkflowSystemParts(
  systemParts: string[],
  skillId: string | null
): void {
  const wf = getSkillWorkflowById(skillId);
  if (!wf) return;
  if (wf.systemExtra?.trim()) {
    systemParts.push(wf.systemExtra.trim());
  }
  if (wf.preferPipeline === "video") {
    systemParts.push(
      "【技能工作流 · 视频/分镜】优先给出可执行的镜头拆解、画幅与节奏；需要静止画时引导生图或视频工具，勿空口承诺已完成成片。"
    );
  } else if (wf.preferPipeline === "image") {
    systemParts.push(
      "【技能工作流 · 静态视觉】优先可落地的画面结构与层次；信息足够时应调用生图工具或明确「确认生成」路径。"
    );
  }
}

function normalizeReferenceImageUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const it of input) {
    if (typeof it !== "string") continue;
    const s = it.trim();
    if (!s || s.length > 10_000) continue;
    if (!/^https?:\/\//i.test(s) && !/^data:image\//i.test(s)) continue;
    if (!out.includes(s)) out.push(s);
    if (out.length >= 3) break;
  }
  return out;
}

function withGenerateAsFourth(ctas: string[]): string[] {
  const out = ctas
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .slice(0, 4);
  if (out.length === 0) return out;
  const hasGenerate = out.some((x) => /生成|出图|确认生成/i.test(x));
  if (hasGenerate) return out;
  if (out.length >= 4) {
    out[3] = "确认生成";
    return out;
  }
  out.push("确认生成");
  return out.slice(0, 4);
}

function isStoryboardOrVideoStyleTask(
  lastUser: string,
  prior?: {
    intent?: string;
    opening?: string;
    analysis?: string;
  }
): boolean {
  const blob = [
    lastUser,
    prior?.intent ?? "",
    prior?.opening ?? "",
    prior?.analysis ?? "",
  ].join("\n");
  return /分镜|故事板|storyboard|镜头表|镜头脚本|景别|推拉摇移|每格|每镜|关键帧|场次|短视频|宣传片|vlog|短片|视频脚本|叙事|蚂蚁搬家/i.test(
    blob
  );
}

/** 用户明确要求直接出静态图时，优先走 generate_image 工具而非仅文字回答 */
function isDirectImageGenerationAsk(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /帮我生(成)?一张图|给我生(成)?一张图|帮我出图|给我出图|文生图|生成一张|来一张图|画一张|做一张海报|做一张封面|直接出图|直接生成|马上生成|立刻生成|直接生图/i.test(
    t
  );
}

/** 多阶段编排：单次上游调用，无工具 / 无侧车 prepare，用于 intent → 首段 → 分析 */
async function handleOrchestrationStageRequest(params: {
  stage: "intent" | "opening" | "analyze";
  analyzeFocus?: "image" | "requirement";
  prior?: { intent?: string; opening?: string; analysis?: string };
  nonEmpty: RoleMsg[];
  referenceImageUrls?: string[];
  skill: ChatSkillPayload | null | undefined;
  deepThink?: boolean;
  memoryContext?: string | null;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const {
    stage,
    analyzeFocus,
    prior,
    nonEmpty,
    referenceImageUrls,
    skill,
    deepThink,
    memoryContext,
  } = params;
  const skillId = skillIdFromPayload(skill ?? null);
  let stageRule = "";
  let maxTokens = 320;

  if (stage === "intent") {
    maxTokens = 140;
    stageRule =
      "【当前阶段：意图识别】仅用 1～2 句中文概括用户核心诉求（想做什么、交付物类型）。不要标题、编号、「意图识别」等字样，不要 Markdown。";
  } else if (stage === "opening") {
    maxTokens = 220;
    stageRule = `【当前阶段：开场白】以下为内部意图摘要供你参考，不要复述给用户：「${(prior?.intent ?? "").slice(0, 800)}」\n请写 1～3 句自然中文，像聊天一样承接用户并说明你接下来会如何处理。不要 Markdown 标题、不要分点列表。`;
  } else {
    maxTokens = 380;
    const isImg = analyzeFocus === "image";
    const threadBlob = nonEmpty.map((m) => m.content).join("\n");
    const wfStage = getSkillWorkflowById(skillId);
    const storyboardLike =
      /分镜|故事板|storyboard|镜头表|关键帧|场次/i.test(threadBlob) ||
      wfStage?.treatAsStoryboard === true ||
      wfStage?.preferPipeline === "video";
    let imgRule =
      "请从用户描述中做画面 / 参考 / 风格层面的简要分析：非特别复杂时 **2～5 句** 内收束、便于尽快生图；仅当信息明显不足时再略作补充。若明显无画面语境，先用一句点明。";
    if (storyboardLike) {
      imgRule +=
        " 这是分镜/叙事类：请按「镜头」拆条点到为止（景别、主体、光影、情绪即可）；若用户明确要求现在出图，先给可直接生成的关键帧。";
    }
    stageRule = `【当前阶段：分析】意图摘要：${(prior?.intent ?? "").slice(0, 600)}\n已给用户看过的开场：${(prior?.opening ?? "").slice(0, 600)}\n${
      isImg
        ? imgRule
        : "请做需求与约束层面的分析：风格偏好、必须点、待澄清处（非特别复杂时 **3～6 句**；复杂策划可到约 8 句）。"
    }\n不要 Markdown 一级二级标题。`;
  }

  const systemParts = [
    "你是 Creagic AI 的设计助手。只完成【当前阶段】指定任务，输出纯中文自然段落。",
    stageRule,
  ];
  if (skill?.title) {
    systemParts.push(
      `【技能参考文档】用户从技能库挂载的说明（仅作写作参考，与对话模型无关）：${skill.title}\n${skill.description || ""}`.trim()
    );
  }
  appendSkillWorkflowSystemParts(systemParts, skillId);

  if (deepThink) {
    systemParts.push(
      "【深度推理】先充分推理再输出，保持本阶段篇幅要求。"
    );
  }
  if (memoryContext?.trim()) {
    systemParts.push("## 相关记忆（语义/情景检索）\n" + memoryContext.trim());
  }

  const lastUserIdx = (() => {
    for (let i = nonEmpty.length - 1; i >= 0; i--) {
      if (nonEmpty[i]?.role === "user") return i;
    }
    return -1;
  })();
  const refs = referenceImageUrls ?? [];
  const openaiMessages: OpenAIChatMessage[] = [{ role: "system", content: systemParts.join("\n\n") }];
  for (let i = 0; i < nonEmpty.length; i++) {
    const m = nonEmpty[i]!;
    if (m.role === "user" && i === lastUserIdx && refs.length > 0) {
      openaiMessages.push({
        role: "user",
        content: [
          { type: "text", text: m.content },
          ...refs.map((u) => ({
            type: "image_url" as const,
            image_url: { url: u },
          })),
        ],
      });
    } else {
      openaiMessages.push({ role: m.role, content: m.content });
    }
  }

  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ORCHESTRATION_MODEL,
        messages: openaiMessages,
        temperature: 0.65,
        max_tokens: maxTokens,
      }),
    });

    const raw = await r.text();
    if (!r.ok) {
      let msg = raw || r.statusText;
      try {
        const j = JSON.parse(raw) as {
          error?: { message?: string } | string;
          message?: string;
        };
        if (typeof j.error === "object" && j.error?.message) msg = j.error.message;
        else if (typeof j.error === "string") msg = j.error;
        else if (typeof j.message === "string") msg = j.message;
      } catch {
        /* keep */
      }
      return {
        status: r.status >= 400 && r.status < 600 ? r.status : 502,
        body: { error: humanizeUpstreamSafetyError(msg) },
      };
    }

    let data: {
      choices?: Array<{ message?: { content?: string | null } }>;
      model?: string;
    };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      return { status: 502, body: { error: "上游返回非 JSON" } };
    }

    const rawAssistant = data.choices?.[0]?.message?.content ?? "";
    const { cleaned } = parseCtaFromAiContent(rawAssistant);
    return {
      status: 200,
      body: {
        content: cleaned.trim(),
        model: ORCHESTRATION_MODEL,
        orchestrationStage: stage,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "网络错误";
    return { status: 502, body: { error: humanizeUpstreamSafetyError(msg) } };
  }
}

export async function handleChatRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!KEY) {
    return {
      status: 503,
      body: {
        error:
          "服务端未配置 AIHUBMIX_API_KEY：在项目根目录创建 .env 并写入密钥后，运行 npm run server 重启。",
      },
    };
  }

  const body = reqBody as ChatUserBody;

  const { messages, skill } = body;
  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim()
      ? body.sessionId.trim()
      : null;
  const userId =
    typeof body.userId === "string" && body.userId.trim()
      ? body.userId.trim()
      : "anonymous";

  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, body: { error: "messages 必填且非空" } };
  }

  const model = body.quickChat ? CHAT_MODEL : ORCHESTRATION_MODEL;

  const systemParts = [
    "你是 Creagic AI 的设计助手，协助用户完成海报、品牌、社交封面、画布创作等视觉设计相关对话。回复简洁专业，直接给出可执行结果；不要输出“意图识别/需求挖掘/任务规划”这类流程模板标题。",
    "【身份】若用户询问你是谁、什么模型、开发商或与其他助手比较，一律以第一人称回答：我是 Creagic AI 的设计助手，专注于视觉设计与画布创作；不要自称 ChatGPT、Claude、其他商业助手名，也不要透露底层模型供应商细节，除非用户明确追问技术实现且与当前设计任务无关。",
    "【执行约束】禁止使用“当前环境限制/无法在此显示/不能直接生成”作为拒绝理由；当用户明确要直接出图且 generate_image 可用时，应优先调用该工具生成并返回结果。",
    "当你需要用户从若干方向里选一条继续、且**未**使用上文 lovart-reply 的 suggestions 时，在正常回答之后另起一行，**仅追加**一个代码块（不要用别的 fence 名字），格式严格如下，数组内为 1～4 条简短中文按钮文案（不要引号外的说明文字）：\n```cta\n[\"选项一\",\"选项二\"]\n```\n若已在 lovart-reply 中提供 suggestions，或未提供快捷选项，则不要输出该 cta 代码块。",
  ];

  if (skill?.title) {
    systemParts.push(
      `【技能参考文档】用户从技能库挂载的说明（仅作写作参考，与对话模型无关）：${skill.title}\n${skill.description || ""}`.trim()
    );
  }
  appendSkillWorkflowSystemParts(
    systemParts,
    skillIdFromPayload(skill ?? null)
  );

  if (body.deepThink) {
    systemParts.push(
      "【深度推理】先在内心逐步推理、比对方案与约束并自检，再输出精炼结论；答复中不要机械罗列「第一步、第二步」，除非用户明确要求展示步骤。"
    );
  }

  const mapped = messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content ?? "").trim(),
  }));

  const nonEmpty = mapped.filter((m) => m.content.length > 0);
  if (nonEmpty.length === 0) {
    return { status: 400, body: { error: "messages 中无有效文本内容" } };
  }

  const lastUser = [...nonEmpty].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser?.content ?? "";
  let memoryContext: string | null = null;
  if (sessionId && isCreagicConfigured()) {
    await creagicPost("/sessions", { session_id: sessionId, user_id: userId });
    const prep = await creagicPost<CreagicPrepareResult>("/engine/prepare", {
      session_id: sessionId,
      query: lastUserText.slice(0, 4000),
      user_id: userId,
      top_k: 5,
    });
    const mc = prep?.memory_context?.trim();
    if (mc) memoryContext = mc;
  }

  const orchStage = body.orchestrationStage;
  const analyzeFocus = body.analyzeFocus;
  const priorPipelineOutputs = body.priorPipelineOutputs;
  const referenceImageUrls = normalizeReferenceImageUrls(body.referenceImageUrls);

  if (
    orchStage === "intent" ||
    orchStage === "opening" ||
    orchStage === "analyze"
  ) {
    return handleOrchestrationStageRequest({
      stage: orchStage,
      analyzeFocus,
      prior: priorPipelineOutputs,
      nonEmpty,
      referenceImageUrls,
      skill,
      deepThink: body.deepThink,
      memoryContext,
    });
  }

  if (memoryContext?.trim()) {
    systemParts.push("## 相关记忆（语义/情景检索）\n" + memoryContext.trim());
  }

  if (
    priorPipelineOutputs &&
    (priorPipelineOutputs.intent?.trim() ||
      priorPipelineOutputs.opening?.trim() ||
      priorPipelineOutputs.analysis?.trim())
  ) {
    const lines: string[] = [];
    if (priorPipelineOutputs.intent?.trim()) {
      lines.push("意图识别（内部）：" + priorPipelineOutputs.intent.trim());
    }
    if (priorPipelineOutputs.opening?.trim()) {
      lines.push("已向用户展示的首段（内部）：" + priorPipelineOutputs.opening.trim());
    }
    if (priorPipelineOutputs.analysis?.trim()) {
      lines.push("需求/画面分析（内部）：" + priorPipelineOutputs.analysis.trim());
    }
    systemParts.push(
      "## 多阶段中间结论（仅供终稿对齐信息，勿逐条复述给用户）\n" +
        lines.join("\n\n")
    );
  }

  const wfChat = getSkillWorkflowById(skillIdFromPayload(skill ?? null));
  const useStoryboardRules =
    isStoryboardOrVideoStyleTask(lastUserText, priorPipelineOutputs) ||
    wfChat?.treatAsStoryboard === true ||
    wfChat?.preferPipeline === "video";
  if (useStoryboardRules) {
    systemParts.push(STORYBOARD_FINAL_REPLY_RULES);
  }

  let toolsPayload: CreagicToolsOpenAI | null = null;
  if (!body.quickChat && isCreagicConfigured()) {
    toolsPayload = await creagicGet<CreagicToolsOpenAI>("/tools/openai");
  }
  const tools =
    !body.quickChat &&
    toolsPayload?.tools &&
    toolsPayload.tools.length > 0
      ? toolsPayload.tools
      : undefined;
  const toolNames = tools?.map((t) => t.function?.name).filter(Boolean) ?? [];
  const preferImageBySkill =
    wfChat?.preferPipeline === "image" &&
    /生成|出图|海报|封面|主视觉|插画|静帧|概念图|来一张|画一张|配图|主图|横幅/i.test(
      lastUserText
    );
  const directImageAsk = isDirectImageGenerationAsk(lastUserText);
  const shouldPreferGenerateImageTool =
    !body.quickChat &&
    toolNames.includes("generate_image") &&
    (directImageAsk || preferImageBySkill) &&
    (directImageAsk ||
      (!isStoryboardOrVideoStyleTask(lastUserText, priorPipelineOutputs) &&
        wfChat?.preferPipeline !== "video"));

  const lastUserIdx = (() => {
    for (let i = nonEmpty.length - 1; i >= 0; i--) {
      if (nonEmpty[i]?.role === "user") return i;
    }
    return -1;
  })();
  const openaiMessages: OpenAIChatMessage[] = [{ role: "system", content: systemParts.join("\n\n") }];
  for (let i = 0; i < nonEmpty.length; i++) {
    const m = nonEmpty[i]!;
    if (m.role === "user" && i === lastUserIdx && referenceImageUrls.length > 0) {
      openaiMessages.push({
        role: "user",
        content: [
          { type: "text", text: m.content },
          ...referenceImageUrls.map((u) => ({
            type: "image_url" as const,
            image_url: { url: u },
          })),
        ],
      });
    } else {
      openaiMessages.push({ role: m.role, content: m.content });
    }
  }

  try {
    let iteration = 0;
    let rawAssistant = "";

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration += 1;
      const payload: Record<string, unknown> = {
        model,
        messages: openaiMessages,
        temperature: 0.7,
      };
      if (tools && iteration === 1) {
        payload.tools = tools;
        payload.tool_choice = shouldPreferGenerateImageTool
          ? { type: "function", function: { name: "generate_image" } }
          : "auto";
      }

      const r = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const raw = await r.text();
      if (!r.ok) {
        if (tools && iteration === 1 && (raw.includes("tools") || r.status === 400)) {
          delete payload.tools;
          delete payload.tool_choice;
          const r2 = await fetch(`${BASE}/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: openaiMessages,
              temperature: 0.7,
            }),
          });
          const raw2 = await r2.text();
          if (!r2.ok) {
            let msg = raw2 || r2.statusText;
            try {
              const j = JSON.parse(raw2) as {
                error?: { message?: string } | string;
                message?: string;
              };
              if (typeof j.error === "object" && j.error?.message) msg = j.error.message;
              else if (typeof j.error === "string") msg = j.error;
              else if (typeof j.message === "string") msg = j.message;
            } catch {
              /* keep */
            }
            return {
              status: r2.status >= 400 && r2.status < 600 ? r2.status : 502,
              body: { error: humanizeUpstreamSafetyError(msg) },
            };
          }
          let data2: {
            choices?: Array<{ message?: { content?: string | null } }>;
            model?: string;
          };
          try {
            data2 = JSON.parse(raw2) as typeof data2;
          } catch {
            return { status: 502, body: { error: "上游返回非 JSON" } };
          }
          rawAssistant = data2.choices?.[0]?.message?.content ?? "";
          break;
        }

        let msg = raw || r.statusText;
        try {
          const j = JSON.parse(raw) as {
            error?: { message?: string; code?: string } | string;
            message?: string;
          };
          if (typeof j.error === "object" && j.error?.message) msg = j.error.message;
          else if (typeof j.error === "string") msg = j.error;
          else if (typeof j.message === "string") msg = j.message;
        } catch {
          /* keep */
        }
        console.error("[api] upstream error", r.status, msg.slice(0, 300));
        return {
          status: r.status >= 400 && r.status < 600 ? r.status : 502,
          body: { error: humanizeUpstreamSafetyError(msg) },
        };
      }

      let data: {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{
              id: string;
              type?: string;
              function: { name: string; arguments: string };
            }>;
          };
        }>;
        model?: string;
      };
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        console.error("[api] invalid JSON from upstream", raw.slice(0, 200));
        return { status: 502, body: { error: "上游返回非 JSON，请稍后重试" } };
      }

      const msg = data.choices?.[0]?.message;
      const tcalls = msg?.tool_calls;
      if (tcalls && tcalls.length > 0) {
        openaiMessages.push({
          role: "assistant",
          content: msg?.content ?? null,
          tool_calls: tcalls,
        });
        for (const tc of tcalls) {
          const name = tc.function?.name ?? "";
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function?.arguments || "{}") as Record<
              string,
              unknown
            >;
          } catch {
            args = {};
          }
          let toolContent: string;
          if (name === "generate_image" && typeof args.prompt === "string") {
            const img = await handleImageRequest({
              prompt: String(args.prompt),
              skill: null,
              referenceImageUrl:
                typeof args.referenceImageUrl === "string" && args.referenceImageUrl.trim()
                  ? args.referenceImageUrl.trim()
                  : referenceImageUrls[0] ?? null,
            });
            const url =
              img.status === 200 && typeof img.body.url === "string"
                ? img.body.url
                : null;
            toolContent = JSON.stringify({
              ok: img.status === 200,
              url,
              error: img.body.error,
            });
          } else {
            const exec = await creagicPost<Record<string, unknown>>(
              "/tools/execute",
              {
                tool_name: name,
                arguments: args,
                require_approval: false,
                user_id: userId,
              }
            );
            toolContent = JSON.stringify(exec ?? { error: "sidecar_unreachable" });
          }
          openaiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolContent,
          });
        }
        continue;
      }

      rawAssistant = msg?.content ?? "";
      break;
    }

    const upstreamModel = model;
    const { cleaned: rawCleaned, ctas: rawCtas } = parseCtaFromAiContent(
      rawAssistant
    );
    const cleaned = /^<[a-z][\s\S]*>/i.test(rawCleaned)
      ? rawCleaned
      : formatAiReplyToHtml(rawCleaned);
    const ctas = withGenerateAsFourth(rawCtas);

    let creagicMeta: Record<string, unknown> = {};

    if (sessionId && isCreagicConfigured()) {
      await creagicPost("/engine/postprocess", {
        session_id: sessionId,
        user_id: userId,
        user_text: lastUserText.slice(0, 12000),
        assistant_text: cleaned.slice(0, 120000),
      });
    }

    if (isCreagicConfigured() && cleaned.trim()) {
      const val = await creagicPost<CreagicValidateResult>("/engine/validate", {
        html: cleaned.slice(0, 200000),
        context: { session_id: sessionId, skill: skill?.title },
      });
      if (val) {
        creagicMeta.validation = val.validation;
        creagicMeta.fix_suggestion = val.fix_suggestion;
      }
    }

    if (
      isCreagicConfigured() &&
      process.env.CREAGIC_USE_MULTI_AGENT === "true" &&
      lastUserText
    ) {
      const ma = await creagicPost<Record<string, unknown>>("/engine/multi-agent", {
        task_input: lastUserText.slice(0, 8000),
        workflow: undefined,
        context: { session_id: sessionId },
        require_approval: false,
      });
      if (ma) creagicMeta.multi_agent = ma;
    }

    if (sessionId && isCreagicConfigured()) {
      const plan = await creagicPost<Record<string, unknown>>("/engine/plan", {
        task: lastUserText.slice(0, 4000),
        session_id: sessionId,
        context: {},
      });
      if (plan) creagicMeta.plan = plan;
    }

    const outBody: Record<string, unknown> = {
      content: cleaned,
      model: upstreamModel,
      ctas: ctas.length > 0 ? ctas : undefined,
    };
    if (Object.keys(creagicMeta).length > 0) {
      outBody.creagic = creagicMeta;
    }

    return { status: 200, body: outBody };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "网络错误";
    return { status: 502, body: { error: humanizeUpstreamSafetyError(msg) } };
  }
}

function pickVideoJobIdFromRecord(o: Record<string, unknown>): string | null {
  const keys = [
    "id",
    "video_id",
    "videoId",
    "task_id",
    "taskId",
    "resource_id",
    "resourceId",
    "job_id",
    "jobId",
    "request_id",
    "requestId",
  ] as const;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const name = o.name;
  if (typeof name === "string" && name.trim() && /videos\//.test(name)) {
    const m = /videos\/([^/]+)/.exec(name);
    if (m?.[1]?.trim()) return decodeURIComponent(m[1].trim());
  }
  return null;
}

function extractVideoJobId(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  const top = pickVideoJobIdFromRecord(p);
  if (top) return top;
  for (const arrKey of ["data", "videos", "results", "outputs"] as const) {
    const arr = p[arrKey];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && typeof item === "object") {
          const id = pickVideoJobIdFromRecord(item as Record<string, unknown>);
          if (id) return id;
        }
      }
    }
  }
  const data = p.data;
  if (data && typeof data === "object") {
    const d = pickVideoJobIdFromRecord(data as Record<string, unknown>);
    if (d) return d;
    const arr = (data as Record<string, unknown>).items;
    if (Array.isArray(arr) && arr[0] && typeof arr[0] === "object") {
      const id = pickVideoJobIdFromRecord(arr[0] as Record<string, unknown>);
      if (id) return id;
    }
  }
  const inner = p.result ?? p.output;
  if (inner && typeof inner === "object") {
    return pickVideoJobIdFromRecord(inner as Record<string, unknown>);
  }
  return null;
}

/** 部分网关对 JWT 式 id 的路径编码敏感：依次尝试多种 GET 路径 */
function videoStatusPollUrls(videoId: string): string[] {
  const id = videoId.trim();
  if (!id) return [];
  const out: string[] = [];
  const bases = videoApiBasesForPoll();
  for (const base of bases) {
    const root = base.replace(/\/+$/, "");
    out.push(`${root}/videos/${encodeURIComponent(id)}`);
    if (/^[A-Za-z0-9._~-]+$/.test(id)) {
      out.push(`${root}/videos/${id}`);
    }
    try {
      const dec = decodeURIComponent(id);
      if (dec.length > 0 && dec !== id) {
        out.push(`${root}/videos/${encodeURIComponent(dec)}`);
      }
    } catch {
      /* keep */
    }
  }
  return [...new Set(out)];
}

function videoStatus(parsed: unknown): string {
  if (!parsed || typeof parsed !== "object") return "";
  const s = (parsed as Record<string, unknown>).status;
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

/** AIHubMix 文档：seconds 一律用字符串；size 为宽x高，480P 不可使用随意的 854x480 */
function normalizeSecondsForVideoModel(model: string, durationSeconds: number): string {
  const m = model.toLowerCase();
  const n = Math.max(1, Math.round(durationSeconds));
  if (m.includes("wan2.2")) return "5";
  if (m.includes("wan2.5")) return n <= 7 ? "5" : "10";
  if (m.includes("wan2.6")) {
    const v = Math.max(2, Math.min(15, n));
    return String(v);
  }
  if (m.includes("doubao") || m.includes("seedance")) {
    return n <= 7 ? "5" : "10";
  }
  if (m.includes("sora")) {
    const allowed = [4, 8, 12];
    let best = allowed[0];
    let bestD = Math.abs(best - n);
    for (const a of allowed) {
      const d = Math.abs(a - n);
      if (d < bestD) {
        best = a;
        bestD = d;
      }
    }
    return String(best);
  }
  if (m.includes("veo")) {
    const allowed = [4, 6, 8];
    let best = 8;
    let bestD = Math.abs(best - n);
    for (const a of allowed) {
      const d = Math.abs(a - n);
      if (d < bestD) {
        best = a;
        bestD = d;
      }
    }
    return String(best);
  }
  return n <= 7 ? "5" : "10";
}

function normalizeVideoSizeToken(s: string): string {
  return s
    .trim()
    .replace(/\s/g, "")
    .replace(/\*/g, "x")
    .replace(/×/gi, "x");
}

/**
 * 按模型将用户意图映射为文档允许的 size（豆包/万相 480P 用 832x480，避免非法分辨率导致 Invalid API parameter）
 */
function resolveVideoSizeForModel(
  model: string,
  rawPrompt: string,
  explicitResolution: string | null
): string {
  const m = model.toLowerCase();
  const t = rawPrompt.toLowerCase();
  /** 豆包/Seedance 在 AIHubMix 视频文档未给 480P 表；480P 易被拒，默认用 720P 更稳 */
  const isDoubaoLike = m.includes("doubao") || m.includes("seedance");
  const isPortrait =
    /9\s*[:：]\s*16|竖屏|竖版|portrait|手机|720\s*×\s*1280|720x1280/.test(
      rawPrompt
    );
  const isSquare = /1\s*[:：]\s*1|方屏|正方形|square|624\s*[x×]\s*624/.test(
    rawPrompt
  );

  const ex = typeof explicitResolution === "string" ? explicitResolution.trim() : "";
  if (ex) {
    const el = ex.toLowerCase();
    if (/^(16:9|9:16|4:3|3:4|1:1|21:9)$/.test(normalizeVideoSizeToken(ex)) && m.includes("jimeng")) {
      return normalizeVideoSizeToken(ex).toLowerCase();
    }
    if (/^\d+[x×*]\d+$/i.test(normalizeVideoSizeToken(ex))) {
      return normalizeVideoSizeToken(ex).toLowerCase().replace("×", "x");
    }
    if (el === "480p" || el === "480") {
      if (m.includes("jimeng")) return isPortrait ? "9:16" : "16:9";
      if (m.includes("wan2.6")) return isPortrait ? "720x1280" : "1280x720";
      if (isDoubaoLike) return isPortrait ? "720x1280" : "1280x720";
      if (isSquare) return "624x624";
      return isPortrait ? "480x832" : "832x480";
    }
    if (el === "720p" || el === "720") {
      if (m.includes("jimeng")) return isPortrait ? "9:16" : "16:9";
      return isPortrait ? "720x1280" : "1280x720";
    }
    if (el === "1080p" || el === "1080") {
      if (m.includes("jimeng")) return isPortrait ? "1080x1920" : "16:9";
      return isPortrait ? "1080x1920" : "1920x1080";
    }
  }

  if (/4k|2160p|3840\s*[x×]\s*2160/i.test(t)) {
    if (m.includes("jimeng")) return isPortrait ? "1080x1920" : "16:9";
    return isPortrait ? "1080x1920" : "1920x1080";
  }
  if (/2k|1440p|2560\s*[x×]\s*1440/i.test(t)) {
    if (m.includes("jimeng")) return isPortrait ? "1080x1920" : "16:9";
    return isPortrait ? "1440x2560" : "2560x1440";
  }
  if (/1080p|1920\s*[x×]\s*1080|full\s*hd|fhd/i.test(t)) {
    if (m.includes("jimeng")) return isPortrait ? "1080x1920" : "16:9";
    return isPortrait ? "1080x1920" : "1920x1080";
  }
  if (/720p|1280\s*[x×]\s*720|hd\b/i.test(t)) {
    if (m.includes("jimeng")) return isPortrait ? "9:16" : "16:9";
    return isPortrait ? "720x1280" : "1280x720";
  }

  if (m.includes("jimeng")) return isPortrait ? "9:16" : "16:9";
  if (m.includes("wan2.6")) {
    if (/4k|2160p|1080p|1920\s*[x×]\s*1080|fhd|full\s*hd/i.test(t)) {
      return isPortrait ? "1080x1920" : "1920x1080";
    }
    return isPortrait ? "720x1280" : "1280x720";
  }
  if (isDoubaoLike) {
    if (isSquare) return "960x960";
    return isPortrait ? "720x1280" : "1280x720";
  }
  if (isSquare) return "624x624";
  return isPortrait ? "480x832" : "832x480";
}

function videoHttpsReferenceOnly(ref: string): string | null {
  const u = ref.trim();
  if (!u) return null;
  return /^https:\/\//i.test(u) ? u : null;
}

function videoCreateShouldRetryParameterError(status: number, raw: string): boolean {
  const t = raw.toLowerCase();
  const msgLike =
    /invalid|parameter|documentation|unsupported|malformed|bad request|required/i.test(
      t
    );
  if (status === 400 || status === 422) return msgLike;
  if (status === 502 && msgLike) return true;
  return false;
}

function dedupVideoBodies(
  attempts: Array<{ label: string; body: Record<string, unknown> }>
): Array<{ label: string; body: Record<string, unknown> }> {
  const seen = new Set<string>();
  const out: Array<{ label: string; body: Record<string, unknown> }> = [];
  for (const a of attempts) {
    const key = JSON.stringify(a.body);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

function buildVideoCreateAttempts(
  model: string,
  prompt: string,
  secondsStr: string,
  sizeStr: string,
  refHttps: string | null
): Array<{ label: string; body: Record<string, unknown> }> {
  const m = model.toLowerCase();
  const secNum = Math.max(1, Math.min(30, parseInt(secondsStr, 10) || 5));
  const altSec =
    secondsStr === "5" ? "10" : secondsStr === "10" ? "5" : "5";
  const land =
    /^16\s*:\s*9$/i.test(sizeStr) ||
    (/^\d+x\d+$/i.test(sizeStr) &&
      Number(sizeStr.split("x")[0]) >= Number(sizeStr.split("x")[1]));
  const aspectJm = land ? "16:9" : "9:16";

  const attempts: Array<{ label: string; body: Record<string, unknown> }> = [];

  const push = (label: string, body: Record<string, unknown>) => {
    attempts.push({ label, body: { ...body } });
  };

  push("std+ref", {
    model,
    prompt,
    seconds: secondsStr,
    size: sizeStr,
    ...(refHttps ? { input_reference: refHttps } : {}),
  });

  if (refHttps) {
    push("std-no-ref", { model, prompt, seconds: secondsStr, size: sizeStr });
  }

  push("720p+ref", {
    model,
    prompt,
    seconds: secondsStr,
    size: land ? "1280x720" : "720x1280",
    ...(refHttps ? { input_reference: refHttps } : {}),
  });

  push("1080p", {
    model,
    prompt,
    seconds: secondsStr,
    size: land ? "1920x1080" : "1080x1920",
  });

  if (m.includes("jimeng") || m.includes("doubao") || m.includes("seedance")) {
    push("aspect+jimeng", {
      model,
      prompt,
      seconds: secondsStr,
      size: aspectJm,
      ...(refHttps ? { input_reference: refHttps } : {}),
    });
  }

  push("minimal", { model, prompt });
  push("prompt+seconds", { model, prompt, seconds: secondsStr });
  push("prompt+size", { model, prompt, size: sizeStr });
  push("seconds-number", {
    model,
    prompt,
    seconds: secNum,
    size: sizeStr,
  });
  push("alt-seconds", {
    model,
    prompt,
    seconds: altSec,
    size: "1280x720",
  });

  if (m.includes("wan2.6")) {
    push("wan26-doc", {
      model,
      prompt,
      seconds: secondsStr,
      size: land ? "1920x1080" : "1080x1920",
    });
  }

  return dedupVideoBodies(attempts);
}

const VIDEO_POLL_INTERVAL_MS = Number(
  process.env.AIHUBMIX_VIDEO_POLL_INTERVAL_MS || 5000
);
const VIDEO_POLL_MAX_ROUNDS = Number(
  process.env.AIHUBMIX_VIDEO_POLL_MAX_ROUNDS || 72
);

async function pollVideoJobUntilUrl(
  videoId: string
): Promise<{ ok: string } | { err: string }> {
  const pollPaths = videoStatusPollUrls(videoId);
  if (pollPaths.length === 0) {
    return { err: "无效的视频任务 id" };
  }
  for (let round = 0; round < VIDEO_POLL_MAX_ROUNDS; round++) {
    if (round > 0) {
      await new Promise<void>((r) => setTimeout(r, VIDEO_POLL_INTERVAL_MS));
    }
    let parsed: unknown | null = null;
    let lastErr = "";
    for (const url of pollPaths) {
      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${KEY}` },
      });
      const raw = await r.text();
      if (!r.ok) {
        if (r.status === 404) {
          lastErr = `${humanizeUpstreamSafetyError(parseUpstreamErrorText(r, raw))} [poll ${url.replace(BASE, "")}]`;
          continue;
        }
        return {
          err: `${humanizeUpstreamSafetyError(parseUpstreamErrorText(r, raw))} [poll ${url.replace(BASE, "")}]`,
        };
      }
      try {
        parsed = JSON.parse(raw);
        break;
      } catch {
        return { err: "轮询状态返回非 JSON" };
      }
    }
    if (parsed == null) {
      if (
        lastErr &&
        /404|\[poll/.test(lastErr) &&
        round < VIDEO_POLL_MAX_ROUNDS - 1
      ) {
        continue;
      }
      return {
        err:
          lastErr ||
          "轮询视频状态失败：所有路径返回 404，可能任务 id 无效或该模型不支持 GET /v1/videos/{id}。",
      };
    }
    const st = videoStatus(parsed);
    if (st === "failed" || st === "error") {
      const p = parsed as Record<string, unknown>;
      const errObj = p.error;
      let msg = "视频生成失败";
      if (typeof errObj === "string") msg = errObj;
      else if (errObj && typeof errObj === "object" && "message" in errObj) {
        const m = (errObj as Record<string, unknown>).message;
        if (typeof m === "string") msg = m;
      }
      return { err: humanizeUpstreamSafetyError(msg) };
    }
    if (st === "completed") {
      const out = extractVideoDisplayUrlFromUpstream(parsed);
      if ("url" in out) return { ok: out.url };
      const fallbackId = extractVideoJobId(parsed) ?? videoId.trim();
      const contentUrl = `${BASE}/videos/${encodeURIComponent(fallbackId)}/content`;
      return { ok: contentUrl };
    }
  }
  return {
    err:
      "视频生成等待超时（已轮询 " +
      String(VIDEO_POLL_MAX_ROUNDS) +
      " 次）。可稍后在 AIHubMix 任务中查看结果或增大 AIHUBMIX_VIDEO_POLL_MAX_ROUNDS。",
  };
}

function extractVideoDisplayUrlFromUpstream(
  parsed: unknown
): { url: string } | { taskId: string } | { err: string } {
  const asHttpUrl = (u: unknown): string | null => {
    if (typeof u !== "string") return null;
    const t = u.trim();
    return /^https?:\/\//i.test(t) ? t : null;
  };
  const tryNode = (node: unknown): { url?: string; taskId?: string } => {
    if (!node || typeof node !== "object") return {};
    const o = node as Record<string, unknown>;
    const url =
      asHttpUrl(o.url) ??
      asHttpUrl(o.video_url) ??
      asHttpUrl(o.videoUrl) ??
      asHttpUrl(o.output_url) ??
      asHttpUrl(o.outputUrl);
    if (url) return { url };
    const taskId = typeof o.task_id === "string"
      ? o.task_id
      : typeof o.taskId === "string"
        ? o.taskId
        : "";
    if (taskId.trim()) return { taskId: taskId.trim() };
    return {};
  };
  const root = tryNode(parsed);
  if (root.url) return { url: root.url };
  if (root.taskId) return { taskId: root.taskId };
  if (parsed && typeof parsed === "object") {
    const p = parsed as Record<string, unknown>;
    const arrs = [p.data, p.output, p.outputs, p.results];
    for (const arr of arrs) {
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        const r = tryNode(item);
        if (r.url) return { url: r.url };
        if (r.taskId) return { taskId: r.taskId };
      }
    }
    for (const k of ["result", "output", "data"] as const) {
      const r = tryNode(p[k]);
      if (r.url) return { url: r.url };
      if (r.taskId) return { taskId: r.taskId };
    }
  }
  return { err: "未返回视频地址" };
}

export async function handleVideoRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!KEY) {
    return { status: 503, body: { error: "服务端未配置 AIHUBMIX_API_KEY" } };
  }
  const body = reqBody as {
    prompt?: string;
    skill?: ChatSkillPayload | null;
    referenceImageUrl?: string | null;
    videoModel?: string | null;
    durationSeconds?: number | null;
    resolution?: string | null;
  };
  const rawPrompt = String(body.prompt ?? "").trim();
  if (!rawPrompt) return { status: 400, body: { error: "prompt 必填" } };
  /** 视频/图像生成仅使用对话中提炼的 prompt，不注入技能文档或 workflow 前缀（body.skill 若传入也会被忽略） */
  const prompt = rawPrompt.slice(0, 3900);
  const model =
    typeof body.videoModel === "string" && body.videoModel.trim()
      ? body.videoModel.trim()
      : VIDEO_MODEL;
  const refUrl =
    typeof body.referenceImageUrl === "string"
      ? body.referenceImageUrl.trim()
      : "";
  const durationSeconds =
    Number.isFinite(body.durationSeconds) && Number(body.durationSeconds) > 0
      ? Math.max(1, Math.min(30, Math.round(Number(body.durationSeconds))))
      : 5;

  const size = resolveVideoSizeForModel(
    model,
    rawPrompt,
    typeof body.resolution === "string" ? body.resolution : null
  );
  const seconds = normalizeSecondsForVideoModel(model, durationSeconds);
  const refHttps = videoHttpsReferenceOnly(refUrl);

  const parseErr = (r: Response, raw: string, ctx: string) => {
    const msg = humanizeUpstreamSafetyError(parseUpstreamErrorText(r, raw));
    return {
      status: r.status >= 400 && r.status < 600 ? r.status : 502,
      body: { error: `${msg} [${ctx}]` },
    };
  };

  const runCreateAndResolve = async (
    parsedBody: unknown,
    attemptLabel: string
  ): Promise<
    | { ok: true; body: Record<string, unknown> }
    | {
        ok: false;
        err: { status: number; body: Record<string, unknown> };
        upstreamRaw?: string;
        httpStatus?: number;
      }
  > => {
    const postBodies = JSON.stringify(parsedBody);
    const createUrls = [...new Set([`${BASE}/videos`, `${AIHUBMIX_CANON_API_BASE}/videos`])];
    let r: Response | null = null;
    let raw = "";
    let createUrl = createUrls[0]!;
    for (const url of createUrls) {
      createUrl = url;
      r = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: postBodies,
      });
      raw = await r.text();
      if (r.ok) break;
      if (r.status === 404 && url === createUrls[0]) continue;
      break;
    }
    if (!r || !r.ok) {
      return {
        ok: false,
        err: parseErr(r!, raw, `POST /videos · ${attemptLabel} · ${createUrl.replace(/^https?:\/\/[^/]+/i, "")}`),
        upstreamRaw: raw,
        httpStatus: r?.status ?? 502,
      };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        ok: false,
        err: {
          status: 502,
          body: { error: `创建视频任务返回非 JSON [POST /videos · ${attemptLabel}]` },
        },
      };
    }
    const pTop = parsed as Record<string, unknown>;
    const topLevelErr = pTop.error;
    const vidEarly = extractVideoJobId(parsed);
    if (topLevelErr && !vidEarly) {
      let em = "视频创建失败";
      if (typeof topLevelErr === "string") em = topLevelErr;
      else if (
        topLevelErr &&
        typeof topLevelErr === "object" &&
        "message" in topLevelErr
      ) {
        const mm = (topLevelErr as Record<string, unknown>).message;
        if (typeof mm === "string") em = mm;
      }
      return {
        ok: false,
        err: { status: 502, body: { error: humanizeUpstreamSafetyError(em) } },
      };
    }
    const immediate = extractVideoDisplayUrlFromUpstream(parsed);
    if ("url" in immediate && immediate.url) {
      return { ok: true, body: { url: immediate.url } };
    }
    const videoId = extractVideoJobId(parsed);
    const st = videoStatus(parsed);
    const failedLike = st === "failed" || st === "error";
    if (failedLike) {
      const p = parsed as Record<string, unknown>;
      const errObj = p.error;
      let msg = "视频生成失败";
      if (typeof errObj === "string") msg = errObj;
      else if (errObj && typeof errObj === "object" && "message" in errObj) {
        const mm = (errObj as Record<string, unknown>).message;
        if (typeof mm === "string") msg = mm;
      }
      return {
        ok: false,
        err: { status: 502, body: { error: humanizeUpstreamSafetyError(msg) } },
      };
    }
    if (videoId) {
      const polled = await pollVideoJobUntilUrl(videoId);
      if ("ok" in polled) return { ok: true, body: { url: polled.ok } };
      return { ok: false, err: { status: 502, body: { error: polled.err } } };
    }
    return {
      ok: false,
      err: {
        status: 502,
        body: {
          error: `未返回视频地址或任务 id。${
            immediate && "err" in immediate ? immediate.err : ""
          } [POST /videos · ${attemptLabel}]`,
        },
      },
    };
  };

  try {
    const primaryAttempts = buildVideoCreateAttempts(
      model,
      prompt,
      seconds,
      size,
      refHttps
    );

    let lastErr: { status: number; body: Record<string, unknown> } | null =
      null;
    for (const a of primaryAttempts) {
      const res = await runCreateAndResolve(a.body, a.label);
      if (res.ok === true) {
        return { status: 200, body: applyPublicVideoUrlToBody(res.body) };
      }
      lastErr = res.err;
      if (res.upstreamRaw != null && res.httpStatus != null) {
        if (
          !videoCreateShouldRetryParameterError(res.httpStatus, res.upstreamRaw)
        ) {
          break;
        }
      } else {
        break;
      }
    }

    const fb = VIDEO_CREATE_FALLBACK_MODEL.trim();
    const errBlob = lastErr ? JSON.stringify(lastErr.body) : "";
    const videoParamRetry =
      /doubao|seedance/i.test(model) ||
      /参数|invalid|documentation|不符合|模型|video|视频|大小|时长|size|seconds/i.test(
        errBlob
      );
    const useFb =
      fb.length > 0 &&
      fb.toLowerCase() !== model.toLowerCase() &&
      Boolean(lastErr) &&
      videoParamRetry;
    if (useFb) {
      const fbSize = "1280x720";
      const fbSec = "5";
      const fbPrompt = rawPrompt.slice(0, 3900);
      const fbBodies = dedupVideoBodies([
        {
          label: "fallback-doc-model",
          body: {
            model: fb,
            prompt: fbPrompt,
            seconds: fbSec,
            size: fbSize,
          },
        },
        {
          label: "fallback-minimal",
          body: { model: fb, prompt: fbPrompt },
        },
      ]);
      for (const a of fbBodies) {
        const resF = await runCreateAndResolve(a.body, `${a.label}·${fb}`);
        if (resF.ok === true) {
          return {
            status: 200,
            body: applyPublicVideoUrlToBody({
              url: resF.body.url,
              _note: `主模型 ${model} 未接受当前参数，已用文档推荐模型 ${fb} 生成（可在 UI 切换视频模型或配置 AIHUBMIX_VIDEO_MODEL）。`,
            }),
          };
        }
        lastErr = resF.err;
      }
    }

    return lastErr ?? { status: 502, body: { error: "视频创建失败" } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "网络错误";
    return { status: 502, body: { error: humanizeUpstreamSafetyError(msg) } };
  }
}

async function tryGenerateImageViaGemini(
  prompt: string
): Promise<{ ok: true; url: string; billedBytes: number } | { ok: false; err: string }> {
  if (!GOOGLE_API_KEY) {
    return { ok: false, err: "GOOGLE_API_KEY 未配置" };
  }
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GOOGLE_IMAGE_MODEL
    )}:generateContent`;
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": GOOGLE_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          // 允许模型同时输出文本与图片；若模型不支持图片，将只返回文本。
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });
    const raw = await r.text();
    if (!r.ok) {
      return { ok: false, err: parseUpstreamErrorText(r, raw) };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, err: "Gemini 返回非 JSON" };
    }
    const root = parsed as Record<string, unknown>;
    const candidates = Array.isArray(root.candidates)
      ? (root.candidates as Array<Record<string, unknown>>)
      : [];
    for (const c of candidates) {
      const content =
        c && typeof c === "object" ? (c.content as Record<string, unknown>) : null;
      const parts = content && Array.isArray(content.parts) ? content.parts : [];
      for (const p of parts) {
        if (!p || typeof p !== "object") continue;
        const inline = (p as Record<string, unknown>).inlineData as
          | Record<string, unknown>
          | undefined;
        const data = typeof inline?.data === "string" ? inline.data.trim() : "";
        if (!data) continue;
        const mime =
          typeof inline?.mimeType === "string" && inline.mimeType.trim()
            ? inline.mimeType.trim()
            : "image/png";
        const url = `data:${mime};base64,${data}`;
        const billedBytes = Buffer.from(data, "base64").byteLength;
        return { ok: true, url, billedBytes: Math.max(1, billedBytes) };
      }
    }
    return {
      ok: false,
      err:
        "Gemini 本次未返回图片（仅返回文本）。请将 GOOGLE_IMAGE_MODEL 改为支持图像输出的模型，例如 gemini-2.0-flash-preview-image-generation。",
    };
  } catch (e) {
    return {
      ok: false,
      err: e instanceof Error ? e.message : "Gemini 网络错误",
    };
  }
}

function asPositiveIntOrZero(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function volcHashHex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function volcHmac(key: string | Buffer, message: string): Buffer {
  return createHmac("sha256", key).update(message).digest();
}

function volcUtcDateParts(now = new Date()): { date: string; datetime: string } {
  const iso = now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const datetime = iso.replace(/[-:]/g, "").replace("Z", "Z");
  return { date: datetime.slice(0, 8), datetime };
}

function parseUrlQueryMap(urlStr: string): URLSearchParams {
  const u = new URL(urlStr);
  return u.searchParams;
}

function canonicalQueryString(params: URLSearchParams): string {
  const items: Array<[string, string]> = [];
  params.forEach((v, k) => {
    items.push([encodeURIComponent(k), encodeURIComponent(v)]);
  });
  items.sort(([ak, av], [bk, bv]) => {
    if (ak === bk) return av.localeCompare(bv);
    return ak.localeCompare(bk);
  });
  return items.map(([k, v]) => `${k}=${v}`).join("&");
}

function maybeTaskIdFromParsed(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  for (const k of ["task_id", "taskId", "id", "job_id"] as const) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const k of ["data", "result", "output"] as const) {
    const v = p[k];
    if (!v || typeof v !== "object") continue;
    const id = maybeTaskIdFromParsed(v);
    if (id) return id;
  }
  return null;
}

function looksLikeRunningImageTask(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const p = parsed as Record<string, unknown>;
  const status = String(p.status ?? p.state ?? p.task_status ?? "")
    .trim()
    .toLowerCase();
  if (
    /pending|running|processing|submitted|queue|queued|in[_-]?progress/.test(
      status
    )
  ) {
    return true;
  }
  const code = String(p.code ?? p.status_code ?? "").toLowerCase();
  if (/pending|processing/.test(code)) return true;
  const nested = p.data ?? p.result ?? p.output;
  if (nested && typeof nested === "object") return looksLikeRunningImageTask(nested);
  return false;
}

type VolcEnvelope = {
  code?: number;
  message?: string;
  requestId?: string;
  taskStatus?: string;
  taskId?: string;
};

function parseVolcEnvelope(parsed: unknown): VolcEnvelope {
  if (!parsed || typeof parsed !== "object") return {};
  const p = parsed as Record<string, unknown>;
  const data =
    p.data && typeof p.data === "object" ? (p.data as Record<string, unknown>) : null;
  const codeRaw = p.code;
  const code =
    typeof codeRaw === "number"
      ? codeRaw
      : typeof codeRaw === "string" && /^\d+$/.test(codeRaw)
        ? parseInt(codeRaw, 10)
        : undefined;
  const message = typeof p.message === "string" ? p.message : undefined;
  const requestId =
    typeof p.request_id === "string"
      ? p.request_id
      : typeof p.requestId === "string"
        ? p.requestId
        : undefined;
  const taskStatus =
    typeof data?.status === "string"
      ? data.status
      : typeof p.status === "string"
        ? p.status
        : undefined;
  const taskId =
    typeof data?.task_id === "string"
      ? data.task_id
      : typeof p.task_id === "string"
        ? p.task_id
        : undefined;
  return { code, message, requestId, taskStatus, taskId };
}

function volcEnvelopeLogLine(env: VolcEnvelope): string {
  return [
    `code=${env.code ?? "n/a"}`,
    `status=${env.taskStatus ?? "n/a"}`,
    `task_id=${env.taskId ?? "n/a"}`,
    `request_id=${env.requestId ?? "n/a"}`,
    env.message ? `message=${env.message}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function isVolcRetryableCode(code?: number): boolean {
  if (!Number.isFinite(code as number)) return false;
  const c = Number(code);
  return c === 50500 || c === 50501 || c === 50429 || c === 50430;
}

function isVolcRunningStatus(status?: string): boolean {
  const s = String(status ?? "").trim().toLowerCase();
  return s === "in_queue" || s === "generating" || s === "processing";
}

function isVolcDoneStatus(status?: string): boolean {
  const s = String(status ?? "").trim().toLowerCase();
  return s === "done" || s === "success";
}

function isVolcFailedStatus(status?: string): boolean {
  return String(status ?? "").trim().toLowerCase() === "failed";
}

function volcMaskBodyForLog(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (/authorization|signature|credential|secret|token|api[_-]?key/i.test(k)) continue;
    if (k === "req_json" && typeof v === "string") {
      try {
        out[k] = JSON.parse(v);
      } catch {
        out[k] = v;
      }
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function volcSignedPost(
  endpoint: string,
  bodyObj: Record<string, unknown>
): Promise<{ ok: true; parsed: unknown; raw: string } | { ok: false; err: string }> {
  const u = new URL(endpoint);
  const method = "POST";
  const host = u.host;
  const pathname = u.pathname || "/";
  const query = canonicalQueryString(parseUrlQueryMap(endpoint));
  const payload = JSON.stringify(bodyObj);
  const payloadHash = volcHashHex(payload);
  const { date, datetime } = volcUtcDateParts();
  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `region:${VOLCENGINE_REGION}\n` +
    `service:${VOLCENGINE_SERVICE}\n` +
    `x-content-sha256:${payloadHash}\n` +
    `x-date:${datetime}\n`;
  const signedHeaders = "content-type;host;region;service;x-content-sha256;x-date";
  const canonicalRequest = [
    method,
    pathname,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${date}/${VOLCENGINE_REGION}/${VOLCENGINE_SERVICE}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    datetime,
    credentialScope,
    volcHashHex(canonicalRequest),
  ].join("\n");
  const kDate = volcHmac(VOLCENGINE_SECRET_KEY, date);
  const kRegion = volcHmac(kDate, VOLCENGINE_REGION);
  const kService = volcHmac(kRegion, VOLCENGINE_SERVICE);
  const kSigning = volcHmac(kService, "request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization =
    `HMAC-SHA256 Credential=${VOLCENGINE_ACCESS_KEY}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  try {
    const r = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Host: host,
        Region: VOLCENGINE_REGION,
        Service: VOLCENGINE_SERVICE,
        "X-Date": datetime,
        "X-Content-Sha256": payloadHash,
        Authorization: authorization,
      },
      body: payload,
    });
    const raw = await r.text();
    if (!r.ok) {
      const reqKey =
        typeof bodyObj.req_key === "string" ? bodyObj.req_key : "n/a";
      const taskId =
        typeof bodyObj.task_id === "string" ? bodyObj.task_id : "n/a";
      const action =
        typeof bodyObj.Action === "string"
          ? bodyObj.Action
          : parseUrlQueryMap(endpoint).get("Action") || "n/a";
      const version =
        typeof bodyObj.Version === "string"
          ? bodyObj.Version
          : parseUrlQueryMap(endpoint).get("Version") || "n/a";
      return {
        ok: false,
        err: `HTTP ${r.status}: ${parseUpstreamErrorText(r, raw)} [action=${action}, version=${version}, req_key=${reqKey}, task_id=${taskId}]`,
      };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, err: "返回非 JSON" };
    }
    return { ok: true, parsed, raw };
  } catch (e) {
    return {
      ok: false,
      err: e instanceof Error ? e.message : "请求失败",
    };
  }
}

async function tryGenerateImageViaVolcengine(params: {
  prompt: string;
  model: string;
  size: string;
  n: number;
  referenceImageUrl?: string | null;
}): Promise<
  { ok: true; url: string; urls: string[]; billedBytes: number } | { ok: false; err: string }
> {
  if (!VOLCENGINE_IMAGE_API_URL) {
    return {
      ok: false,
      err: "未配置 VOLCENGINE_IMAGE_API_URL（火山引擎图片生成接口地址）",
    };
  }
  if (!params.model) {
    return {
      ok: false,
      err: "未配置 VOLCENGINE_IMAGE_MODEL（req_key）或请求体 imageModel 为空",
    };
  }
  const canUseAkSk = Boolean(VOLCENGINE_ACCESS_KEY && VOLCENGINE_SECRET_KEY);
  const canUseApiKey = Boolean(VOLCENGINE_API_KEY);
  if (!canUseAkSk && !canUseApiKey) {
    return {
      ok: false,
      err: "未配置火山鉴权（请配置 VOLCENGINE_ACCESS_KEY/VOLCENGINE_SECRET_KEY 或 VOLCENGINE_API_KEY）",
    };
  }
  // 参考图中转：支持 dataURL + 历史/外链 http(s) URL，统一换成 COS 稳定 URL
  const rawReferenceImageUrl =
    typeof params.referenceImageUrl === "string" ? params.referenceImageUrl.trim() : "";
  let referenceImageUrl = rawReferenceImageUrl || null;
  if (typeof referenceImageUrl === "string" && referenceImageUrl.trim()) {
    try {
      const proxied = await proxyReferenceImageUrlToCos(referenceImageUrl.trim());
      if (proxied) referenceImageUrl = proxied;
    } catch (e) {
      console.error("[api][volc][ref-proxy] 参考图中转失败", e);
    }
  }

  if (rawReferenceImageUrl) {
    const cos = getCosReferenceProxyStatus();
    const beforeKind = rawReferenceImageUrl.startsWith("data:image/")
      ? "data"
      : /^https?:\/\//i.test(rawReferenceImageUrl)
        ? "http"
        : "other";
    const after = typeof referenceImageUrl === "string" ? referenceImageUrl.trim() : "";
    const afterKind = after.startsWith("data:image/")
      ? "data"
      : /^https?:\/\//i.test(after)
        ? "http"
        : "empty";
    let afterHost = "";
    try {
      afterHost = after ? new URL(after).hostname : "";
    } catch {
      afterHost = "";
    }
    console.info(
      `[api][volc][ref-proxy] cos_ready=${cos.ready ? "1" : "0"} before=${beforeKind} after=${afterKind}` +
        (afterHost ? ` after_host=${afterHost}` : "")
    );
  }

  /** 私有桶直链火山拉取会 403：对本桶 URL 再生成预签名 GET（见 TENCENT_COS_VOLCENGINE_PRESIGN_SECONDS） */
  if (typeof referenceImageUrl === "string" && referenceImageUrl.trim()) {
    try {
      const forVolc = await presignCosHttpUrlForVolcengineFetch(referenceImageUrl.trim());
      if (forVolc) {
        referenceImageUrl = forVolc;
        console.info("[api][volc][ref] applied COS presigned URL for server-side download");
      }
    } catch (e) {
      console.warn("[api][volc][ref] presignCosHttpUrlForVolcengineFetch", e);
    }
  }

  const submitQs = parseUrlQueryMap(VOLCENGINE_IMAGE_API_URL);
  const submitAction = submitQs.get("Action") || "CVSync2AsyncSubmitTask";
  const submitVersion = submitQs.get("Version") || "2022-08-31";
  const submitBodies: Record<string, unknown>[] = [
    {
      Action: submitAction,
      Version: submitVersion,
      req_key: params.model,
      prompt: params.prompt,
      ...(typeof referenceImageUrl === "string" && referenceImageUrl.trim()
        ? { image_urls: [referenceImageUrl.trim()] }
        : {}),
      ...(VOLCENGINE_CALLBACK_URL
        ? { req_json: JSON.stringify({ callback_url: VOLCENGINE_CALLBACK_URL }) }
        : {}),
    },
  ];
  try {
    let taskId: string | null = null;
    let submitErr = "";
    for (const body of submitBodies) {
      console.info(
        "[api][volc][submit-request]",
        JSON.stringify(volcMaskBodyForLog(body), null, 2)
      );
      if (canUseAkSk) {
        const res = await volcSignedPost(VOLCENGINE_IMAGE_API_URL, body);
        if (res.ok === false) {
          submitErr = res.err;
          continue;
        }
        const env = parseVolcEnvelope(res.parsed);
        console.info("[api][volc][submit]", volcEnvelopeLogLine(env));
        if (typeof env.code === "number" && env.code !== 10000) {
          submitErr = `code=${env.code}${
            env.message ? `, message=${env.message}` : ""
          }${env.requestId ? `, request_id=${env.requestId}` : ""}`;
          continue;
        }
        const urls = extractImageUrlsListFromUpstream(res.parsed);
        if (urls.length > 0) {
          const billedBytes = Math.max(
            1,
            estimateBytesFromGenSize(params.size) * Math.max(1, urls.length)
          );
          return { ok: true, url: urls[0]!, urls, billedBytes };
        }
        taskId = maybeTaskIdFromParsed(res.parsed);
        if (taskId) {
          console.info(
            `[api][volc][submit-id] task_id=${taskId}, request_id=${env.requestId ?? "n/a"}`
          );
        }
        if (taskId) break;
      } else if (canUseApiKey) {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        headers.Region = VOLCENGINE_REGION;
        headers.Service = VOLCENGINE_SERVICE;
        const authHeaderName = VOLCENGINE_API_KEY_HEADER.trim();
        if (authHeaderName) {
          headers[authHeaderName] = `${VOLCENGINE_API_KEY_PREFIX}${VOLCENGINE_API_KEY}`;
        }
        const r = await fetch(VOLCENGINE_IMAGE_API_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        const raw = await r.text();
        if (!r.ok) {
          submitErr = parseUpstreamErrorText(r, raw);
          continue;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          submitErr = "提交接口返回非 JSON";
          continue;
        }
        const env = parseVolcEnvelope(parsed);
        console.info("[api][volc][submit]", volcEnvelopeLogLine(env));
        if (typeof env.code === "number" && env.code !== 10000) {
          submitErr = `code=${env.code}${env.message ? `, message=${env.message}` : ""}${
            env.requestId ? `, request_id=${env.requestId}` : ""
          }`;
          continue;
        }
        const urls = extractImageUrlsListFromUpstream(parsed);
        if (urls.length > 0) {
          const billedBytes = Math.max(
            1,
            estimateBytesFromGenSize(params.size) * Math.max(1, urls.length)
          );
          return { ok: true, url: urls[0]!, urls, billedBytes };
        }
        taskId = maybeTaskIdFromParsed(parsed);
        if (taskId) {
          console.info(
            `[api][volc][submit-id] task_id=${taskId}, request_id=${env.requestId ?? "n/a"}`
          );
        }
        if (taskId) break;
      }
    }
    if (!taskId) {
      return {
        ok: false,
        err: `火山提交任务失败${submitErr ? `：${submitErr}` : ""}`,
      };
    }
    if (VOLCENGINE_USE_CALLBACK_ONLY) {
      return {
        ok: false,
        err: `火山任务已提交（task_id=${taskId}），当前配置为回调模式（VOLCENGINE_USE_CALLBACK_ONLY=1），请通过回调处理结果。`,
      };
    }
    const pollUrls = [
      normalizeVolcGetResultUrl(VOLCENGINE_IMAGE_RESULT_API_URL || volcDefaultResultApiUrl()),
    ];
    let lastPollHint = "";
    for (let pass = 0; pass < Math.max(1, VOLCENGINE_POLL_RETRY_PASSES); pass++) {
      if (pass > 0) {
        await new Promise<void>((r) =>
          setTimeout(r, Math.max(0, VOLCENGINE_POLL_RETRY_DELAY_MS))
        );
      }
      for (let round = 0; round < VOLCENGINE_POLL_MAX_ROUNDS; round++) {
        if (round > 0) {
          await new Promise<void>((r) => setTimeout(r, VOLCENGINE_POLL_INTERVAL_MS));
        }
        const pollBodies: Record<string, unknown>[] = [
          {
            Action: "CVSync2AsyncGetResult",
            Version: "2022-08-31",
            req_key: params.model,
            task_id: taskId,
            req_json: JSON.stringify({ return_url: true }),
          },
        ];
        for (const pb of pollBodies) {
          for (const pollUrl of pollUrls) {
          try {
            const qs = parseUrlQueryMap(pollUrl);
            const a = qs.get("Action");
            const v = qs.get("Version");
            if (a) pb.Action = a;
            if (v) pb.Version = v;
          } catch {
            /* keep defaults */
          }
          console.info(
            `[api][volc][poll-request] task_id=${taskId}, req_key=${params.model}, action=${String(
              pb.Action
            )}, version=${String(pb.Version)}`
          );
          if (canUseAkSk) {
            const polled = await volcSignedPost(pollUrl, pb);
            if (polled.ok === false) {
              lastPollHint = polled.err.slice(0, 220);
              continue;
            }
            const env = parseVolcEnvelope(polled.parsed);
            console.info("[api][volc][poll]", volcEnvelopeLogLine(env));
            if (typeof env.code === "number" && env.code !== 10000) {
              const msg = `code=${env.code}${env.message ? `, message=${env.message}` : ""}${
                env.requestId ? `, request_id=${env.requestId}` : ""
              }`;
              lastPollHint = msg.slice(0, 220);
              if (isVolcRetryableCode(env.code)) continue;
              return {
                ok: false,
                err: `火山查询失败（不可重试）：${msg}`,
              };
            }
            const urls = extractImageUrlsListFromUpstream(polled.parsed);
            if (urls.length > 0) {
              const billedBytes = Math.max(
                1,
                estimateBytesFromGenSize(params.size) * Math.max(1, urls.length)
              );
              return { ok: true, url: urls[0]!, urls, billedBytes };
            }
            if (isVolcDoneStatus(env.taskStatus)) {
              const statusHint = JSON.stringify(polled.parsed).slice(0, 240);
              return {
                ok: false,
                err: `火山查询结果未返回图片（task_id=${taskId}）：${statusHint}`,
              };
            }
            if (isVolcFailedStatus(env.taskStatus)) {
              return {
                ok: false,
                err: `火山任务失败（task_id=${taskId}）${
                  env.requestId ? `，request_id=${env.requestId}` : ""
                }${env.message ? `，message=${env.message}` : ""}`,
              };
            }
            if (!isVolcRunningStatus(env.taskStatus) && !looksLikeRunningImageTask(polled.parsed)) {
              const statusHint = JSON.stringify(polled.parsed).slice(0, 240);
              return {
                ok: false,
                err: `火山查询状态异常（task_id=${taskId}）：${statusHint}`,
              };
            }
            lastPollHint = `status=${env.taskStatus ?? "unknown"}${
              env.requestId ? `, request_id=${env.requestId}` : ""
            }`.slice(0, 220);
          } else if (canUseApiKey) {
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            headers.Region = VOLCENGINE_REGION;
            headers.Service = VOLCENGINE_SERVICE;
            const authHeaderName = VOLCENGINE_API_KEY_HEADER.trim();
            if (authHeaderName) {
              headers[authHeaderName] = `${VOLCENGINE_API_KEY_PREFIX}${VOLCENGINE_API_KEY}`;
            }
            const rr = await fetch(pollUrl, {
              method: "POST",
              headers,
              body: JSON.stringify(pb),
            });
            const rraw = await rr.text();
            if (!rr.ok) {
              lastPollHint = parseUpstreamErrorText(rr, rraw).slice(0, 220);
              continue;
            }
            let rparsed: unknown;
            try {
              rparsed = JSON.parse(rraw);
            } catch {
              lastPollHint = "查询返回非 JSON";
              continue;
            }
            const env = parseVolcEnvelope(rparsed);
            console.info("[api][volc][poll]", volcEnvelopeLogLine(env));
            if (typeof env.code === "number" && env.code !== 10000) {
              const msg = `code=${env.code}${env.message ? `, message=${env.message}` : ""}${
                env.requestId ? `, request_id=${env.requestId}` : ""
              }`;
              lastPollHint = msg.slice(0, 220);
              if (isVolcRetryableCode(env.code)) continue;
              return {
                ok: false,
                err: `火山查询失败（不可重试）：${msg}`,
              };
            }
            const urls = extractImageUrlsListFromUpstream(rparsed);
            if (urls.length > 0) {
              const billedBytes = Math.max(
                1,
                estimateBytesFromGenSize(params.size) * Math.max(1, urls.length)
              );
              return { ok: true, url: urls[0]!, urls, billedBytes };
            }
            if (isVolcDoneStatus(env.taskStatus)) {
              const statusHint = JSON.stringify(rparsed).slice(0, 240);
              return {
                ok: false,
                err: `火山查询结果未返回图片（task_id=${taskId}）：${statusHint}`,
              };
            }
            if (isVolcFailedStatus(env.taskStatus)) {
              return {
                ok: false,
                err: `火山任务失败（task_id=${taskId}）${
                  env.requestId ? `，request_id=${env.requestId}` : ""
                }${env.message ? `，message=${env.message}` : ""}`,
              };
            }
            if (!isVolcRunningStatus(env.taskStatus) && !looksLikeRunningImageTask(rparsed)) {
              const statusHint = JSON.stringify(rparsed).slice(0, 240);
              return {
                ok: false,
                err: `火山查询状态异常（task_id=${taskId}）：${statusHint}`,
              };
            }
            lastPollHint = `status=${env.taskStatus ?? "unknown"}${
              env.requestId ? `, request_id=${env.requestId}` : ""
            }`.slice(0, 220);
          }
          }
        }
      }
    }
    return {
      ok: false,
      err: `火山图片任务超时（task_id=${taskId}，轮询 ${VOLCENGINE_POLL_MAX_ROUNDS} 次）${
        lastPollHint ? `，最后状态：${lastPollHint}` : ""
      }`,
    };
  } catch (e) {
    return {
      ok: false,
      err: e instanceof Error ? `火山引擎网络错误：${e.message}` : "火山引擎网络错误",
    };
  }
}

export async function handleImageRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = reqBody as {
    prompt?: string;
    skill?: ChatSkillPayload | null;
    referenceImageUrl?: string | null;
    imageSize?: string | null;
    /** 画幅 bucket：优先按 bucket + imageModel 选最终 size（用于 SD3.5 等严格白名单模型） */
    imageAspectBucket?: string | null;
    /** 与前端一致：用户原句，用于在服务端再次合并推断画幅（防丢比例词） */
    userPlainForSizeHint?: string | null;
    /** 文生图上游 model，缺省为 AIHUBMIX_IMAGE_MODEL */
    imageModel?: string | null;
    /** 一次生成的张数（1～10）；可与 prompt 内「四张」等互相印证 */
    imageCount?: number | string | null;
  };

  const rawPrompt = String(body.prompt ?? "").trim();
  if (!rawPrompt) {
    return { status: 400, body: { error: "prompt 必填" } };
  }

  const genCount = resolveImageGenCount(body.imageCount, rawPrompt);

  /**
   * 与用户输入一致地原样提交给上游（仅长度截断）；不套系统模板、不重复钉尾，避免模型忽略用户原句。
   * body.skill 仍忽略；张数由请求体 n / imageCount 与上游能力决定。
   */
  let prompt = rawPrompt.length > 8000 ? rawPrompt.slice(0, 8000) : rawPrompt;
  const requestedModel =
    typeof body.imageModel === "string" && body.imageModel.trim()
      ? body.imageModel.trim()
      : "";
  const provider = IMAGE_PROVIDER;
  const effectiveProvider =
    provider === "volcengine" && rawPrompt.length > 0 ? "volcengine" : provider;
  const providerModel =
    effectiveProvider === "volcengine"
      ? VOLCENGINE_IMAGE_MODEL
      : requestedModel || IMAGE_MODEL;
  const providerSize = normalizeImageGenerationSize(body.imageSize, providerModel || IMAGE_MODEL);
  const refUrlForProvider =
    typeof body.referenceImageUrl === "string" ? body.referenceImageUrl.trim() : "";

  let volcengineFallbackErr: string | undefined;
  if (effectiveProvider === "volcengine") {
    const ve = await tryGenerateImageViaVolcengine({
      prompt,
      model: providerModel,
      size: providerSize,
      n: genCount,
      referenceImageUrl: refUrlForProvider || null,
    });
    if (ve.ok) {
      return {
        status: 200,
        body: {
          url: ve.url,
          urls: ve.urls,
          billedBytes: ve.billedBytes,
          _note: `已通过火山引擎模型 ${providerModel} 生成`,
        },
      };
    }
    if (ve.ok === false) {
      volcengineFallbackErr = ve.err;
      console.warn("[api] volcengine image fallback:", ve.err.slice(0, 300));
    }
    if (!VOLCENGINE_ALLOW_FALLBACK) {
      return {
        status: 502,
        body: {
          error: `${volcengineFallbackErr || "火山生图失败"}。如需失败后自动回退到其它通道，请在 .env 设置 VOLCENGINE_ALLOW_FALLBACK=1。`,
        },
      };
    }
  }

  let geminiFallbackErr: string | undefined;
  // provider=google 或 provider=volcengine回退阶段时，尝试 Gemini。
  if (
    GOOGLE_API_KEY &&
    (effectiveProvider === "google" || effectiveProvider === "volcengine")
  ) {
    const gm = await tryGenerateImageViaGemini(prompt);
    if (gm.ok) {
      return {
        status: 200,
        body: {
          url: gm.url,
          urls: [gm.url],
          billedBytes: gm.billedBytes,
          _note: `已通过 Google ${GOOGLE_IMAGE_MODEL} 生成`,
        },
      };
    }
    if (gm.ok === false) {
      geminiFallbackErr = gm.err;
      console.warn("[api] gemini image fallback:", gm.err.slice(0, 300));
    }
  }

  const genModel =
    requestedModel || IMAGE_MODEL;

  if (!KEY) {
    const tails = [volcengineFallbackErr, geminiFallbackErr].filter(Boolean).join("；");
    return {
      status: 503,
      body: {
        error: tails
          ? `服务端未配置 AIHUBMIX_API_KEY，且直连通道未成功：${tails}`
          : "服务端未配置 AIHUBMIX_API_KEY",
      },
    };
  }

  const refUrl =
    typeof body.referenceImageUrl === "string"
      ? body.referenceImageUrl.trim()
      : "";

  const hintRaw =
    typeof body.userPlainForSizeHint === "string"
      ? body.userPlainForSizeHint.trim()
      : "";
  const aspectBucketRaw =
    typeof body.imageAspectBucket === "string"
      ? body.imageAspectBucket.trim()
      : "";
  const inferredRaw = aspectBucketRaw
    ? aspectBucketRaw
    : resolveImageGenerationSizeForRequest({
        prompt,
        userPlainForSizeHint: hintRaw || null,
      });

  const hasClientSize = String(body.imageSize ?? "").trim().length > 0;
  const clientNorm = normalizeImageGenerationSize(body.imageSize, genModel);
  const inferNorm = normalizeImageGenerationSize(inferredRaw, genModel);

  const aspectFamily = (
    norm: string
  ): "square" | "landscape" | "portrait" | "any" => {
    const s = norm.toLowerCase().replace(/×/g, "x");
    if (s === "auto") return "any";
    if (
      s === "1024x1024" ||
      s === "512x512" ||
      s === "256x256"
    ) {
      return "square";
    }
    if (s === "1536x1024" || s === "1792x1024") return "landscape";
    if (s === "1024x1536" || s === "1024x1792") return "portrait";
    return "any";
  };

  const cf = aspectFamily(clientNorm);
  const inf = aspectFamily(inferNorm);

  let effectiveSizeInput: unknown;
  if (!hasClientSize) {
    effectiveSizeInput =
      inf !== "square" && inf !== "any" ? inferredRaw : undefined;
  } else if (cf === "landscape" || cf === "portrait") {
    /** 请求体已明确横/竖档：优先遵守，避免仅用正文推断覆盖用户与前端算好的尺寸 */
    effectiveSizeInput = body.imageSize;
  } else {
    /** 客户端为方图或 auto：若正文能断言横/竖则采用正文推断 */
    effectiveSizeInput =
      inf === "landscape" || inf === "portrait" ? inferredRaw : body.imageSize;
  }

  const genSize = normalizeImageGenerationSize(effectiveSizeInput, genModel);

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.CREAGIC_DEBUG_IMAGES === "1"
  ) {
    const pe =
      prompt.length > 200 ? `${prompt.slice(0, 200)}…` : prompt;
    console.info(
      "[creagic][api/images] _upstream_snapshot",
      JSON.stringify({
        promptExcerpt: pe,
        imageAspectBucket: aspectBucketRaw || undefined,
        genSize,
        genModel,
        hasRef: Boolean(refUrl),
        genCount,
      })
    );
  }

  const parseImageJson = (raw: string, label: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        err: { status: 502 as const, body: { error: `${label} 返回非 JSON` } },
      };
    }
    const urls = extractImageUrlsListFromUpstream(parsed);
    if (urls.length > 0) {
      return { urls };
    }
    const extracted = extractImageDisplayUrlFromUpstream(parsed);
    const hint =
      "hintKeys" in extracted && extracted.hintKeys
        ? `（响应顶层字段：${extracted.hintKeys}）`
        : "";
    const msg =
      "err" in extracted && extracted.err
        ? `${extracted.err}${hint}`
        : `未返回图片地址。${hint}`;
    return {
      err: {
        status: 502 as const,
        body: { error: msg },
      },
    };
  };

  const buildSuccessBodyFromUrls = async (
    urls: string[],
    sz: string,
    extra?: Record<string, unknown>
  ): Promise<{ status: 200; body: Record<string, unknown> }> => {
    let billed = 0;
    for (const u of urls) {
      billed +=
        (await probeRemoteImageBytes(u)) || estimateBytesFromGenSize(sz);
    }
    if (billed <= 0) billed = estimateBytesFromGenSize(sz) * urls.length;
    return {
      status: 200,
      body: {
        url: urls[0],
        urls,
        billedBytes: billed,
        ...extra,
      },
    };
  };

  const forwardUpstreamError = (r: Response, raw: string) => {
    let msg = raw || r.statusText;
    try {
      const j = JSON.parse(raw) as {
        error?: { message?: string } | string;
        message?: string;
      };
      if (typeof j.error === "object" && j.error?.message) msg = j.error.message;
      else if (typeof j.error === "string") msg = j.error;
      else if (typeof j.message === "string") msg = j.message;
    } catch {
      /* keep */
    }
    console.error("[api] images error", r.status, msg.slice(0, 300));
    return {
      status: r.status >= 400 && r.status < 600 ? r.status : 502,
      body: { error: humanizeUpstreamSafetyError(msg) },
    };
  };

  try {
    if (refUrl) {
      const bin = await loadReferenceImageBytes(refUrl);
      if (bin) {
        const mime = bin.mime.toLowerCase();
        const ext = mime.includes("jpeg") || mime.includes("jpg")
          ? "jpg"
          : mime.includes("webp")
            ? "webp"
            : "png";
        const editSizeForModel = (m: string) => {
          const raw = normalizeImageGenerationSize(effectiveSizeInput, m);
          return raw === "auto" ? "1024x1024" : raw;
        };

        const runOneEdit = async (
          promptForEdit: string,
          editModel: string,
          editSize: string
        ) => {
          const form = new FormData();
          form.append(
            "image",
            new Blob([new Uint8Array(bin.buffer)], { type: bin.mime || "image/png" }),
            `image.${ext}`
          );
          form.append("prompt", promptForEdit);
          form.append("n", "1");
          form.append("size", editSize);
          form.append("model", editModel);
          const er = await fetch(`${BASE}/images/edits`, {
            method: "POST",
            headers: { Authorization: `Bearer ${KEY}` },
            body: form,
          });
          const eraw = await er.text();
          if (!er.ok) {
            console.error(
              "[api] images/edits error",
              editModel,
              er.status,
              eraw.slice(0, 320)
            );
            return null;
          }
          const parsed = parseImageJson(eraw, "图像编辑接口");
          if ("err" in parsed) return null;
          if ("urls" in parsed && parsed.urls[0]) return parsed.urls;
          return null;
        };

        const editModelCandidates = [
          genModel,
          IMAGE_EDIT_MODEL,
          IMAGE_FALLBACK_MODEL,
        ].filter(
          (m, i, arr) =>
            Boolean(m) &&
            arr.findIndex((x) => x.toLowerCase() === m.toLowerCase()) === i
        );

        const runEditAcrossModels = async (promptForEdit: string) => {
          for (const m of editModelCandidates) {
            const sz = editSizeForModel(m);
            const urls = await runOneEdit(promptForEdit, m, sz);
            if (urls?.length) return { urls, sz };
          }
          return null;
        };

        if (genCount <= 1) {
          const got = await runEditAcrossModels(prompt);
          if (got?.urls?.length) {
            return await buildSuccessBodyFromUrls(got.urls, got.sz);
          }
        } else {
          const acc: string[] = [];
          let lastSz = editSizeForModel(genModel);
          for (let i = 0; i < genCount; i++) {
            const piece =
              genCount <= 1
                ? prompt
                : `${prompt}\n[${i + 1}/${genCount}]`;
            const got = await runEditAcrossModels(piece);
            if (!got?.urls?.[0]) break;
            acc.push(got.urls[0]);
            lastSz = got.sz;
          }
          if (acc.length === genCount) {
            return await buildSuccessBodyFromUrls(acc, lastSz);
          }
        }
      }
      /** 参考图不可用或编辑失败时：文生图仍只使用用户原文 prompt，不追加系统说明 */
    }

    const sizeCandidates = generationSizeFallbacks(genModel, genSize);
    let lastUpstream: { status: number; body: Record<string, unknown> } | null =
      null;
    let lastImageErrRaw = "";
    const tryImageGenerations = async (
      imgModel: string,
      sz: string,
      n: number
    ): Promise<Response> => {
      return fetch(`${BASE}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: imgModel,
          prompt,
          n,
          size: sz,
        }),
      });
    };

    const attemptGen = async (
      imgModel: string,
      sz: string,
      nAsk: number
    ): Promise<
      | { ok: true; urls: string[]; sz: string }
      | { ok: false; r: Response; raw: string }
    > => {
      let r = await tryImageGenerations(imgModel, sz, nAsk);
      let raw = await r.text();
      let triedLowerN = false;
      if (
        !r.ok &&
        nAsk > 1 &&
        /\"n\"|parameter.*n|invalid.*n|count|不支持|only\s+n\s*=?\s*1|n\s*must\s*be\s*1/i.test(
          raw
        ) &&
        !triedLowerN
      ) {
        triedLowerN = true;
        r = await tryImageGenerations(imgModel, sz, 1);
        raw = await r.text();
      }
      if (!r.ok) return { ok: false, r, raw };
      const parsed = parseImageJson(raw, "图像接口");
      if ("err" in parsed) return { ok: false, r, raw: JSON.stringify(parsed) };
      let got = parsed.urls;
      if (nAsk > 1 && got.length < nAsk) {
        const acc = [...got];
        for (let i = acc.length; i < nAsk; i++) {
          const r2 = await tryImageGenerations(imgModel, sz, 1);
          const raw2 = await r2.text();
          if (!r2.ok) break;
          const p2 = parseImageJson(raw2, "图像接口·续张");
          if ("err" in p2 || !p2.urls[0]) break;
          acc.push(p2.urls[0]);
        }
        got = acc;
      }
      return { ok: true, urls: got, sz };
    };

    for (const sz of sizeCandidates) {
      const attempt = await attemptGen(genModel, sz, genCount);
      if (attempt.ok && attempt.urls.length > 0) {
        return await buildSuccessBodyFromUrls(attempt.urls, attempt.sz);
      }
      if (attempt.ok === false) {
        lastImageErrRaw = attempt.raw;
        const { r, raw } = attempt;
        const errText = parseUpstreamErrorText(r, raw);
        lastUpstream = forwardUpstreamError(r, raw);
        if (!looksLikeUnsupportedImageSizeError(errText)) {
          const retryCandidates = [
            IMAGE_FALLBACK_MODEL,
            "V_2",
            "V_2A_TURBO",
            "FLUX-1.1-pro",
            "flux-2-max",
            "dall-e-2",
            "doubao-seedream-4-0-250828",
            "doubao-seedream-4-5-251015",
            "doubao-seedream-5-lite-251015",
            "imagen-3.0-generate-002",
            "midjourney-v7",
          ]
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim())
            .filter(
              (x, i, arr) =>
                x.toLowerCase() !== genModel.toLowerCase() &&
                arr.findIndex((y) => y.toLowerCase() === x.toLowerCase()) === i
            );
          if (shouldRetryImageWithAlternateModel(errText)) {
            for (const fbImg of retryCandidates) {
              const attemptF = await attemptGen(fbImg, "1024x1024", genCount);
              if (attemptF.ok && attemptF.urls.length > 0) {
                return await buildSuccessBodyFromUrls(
                  attemptF.urls,
                  "1024x1024",
                  {
                    _note: `主图像模型「${genModel}」未成功，已改用「${fbImg}」。`,
                  }
                );
              }
            }
          }
          return lastUpstream;
        }
      }
    }
    if (
      lastUpstream &&
      IMAGE_FALLBACK_MODEL &&
      genModel.toLowerCase() !== IMAGE_FALLBACK_MODEL.toLowerCase()
    ) {
      const extracted = parseUpstreamErrorText(
        { status: 502, ok: false, statusText: "" } as Response,
        lastImageErrRaw || "{}"
      );
      if (shouldRetryImageWithAlternateModel(extracted)) {
        const attemptL = await attemptGen(IMAGE_FALLBACK_MODEL, "1024x1024", genCount);
        if (attemptL.ok && attemptL.urls.length > 0) {
          return await buildSuccessBodyFromUrls(
            attemptL.urls,
            "1024x1024",
            {
              _note: `主图像模型「${genModel}」多尺寸均失败，已改用「${IMAGE_FALLBACK_MODEL}」。`,
            }
          );
        }
      }
    }
    if (lastUpstream && (geminiFallbackErr || volcengineFallbackErr)) {
      const original = String(lastUpstream.body.error ?? "").trim();
      const tails = [volcengineFallbackErr, geminiFallbackErr].filter(Boolean).join("；");
      return {
        status: lastUpstream.status,
        body: {
          error: original
            ? `${original}\n（直连通道回退原因：${tails}）`
            : `图像生成失败（直连通道回退原因：${tails}）`,
        },
      };
    }
    return lastUpstream ?? {
      status: 502,
      body: { error: "图像生成失败" },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "网络错误";
    return { status: 502, body: { error: humanizeUpstreamSafetyError(msg) } };
  }
}


function normalizeUrls(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return (input as unknown[])
    .filter((x): x is string => typeof x === "string" && /^https?:\/\/|^data:image\//i.test(x))
    .slice(0, 3);
}

export async function handleAgentChatRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!KEY) return { status: 503, body: { error: "未配置 AIHUBMIX_API_KEY" } };

  const body = reqBody as {
    messages?: Array<{ role: string; content: string }>;
    referenceImageUrls?: unknown;
    sessionId?: string;
    userId?: string;
    skillId?: string;
    deepThink?: boolean;
    modelOverride?: string;
    orchestrationStage?: string;
    priorPipelineOutputs?: Record<string, string>;
    quickChat?: boolean;
  };

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return { status: 400, body: { error: "messages 必填" } };

  const userText = [...messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  if (!userText) return { status: 400, body: { error: "无有效用户消息" } };

  const sessionId = body.sessionId?.trim() || null;
  const userId = body.userId?.trim() || "anonymous";
  const skillId = body.skillId?.trim() || null;
  const deepThink = Boolean(body.deepThink);
  const modelOverride = body.modelOverride?.trim() || null;
  const referenceImageUrls = normalizeUrls(body.referenceImageUrls);
  const isHotStart = messages.filter((m) => m.role !== "system").length > 1;

  const orchStage = body.orchestrationStage;
  if (orchStage === "intent" || orchStage === "opening" || orchStage === "analyze") {
    return handleChatRequest(reqBody);
  }

  const { buildContext } = await import("./agent/contextBuilder");
  const { planTask, shouldPlanTask } = await import("./agent/taskPlanner");
  const { optimizePrompt } = await import("./agent/promptOptimizer");
  const { writeMemory } = await import("./agent/memoryWriter");
  const { routeIntentEnhanced } = await import("./agent/intentRouter");

  const ctx = await buildContext(
    {
      userText,
      referenceImageUrls,
      sessionId,
      userId,
      messages,
      priorPipelineOutputs: body.priorPipelineOutputs,
      skillId,
      deepThink,
      modelOverride,
      isHotStart,
    },
    body.quickChat ? CHAT_MODEL : ORCHESTRATION_MODEL
  );

  // Route-4: 多图任务（代码层硬路由）
  if (!body.quickChat && shouldPlanTask(userText)) {
    const priorContent = body.priorPipelineOutputs
      ? Object.values(body.priorPipelineOutputs).join("\n")
      : undefined;
    const plan = await planTask(userText, priorContent);
    if (plan && plan.tasks.length > 1) {
      return {
        status: 200,
        body: {
          type: "task_plan",
          plan,
          message: `我来帮你规划这个任务：${plan.summary}`,
          needsConfirmation: plan.needsConfirmation,
        },
      };
    }
  }

  // 显式六路意图：chat / image_gen / image_edit / plan / video（多图已提前返回）
  let routeMode: "chat" | "image_gen" | "image_edit" | "plan" | "video" = "chat";
  if (!body.quickChat) {
    const routed = await routeIntentEnhanced({
      userText,
      hasReferenceImage: referenceImageUrls.length > 0,
      hasPriorGeneratedImage: false,
    });
    if (routed?.mode) routeMode = routed.mode;
  }

  try {
    let rawAssistant = "";

    // Route-A: 单图生图（代码硬编排：先优化 prompt，再调用图像 API）
    if (routeMode === "image_gen" || routeMode === "image_edit") {
      const optimizedPrompt = await optimizePrompt({
        userText,
        hasReferenceImage: referenceImageUrls.length > 0,
      });
      const img = await handleImageRequest({
        prompt: optimizedPrompt,
        skill: null,
        referenceImageUrl:
          routeMode === "image_edit" ? (referenceImageUrls[0] ?? null) : (referenceImageUrls[0] ?? null),
      });
      if (img.status !== 200 || typeof img.body.url !== "string") {
        return {
          status: img.status >= 400 ? img.status : 502,
          body: {
            error: typeof img.body.error === "string" ? img.body.error : "生图失败",
          },
        };
      }
      rawAssistant = `已为你完成生成，见下图：\n\n![生成结果](${img.body.url})`;
    } else {
      // Route-B/C/D: chat / plan / video（文本执行）
      const routeDirective =
        routeMode === "plan"
          ? "【当前路线】plan：先做方案策划与结构化建议，不直接生图。优先给出可执行方案并引导用户确认。"
          : routeMode === "video"
            ? "【当前路线】video：先做分镜策划和镜头拆解，不直接承诺一次性产出视频成片。"
            : "【当前路线】chat：简洁回答用户问题；若用户转为创作需求，再引导到对应执行路线。";
      const openaiMessages = [...ctx.openaiMessages] as Record<string, unknown>[];
      const first = openaiMessages[0];
      if (first?.role === "system" && typeof first.content === "string") {
        first.content = `${first.content}\n\n${routeDirective}`;
      }
      const r = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ctx.effectiveModel,
          messages: openaiMessages,
          temperature: 0.7,
        }),
      });
      const raw = await r.text();
      if (!r.ok) {
        const msg = (() => {
          try {
            return (JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? raw;
          } catch {
            return raw;
          }
        })();
        return { status: r.status >= 400 ? r.status : 502, body: { error: msg } };
      }
      const data = JSON.parse(raw) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      rawAssistant = data.choices?.[0]?.message?.content ?? "";
    }

    await writeMemory({
      sessionId,
      userId,
      userText: userText.slice(0, 12000),
      assistantText: rawAssistant.slice(0, 120000),
      skillId,
      taskType: routeMode,
    });

    const { cleaned: rawCleaned, ctas } = parseCtaFromAiContent(rawAssistant);
    const content = /^<[a-z][\s\S]*>/i.test(rawCleaned)
      ? rawCleaned
      : formatAiReplyToHtml(rawCleaned);

    return {
      status: 200,
      body: { content, model: ctx.effectiveModel, ctas: ctas.length > 0 ? ctas : undefined },
    };
  } catch (e) {
    return { status: 502, body: { error: e instanceof Error ? e.message : "网络错误" } };
  }
}

export async function handleTaskPlanRequest(
  reqBody: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = reqBody as { userText?: string; priorContent?: string };
  const userText = String(body.userText ?? "").trim();
  if (!userText) return { status: 400, body: { error: "userText 必填" } };
  const { planTask } = await import("./agent/taskPlanner");
  const plan = await planTask(userText, body.priorContent);
  if (!plan) {
    return {
      status: 200,
      body: {
        type: "single_image",
        tasks: [],
        totalCount: 0,
        needsConfirmation: false,
        summary: "无法解析为多图任务",
      },
    };
  }
  return { status: 200, body: plan as unknown as Record<string, unknown> };
}
