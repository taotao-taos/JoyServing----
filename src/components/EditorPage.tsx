import * as React from "react";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Plus, 
  MessageSquare, 
  History, 
  Image as ImageIcon, 
  Users, 
  ChevronDown, 
  ArrowUp,
  ArrowDownRight,
  Minimize2,
  Zap,
  Maximize2,
  Grid3X3,
  HelpCircle,
  Video,
  Sparkles,
  Music,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Trash2,
  MousePointer2,
  MapPin,
  ImagePlus,
  Frame,
  Square,
  Pencil,
  Type,
  Play,
  ShoppingCart,
  Circle,
  Triangle,
  Star,
  Pentagon,
  Hexagon,
  MessageSquare as MessageIcon,
  ArrowLeft,
  ArrowRight,
  Download,
  Link2,
  MoreHorizontal,
  Type as TypeIcon,
  Settings2,
  RefreshCw,
  History as HistoryIcon,
  Monitor,
  ChevronUp,
  Hand,
  Undo2,
  Redo2,
  PlusCircle,
  Library,
  Minus,
  Copy as CopyIcon,
  ExternalLink,
  Loader2,
  X,
} from '@/lib/icons';
import { Button } from "@/components/ui/button";
import { AiModelPopover } from "@/components/AiModelPopover";
import { ProfileAvatarHover } from "@/components/ProfileAvatarHover";
import { TypewriterAiReply } from "./TypewriterAiReply";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CollapsedChatFabIcon } from "@/components/icons/CollapsedChatFabIcon";
import { buildRecommendationPresetHtml } from "./MainContent";
import { getEditorSkillById } from "@/src/lib/editorSkillsRegistry";
import { CreagicLogo } from "@/src/components/CreagicLogo";
import {
  CREAGIC_SESSION_LS_KEY,
  loadChatThreadJson,
  loadSessionIndex,
  resolveInitialChatSessionId,
  saveChatThreadJson,
  upsertSessionIndex,
  type ChatSessionIndexRow,
} from "@/src/lib/chatSessionStorage";
import {
  extractRefImageSrcsFromUserHtml,
  formatImageSizeUserLabel,
  inferOpenAiGenerationSize,
  inferRequestedImageCountFromPlain,
  looksLikeImageEditFollowUp,
  normalizeAspectBucketFromText,
  resolveImageGenerationSizeForRequest,
  stripRefChipPlainNoise,
} from "@/src/lib/chatRefImage";
import { CreagicChatComposer } from "@/src/components/CreagicChatComposer";
import { ImageSelectionToolbar, type ActionId as ImageToolbarActionId } from "@/src/components/ImageSelectionToolbar";
import {
  ImageObjectEditOverlays,
  type ImageEditSession,
} from "@/src/components/ImageObjectEditOverlays";
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from "@/src/lib/siteLinks";
import {
  sendChatCompletion,
  type ChatApiMessage,
  type ChatResponseBody,
} from "@/src/lib/chatApi";
import { formatAiReplyToHtml } from "@/src/lib/formatAiChatHtml";
import {
  countPriorImageKeywordUserTurns,
  isDirectVideoGenerationRequest,
  isEligibleForDirectImageGeneration,
  isVideoPrimaryRequest,
  looksLikeVisualFollowUp,
  shouldUseImagePipeline,
  userAskedExplicitImageGeneration,
  wantsLongPlanningOnly,
} from "@/src/lib/imageIntent";
import {
  enhanceImageWithLiblib,
  generateImageWithPrompt,
  removeBackgroundWithLiblib,
} from "@/src/lib/imageApi";
import { generateVideoWithPrompt } from "@/src/lib/videoApi";
import { sanitizeUserChatHtml } from "@/src/lib/sanitizeUserChatHtml";
import {
  routeUserIntent,
  type RouteIntentMode,
} from "@/src/lib/routeIntentApi";
import { useDismissOnOutsidePress } from "@/src/lib/useDismissOnOutsidePress";
import { useDismissOnOutsidePressAny } from "@/src/lib/useDismissOnOutsidePress";
import {
  focusContentEditableAfterNode,
  insertHtmlIntoContentEditable,
  richHasContent,
} from "@/src/lib/richChatContent";
import type { MediaModelManifestRow } from "@/src/lib/aiModelsRegistry";
import {
  CREDITS_PER_CHAT_ROUND,
  CREDITS_PER_IMAGE,
  PRECHECK_IMAGE_SIDECHAT,
  PRECHECK_CANVAS_IMAGE,
  DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS,
} from "@/src/lib/creditsConstants";
import {
  CANVAS_COORD_UNITS_PER_CSS_PX as CANVAS_U,
  CANVAS_JSON_CS_KEY,
  CANVAS_JSON_CS_VALUE,
  canvasToCssPx,
  scaleLegacyCanvasObjects,
} from "@/src/lib/canvasCoordScale";
import {
  creditsForChatRound,
  creditsForImageBytes,
  creditsForVideoSeconds,
} from "@/src/lib/creditsBilling";
import {
  buildPendingRefChipHtmlFromUrl,
  buildRefChipHtmlFromUrl,
  nextRefChipIndex,
} from "@/src/lib/refChipHtml";
import { useAppToast } from "@/src/lib/AppToastProvider";
import {
  extractNumberedShotsFromAssistantText,
  parseRequestedStoryboardPanelIndex,
  stripStoryboardPanelDirectiveForImagePrompt,
  userWantsSingleStoryboardPanelReference,
  userWantsStoryboardBatchImages,
} from "@/src/lib/storyboardBatch";
import {
  ASSISTANT_PROMISED_IMAGE_GENERATION_RE,
  assistantOfferedOrPreparedImageGeneration,
  extractImagePromptFromLastAssistant,
  isShortAffirmToGenerateImage,
  mergeExtractedImagePromptWithUser,
  shouldPreferUserOnlyForImagePrompt,
} from "@/src/lib/chatImageFollowup";

function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") return html;
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.innerText || "").replace(/\s+$/g, "").trim();
}

async function copyChatContentToClipboard(rawHtml: string, plainText: string): Promise<void> {
  const h = rawHtml.trim();
  const t = plainText.trim();
  if (!h && !t) return;
  if (h && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    const htmlBlob = new Blob([h], { type: "text/html" });
    const textBlob = new Blob([t || htmlToPlainText(h)], { type: "text/plain" });
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]);
    return;
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(t || htmlToPlainText(h));
  }
}

function CollapsibleMessage({
  contentKey,
  /** 仅对超长助手回复折叠；阈值过小会导致正常段落也出现「展开」 */
  maxHeight = 520,
  children,
}: {
  contentKey: string;
  maxHeight?: number;
  children: React.ReactNode;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [collapsible, setCollapsible] = React.useState(false);

  const measureNaturalScrollHeight = (el: HTMLDivElement) => {
    const prevMax = el.style.maxHeight;
    const prevOv = el.style.overflow;
    el.style.maxHeight = "none";
    el.style.overflow = "visible";
    const sh = el.scrollHeight;
    el.style.maxHeight = prevMax;
    el.style.overflow = prevOv;
    return sh;
  };

  React.useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const threshold = maxHeight + 12;
    let ro: ResizeObserver | null = null;
    let raf1 = 0;
    let raf2 = 0;

    const check = () => {
      const node = boxRef.current;
      if (!node) return;
      // 用「解除 max-height 后的真实高度」判断，避免已处于折叠态时 scrollHeight 与阈值比较失真
      const natural = measureNaturalScrollHeight(node);
      setCollapsible(natural > threshold);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(check);
    });
    ro = new ResizeObserver(() => {
      requestAnimationFrame(check);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro?.disconnect();
    };
  }, [contentKey, maxHeight]);

  /** 折叠态下再校一次：短内容不应出现「展开」或视错觉上的被裁切 */
  React.useLayoutEffect(() => {
    if (!collapsible || expanded) return;
    const el = boxRef.current;
    if (!el) return;
    const threshold = maxHeight + 12;
    const natural = measureNaturalScrollHeight(el);
    if (natural <= threshold) {
      setCollapsible(false);
    }
  }, [collapsible, expanded, maxHeight, contentKey]);

  React.useEffect(() => {
    setExpanded(false);
  }, [contentKey]);

  return (
    <div className="min-w-0 max-w-full select-text">
      <div
        ref={boxRef}
        className="select-text"
        style={collapsible && !expanded ? { maxHeight, overflow: "hidden" } : undefined}
      >
        {children}
      </div>
      {collapsible && (
        <button
          type="button"
          className="mt-1 text-xs font-medium text-neutral-500 hover:text-neutral-700"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "收起" : "展开"}
        </button>
      )}
    </div>
  );
}

function GenPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-[4px] bg-neutral-100",
        className
      )}
    >
      <img
        src="/assets/placeholders/gen-placeholder.svg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

/** 对话区内多格生图：与单格同占位比例 */
function ChatImageGenSlot({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[4px] border border-neutral-100 bg-neutral-50 aspect-[4/3]",
        className
      )}
    >
      {children}
      {label ? (
        <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeRefChipMarkerText(html: string): string {
  return String(html || "").replace(/参考图\s*\(\s*\d+\s*\)/g, "参考图");
}

function collapseConsecutiveDuplicateUserBlocks(html: string): string {
  const raw = String(html || "").trim();
  if (!raw) return "";
  if (typeof document === "undefined") return raw;
  const host = document.createElement("div");
  host.innerHTML = raw;
  const children = Array.from(host.children);
  if (children.length === 0) return raw;
  let prevText = "";
  children.forEach((el) => {
    const cur = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!cur) return;
    if (cur === prevText) {
      el.remove();
      return;
    }
    prevText = cur;
  });
  return host.innerHTML.trim() || raw;
}

function summarizeFirstUserMessageTitle(messages: Message[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "新对话";
  const plain = htmlToPlainText(firstUser.content || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "新对话";
  return plain.length > 24 ? `${plain.slice(0, 24)}...` : plain;
}

export type SidechatPipelineKind =
  | "chat"
  | "image"
  | "video"
  | "plan"
  | "orchestrate";

type SidechatMultiStagePhase =
  | "intent"
  | "opening"
  | "analyze"
  | "final"
  | "done";

const SIDECHAT_PIPELINE_LABEL: Record<SidechatPipelineKind, string> = {
  chat: "大模型对话",
  image: "图像生成 · 文生图",
  video: "视频策划 · 分镜/叙事",
  plan: "多步策划",
  orchestrate: "智能编排",
};

function thinkingInFlightLabel(
  phase: "thinking" | "generating" | undefined
): string {
  return phase === "generating" ? "生成中" : "思考中";
}

function resolveSidechatPipeline(args: {
  imageIntent: boolean;
  useQuickChat: boolean;
  intentRouteMode: RouteIntentMode | null;
}): SidechatPipelineKind {
  const { imageIntent, useQuickChat, intentRouteMode } = args;
  if (imageIntent) return "image";
  if (useQuickChat) return "chat";
  if (intentRouteMode === "video") return "video";
  if (intentRouteMode === "plan") return "plan";
  return "orchestrate";
}

interface Message {
  id?: string;
  role: "user" | "ai";
  content: string;
  /** 模型文末 ```cta``` 解析出的快捷回复，最多 4 条 */
  ctas?: string[];
  image?: string;
  /** 分镜等一次返回多张静帧 */
  images?: string[];
  /** 多图生成时预计总张数（>1 时与 generating 配合展示多格占位） */
  imageGenerationExpected?: number;
  /** 重新生成：与上次文生图请求一致（prompt / 模型 / 尺寸 / 首格参考） */
  imageRegen?: {
    prompts: string[];
    imageModel: string;
    referenceImageUrl: string | null;
    /** 单图 / 关键帧时使用；分镜批量按每条 prompt 重新 infer */
    imageSize?: string;
  };
  /** 侧车 / API 处理链路：头像区展示能力与阶段 */
  pipeline?: SidechatPipelineKind;
  thinking?: {
    duration: number;
    isComplete: boolean;
    /** 未完成：对话/路由阶段为 thinking；调用文生图接口时为 generating */
    phase?: "thinking" | "generating";
  };
  tools?: {
    name: string;
    status: "loading" | "complete";
  }[];
  /** 多轮 /api/chat 编排阶段 */
  multiStage?: {
    phase: SidechatMultiStagePhase;
    analyzeFocus?: "image" | "requirement";
    pipelineT0: number;
    /** 第二阶段模型输出，单独展示在终稿上方 */
    openingHtml?: string;
    /** 分析阶段正文，终稿完成后仍保留，可通过胶囊栏展开查看 */
    analysisHtml?: string;
    /** 分析胶囊是否展开 */
    analysisExpanded?: boolean;
  };
  /** 侧栏直连 /api/videos 返回的成片地址 */
  videoUrl?: string;
}

/** 从最近一条含生成图的助手消息取分镜组图 URL 列表（images 优先，否则单张 image） */
function findLastAssistantStoryboardImageUrls(
  thread: Message[]
): string[] | null {
  for (let i = thread.length - 1; i >= 0; i--) {
    const row = thread[i];
    if (row.role !== "ai") continue;
    if (row.images && row.images.length > 0) return row.images;
    if (row.image) return [row.image];
  }
  return null;
}

/** 单一步骤条文案：只展示当前一步（与 tools 同步更新，不叠多条） */
function currentSidechatStepText(msg: Message): string {
  const tools = msg.tools;
  if (tools && tools.length > 0) {
    return tools[tools.length - 1]!.name;
  }
  if (msg.pipeline) {
    return SIDECHAT_PIPELINE_LABEL[msg.pipeline];
  }
  if (msg.thinking && !msg.thinking.isComplete) {
    return thinkingInFlightLabel(msg.thinking.phase);
  }
  return "";
}

function pickAnalyzeFocus(
  userPlain: string,
  planReadyForImage: boolean
): "image" | "requirement" {
  if (planReadyForImage) return "image";
  if (
    /分镜|故事板|storyboard|镜头表|景别|关键帧|短视频|宣传片|vlog|短片|视频脚本|叙事|场次/i.test(
      userPlain
    )
  ) {
    return "image";
  }
  if (
    /图|画|海报|封面|主视觉|参考|画风|截图|贴图|生图|插画|配色|字体|Logo|LOGO|版面|排版|视觉|像素/i.test(
      userPlain
    )
  ) {
    return "image";
  }
  return "requirement";
}

/** 需求已经足够具体，可跳过多头编排、少次模型往返 */
function isConcreteCreativeBrief(userPlain: string): boolean {
  const s = userPlain.trim();
  if (
    /直接出图|立刻生图|马上生图|跳过分析|不用分析|不要追问|单轮出图|快出图|尽快生成|别分析了/i.test(
      s
    )
  ) {
    return true;
  }
  if (s.length >= 100) return true;
  if (/分镜\s*\d|镜头\s*\d|第\s*\d+\s*[个格镜场]/.test(s)) return true;
  if (/(?:^|[\n\r])\s*\d+\s*[\.、\)]\s*\S{6,}/.test(s) && s.length >= 50) {
    return true;
  }
  if (
    /描述[:：]|景别|全景|特写|中景|推拉摇移|长镜头/.test(s) &&
    s.length >= 48
  ) {
    return true;
  }
  return false;
}

function shouldSkipOrchestrationAnalyze(userPlain: string): boolean {
  if (/别分析|不用分析|够清楚了|直接(出|生成)|跳过|出图/.test(userPlain)) {
    return true;
  }
  return isConcreteCreativeBrief(userPlain);
}

function shouldAutoKeyframeAfterStoryboardChat(args: {
  sidechatPipeline: SidechatPipelineKind;
  userPlain: string;
}): boolean {
  const { sidechatPipeline, userPlain } = args;
  if (
    sidechatPipeline !== "video" &&
    sidechatPipeline !== "plan" &&
    sidechatPipeline !== "orchestrate"
  ) {
    return false;
  }
  const s = userPlain;
  if (/别出图|只要文字|不要图|仅文案/.test(s)) return false;
  if (!/分镜|故事板|镜头|关键帧|短片|视频|叙事|场景/.test(s)) return false;
  return (
    isConcreteCreativeBrief(s) ||
    /直接生成|出第?[一二1]格|关键帧|出图|画出来|先生一/.test(s)
  );
}

/** 文生图请求：只使用用户当前输入（去掉参考图 chip 在纯文本中的占位） */
function directUserImagePrompt(userPlain: string): string {
  return (stripRefChipPlainNoise(userPlain) || userPlain.trim()).slice(0, 3800);
}

function userPlainSizeHint(userPlain: string): string {
  return stripRefChipPlainNoise(userPlain) || userPlain.trim();
}

function inferAspectBucketForUser(userPlain: string): string | null {
  const hint = userPlainSizeHint(userPlain);
  return normalizeAspectBucketFromText(hint);
}

function buildMergedImagePromptFromAssistant(
  assistantPlain: string,
  userPlain: string
): string {
  if (shouldPreferUserOnlyForImagePrompt(userPlain)) {
    return stripRefChipPlainNoise(userPlain) || userPlain.trim();
  }
  const extracted = extractImagePromptFromLastAssistant(
    assistantPlain,
    userPlain
  );
  if (!extracted.trim()) {
    return stripRefChipPlainNoise(userPlain) || userPlain.trim();
  }
  return mergeExtractedImagePromptWithUser(extracted, userPlain);
}

function formatChatHistoryDate(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** 侧栏图标：hover / 键盘聚焦时显示说明（避免仅依赖 title 原生提示） */
function ChatHeaderIconTip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-[80] mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

interface CanvasObject {
  id: string;
  type: 'shape' | 'text' | 'image' | 'video' | 'mark' | 'image-gen' | 'video-gen' | 'drawing';
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  shapeType?: string;
  color?: string;
  /** 仅对矩形类 shape 生效，取值为 0..50（CanvasShapeSvg 的 0..100 viewBox 单位） */
  cornerRadius?: number;
}

type DrawingPayload = {
  strokeWidth: number;
  points: [number, number][];
};

type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

function parseDrawing(obj: CanvasObject): DrawingPayload | null {
  if (obj.type !== "drawing" || !obj.content) return null;
  try {
    const p = JSON.parse(obj.content) as DrawingPayload;
    if (!Array.isArray(p.points)) return null;
    return {
      strokeWidth:
        typeof p.strokeWidth === "number" ? p.strokeWidth : 8 * CANVAS_U,
      points: p.points as [number, number][],
    };
  } catch {
    return null;
  }
}

function distPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function pointNearDrawing(x: number, y: number, obj: CanvasObject) {
  const d = parseDrawing(obj);
  if (!d || d.points.length < 1) return false;
  const thresh = Math.max(10, (d.strokeWidth ?? 8) / 2 + 6);
  const pts = d.points;
  if (pts.length === 1) {
    const [px, py] = pts[0];
    return Math.hypot(x - px, y - py) <= thresh;
  }
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    if (distPointToSegment(x, y, x1, y1, x2, y2) <= thresh) return true;
  }
  return false;
}

function bboxFromPoints(points: [number, number][], pad: number) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of points) {
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
    minY = Math.min(minY, py);
    maxY = Math.max(maxY, py);
  }
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + 2 * pad,
    h: maxY - minY + 2 * pad,
  };
}

function getCanvasObjectAabb(obj: CanvasObject) {
  let w = obj.width ?? 100;
  let h = obj.height ?? 40;
  let ox = obj.x;
  let oy = obj.y;
  if (obj.type === "mark") {
    w = 24 * CANVAS_U;
    h = 24 * CANVAS_U;
    ox = obj.x - w / 2;
    oy = obj.y - h / 2;
  } else if (obj.type === "text") {
    w = obj.width ?? 220 * CANVAS_U;
    h = obj.height ?? 56 * CANVAS_U;
  } else if (obj.type === "image" || obj.type === "video") {
    w = obj.width ?? 800 * CANVAS_U;
    h =
      obj.height ??
      (obj.type === "video" ? 450 * CANVAS_U : 1200 * CANVAS_U);
  } else if (obj.type === "image-gen") {
    w = obj.width ?? 600 * CANVAS_U;
    h = obj.height ?? 600 * CANVAS_U;
  } else if (obj.type === "video-gen") {
    w = obj.width ?? 800 * CANVAS_U;
    h = obj.height ?? 450 * CANVAS_U;
  } else if (obj.type === "drawing") {
    const d = parseDrawing(obj);
    if (!d || d.points.length === 0) {
      w = obj.width ?? 0;
      h = obj.height ?? 0;
    } else {
      const pad = (d.strokeWidth ?? 8) / 2 + 2;
      const b = bboxFromPoints(d.points, pad);
      ox = b.x;
      oy = b.y;
      w = b.w;
      h = b.h;
    }
  }
  return { ox, oy, w, h };
}

/** 画布对象 → 可作为侧栏参考图的图片 URL（贴图 / 画布生图框内富文本里的参考 chip） */
function canvasObjectToReferenceImageUrl(
  obj: CanvasObject
): string | null {
  if (obj.type === "image" && obj.content?.trim()) {
    const u = obj.content.trim();
    if (
      u.startsWith("http://") ||
      u.startsWith("https://") ||
      u.startsWith("data:") ||
      u.startsWith("/")
    ) {
      return u;
    }
  }
  if (obj.type === "image-gen" && obj.content?.trim()) {
    const wrapped = `<div>${obj.content}</div>`;
    const chips = extractRefImageSrcsFromUserHtml(wrapped);
    if (chips[0]) return chips[0];
  }
  return null;
}

/** 聊天/文生图写入画布时，占位较长边上限（CSS 像素），避免 1024² 等原图撑满工作区 */
const CANVAS_IMPORT_IMAGE_MAX_EDGE_CSS = 560;

function clampImageDisplaySizeCss(
  naturalW: number,
  naturalH: number,
  maxEdgeCss: number
): { w: number; h: number } {
  const w = Math.max(1, naturalW);
  const h = Math.max(1, naturalH);
  const long = Math.max(w, h);
  if (long <= maxEdgeCss) return { w, h };
  const s = maxEdgeCss / long;
  return {
    w: Math.max(1, Math.round(w * s)),
    h: Math.max(1, Math.round(h * s)),
  };
}

const CANVAS_CLIPBOARD_PREFIX = "lovart-canvas:";
type CanvasObjectData = Omit<CanvasObject, "id">;

function aabbIntersects(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  return !(ax + aw < bx || ax > bx + bw || ay + ah < by || ay > by + bh);
}

function polygonPoints(cx: number, cy: number, n: number, r: number, rotation = -Math.PI / 2) {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = rotation + (i * 2 * Math.PI) / n;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function starPolygonPoints(cx: number, cy: number, spikes: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function isTextShapeType(st?: string) {
  return Boolean(st && st.startsWith("text-"));
}

function shapeSupportsCornerRadius(st?: string) {
  return (
    st === "square" ||
    st === "text-square" ||
    st === "text-left" ||
    st === "text-right"
  );
}

const SHAPE_DEFAULT_CORNER_RADIUS = 12;
const SHAPE_TEXT_PAD_X = 24;
const SHAPE_TEXT_PAD_Y = 20;
const SHAPE_TEXT_MIN_W = 56;
const SHAPE_TEXT_MIN_H = 44;

function EditableShapeTextLayer({
  obj,
  onUpdate,
}: {
  obj: CanvasObject;
  onUpdate: (id: string, updates: Partial<CanvasObject>) => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);

  const measure = () => {
    const el = innerRef.current;
    if (!el || obj.width == null || obj.height == null) return;
    const sw = el.scrollWidth;
    const sh = el.scrollHeight;
    const nwCss = Math.max(
      SHAPE_TEXT_MIN_W,
      Math.ceil(sw + SHAPE_TEXT_PAD_X)
    );
    const nhCss = Math.max(
      SHAPE_TEXT_MIN_H,
      Math.ceil(sh + SHAPE_TEXT_PAD_Y)
    );
    const nw = nwCss * CANVAS_U;
    const nh = nhCss * CANVAS_U;
    if (Math.abs(nw - (obj.width ?? 0)) > 0.5 || Math.abs(nh - (obj.height ?? 0)) > 0.5) {
      onUpdate(obj.id, { width: nw, height: nh });
    }
  };

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (document.activeElement !== el) {
      el.textContent = obj.content ?? "文本";
    }
    measure();
  }, [obj.id, obj.content, obj.width, obj.height, obj.shapeType]);

  const shapeType = obj.shapeType ?? "text-square";

  const boxAlign =
    shapeType === "text-left"
      ? "items-center justify-start pl-[8%] pr-[6%]"
      : shapeType === "text-right"
        ? "items-center justify-end pr-[8%] pl-[6%]"
        : "items-center justify-center px-[8%]";

  return (
    <div
      className={cn("pointer-events-auto absolute inset-0 z-[2] flex", boxAlign)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        ref={innerRef}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          "max-h-[min(320px,70vh)] min-w-[1ch] max-w-full whitespace-pre-wrap break-words text-sm font-bold leading-snug text-white outline-none",
          shapeType === "text-left" && "text-left",
          shapeType === "text-right" && "text-right",
          (shapeType === "text-square" ||
            shapeType === "text-circle" ||
            shapeType === "text-bubble") &&
            "text-center"
        )}
        style={{ width: "max-content", maxWidth: "100%" }}
        onInput={(e) => {
          const raw = (e.target as HTMLDivElement).innerText.replace(/\u200b/g, "");
          onUpdate(obj.id, { content: raw });
          requestAnimationFrame(measure);
        }}
        onBlur={() => {
          const el = innerRef.current;
          if (el) {
            const raw = el.innerText.replace(/\u200b/g, "").replace(/\n+$/, "");
            onUpdate(obj.id, { content: raw });
          }
          measure();
        }}
      />
    </div>
  );
}

function CanvasShapeSvg({
  shapeType = "square",
  fill = "#94a3b8",
  cornerRadius = SHAPE_DEFAULT_CORNER_RADIUS,
  omitLabel = false,
}: {
  shapeType?: string;
  fill?: string;
  cornerRadius?: number;
  /** 文字由 HTML 层编辑时，仅绘制形状底 */
  omitLabel?: boolean;
}) {
  const label = "文本";
  const shapeText = (opts: { x: number; anchor: "middle" | "start" | "end"; size?: number }) => (
    <text
      x={opts.x}
      y={50}
      dominantBaseline="middle"
      textAnchor={opts.anchor}
      fill="white"
      fontSize={opts.size ?? 20}
      fontWeight={700}
      fontFamily="var(--font-sans)"
    >
      {label}
    </text>
  );
  const rectCorner = shapeSupportsCornerRadius(shapeType)
    ? Math.max(0, Math.min(50, Number.isFinite(cornerRadius) ? cornerRadius : SHAPE_DEFAULT_CORNER_RADIUS))
    : 0;

  switch (shapeType) {
    case "circle":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <ellipse cx={50} cy={50} rx={50} ry={50} fill={fill} />
        </svg>
      );
    case "triangle":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <polygon points="50,10 92,88 8,88" fill={fill} />
        </svg>
      );
    case "pentagon":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <polygon points={polygonPoints(50, 50, 5, 44)} fill={fill} />
        </svg>
      );
    case "hexagon":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <polygon points={polygonPoints(50, 50, 6, 44)} fill={fill} />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <polygon points={starPolygonPoints(50, 50, 5, 46, 20)} fill={fill} />
        </svg>
      );
    case "text-square":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <rect x={0} y={0} width={100} height={100} rx={rectCorner} fill={fill} />
          {!omitLabel && shapeText({ x: 50, anchor: "middle", size: 18 })}
        </svg>
      );
    case "text-circle":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <ellipse cx={50} cy={50} rx={50} ry={50} fill={fill} />
          {!omitLabel && shapeText({ x: 50, anchor: "middle", size: 18 })}
        </svg>
      );
    case "text-bubble":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <path
            d="M18 20 Q18 12 26 12H74Q82 12 82 20V58Q82 66 74 66H42L32 86L35 66H26Q18 66 18 58Z"
            fill={fill}
          />
          {!omitLabel && shapeText({ x: 50, anchor: "middle", size: 16 })}
        </svg>
      );
    case "text-left":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <rect x={0} y={0} width={100} height={100} rx={rectCorner} fill={fill} />
          {!omitLabel && shapeText({ x: 18, anchor: "start", size: 18 })}
        </svg>
      );
    case "text-right":
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <rect x={0} y={0} width={100} height={100} rx={rectCorner} fill={fill} />
          {!omitLabel && shapeText({ x: 82, anchor: "end", size: 18 })}
        </svg>
      );
    case "square":
    default:
      return (
        <svg viewBox="0 0 100 100" className="block h-full w-full" preserveAspectRatio="none">
          <rect x={0} y={0} width={100} height={100} rx={rectCorner} fill={fill} />
        </svg>
      );
  }
}

function newCreagicSessionId(): string {
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(CREAGIC_SESSION_LS_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}

async function syncCreagicServerMessages(sessionId: string, messages: Message[]) {
  try {
    const rows = messages
      .filter(
        (m) =>
          (m.role === "user" && richHasContent(m.content)) ||
          (m.role === "ai" &&
            ((m.content?.trim()?.length ?? 0) > 0 ||
              Boolean(m.image) ||
              Boolean(m.videoUrl)))
      )
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content:
          m.role === "user"
            ? htmlToPlainText(m.content)
            : `${htmlToPlainText(m.content || "")}${m.image ? ` [image:${m.image}]` : ""}${m.videoUrl ? ` [video:${m.videoUrl}]` : ""}`,
      }));
    await fetch(`/api/creagic/sessions/${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: rows }),
    });
  } catch {
    /* Creagic 侧车可选 */
  }
}

type ChatStarterCard = {
  title: string;
  desc: string;
  fullText: string;
  images: [string, string, string];
};

type ChatStarterGroup = { id: string; label: string; cards: ChatStarterCard[] };

/** 侧边栏空态推荐：三组循环 — 社交封面 / 品牌 / 海报 */
const CHAT_STARTER_PROMPT_GROUPS: ChatStarterGroup[] = [
  {
    id: "social",
    label: "社交封面",
    cards: [
      {
        title: "小红书活力封面",
        desc: "高饱和配色、手写字体，突出人物主体…",
        fullText:
          "为我生成一张小红书封面：高饱和配色与手写字体，突出人物主体，上方留白放标题。竖版 3:4，风格年轻活泼、有贴纸感。",
        images: [
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=600&fit=crop",
        ],
      },
      {
        title: "朋友圈九宫格主图",
        desc: "统一色调与网格构图，适合系列发文…",
        fullText:
          "按同一套品牌色与字体，生成 9 张可拼九宫格的朋友圈配图，主题围绕周末咖啡日常，每张一个小场景，整体网格对齐。",
        images: [
          "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400&h=600&fit=crop",
        ],
      },
      {
        title: "B站横版视频封面",
        desc: "强对比标题区 + 人物特写，信息层级清晰…",
        fullText:
          "生成 B 站 16:9 视频封面：左侧大标题区高对比，右侧人物特写带描边，底部小字副标题，整体赛博霓虹或二次元任选其一。",
        images: [
          "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=600&fit=crop",
        ],
      },
    ],
  },
  {
    id: "brand",
    label: "品牌",
    cards: [
      {
        title: "极简 Logo 与延展",
        desc: "几何图形、黑白主色，附辅助图形建议…",
        fullText:
          "为科技品牌设计极简 Logo：几何单字母图形 + 无衬线字标，黑白稿与反白稿，并给出名片与信封上的延展示意文案。",
        images: [
          "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=600&fit=crop",
        ],
      },
      {
        title: "茶饮品牌视觉全案",
        desc: "清新绿 + 米色，杯套与门店灯箱 mockup…",
        fullText:
          "新中式茶饮品牌视觉：主色抹茶绿与米白，需要杯身、纸袋、门店灯箱三件套 mockup，风格清新手写插画。",
        images: [
          "https://images.unsplash.com/photo-1527169402691-feff5539e52c?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1544140704-50de2cdbcec4?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=600&fit=crop",
        ],
      },
      {
        title: "潮牌图形与吊牌",
        desc: "粗体排版、撞色条纹，适合服装辅料…",
        fullText:
          "街头潮牌辅助图形：撞色条纹与粗体英文排版，输出可用于织唛、吊牌与胶印的方形主视觉，高对比。",
        images: [
          "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1523381210438-271e8be1f52b?w=400&h=600&fit=crop",
        ],
      },
    ],
  },
  {
    id: "poster",
    label: "海报",
    cards: [
      {
        title: "布达佩斯电影风格分镜",
        desc: "根据提供的参考图画面风格，依照《布达佩…",
        fullText:
          "根据提供的参考图画面风格，依照《布达佩斯大饭店》对称构图与马卡龙配色，生成一张电影感分镜海报，人物居中、画幅留白。",
        images: [
          "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=600&fit=crop",
        ],
      },
      {
        title: "矢量夸张人物 3D 风格",
        desc: "IP 设计，超现实主义，超级符号化造型…",
        fullText:
          "矢量夸张人物 3D 风格 IP：超现实主义比例、超级符号化造型，适合潮玩海报主视觉，背景纯色突出角色。",
        images: [
          "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=600&fit=crop",
        ],
      },
      {
        title: "运动模式 App 开屏海报",
        desc: "根据参考图的整体风格和构图延展运营图…",
        fullText:
          "运动健康 App 开屏海报：沿用参考图的霓虹跑道与暗色 UI 风格，突出「开始训练」按钮与心率曲线小元素，竖版。",
        images: [
          "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=600&fit=crop",
          "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=600&fit=crop",
        ],
      },
    ],
  },
];

export function EditorPage({
  onBack,
  initialMessage,
  onUpgrade,
  onLogout,
  initialCanvasName,
  projectId = null,
  initialCanvasJson = null,
  onProjectPersist,
  creditBalance,
  onOpenProjects,
  onNewProject,
  onDeleteCurrentProject,
  deepThinkMode,
  onDeepThinkModeChange,
  selectedSkill,
  onSelectedSkillChange,
  imageModelRows,
  videoModelRows,
  selectedImageModel,
  selectedVideoModel,
  onSelectedImageModelChange,
  onSelectedVideoModelChange,
  tryConsumeCredits,
}: {
  onBack: () => void;
  initialMessage?: string | null;
  onUpgrade?: () => void;
  onLogout?: () => void;
  initialCanvasName?: string | null;
  /** 与 App 项目列表同步的画布持久化 */
  projectId?: string | null;
  initialCanvasJson?: string | null;
  onProjectPersist?: (payload: {
    projectId: string;
    title: string;
    canvasJson: string;
    previewUrl?: string;
  }) => void;
  creditBalance: number;
  tryConsumeCredits: (amount: number) => boolean;
  onOpenProjects?: () => void;
  onNewProject?: () => void;
  onDeleteCurrentProject?: () => void;
  key?: string;
  deepThinkMode: boolean;
  onDeepThinkModeChange: (value: boolean) => void;
  selectedSkill: string | null;
  onSelectedSkillChange: (id: string | null) => void;
  imageModelRows: MediaModelManifestRow[];
  videoModelRows: MediaModelManifestRow[];
  selectedImageModel: string;
  selectedVideoModel: string;
  onSelectedImageModelChange: (apiModelId: string) => void;
  onSelectedVideoModelChange: (apiModelId: string) => void;
}) {
  const toast = useAppToast();
  const [canvasName, setCanvasName] = useState("未命名");
  const [isEditingName, setIsEditingName] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string>(() =>
    resolveInitialChatSessionId(projectId)
  );
  const [chatHasContent, setChatHasContent] = useState(false);
  const [imageProcessingById, setImageProcessingById] = useState<
    Record<string, { action: "removeBg" | "upscale"; label: string }>
  >({});
  const [isAITyping, setIsAITyping] = useState(false);
  const [regenerateBusyId, setRegenerateBusyId] = useState<string | null>(
    null
  );
  /** 发送后先展示加载态，再切换为圆形「停止」按钮，避免与参考交互不一致 */
  const [chatSendSlotPhase, setChatSendSlotPhase] = useState<
    "idle" | "loading" | "stop"
  >("idle");
  /** 仅该条助手消息播放打字机入场（新发送产生；历史恢复不匹配） */
  const [replyTypewriterMsgId, setReplyTypewriterMsgId] = useState<string | null>(
    null
  );
  const chatSubmitLockRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const chatSelectionRangeRef = useRef<Range | null>(null);
  const [isChatSelectionLocked, setIsChatSelectionLocked] = useState(false);
  const lockedMessagesRef = useRef<Message[] | null>(null);
  const chatSelectionGuardUntilRef = useRef(0);
  const chatSelectionGuardTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const messagesRef = useRef<Message[]>([]);
  const lastAssistantImageUrlRef = useRef<string | null>(null);
  /** 侧车 /engine/plan 上一轮返回 ready_for_image 时，下一轮用户说出图可降低门槛 */
  const creagicPlanReadyRef = useRef(false);
  const editorMountedRef = useRef(true);
  const chatFlyAbortRef = useRef<AbortController | null>(null);
  /** 当前侧栏对话进行中时，指向本轮助手气泡 id，用于取消 */
  const inFlightAiMsgIdRef = useRef<string | null>(null);
  const chatThinkingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const displayedMessages =
    isChatSelectionLocked && lockedMessagesRef.current
      ? lockedMessagesRef.current
      : messages;
  const chatHeaderTitle = React.useMemo(
    () => summarizeFirstUserMessageTitle(displayedMessages),
    [displayedMessages]
  );

  /** 点击发送后：短暂显示加载 icon，再显示与常见聊天产品一致的圆形停止键 */
  useEffect(() => {
    if (!isAITyping) {
      setChatSendSlotPhase("idle");
      return;
    }
    setChatSendSlotPhase("loading");
    const t = window.setTimeout(() => {
      setChatSendSlotPhase("stop");
    }, 420);
    return () => window.clearTimeout(t);
  }, [isAITyping]);

  useEffect(() => {
    editorMountedRef.current = true;
    return () => {
      editorMountedRef.current = false;
      if (chatThinkingIntervalRef.current != null) {
        clearInterval(chatThinkingIntervalRef.current);
        chatThinkingIntervalRef.current = null;
      }
      chatFlyAbortRef.current?.abort();
      chatFlyAbortRef.current = null;
    };
  }, []);

  /** 全局「当前会话」指针与侧栏 chatSessionId 一致（含项目下多线程 UUID） */
  useEffect(() => {
    try {
      localStorage.setItem(CREAGIC_SESSION_LS_KEY, chatSessionId);
    } catch {
      /* ignore */
    }
  }, [chatSessionId]);

  useEffect(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "ai") continue;
      if (m.images?.length) {
        lastAssistantImageUrlRef.current =
          m.images[m.images.length - 1] ?? null;
        return;
      }
      if (m.image) {
        lastAssistantImageUrlRef.current = m.image;
        return;
      }
    }
    lastAssistantImageUrlRef.current = null;
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rawLocal = loadChatThreadJson(chatSessionId);
      if (rawLocal) {
        try {
          const parsed = JSON.parse(rawLocal) as Message[];
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            !cancelled
          ) {
            setMessages(parsed);
            messagesRef.current = parsed;
            return;
          }
        } catch {
          /* 继续尝试侧车 */
        }
      }

      try {
        const r = await fetch(
          `/api/creagic/sessions/${encodeURIComponent(chatSessionId)}`
        );
        if (r.status === 404) {
          await fetch("/api/creagic/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: chatSessionId,
              user_id: "local",
            }),
          });
          return;
        }
        if (!r.ok || cancelled) return;
        const data = (await r.json()) as {
          messages?: Array<{ role: string; content: string }>;
        };
        const raw = data.messages;
        if (!raw?.length) return;
        const restored: Message[] = raw.map((row, i) =>
          row.role === "user"
            ? { role: "user", content: `<p>${escapeHtmlText(row.content)}</p>` }
            : {
                role: "ai",
                id: `restored-${i}`,
                content: formatAiReplyToHtml(row.content),
              }
        );
        setMessages((prev) => {
          if (prev.length > 0) return prev;
          messagesRef.current = restored;
          return restored;
        });
      } catch {
        /* 侧车未启动时忽略 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatSessionId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        saveChatThreadJson(chatSessionId, JSON.stringify(messages));
        if (messages.length > 0) {
          const u = messages.find((m) => m.role === "user");
          const title = u
            ? htmlToPlainText(u.content).trim().slice(0, 36) || "新对话"
            : "新对话";
          upsertSessionIndex({
            id: chatSessionId,
            title,
            updatedAt: Date.now(),
            ...(projectId?.trim()
              ? { projectId: projectId.trim() }
              : {}),
          });
        }
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [messages, chatSessionId, projectId]);

  const selectedSkillRef = useRef(selectedSkill);
  selectedSkillRef.current = selectedSkill;

  const selectedImageModelRef = useRef(selectedImageModel);
  const selectedVideoModelRef = useRef(selectedVideoModel);
  selectedImageModelRef.current = selectedImageModel;
  selectedVideoModelRef.current = selectedVideoModel;
  const selectedImageModelLabel =
    imageModelRows.find((row) => row.apiModelId === selectedImageModel)?.title ||
    selectedImageModel;
  const selectedVideoModelLabel =
    videoModelRows.find((row) => row.apiModelId === selectedVideoModel)?.title ||
    selectedVideoModel;

  const tryConsumeCreditsRef = useRef(tryConsumeCredits);
  tryConsumeCreditsRef.current = tryConsumeCredits;

  const handleSendMessageRef = useRef<
    ((textOverride?: string) => void) | undefined
  >(undefined);

  const selectToolbarAnchorRef = useRef<HTMLDivElement>(null);
  const shapeToolbarAnchorRef = useRef<HTMLDivElement>(null);
  const historyMenuAnchorRef = useRef<HTMLDivElement>(null);

  // Canvas State
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  offsetRef.current = offset;
  zoomRef.current = zoom;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const zoomTrackRef = useRef<HTMLDivElement>(null);
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const initialProcessed = useRef(false);

  const deepThinkRef = useRef(false);
  useEffect(() => {
    deepThinkRef.current = deepThinkMode;
  }, [deepThinkMode]);
  const [historySessions, setHistorySessions] = useState<ChatSessionIndexRow[]>(
    []
  );
  const [canvasGenBusyId, setCanvasGenBusyId] = useState<string | null>(null);
  const [msgVote, setMsgVote] = useState<Record<string, "up" | "down">>({});
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [starterGroupIndex, setStarterGroupIndex] = useState(0);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>("select");
  const [isShapePopoverOpen, setIsShapePopoverOpen] = useState(false);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [shapeDrawRect, setShapeDrawRect] = useState<{
    ax: number;
    ay: number;
    bx: number;
    by: number;
  } | null>(null);
  const shapeDrawRectRef = useRef(shapeDrawRect);
  shapeDrawRectRef.current = shapeDrawRect;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const selectedShapeRef = useRef(selectedShape);
  selectedShapeRef.current = selectedShape;
  const generatorInputRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevSelectedGenIdRef = useRef<string | null>(null);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);
  const [isDistributeMenuOpen, setIsDistributeMenuOpen] = useState(false);
  const projectMenuAnchorRef = useRef<HTMLDivElement>(null);
  const alignMenuAnchorRef = useRef<HTMLDivElement>(null);
  const distributeMenuAnchorRef = useRef<HTMLDivElement>(null);
  const unifiedMediaInputRef = useRef<HTMLInputElement>(null);
  const pendingFileTargetRef = useRef<
    { kind: "canvas" | "image-gen" | "video-gen"; id?: string } | null
  >(null);
  const canvasUndoBackupRef = useRef<CanvasObject[] | null>(null);
  const [isSelectPopoverOpen, setIsSelectPopoverOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (isHistoryOpen) {
      setHistorySessions(loadSessionIndex());
    }
  }, [isHistoryOpen]);

  useDismissOnOutsidePress(
    isSelectPopoverOpen,
    selectToolbarAnchorRef,
    () => setIsSelectPopoverOpen(false)
  );
  useDismissOnOutsidePress(
    isShapePopoverOpen,
    shapeToolbarAnchorRef,
    () => setIsShapePopoverOpen(false)
  );
  useDismissOnOutsidePress(
    isHistoryOpen,
    historyMenuAnchorRef,
    () => setIsHistoryOpen(false)
  );
  useDismissOnOutsidePress(
    isAlignMenuOpen,
    alignMenuAnchorRef,
    () => setIsAlignMenuOpen(false)
  );
  useDismissOnOutsidePress(
    isDistributeMenuOpen,
    distributeMenuAnchorRef,
    () => setIsDistributeMenuOpen(false)
  );

  useEffect(() => {
    setMsgVote({});
  }, [chatSessionId]);
  const [activeTags, setActiveTags] = useState<{ id: string, number: number, label: string, thumbnail: string }[]>([]);
  const chatInputRef = useRef<HTMLDivElement>(null);
  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [objectDragStart, setObjectDragStart] = useState({ x: 0, y: 0 });
  const objectPointerDownRef = useRef(false);
  const objectDragClientStartRef = useRef<{ x: number; y: number } | null>(null);
  const objectDragSyncRef = useRef(false);

  /** 屏幕像素：超过此位移才开始拖拽，避免轻点误拖，且无长按等待 */
  const OBJECT_DRAG_THRESHOLD_PX = 4;

  const cancelPendingObjectDrag = () => {
    objectPointerDownRef.current = false;
    objectDragClientStartRef.current = null;
  };
  const [canvasObjects, setCanvasObjects] = useState<CanvasObject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const canvasObjectsRef = useRef<CanvasObject[]>([]);
  canvasObjectsRef.current = canvasObjects;
  const canvasHitAreaRef = useRef<HTMLDivElement>(null);
  /** 画布图片 DOM，用于工具栏 fixed 定位（不随画布 scale 缩放） */
  const imageObjectDomRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [imageToolbarViewport, setImageToolbarViewport] = useState<{
    cx: number;
    top: number;
  } | null>(null);
  const [imageEditSession, setImageEditSession] = useState<ImageEditSession | null>(
    null
  );
  const [imageEditRect, setImageEditRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!initialCanvasJson?.trim()) return;
    try {
      const data = JSON.parse(initialCanvasJson) as {
        objects?: CanvasObject[];
        zoom?: number;
        offset?: { x: number; y: number };
        [CANVAS_JSON_CS_KEY]?: number;
      };
      if (Array.isArray(data.objects)) {
        const needsScale =
          data[CANVAS_JSON_CS_KEY] !== CANVAS_JSON_CS_VALUE;
        setCanvasObjects(
          needsScale
            ? scaleLegacyCanvasObjects(
                data.objects,
                CANVAS_JSON_CS_VALUE
              )
            : data.objects
        );
        setSelectedIds(new Set());
      }
      if (typeof data.zoom === "number" && data.zoom > 0) {
        setZoom(data.zoom);
      }
      if (
        data.offset &&
        typeof data.offset.x === "number" &&
        typeof data.offset.y === "number"
      ) {
        setOffset(data.offset);
      }
    } catch {
      /* ignore */
    }
  }, [projectId, initialCanvasJson]);

  const projectPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  useEffect(() => {
    const pid = projectId?.trim();
    if (!pid || !onProjectPersist) return;
    if (projectPersistTimerRef.current) {
      clearTimeout(projectPersistTimerRef.current);
    }
    projectPersistTimerRef.current = setTimeout(() => {
      const firstImg = canvasObjects.find((o) => o.type === "image");
      const preview =
        firstImg?.content &&
        (firstImg.content.startsWith("http") ||
          firstImg.content.startsWith("data:"))
          ? firstImg.content
          : undefined;
      onProjectPersist({
        projectId: pid,
        title: canvasName,
        canvasJson: JSON.stringify({
          objects: canvasObjects,
          zoom,
          offset,
          [CANVAS_JSON_CS_KEY]: CANVAS_JSON_CS_VALUE,
        }),
        previewUrl: preview,
      });
    }, 650);
    return () => {
      if (projectPersistTimerRef.current) {
        clearTimeout(projectPersistTimerRef.current);
      }
    };
  }, [
    canvasObjects,
    zoom,
    offset,
    canvasName,
    projectId,
    onProjectPersist,
  ]);
  const [isResizingObject, setIsResizingObject] = useState(false);
  const resizeSessionRef = useRef<{
    objectId: string;
    handle: ResizeHandle;
    pointerStartX: number;
    pointerStartY: number;
    startW: number;
    startH: number;
    startObjX: number;
    startObjY: number;
    lockAspect?: boolean;
    drawingPoints?: [number, number][];
    drawingStrokeWidth?: number;
  } | null>(null);
  const objectDragGroupRef = useRef<Set<string>>(new Set());
  /** 单击画布可引用图：记录指针用于 mouseup 判定轻点；仅设「待加入参考图」灰显，双击才写入输入框 */
  const canvasRefImagePointerRef = useRef<{
    objectId: string;
    url: string;
    sx: number;
    sy: number;
  } | null>(null);
  /** 待双击加入侧栏参考图的画布对象 id（单击切换；点空白或点非可引用对象时清除） */
  const [pendingRefImageObjectId, setPendingRefImageObjectId] = useState<
    string | null
  >(null);
  const [marquee, setMarquee] = useState<{
    ax: number;
    ay: number;
    bx: number;
    by: number;
  } | null>(null);
  const marqueeRef = useRef(marquee);
  marqueeRef.current = marquee;

  const [pencilStrokeWidth, setPencilStrokeWidth] = useState(8);
  const [pencilColor, setPencilColor] = useState("#18181b");
  const pencilDrawingActiveRef = useRef(false);
  const pencilDrawingIdRef = useRef<string | null>(null);

  const primarySelectedId = selectedIds.size === 1 ? [...selectedIds][0] : null;
  const selectedObject = primarySelectedId
    ? canvasObjects.find((obj) => obj.id === primarySelectedId)
    : undefined;
  const showMultiAlignToolbar =
    activeTool === "select" &&
    selectedIds.size >= 2 &&
    !isDraggingObject &&
    !isResizingObject &&
    !marquee;

  const showFloatingImageToolbar =
    activeTool === "select" &&
    primarySelectedId != null &&
    selectedObject?.type === "image" &&
    !isDraggingObject &&
    !isResizingObject &&
    !marquee &&
    !imageEditSession &&
    selectedObject.width != null &&
    selectedObject.height != null;

  useLayoutEffect(() => {
    if (!showFloatingImageToolbar || !primarySelectedId) {
      setImageToolbarViewport(null);
      return;
    }
    const el = imageObjectDomRef.current.get(primarySelectedId);
    if (!el) {
      setImageToolbarViewport(null);
      return;
    }
    const measure = () => {
      const r = el.getBoundingClientRect();
      setImageToolbarViewport({
        cx: r.left + r.width / 2,
        top: r.top,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [
    showFloatingImageToolbar,
    primarySelectedId,
    zoom,
    offset.x,
    offset.y,
    canvasObjects,
    isDraggingObject,
    isResizingObject,
    marquee,
    activeTool,
    imageEditSession,
  ]);

  useLayoutEffect(() => {
    if (!imageEditSession) {
      setImageEditRect(null);
      return;
    }
    const el = imageObjectDomRef.current.get(imageEditSession.objectId);
    if (!el) {
      setImageEditRect(null);
      return;
    }
    let rafId = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setImageEditRect((prev) => {
        if (
          prev &&
          Math.abs(prev.left - r.left) < 0.5 &&
          Math.abs(prev.top - r.top) < 0.5 &&
          Math.abs(prev.width - r.width) < 0.5 &&
          Math.abs(prev.height - r.height) < 0.5
        ) {
          return prev;
        }
        return new DOMRect(r.x, r.y, r.width, r.height);
      });
    };
    const scheduleMeasure = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        measure();
      });
    };
    measure();
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(el);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
    };
  }, [
    imageEditSession,
    zoom,
    offset.x,
    offset.y,
    canvasObjects,
    isDraggingObject,
    isResizingObject,
  ]);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const el = canvasHitAreaRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const xd =
      (clientX - rect.left - rect.width / 2 - offset.x) / zoom;
    const yd =
      (clientY - rect.top - rect.height / 2 - offset.y) / zoom;
    return { x: xd * CANVAS_U, y: yd * CANVAS_U };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, obj: CanvasObject, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    cancelPendingObjectDrag();
    setIsDraggingObject(false);
    const aabb = getCanvasObjectAabb(obj);
    const w = aabb.w;
    const h = aabb.h;
    const { x, y } = getCanvasPoint(e.clientX, e.clientY);
    const d = obj.type === "drawing" ? parseDrawing(obj) : null;
    resizeSessionRef.current = {
      objectId: obj.id,
      handle,
      pointerStartX: x,
      pointerStartY: y,
      startW: w,
      startH: h,
      startObjX: aabb.ox,
      startObjY: aabb.oy,
      // 图片/视频允许边框与画面贴合：锁定等比缩放，避免 object-contain 留白导致选框大于画面
      lockAspect: obj.type === "image" || obj.type === "video",
      ...(d && d.points.length > 0
        ? {
            drawingPoints: d.points.map(([px, py]) => [px, py] as [number, number]),
            drawingStrokeWidth: d.strokeWidth,
          }
        : {}),
    };
    setIsResizingObject(true);
  };

  const handleUpdateObject = (id: string, updates: Partial<CanvasObject>) => {
    setCanvasObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj));
  };

  const handleImageToolbarAction = useCallback(
    async (actionId: ImageToolbarActionId) => {
      if (!primarySelectedId || selectedObject?.type !== "image") {
        toast("请先选中一张图片。");
        return;
      }
      const sourceUrl = String(selectedObject.content || "").trim();
      if (!sourceUrl) {
        toast("当前图片地址无效。");
        return;
      }
      if (actionId === "upscale") {
        setImageProcessingById((prev) => ({
          ...prev,
          [primarySelectedId]: { action: "upscale", label: "质感增强中" },
        }));
        try {
          const out = await enhanceImageWithLiblib(sourceUrl);
          handleUpdateObject(primarySelectedId, { content: out.url });
          toast("已完成质感增强。");
        } catch (e) {
          toast(e instanceof Error ? e.message : "质感增强失败");
        } finally {
          setImageProcessingById((prev) => {
            const next = { ...prev };
            delete next[primarySelectedId];
            return next;
          });
        }
        return;
      }
      if (actionId === "removeBg") {
        setImageProcessingById((prev) => ({
          ...prev,
          [primarySelectedId]: { action: "removeBg", label: "移除背景生成中" },
        }));
        try {
          const out = await removeBackgroundWithLiblib(sourceUrl);
          handleUpdateObject(primarySelectedId, { content: out.url });
          toast("已移除背景。");
        } catch (e) {
          toast(e instanceof Error ? e.message : "移除背景失败");
        } finally {
          setImageProcessingById((prev) => {
            const next = { ...prev };
            delete next[primarySelectedId];
            return next;
          });
        }
        return;
      }
      if (actionId === "download") {
        const a = document.createElement("a");
        a.href = sourceUrl;
        a.download = "image.png";
        a.rel = "noreferrer";
        a.click();
        return;
      }
      if (actionId === "erase") {
        setImageEditSession({ mode: "erase", objectId: primarySelectedId });
        return;
      }
      if (actionId === "outpaint") {
        setImageEditSession({ mode: "outpaint", objectId: primarySelectedId });
        return;
      }
      if (actionId === "crop") {
        setImageEditSession({ mode: "crop", objectId: primarySelectedId });
        return;
      }
      toast("该功能正在接入中。");
    },
    [primarySelectedId, selectedObject, toast]
  );

  const applyChatStarterCard = (card: ChatStarterCard) => {
    const el = chatInputRef.current;
    if (!el) return;
    el.querySelectorAll(".preset-prompt").forEach((node) => node.remove());
    const thumb = card.images[1] ?? card.images[0];
    const html = buildRecommendationPresetHtml({
      title: card.fullText,
      prompt: card.fullText,
      imageUrl: thumb,
      needsReferenceImage: Boolean(thumb),
    });
    el.insertAdjacentHTML("beforeend", html);
    setChatHasContent(richHasContent(el.innerHTML));
  };

  const handleToolClick = (tool: string) => {
    if (tool === "shape") {
      setIsShapePopoverOpen(!isShapePopoverOpen);
    } else {
      setIsShapePopoverOpen(false);
    }
    
    if (tool === "image-gen") {
      const z = zoomRef.current;
      const off = offsetRef.current;
      const cx = (-off.x / z) * CANVAS_U;
      const cy = (-off.y / z) * CANVAS_U;
      const w = 600 * CANVAS_U;
      const fh = 600 * CANVAS_U;
      const newId = Math.random().toString(36).slice(2, 11);
      setCanvasObjects((prev) => [
        ...prev,
        {
          id: newId,
          type: "image-gen",
          x: cx - w / 2,
          y: cy - fh / 2,
          width: w,
          height: fh,
          content: "",
        },
      ]);
      setSelectedIds(new Set([newId]));
      setActiveTool("select");
    } else if (tool === "video-gen") {
      const z = zoomRef.current;
      const off = offsetRef.current;
      const cx = (-off.x / z) * CANVAS_U;
      const cy = (-off.y / z) * CANVAS_U;
      const w = 800 * CANVAS_U;
      const fh = 450 * CANVAS_U;
      const newId = Math.random().toString(36).slice(2, 11);
      setCanvasObjects((prev) => [
        ...prev,
        {
          id: newId,
          type: "video-gen",
          x: cx - w / 2,
          y: cy - fh / 2,
          width: w,
          height: fh,
          content: "",
        },
      ]);
      setSelectedIds(new Set([newId]));
      setActiveTool("select");
    } else {
      setActiveTool(tool);
    }
  };

  useEffect(() => {
    if (activeTool !== "pencil") {
      pencilDrawingActiveRef.current = false;
      pencilDrawingIdRef.current = null;
    }
  }, [activeTool]);

  useEffect(() => {
    const el = scrollRef.current;
    const prevCount = prevMessageCountRef.current;
    const nextCount = messages.length;
    prevMessageCountRef.current = nextCount;
    if (!el) return;
    // 仅在消息条数变化时自动滚到底；内容细粒度更新（如阶段字段）不应打断用户划选
    if (prevCount === nextCount) return;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    const hasSelection =
      !!sel &&
      !sel.isCollapsed &&
      !!sel.anchorNode &&
      !!sel.focusNode &&
      el.contains(sel.anchorNode) &&
      el.contains(sel.focusNode);
    if (hasSelection) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const captureChatSelection = useCallback(() => {
    const el = scrollRef.current;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!el || !sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) {
      return;
    }
    chatSelectionRangeRef.current = range.cloneRange();
    if (!isChatSelectionLocked) {
      lockedMessagesRef.current = messagesRef.current;
      setIsChatSelectionLocked(true);
    }
    // 鼠标松开后的短窗口内保护选区：若被异步渲染清空则自动恢复
    chatSelectionGuardUntilRef.current = Date.now() + 3000;
    if (chatSelectionGuardTimerRef.current != null) return;
    chatSelectionGuardTimerRef.current = setInterval(() => {
      const root = scrollRef.current;
      const saved = chatSelectionRangeRef.current;
      if (!root || !saved || Date.now() > chatSelectionGuardUntilRef.current) {
        if (chatSelectionGuardTimerRef.current != null) {
          clearInterval(chatSelectionGuardTimerRef.current);
          chatSelectionGuardTimerRef.current = null;
        }
        return;
      }
      if (
        !root.contains(saved.startContainer) ||
        !root.contains(saved.endContainer)
      ) {
        chatSelectionRangeRef.current = null;
        clearInterval(chatSelectionGuardTimerRef.current);
        chatSelectionGuardTimerRef.current = null;
        return;
      }
      const s = window.getSelection();
      if (!s) return;
      const hasActiveChatSelection =
        !s.isCollapsed &&
        s.anchorNode != null &&
        s.focusNode != null &&
        root.contains(s.anchorNode) &&
        root.contains(s.focusNode);
      if (hasActiveChatSelection) return;
      s.removeAllRanges();
      s.addRange(saved.cloneRange());
    }, 120);
  }, [isChatSelectionLocked]);

  useEffect(() => {
    const clearOnOutsidePointer = (e: MouseEvent) => {
      const el = scrollRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      chatSelectionRangeRef.current = null;
      lockedMessagesRef.current = null;
      setIsChatSelectionLocked(false);
      chatSelectionGuardUntilRef.current = 0;
      if (chatSelectionGuardTimerRef.current != null) {
        clearInterval(chatSelectionGuardTimerRef.current);
        chatSelectionGuardTimerRef.current = null;
      }
    };
    document.addEventListener("mousedown", clearOnOutsidePointer, true);
    return () => {
      document.removeEventListener("mousedown", clearOnOutsidePointer, true);
    };
  }, []);

  useEffect(
    () => () => {
      if (chatSelectionGuardTimerRef.current != null) {
        clearInterval(chatSelectionGuardTimerRef.current);
        chatSelectionGuardTimerRef.current = null;
      }
    },
    []
  );

  useLayoutEffect(() => {
    const saved = chatSelectionRangeRef.current;
    const el = scrollRef.current;
    if (!saved || !el) return;
    if (
      !el.contains(saved.startContainer) ||
      !el.contains(saved.endContainer)
    ) {
      chatSelectionRangeRef.current = null;
      return;
    }
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!sel) return;
    const hasActiveChatSelection =
      !sel.isCollapsed &&
      sel.anchorNode != null &&
      sel.focusNode != null &&
      el.contains(sel.anchorNode) &&
      el.contains(sel.focusNode);
    if (hasActiveChatSelection) return;
    sel.removeAllRanges();
    sel.addRange(saved.cloneRange());
  }, [messages, hoveredIcon, isAITyping]);

  useEffect(() => {
    if (initialCanvasName?.trim()) {
      setCanvasName(initialCanvasName.trim());
    } else {
      setCanvasName("未命名");
    }
  }, [initialCanvasName]);

  useEffect(() => {
    if (!isProjectMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (
        projectMenuAnchorRef.current &&
        !projectMenuAnchorRef.current.contains(e.target as Node)
      ) {
        setIsProjectMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [isProjectMenuOpen]);

  useEffect(() => {
    if (initialMessage && !initialProcessed.current) {
      initialProcessed.current = true;
      queueMicrotask(() => {
        if (chatInputRef.current) {
          if (/<[a-z][\s\S]*>/i.test(initialMessage)) {
            chatInputRef.current.innerHTML = initialMessage;
          } else {
            chatInputRef.current.textContent = initialMessage;
          }
          setChatHasContent(richHasContent(chatInputRef.current.innerHTML));
        }
        handleSendMessage(initialMessage);
      });
    }
  }, [initialMessage]);

  useLayoutEffect(() => {
    const id = primarySelectedId;
    if (!id) {
      prevSelectedGenIdRef.current = null;
      return;
    }
    const obj = canvasObjectsRef.current.find((o) => o.id === id);
    const apply = () => {
      if (!obj || (obj.type !== "image-gen" && obj.type !== "video-gen")) {
        prevSelectedGenIdRef.current = id;
        return;
      }
      const el = generatorInputRefs.current.get(id);
      if (!el) return;
      if (prevSelectedGenIdRef.current !== id) {
        el.innerHTML = obj.content ?? "";
      }
      prevSelectedGenIdRef.current = id;
    };
    apply();
    requestAnimationFrame(apply);
  }, [primarySelectedId]);

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const isExternalTextInputFocused = () => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return true;
    if (el.getAttribute("contenteditable") === "true") return true;
    return false;
  };

  const getViewportCenterCanvas = () => {
    const z = zoomRef.current;
    const off = offsetRef.current;
    return {
      x: (-off.x / z) * CANVAS_U,
      y: (-off.y / z) * CANVAS_U,
    };
  };

  const centerObjectsInCanvas = (objects: CanvasObject[], cx: number, cy: number): CanvasObject[] => {
    if (objects.length === 0) return objects;
    let minOx = Infinity;
    let minOy = Infinity;
    let maxRx = -Infinity;
    let maxBy = -Infinity;
    for (const o of objects) {
      const { ox, oy, w, h } = getCanvasObjectAabb(o);
      minOx = Math.min(minOx, ox);
      minOy = Math.min(minOy, oy);
      maxRx = Math.max(maxRx, ox + w);
      maxBy = Math.max(maxBy, oy + h);
    }
    const midX = (minOx + maxRx) / 2;
    const midY = (minOy + maxBy) / 2;
    const dx = cx - midX;
    const dy = cy - midY;
    return objects.map((o) => {
      if (o.type === "drawing") {
        const d = parseDrawing(o);
        if (!d) return { ...o, x: o.x + dx, y: o.y + dy };
        const points = d.points.map(
          ([px, py]) => [px + dx, py + dy] as [number, number]
        );
        const pad = d.strokeWidth / 2 + 2;
        const b = bboxFromPoints(points, pad);
        return {
          ...o,
          x: b.x,
          y: b.y,
          width: b.w,
          height: b.h,
          content: JSON.stringify({ strokeWidth: d.strokeWidth, points }),
        };
      }
      return { ...o, x: o.x + dx, y: o.y + dy };
    });
  };

  const handleDeleteMessage = (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  };

  /** 将图片作为画布对象加入，与画板共用平移/缩放/选中拖拽。未传 width/height 时用图片自然尺寸。 */
  const addImageToCanvas = (
    src: string,
    opts?: { width?: number; height?: number; resetView?: boolean; centerInViewport?: boolean }
  ) => {
    const pushImageObject = (width: number, height: number) => {
      const newId = Math.random().toString(36).slice(2, 11);
      setCanvasObjects((prev) => {
        let x: number;
        let y: number;
        if (opts?.centerInViewport) {
          const { x: cx, y: cy } = getViewportCenterCanvas();
          x = cx - width / 2;
          y = cy - height / 2;
        } else {
          const stagger = prev.filter((o) => o.type === "image").length;
          x = (40 + (stagger % 6) * 36) * CANVAS_U;
          y = (40 + (stagger % 6) * 36) * CANVAS_U;
        }
        return [
          ...prev,
          {
            id: newId,
            type: "image" as const,
            x,
            y,
            width,
            height,
            content: src,
          },
        ];
      });
      setSelectedIds(new Set([newId]));
      if (opts?.resetView) {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    };

    if (opts?.width != null && opts?.height != null) {
      pushImageObject(opts.width * CANVAS_U, opts.height * CANVAS_U);
      return;
    }

    const img = new Image();
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      const nw = img.naturalWidth > 0 ? img.naturalWidth : 800;
      const nh = img.naturalHeight > 0 ? img.naturalHeight : 600;
      const { w, h } = clampImageDisplaySizeCss(
        nw,
        nh,
        CANVAS_IMPORT_IMAGE_MAX_EDGE_CSS
      );
      pushImageObject(w * CANVAS_U, h * CANVAS_U);
    };
    img.onerror = () => pushImageObject(800 * CANVAS_U, 600 * CANVAS_U);
    img.src = src;
  };

  const fitAllObjectsInView = () => {
    const objs = canvasObjectsRef.current;
    const area = canvasHitAreaRef.current;
    if (!area) return;
    if (objs.length === 0) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const o of objs) {
      const { ox, oy, w, h } = getCanvasObjectAabb(o);
      minX = Math.min(minX, ox);
      minY = Math.min(minY, oy);
      maxX = Math.max(maxX, ox + w);
      maxY = Math.max(maxY, oy + h);
    }
    if (!Number.isFinite(minX)) return;
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);
    const mx = (minX + maxX) / 2;
    const my = (minY + maxY) / 2;
    const rect = area.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;
    const margin = 56;
    const zFit = Math.min(
      ((vw - margin * 2) * CANVAS_U) / bw,
      ((vh - margin * 2) * CANVAS_U) / bh,
      2
    );
    const newZoom = Math.max(0.1, Math.min(2, zFit));
    setZoom(newZoom);
    setOffset({
      x: -(mx / CANVAS_U) * newZoom,
      y: -(my / CANVAS_U) * newZoom,
    });
  };

  const zoomCanvasIn = () => setZoom((z) => Math.min(2, z * 1.15));
  const zoomCanvasOut = () => setZoom((z) => Math.max(0.1, z / 1.15));

  const duplicateSelection = () => {
    const sel = selectedIdsRef.current;
    if (sel.size === 0) return;
    const objs = canvasObjectsRef.current.filter((o) => sel.has(o.id));
    const delta = 24 * CANVAS_U;
    const newObjs: CanvasObject[] = objs.map((o) => {
      const id = Math.random().toString(36).slice(2, 11);
      if (o.type === "drawing") {
        const d = parseDrawing(o);
        if (!d) return { ...o, id };
        const points = d.points.map(
          ([px, py]) => [px + delta, py + delta] as [number, number]
        );
        const pad = d.strokeWidth / 2 + 2;
        const b = bboxFromPoints(points, pad);
        return {
          ...o,
          id,
          x: b.x,
          y: b.y,
          width: b.w,
          height: b.h,
          content: JSON.stringify({ strokeWidth: d.strokeWidth, points }),
        };
      }
      return { ...o, id, x: o.x + delta, y: o.y + delta };
    });
    setCanvasObjects((prev) => [...prev, ...newObjs]);
    setSelectedIds(new Set(newObjs.map((x) => x.id)));
  };

  const alignSelectedObjects = (
    mode: "left" | "centerX" | "right" | "top" | "centerY" | "bottom"
  ) => {
    const ids = selectedIdsRef.current;
    if (ids.size < 2) return;
    const selected = canvasObjectsRef.current.filter((o) => ids.has(o.id));
    if (selected.length < 2) return;

    const boxes = selected.map((o) => ({ id: o.id, ...getCanvasObjectAabb(o) }));
    const minX = Math.min(...boxes.map((b) => b.ox));
    const maxX = Math.max(...boxes.map((b) => b.ox + b.w));
    const minY = Math.min(...boxes.map((b) => b.oy));
    const maxY = Math.max(...boxes.map((b) => b.oy + b.h));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const deltaById = new Map<string, { dx: number; dy: number }>();
    for (const b of boxes) {
      let dx = 0;
      let dy = 0;
      if (mode === "left") dx = minX - b.ox;
      else if (mode === "centerX") dx = cx - (b.ox + b.w / 2);
      else if (mode === "right") dx = maxX - (b.ox + b.w);
      else if (mode === "top") dy = minY - b.oy;
      else if (mode === "centerY") dy = cy - (b.oy + b.h / 2);
      else if (mode === "bottom") dy = maxY - (b.oy + b.h);
      deltaById.set(b.id, { dx, dy });
    }

    setCanvasObjects((prev) =>
      prev.map((obj) => {
        const dxy = deltaById.get(obj.id);
        if (!dxy) return obj;
        const { dx, dy } = dxy;
        if (dx === 0 && dy === 0) return obj;
        if (obj.type === "drawing") {
          const d = parseDrawing(obj);
          if (!d || d.points.length === 0) return { ...obj, x: obj.x + dx, y: obj.y + dy };
          const points = d.points.map(
            ([px, py]) => [px + dx, py + dy] as [number, number]
          );
          const pad = d.strokeWidth / 2 + 2;
          const b = bboxFromPoints(points, pad);
          return {
            ...obj,
            x: b.x,
            y: b.y,
            width: b.w,
            height: b.h,
            content: JSON.stringify({ strokeWidth: d.strokeWidth, points }),
          };
        }
        return { ...obj, x: obj.x + dx, y: obj.y + dy };
      })
    );
  };

  const distributeSelectedObjects = (mode: "horizontal" | "vertical") => {
    const ids = selectedIdsRef.current;
    if (ids.size < 3) return;
    const selected = canvasObjectsRef.current.filter((o) => ids.has(o.id));
    if (selected.length < 3) return;
    const boxes = selected.map((o) => ({ id: o.id, ...getCanvasObjectAabb(o) }));
    const deltaById = new Map<string, { dx: number; dy: number }>();

    if (mode === "horizontal") {
      const sorted = [...boxes].sort((a, b) => a.ox - b.ox);
      const minLeft = sorted[0]!.ox;
      const maxRight = sorted[sorted.length - 1]!.ox + sorted[sorted.length - 1]!.w;
      const totalW = sorted.reduce((s, b) => s + b.w, 0);
      const gap = (maxRight - minLeft - totalW) / (sorted.length - 1);
      let cursor = minLeft;
      for (const b of sorted) {
        deltaById.set(b.id, { dx: cursor - b.ox, dy: 0 });
        cursor += b.w + gap;
      }
    } else {
      const sorted = [...boxes].sort((a, b) => a.oy - b.oy);
      const minTop = sorted[0]!.oy;
      const maxBottom =
        sorted[sorted.length - 1]!.oy + sorted[sorted.length - 1]!.h;
      const totalH = sorted.reduce((s, b) => s + b.h, 0);
      const gap = (maxBottom - minTop - totalH) / (sorted.length - 1);
      let cursor = minTop;
      for (const b of sorted) {
        deltaById.set(b.id, { dx: 0, dy: cursor - b.oy });
        cursor += b.h + gap;
      }
    }

    setCanvasObjects((prev) =>
      prev.map((obj) => {
        const dxy = deltaById.get(obj.id);
        if (!dxy) return obj;
        const { dx, dy } = dxy;
        if (dx === 0 && dy === 0) return obj;
        if (obj.type === "drawing") {
          const d = parseDrawing(obj);
          if (!d || d.points.length === 0) {
            return { ...obj, x: obj.x + dx, y: obj.y + dy };
          }
          const points = d.points.map(
            ([px, py]) => [px + dx, py + dy] as [number, number]
          );
          const pad = d.strokeWidth / 2 + 2;
          const b = bboxFromPoints(points, pad);
          return {
            ...obj,
            x: b.x,
            y: b.y,
            width: b.w,
            height: b.h,
            content: JSON.stringify({ strokeWidth: d.strokeWidth, points }),
          };
        }
        return { ...obj, x: obj.x + dx, y: obj.y + dy };
      })
    );
  };

  const restoreCanvasUndo = () => {
    const snap = canvasUndoBackupRef.current;
    if (!snap) return;
    setCanvasObjects(snap);
    canvasUndoBackupRef.current = null;
    setSelectedIds(new Set());
  };

  const triggerMediaPick = (target: NonNullable<typeof pendingFileTargetRef.current>) => {
    pendingFileTargetRef.current = target;
    unifiedMediaInputRef.current?.click();
  };

  const appendGenChipFromUrl = (
    objectId: string,
    genType: "image-gen" | "video-gen",
    imageUrl: string
  ) => {
    setCanvasObjects((prev) =>
      prev.map((o) => {
        if (o.id !== objectId || o.type !== genType) return o;
        const idx = nextRefChipIndex(o.content ?? "");
        const chip = buildRefChipHtmlFromUrl(imageUrl, idx);
        const el = generatorInputRefs.current.get(objectId);
        const sel = selectedIdsRef.current;
        if (el && sel.has(objectId) && sel.size === 1) {
          el.innerHTML += chip;
          return { ...o, content: el.innerHTML };
        }
        return { ...o, content: (o.content ?? "") + chip };
      })
    );
  };

  const handleUnifiedMediaFiles = (fileList: FileList | null) => {
    const file = fileList?.[0];
    const target = pendingFileTargetRef.current;
    pendingFileTargetRef.current = null;
    if (!file || !target) return;

    const runWithDataUrl = (cb: (url: string) => void) => {
      const reader = new FileReader();
      reader.onload = () => cb(reader.result as string);
      reader.readAsDataURL(file);
    };

    if (target.kind === "canvas") {
      if (file.type.startsWith("image/")) {
        runWithDataUrl((url) => addImageToCanvas(url, { centerInViewport: true }));
      } else if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        const w = 800 * CANVAS_U;
        const h = 450 * CANVAS_U;
        const { x: cx, y: cy } = getViewportCenterCanvas();
        const newId = Math.random().toString(36).slice(2, 11);
        setCanvasObjects((prev) => [
          ...prev,
          {
            id: newId,
            type: "video",
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
            content: url,
          },
        ]);
        setSelectedIds(new Set([newId]));
      }
      return;
    }

    if (!file.type.startsWith("image/") || !target.id) return;
    runWithDataUrl((url) => appendGenChipFromUrl(target.id!, target.kind, url));
  };

  const canvasKbdRef = useRef({
    restoreCanvasUndo: () => {},
    duplicateSelection: () => {},
    fitAllObjectsInView: () => {},
    zoomCanvasIn: () => {},
    zoomCanvasOut: () => {},
  });
  canvasKbdRef.current = {
    restoreCanvasUndo,
    duplicateSelection,
    fitAllObjectsInView,
    zoomCanvasIn,
    zoomCanvasOut,
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isExternalTextInputFocused()) return;
      const k = canvasKbdRef.current;
      const sel = selectedIdsRef.current;
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        k.restoreCanvasUndo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        k.duplicateSelection();
        return;
      }
      if (e.shiftKey && (e.key === "1" || e.key === "!")) {
        e.preventDefault();
        k.fitAllObjectsInView();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        k.zoomCanvasIn();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        k.zoomCanvasOut();
        return;
      }
      if ((e.key === "Backspace" || e.key === "Delete") && sel.size > 0) {
        canvasUndoBackupRef.current = JSON.parse(
          JSON.stringify(canvasObjectsRef.current)
        ) as CanvasObject[];
        setCanvasObjects((prev) => prev.filter((obj) => !sel.has(obj.id)));
        setSelectedIds(new Set());
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && sel.size > 0) {
        e.preventDefault();
        const objs = canvasObjectsRef.current.filter((o) => sel.has(o.id));
        const items: CanvasObjectData[] = objs.map(({ id: _id, ...rest }) => rest);
        const payload = JSON.stringify({ v: 1 as const, items });
        void navigator.clipboard.writeText(`${CANVAS_CLIPBOARD_PREFIX}${payload}`);
      }
    };
    const handlePaste = (e: ClipboardEvent) => {
      if (isExternalTextInputFocused()) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.startsWith(CANVAS_CLIPBOARD_PREFIX)) return;
      e.preventDefault();
      let items: CanvasObjectData[];
      try {
        const data = JSON.parse(text.slice(CANVAS_CLIPBOARD_PREFIX.length)) as {
          v?: number;
          items?: CanvasObjectData[];
        };
        if (data?.v !== 1 || !Array.isArray(data.items) || data.items.length === 0) return;
        items = data.items;
      } catch {
        return;
      }
      const newObjects: CanvasObject[] = items.map((item) => ({
        ...item,
        id: Math.random().toString(36).slice(2, 11),
      }));
      const { x: cx, y: cy } = getViewportCenterCanvas();
      const placed = centerObjectsInCanvas(newObjects, cx, cy);
      setCanvasObjects((prev) => [...prev, ...placed]);
      setSelectedIds(new Set(placed.map((p) => p.id)));
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const removeGeneratorObject = (objectId: string) => {
    generatorInputRefs.current.delete(objectId);
    setCanvasObjects((prev) => prev.filter((o) => o.id !== objectId));
    setSelectedIds((sel) => {
      if (!sel.has(objectId)) return sel;
      const next = new Set(sel);
      next.delete(objectId);
      return next;
    });
  };

  const submitImageGenerator = async (objectId: string) => {
    const el = generatorInputRefs.current.get(objectId);
    const html = el?.innerHTML ?? "";
    if (!richHasContent(html)) {
      toast("请先输入图片描述。");
      return;
    }
    if (creditBalance < PRECHECK_CANVAS_IMAGE) {
      toast(
        `积分不足。画布生图预计至少需要 ${PRECHECK_CANVAS_IMAGE} 积分（按多张 MB 预留），请稍后再试或升级。`
      );
      return;
    }
    const prompt = htmlToPlainText(html);
    const skillMeta = getEditorSkillById(selectedSkillRef.current);
    const skillPayload = skillMeta
      ? {
          id: skillMeta.id,
          title: skillMeta.title,
          description: skillMeta.description,
        }
      : null;
    const chipUrls = extractRefImageSrcsFromUserHtml(html);
    const referenceImageUrl = chipUrls[0] ?? null;
    const imageSize = inferOpenAiGenerationSize(prompt);
    setCanvasGenBusyId(objectId);
    try {
      const { url, billedBytes } = await generateImageWithPrompt({
        prompt,
        skill: null,
        referenceImageUrl,
        imageSize,
        imageModel: selectedImageModelRef.current,
      });
      const cost = creditsForImageBytes(billedBytes ?? 0);
      if (!tryConsumeCreditsRef.current(cost)) {
        toast("生成已完成，但积分不足以支付，请充值后继续使用。");
      }
      addImageToCanvas(url, { centerInViewport: true });
      removeGeneratorObject(objectId);
      setActiveTool("select");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      setCanvasGenBusyId(null);
    }
  };

  const submitVideoGenerator = async (objectId: string) => {
    const el = generatorInputRefs.current.get(objectId);
    const html = el?.innerHTML ?? "";
    const plain = htmlToPlainText(html).trim();
    const prompt =
      plain.length > 0
        ? `【视频生成】${plain}`
        : "【视频生成】电影感场景，16:9，动态构图，光影明确。";
    const skillMeta = getEditorSkillById(selectedSkillRef.current);
    const skillPayload = skillMeta
      ? {
          id: skillMeta.id,
          title: skillMeta.title,
          description: skillMeta.description,
        }
      : null;
    const chipUrls = extractRefImageSrcsFromUserHtml(html);
    const referenceImageUrl = chipUrls[0] ?? null;
    const videoBill = creditsForVideoSeconds(DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS);
    if (creditBalance < videoBill) {
      toast(
        `积分不足。视频按 ${DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS} 秒估算需 ${videoBill} 积分（${creditsForVideoSeconds(1)}/秒）。`
      );
      return;
    }
    setCanvasGenBusyId(objectId);
    try {
      const { url } = await generateVideoWithPrompt({
        prompt,
        skill: null,
        referenceImageUrl,
        videoModel: selectedVideoModelRef.current,
        durationSeconds: DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS,
        /** 分辨率交由后端按 prompt 自动推断：默认 480P，用户明确要求时升档 */
        resolution: null,
      });
      if (!tryConsumeCreditsRef.current(videoBill)) {
        toast("生成已完成，但积分不足以支付，请充值后继续使用。");
      }
      const w = 800 * CANVAS_U;
      const h = 450 * CANVAS_U;
      const { x: cx, y: cy } = getViewportCenterCanvas();
      const newId = Math.random().toString(36).slice(2, 11);
      setCanvasObjects((prev) => [
        ...prev,
        {
          id: newId,
          type: "video",
          x: cx - w / 2,
          y: cy - h / 2,
          width: w,
          height: h,
          content: url,
        },
      ]);
      setSelectedIds(new Set([newId]));
      removeGeneratorObject(objectId);
      setActiveTool("select");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      setCanvasGenBusyId(null);
    }
  };

  const handleNewChat = () => {
    try {
      saveChatThreadJson(chatSessionId, JSON.stringify(messagesRef.current));
      if (messagesRef.current.length > 0) {
        const u = messagesRef.current.find((m) => m.role === "user");
        upsertSessionIndex({
          id: chatSessionId,
          title: u
            ? htmlToPlainText(u.content).trim().slice(0, 36) || "新对话"
            : "新对话",
          updatedAt: Date.now(),
          ...(projectId?.trim()
            ? { projectId: projectId.trim() }
            : {}),
        });
      }
    } catch {
      /* ignore */
    }
    const pid = projectId?.trim();
    creagicPlanReadyRef.current = false;
    lastAssistantImageUrlRef.current = null;
    messagesRef.current = [];
    setMessages([]);
    setActiveTags([]);
    if (chatInputRef.current) chatInputRef.current.innerHTML = "";
    setChatHasContent(false);
    setIsHistoryOpen(false);

    if (pid) {
      const newSid = crypto.randomUUID();
      try {
        localStorage.setItem(CREAGIC_SESSION_LS_KEY, newSid);
      } catch {
        /* ignore */
      }
      setChatSessionId(newSid);
      try {
        saveChatThreadJson(newSid, "[]");
        upsertSessionIndex({
          id: newSid,
          title: "新对话",
          updatedAt: Date.now(),
          projectId: pid,
        });
      } catch {
        /* ignore */
      }
      void fetch("/api/creagic/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: newSid, user_id: "local" }),
      });
      return;
    }

    const nid = newCreagicSessionId();
    setChatSessionId(nid);
    void fetch("/api/creagic/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: nid, user_id: "local" }),
    });
  };

  const applyCtaToChatInput = (text: string) => {
    const el = chatInputRef.current;
    const trimmed = text.trim();
    const autoSubmit =
      !isAITyping && isShortAffirmToGenerateImage(trimmed);
    if (el) {
      el.textContent = text;
      setChatHasContent(richHasContent(el.innerHTML));
      if (!autoSubmit) {
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    if (autoSubmit) {
      queueMicrotask(() => handleSendMessageRef.current?.(trimmed));
    }
  };

  const handleCancelInFlightChat = useCallback(() => {
    if (!inFlightAiMsgIdRef.current) return;
    chatFlyAbortRef.current?.abort();
    chatFlyAbortRef.current = null;
    if (chatThinkingIntervalRef.current != null) {
      clearInterval(chatThinkingIntervalRef.current);
      chatThinkingIntervalRef.current = null;
    }
    const id = inFlightAiMsgIdRef.current;
    inFlightAiMsgIdRef.current = null;
    if (id) {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) {
          messagesRef.current = prev;
          return prev;
        }
        const m = prev[idx];
        const next = [...prev];
        next[idx] = {
          ...m,
          thinking: m.thinking
            ? { ...m.thinking, isComplete: true, phase: undefined }
            : undefined,
          tools: m.tools?.map((t) => ({
            ...t,
            status: "complete" as const,
          })),
          content: `<p class="text-sm text-neutral-500">已停止生成</p>`,
        };
        messagesRef.current = next;
        return next;
      });
    }
    if (editorMountedRef.current) {
      setIsAITyping(false);
    }
  }, []);

  const handleRegenerateMessageImages = useCallback(
    async (msg: Message) => {
      const meta = msg.imageRegen;
      if (!meta?.prompts.length || !msg.id) return;
      if (regenerateBusyId || isAITyping) {
        if (isAITyping) toast("请等待当前回复完成后再试。");
        return;
      }
      const n = meta.prompts.length;
      const minNeed = n * CREDITS_PER_IMAGE;
      if (creditBalance < minNeed) {
        toast(
          `积分不足。重新生成约需 ${minNeed} 积分（${n}×${CREDITS_PER_IMAGE}）。`
        );
        return;
      }
      setRegenerateBusyId(msg.id);
      const skillMeta = getEditorSkillById(selectedSkillRef.current);
      const skillPayload = skillMeta
        ? {
            id: skillMeta.id,
            title: skillMeta.title,
            description: skillMeta.description,
          }
        : null;
      try {
        const urls: string[] = [];
        for (let i = 0; i < n; i++) {
          const p = meta.prompts[i]!;
          const imageSize =
            meta.imageSize ?? inferOpenAiGenerationSize(p);
          const { url, billedBytes } = await generateImageWithPrompt({
            prompt: p,
            skill: null,
            referenceImageUrl:
              i === 0 ? meta.referenceImageUrl ?? undefined : undefined,
            imageSize,
            imageModel: meta.imageModel,
          });
          urls.push(url);
          const cost = creditsForImageBytes(billedBytes ?? 0);
          if (!tryConsumeCreditsRef.current(cost)) {
            toast("积分不足，已停止继续生成。");
            break;
          }
          addImageToCanvas(url, {
            centerInViewport: i === urls.length - 1,
          });
          lastAssistantImageUrlRef.current = url;
        }
        if (!urls.length) return;
        setMessages((prev) => {
          const next = prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  images: urls.length > 1 ? urls : undefined,
                  image: urls[urls.length - 1]!,
                  imageRegen: meta,
                }
              : m
          );
          messagesRef.current = next;
          return next;
        });
        queueMicrotask(() => {
          void syncCreagicServerMessages(chatSessionId, messagesRef.current);
        });
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e));
      } finally {
        setRegenerateBusyId(null);
      }
    },
    [
      regenerateBusyId,
      isAITyping,
      creditBalance,
      chatSessionId,
      toast,
      addImageToCanvas,
    ]
  );

  const handleSendMessage = (textOverride?: string) => {
    const html = textOverride ?? chatInputRef.current?.innerHTML ?? "";
    if (!richHasContent(html) || isAITyping || chatSubmitLockRef.current) return;
    chatSubmitLockRef.current = true;

    const userContent = collapseConsecutiveDuplicateUserBlocks(html);
    const userPlain = htmlToPlainText(userContent);
    const priorThread = messagesRef.current;
    const priorImageKeywordTurns = countPriorImageKeywordUserTurns(
      priorThread,
      richHasContent,
      htmlToPlainText
    );

    const ac = new AbortController();
    chatFlyAbortRef.current = ac;
    const { signal } = ac;

    void (async () => {
      const refChipsEarly = extractRefImageSrcsFromUserHtml(userContent);
      const hasRef = refChipsEarly.length > 0;

      const panelIdxForStoryboard =
        parseRequestedStoryboardPanelIndex(userPlain);
      const wantsSinglePanelStoryboardRef =
        userWantsSingleStoryboardPanelReference(userPlain);
      const storyboardPanelUrlsForRef = wantsSinglePanelStoryboardRef
        ? findLastAssistantStoryboardImageUrls(priorThread)
        : null;
      const storyboardPanelRefUrlEarly =
        wantsSinglePanelStoryboardRef && panelIdxForStoryboard
          ? storyboardPanelUrlsForRef?.[panelIdxForStoryboard - 1] ?? null
          : null;

      const userMessage: Message = { role: "user", content: userContent };
      setReplyTypewriterMsgId(null);
      const aiMsgId = Math.random().toString(36).slice(2, 11);
      /** 先展示「思考中」；意图路由完成后再挂上具体 pipeline（文生图 / 对话 / 编排等） */
      const initialAIMessage: Message = {
        id: aiMsgId,
        role: "ai",
        content: "",
        thinking: { duration: 0, isComplete: false, phase: "thinking" },
        tools: [{ name: "意图识别", status: "loading" }],
      };

      inFlightAiMsgIdRef.current = aiMsgId;

      const apiMessages: ChatApiMessage[] = [];
      for (const m of priorThread) {
        if (m.role === "user" && richHasContent(m.content)) {
          apiMessages.push({ role: "user", content: htmlToPlainText(m.content) });
        } else if (m.role === "ai" && m.content?.trim()) {
          apiMessages.push({
            role: "assistant",
            content: htmlToPlainText(m.content),
          });
        }
      }
      apiMessages.push({ role: "user", content: userPlain });

      const nextThread = [...priorThread, userMessage, initialAIMessage];
      messagesRef.current = nextThread;
      setMessages(nextThread);

      if (chatInputRef.current) chatInputRef.current.innerHTML = "";
      setChatHasContent(false);
      setIsAITyping(true);

      const patchAi = (fn: (m: Message) => Message) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === aiMsgId);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = fn(next[idx]);
          messagesRef.current = next;
          return next;
        });
      };

      /** 完成时用时间差写入 duration；勿每秒 patchAi，否则会整表重渲染并清空文本划选 */
      const thinkingStartedAtMs = Date.now();
      const elapsedThinkingSeconds = () =>
        Math.max(0, Math.round((Date.now() - thinkingStartedAtMs) / 1000));
      if (chatThinkingIntervalRef.current != null) {
        clearInterval(chatThinkingIntervalRef.current);
        chatThinkingIntervalRef.current = null;
      }

      const dropAssistantPlaceholder = () => {
        chatFlyAbortRef.current?.abort();
        chatFlyAbortRef.current = null;
        inFlightAiMsgIdRef.current = null;
        if (chatThinkingIntervalRef.current != null) {
          clearInterval(chatThinkingIntervalRef.current);
          chatThinkingIntervalRef.current = null;
        }
        messagesRef.current = priorThread;
        setMessages(priorThread);
        if (editorMountedRef.current) {
          setIsAITyping(false);
        }
      };

      if (wantsSinglePanelStoryboardRef && !storyboardPanelRefUrlEarly) {
        patchAi((m) => ({
          ...m,
          thinking: { duration: 0, isComplete: true, phase: undefined },
          tools: [{ name: "分镜参考", status: "complete" }],
          content: formatAiReplyToHtml(
            `<p class="text-sm text-amber-800">未找到第 <strong>${
              panelIdxForStoryboard ?? "?"
            }</strong> 格对应的分镜图：请先在对话里<strong>生成分镜静帧组图</strong>，再基于某一格继续生成。</p>`
          ),
        }));
        setIsAITyping(false);
        chatSubmitLockRef.current = false;
        inFlightAiMsgIdRef.current = null;
        chatFlyAbortRef.current = null;
        return;
      }

      let imageIntent = false;
      let useQuickChat = false;
      let promptForImage = userPlain;
      let routedAsImageGenOnly = false;
      let intentRouteMode: RouteIntentMode | null = null;
      try {
        const route = await routeUserIntent(
          {
            userText: userPlain,
            hasReferenceImage:
              hasRef || Boolean(storyboardPanelRefUrlEarly),
            hasPriorGeneratedImage: Boolean(lastAssistantImageUrlRef.current),
          },
          { signal }
        );
        intentRouteMode = route.mode;
        {
          // 意图路由的 optimized_prompt 经常与用户原意不一致；生图/编辑仅认用户输入，路由只用于 mode
          const userCore =
            stripRefChipPlainNoise(userPlain) || userPlain.trim();
          promptForImage =
            userCore ||
            (hasRef
              ? "【仅有参考图、无文字说明】请忠实保留参考图主体与风格，可做高清或小幅延展，不要更换题材"
              : userPlain.trim());
        }
        if (route.mode === "video" || route.mode === "plan") {
          imageIntent = false;
          useQuickChat = false;
        } else         if (route.mode === "image_gen" || route.mode === "image_edit") {
          imageIntent = true;
          if (route.mode === "image_gen") {
            routedAsImageGenOnly = true;
          }
        }
        if (route.mode === "chat") {
          imageIntent = false;
          const sm = getEditorSkillById(selectedSkillRef.current);
          const wf = sm?.workflow;
          /** 关闭深度思考 = 快速模式（快聊）；开启后按技能工作流决定是否仍可走快聊 */
          if (!deepThinkRef.current) {
            useQuickChat = true;
          } else if (!selectedSkillRef.current) {
            useQuickChat = false;
          } else if (wf?.allowQuickChat === true) {
            useQuickChat = true;
          } else if (wf?.forceOrchestration === false) {
            useQuickChat = true;
          } else {
            useQuickChat = false;
          }
        }
      } catch {
        if (!signal.aborted) {
          imageIntent = shouldUseImagePipeline(userPlain, {
            creagicPlanReadyForImage: creagicPlanReadyRef.current,
            priorImageKeywordTurns,
          });
          if (!imageIntent && isVideoPrimaryRequest(userPlain)) {
            intentRouteMode = "video";
          }
        }
      }

      const explicitStaticImage =
        /要一张|来一张|生成.{0,4}图|出图|文生图|画一张|来张|海报|主视觉|关键帧|概念图|封面图|首帧|静帧|静态图|效果图|生成一[只个条张幅]|画一[只个条张幅]|来一[只个条张幅]/i.test(
          userPlain
        );
      /** “视频封面 / B站封面”等是静态图，不应被 video 路由吞掉 */
      const staticCoverLike = /(?:视频|b站|bilibili|抖音|小红书)?\s*(?:封面|封面图|头图)/i.test(
        userPlain
      );
      const clearTimelineVideoAsk = /分镜|脚本|时长|镜头|转场|配音|旁白|剪辑|导出视频|mp4|动效|逐帧|短片|宣传片/i.test(
        userPlain
      );
      if (staticCoverLike && !clearTimelineVideoAsk) {
        imageIntent = true;
        useQuickChat = false;
        intentRouteMode = null;
      }

      let storyboardBatchShots: string[] | null = null;
      const lastAssistantPlainForBatch = (() => {
        for (let i = priorThread.length - 1; i >= 0; i--) {
          const row = priorThread[i];
          if (row.role === "ai" && row.content?.trim()) {
            return htmlToPlainText(row.content);
          }
        }
        return "";
      })();
      if (
        !wantsSinglePanelStoryboardRef &&
        userWantsStoryboardBatchImages(userPlain)
      ) {
        const numbered = extractNumberedShotsFromAssistantText(
          lastAssistantPlainForBatch
        );
        if (numbered.length >= 2) {
          storyboardBatchShots = numbered;
          imageIntent = true;
          useQuickChat = false;
          intentRouteMode = null;
        } else {
          /** 未识别到多条编号分镜时仍生图：走单张文生图，用上条助手正文 + 用户话综合 prompt */
          imageIntent = true;
          useQuickChat = false;
          intentRouteMode = null;
          promptForImage = buildMergedImagePromptFromAssistant(
            lastAssistantPlainForBatch,
            userPlain
          );
        }
      }

      /** 上文已谈到可生图，用户短句「生成吧」等 → 直接文生图，并从上一则助手正文抽 prompt */
      if (
        !storyboardBatchShots &&
        isShortAffirmToGenerateImage(userPlain) &&
        (assistantOfferedOrPreparedImageGeneration(lastAssistantPlainForBatch) ||
          creagicPlanReadyRef.current)
      ) {
        imageIntent = true;
        useQuickChat = false;
        intentRouteMode = null;
        routedAsImageGenOnly = false;
        promptForImage = buildMergedImagePromptFromAssistant(
          lastAssistantPlainForBatch,
          userPlain
        );
      }

      /**
       * 智能编排兜底：若当前命中「视觉跟进」且上一轮已处于生图语境，
       * 则强制改走生图管线，避免“调整色调/换风格”被继续当作编排文本处理。
       */
      const hasRecentImageGenerationContext =
        Boolean(lastAssistantImageUrlRef.current) ||
        /已生成|文生图完成|下载链接|已同步到画布|关键帧|静帧|png|jpg|jpeg|webp|图片已生成/i.test(
          lastAssistantPlainForBatch
        );
      const shouldForceImageByContext =
        !imageIntent &&
        !wantsSinglePanelStoryboardRef &&
        !userWantsStoryboardBatchImages(userPlain) &&
        !isDirectVideoGenerationRequest(userPlain) &&
        hasRecentImageGenerationContext &&
        looksLikeVisualFollowUp(userPlain) &&
        !wantsLongPlanningOnly(userPlain);
      if (shouldForceImageByContext) {
        imageIntent = true;
        useQuickChat = false;
        intentRouteMode = null;
        routedAsImageGenOnly = true;
        promptForImage = buildMergedImagePromptFromAssistant(
          lastAssistantPlainForBatch,
          userPlain
        );
      }

      /** 基于「第 N 格分镜图」单张衍生：将该格静帧 URL 作为 referenceImageUrl，prompt 用去掉格序套话后的画面需求 */
      if (wantsSinglePanelStoryboardRef && storyboardPanelRefUrlEarly) {
        imageIntent = true;
        useQuickChat = false;
        intentRouteMode = null;
        routedAsImageGenOnly = true;
        const stripped = stripStoryboardPanelDirectiveForImagePrompt(userPlain);
        promptForImage =
          stripped.length >= 4 ? stripped : userPlain.trim();
      }

      /**
       * 路由器常把「生成一条小狗」等判成 plan/chat，随后编排/快聊用助手长文当生图 prompt，与用户短句无关。
       * 本地已识别为单轮出图、且非分镜批量、非「仅确认生成」类短句时，强制直出图并只用用户原文（去 chip 噪声）。
       */
      if (
        (intentRouteMode === "plan" ||
          intentRouteMode === "chat" ||
          useQuickChat) &&
        shouldUseImagePipeline(userPlain, {
          creagicPlanReadyForImage: creagicPlanReadyRef.current,
          priorImageKeywordTurns,
        }) &&
        !isVideoPrimaryRequest(userPlain) &&
        !userWantsStoryboardBatchImages(userPlain) &&
        !wantsSinglePanelStoryboardRef &&
        !storyboardBatchShots &&
        !isShortAffirmToGenerateImage(userPlain)
      ) {
        imageIntent = true;
        useQuickChat = false;
        intentRouteMode = null;
        routedAsImageGenOnly = true;
        const userCore =
          stripRefChipPlainNoise(userPlain) || userPlain.trim();
        promptForImage =
          userCore ||
          (hasRef
            ? "【仅有参考图、无文字说明】请忠实保留参考图主体与风格，可做高清或小幅延展，不要更换题材"
            : userPlain.trim());
      }

      if (
        routedAsImageGenOnly &&
        imageIntent &&
        selectedSkillRef.current &&
        !explicitStaticImage &&
        !storyboardBatchShots &&
        !wantsSinglePanelStoryboardRef
      ) {
        const sm = getEditorSkillById(selectedSkillRef.current);
        /** 仅当 manifest 显式 skipDirectImageWhenRouted:true 时先对话；默认仍直出图（避免「已给提示词却只说在生成」） */
        if (sm?.workflow?.skipDirectImageWhenRouted === true) {
          imageIntent = false;
          if (import.meta.env.DEV) {
            console.info(
              "[creagic] skipDirectImageWhenRouted：技能 %s 本回合改为对话编排（非直出图）",
              selectedSkillRef.current ?? ""
            );
          }
        }
      }

      /** 明确「生视频 / 生成短片」等：直连 /api/videos，不走仅文字编排 */
      const directVideoIntent =
        !storyboardBatchShots && isDirectVideoGenerationRequest(userPlain);
      if (directVideoIntent) {
        imageIntent = false;
        useQuickChat = false;
        intentRouteMode = "video";
      }

      if (
        imageIntent &&
        !(storyboardBatchShots && storyboardBatchShots.length >= 2) &&
        !directVideoIntent &&
        (!userWantsStoryboardBatchImages(userPlain) ||
          wantsSinglePanelStoryboardRef)
      ) {
        const hasRecentImageContextForEditFollow =
          Boolean(lastAssistantImageUrlRef.current) ||
          /已生成|文生图完成|下载链接|已同步到画布|关键帧|静帧|png|jpg|jpeg|webp|图片已生成/i.test(
            lastAssistantPlainForBatch
          );
        const editFollow =
          (Boolean(lastAssistantImageUrlRef.current) &&
            looksLikeImageEditFollowUp(userPlain)) ||
          (hasRecentImageContextForEditFollow &&
            looksLikeVisualFollowUp(userPlain));
        if (
          !isEligibleForDirectImageGeneration(userPlain, {
            hasReferenceImage:
              hasRef || Boolean(storyboardPanelRefUrlEarly),
            treatAsImageEditFollowUp: editFollow,
          })
        ) {
          imageIntent = false;
        } else if (
          hasRecentImageContextForEditFollow &&
          !hasRef &&
          !lastAssistantImageUrlRef.current &&
          looksLikeVisualFollowUp(userPlain)
        ) {
          // 上一轮是“生图语境”但缺少可编辑 URL 时，合并上文语义，避免退回编排
          promptForImage = buildMergedImagePromptFromAssistant(
            lastAssistantPlainForBatch,
            userPlain
          );
        }
      }

      const sidechatPipeline = resolveSidechatPipeline({
        imageIntent,
        useQuickChat,
        intentRouteMode,
      });

      const mayAutoKeyframe =
        !directVideoIntent &&
        !imageIntent &&
        !useQuickChat &&
        shouldAutoKeyframeAfterStoryboardChat({
          sidechatPipeline,
          userPlain,
        });

      if (signal.aborted || !editorMountedRef.current) {
        dropAssistantPlaceholder();
        return;
      }

      const batchPanelCount = storyboardBatchShots?.length ?? 0;
      const sidechatImageCount =
        imageIntent &&
        !(storyboardBatchShots && storyboardBatchShots.length >= 2)
          ? wantsSinglePanelStoryboardRef
            ? 1
            : inferRequestedImageCountFromPlain(userPlain)
          : 1;
      const videoBillPrecheck = creditsForVideoSeconds(
        DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS
      );
      const minCredits =
        directVideoIntent
          ? Math.max(CREDITS_PER_CHAT_ROUND, videoBillPrecheck)
          : batchPanelCount >= 2
            ? PRECHECK_IMAGE_SIDECHAT * Math.min(batchPanelCount, 10)
            : imageIntent || mayAutoKeyframe
              ? PRECHECK_IMAGE_SIDECHAT * Math.min(sidechatImageCount, 10)
              : CREDITS_PER_CHAT_ROUND;
      if (creditBalance < minCredits) {
        toast(
          directVideoIntent
            ? `积分不足。生成视频约需 ${videoBillPrecheck} 积分（按 ${DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS}s 估算），请充值后再试。`
            : batchPanelCount >= 2
            ? `积分不足。批量分镜约 ${Math.min(batchPanelCount, 10)} 张图，请至少保留约 ${minCredits} 积分。`
            : imageIntent || mayAutoKeyframe
              ? `积分不足。本回合生图按约 ${Math.min(sidechatImageCount, 10)} 张预留，请至少保留约 ${minCredits} 积分。`
              : `积分不足。每轮对话消耗 ${CREDITS_PER_CHAT_ROUND} 积分。`
        );
        dropAssistantPlaceholder();
        return;
      }

      patchAi((m) => ({
        ...m,
        pipeline: sidechatPipeline,
        multiStage:
          imageIntent || useQuickChat || directVideoIntent
            ? undefined
            : {
                phase: "intent",
                pipelineT0: Date.now(),
              },
        tools:
          storyboardBatchShots && storyboardBatchShots.length >= 2
            ? [
                {
                  name: `分镜批量 · ${storyboardBatchShots.length} 格`,
                  status: "loading",
                },
              ]
            : directVideoIntent
              ? [{ name: "视频生成", status: "loading" }]
              : imageIntent
                ? [
                    { name: "解析创意与参考", status: "loading" },
                    { name: "图像模型渲染", status: "loading" },
                  ]
                : [
                    {
                      name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                      status: "loading",
                    },
                  ],
      }));

      void (async () => {
        try {
          const skillMeta = getEditorSkillById(selectedSkillRef.current);
          const skillPayload = skillMeta
            ? {
                id: skillMeta.id,
                title: skillMeta.title,
                description: skillMeta.description,
              }
            : null;

        if (storyboardBatchShots && storyboardBatchShots.length >= 2) {
          const refChips = extractRefImageSrcsFromUserHtml(userContent);
          const batchRefUrl: string | null = refChips[0] ?? null;
          const n = storyboardBatchShots.length;
          const urls: string[] = [];
          const regenPrompts: string[] = [];
          const batchPromptLines = storyboardBatchShots
            .map((shot, idx) => `${idx + 1}. ${shot}`)
            .join("\n");
          const batchPrompt = [
            `请一次性生成 ${n} 张分镜关键帧静图（严格按镜头编号顺序输出）。`,
            "全组要求：统一视觉风格、叙事连贯、电影感、宽画幅、单幅构图清晰、无字幕条与界面装饰。",
            "镜头清单：",
            batchPromptLines,
          ].join("\n");
          const batchRegenPrompts = storyboardBatchShots.map((shot, si) =>
            `【分镜静帧 ${si + 1}/${n}】${shot}\n统一视觉风格、叙事连贯、电影感，宽画幅单幅构图清晰，无字幕条与界面装饰。`.slice(
              0,
              3800
            )
          );

          patchAi((m) => ({
            ...m,
            thinking: m.thinking
              ? { ...m.thinking, phase: "generating", isComplete: false }
              : {
                  duration: elapsedThinkingSeconds(),
                  isComplete: false,
                  phase: "generating",
                },
            imageGenerationExpected: n,
            images: [],
            tools: [
              {
                name: `分镜批量 · 一次生成 ${n} 格`,
                status: "loading",
              },
            ],
          }));

          let usedSingleBatchCall = false;
          try {
            const batchRes = await generateImageWithPrompt(
              {
                prompt: batchPrompt.slice(0, 7800),
                skill: null,
                referenceImageUrl: batchRefUrl,
                userPlainForSizeHint: userPlainSizeHint(userPlain),
                imageModel: selectedImageModelRef.current,
                imageCount: n,
                imageAspectBucket: inferAspectBucketForUser(userPlain),
              },
              {
                signal,
                timeoutMs: Math.min(900_000, Math.max(120_000, 180_000 * n)),
              }
            );
            const got = [
              ...(Array.isArray(batchRes.urls) ? batchRes.urls : []),
              ...(batchRes.url ? [batchRes.url] : []),
            ].filter((u, i, arr) => Boolean(u) && arr.indexOf(u) === i);
            if (got.length >= n) {
              usedSingleBatchCall = true;
              urls.push(...got.slice(0, n));
              regenPrompts.push(...batchRegenPrompts);
              patchAi((m) => ({
                ...m,
                images: [...urls],
                image: urls[urls.length - 1]!,
                imageGenerationExpected: undefined,
              }));
              const billedEach = Math.max(
                1,
                Math.round((batchRes.billedBytes ?? 0) / n)
              );
              for (let i = 0; i < urls.length; i++) {
                const u = urls[i]!;
                lastAssistantImageUrlRef.current = u;
                const imgCost = creditsForImageBytes(billedEach);
                if (!tryConsumeCreditsRef.current(imgCost)) {
                  toast(
                    `第 ${i + 1} 格已生成，但当前积分不足以扣费，请充值后再继续批量出图。`
                  );
                }
                addImageToCanvas(u, { centerInViewport: i === urls.length - 1 });
              }
            }
          } catch {
            // 单次批量失败：自动回退逐格，确保功能可用
          }

          if (!usedSingleBatchCall) {
            for (let si = 0; si < n; si++) {
              if (signal.aborted || !editorMountedRef.current) return;
              const shot = storyboardBatchShots[si];
              const prompt = `【分镜静帧 ${si + 1}/${n}】${shot}\n统一视觉风格、叙事连贯、电影感，宽画幅单幅构图清晰，无字幕条与界面装饰。`;
              regenPrompts.push(prompt.slice(0, 3800));
              patchAi((m) => ({
                ...m,
                thinking: m.thinking
                  ? { ...m.thinking, phase: "generating", isComplete: false }
                  : {
                      duration: elapsedThinkingSeconds(),
                      isComplete: false,
                      phase: "generating",
                    },
                imageGenerationExpected: n,
                tools: [
                  {
                    name: `分镜批量 · ${si + 1}/${n}`,
                    status: "loading",
                  },
                ],
              }));
              const { url, billedBytes } = await generateImageWithPrompt(
                {
                  prompt: prompt.slice(0, 3800),
                  skill: null,
                  referenceImageUrl: si === 0 ? batchRefUrl : null,
                  userPlainForSizeHint: userPlainSizeHint(userPlain),
                  imageModel: selectedImageModelRef.current,
                  imageAspectBucket: inferAspectBucketForUser(userPlain),
                },
                { signal, timeoutMs: 180_000 }
              );
              if (signal.aborted || !editorMountedRef.current) return;
              urls.push(url);
              lastAssistantImageUrlRef.current = url;
              patchAi((m) => ({
                ...m,
                images: [...urls],
                image: url,
                imageGenerationExpected: n,
              }));
              const imgCost = creditsForImageBytes(billedBytes ?? 0);
              if (!tryConsumeCreditsRef.current(imgCost)) {
                toast(
                  `第 ${si + 1} 格已生成，但当前积分不足以扣费，请充值后再继续批量出图。`
                );
              }
              addImageToCanvas(url, {
                centerInViewport: si === n - 1,
              });
            }
          }
          if (chatThinkingIntervalRef.current != null) {
            clearInterval(chatThinkingIntervalRef.current);
            chatThinkingIntervalRef.current = null;
          }
          if (signal.aborted || !editorMountedRef.current) return;
          patchAi((m) => ({
            ...m,
            thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
            imageGenerationExpected: undefined,
            tools: [
              {
                name: `分镜批量 · ${n} 格已完成`,
                status: "complete",
              },
              {
                name: batchRefUrl ? "参考图：已带入（首格）" : "参考图：未带入",
                status: "complete",
              },
            ],
            content: formatAiReplyToHtml(
              `已根据上一则分镜脚本顺序生成 **${urls.length}** 张静帧，并已加入画布。可点击预览继续调整某一格，或在对话里指定「第 X 格改成…」。`
            ),
            images: urls,
            image: urls[urls.length - 1],
            imageRegen: {
              prompts: regenPrompts,
              imageModel: selectedImageModelRef.current,
              referenceImageUrl: batchRefUrl,
            },
            ctas: undefined,
          }));
          setReplyTypewriterMsgId(aiMsgId);
          creagicPlanReadyRef.current = false;
          queueMicrotask(() => {
            void syncCreagicServerMessages(chatSessionId, messagesRef.current);
          });
        } else if (directVideoIntent) {
          const refChips = extractRefImageSrcsFromUserHtml(userContent);
          const referenceImageUrl = refChips[0] ?? null;
          const videoPrompt =
            promptForImage?.trim() && promptForImage !== userPlain
              ? `【视频生成】${promptForImage.slice(0, 3500)}`
              : `【视频生成】${userPlain.slice(0, 3500)}`;
          const videoBill = creditsForVideoSeconds(
            DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS
          );
          patchAi((m) => ({
            ...m,
            thinking: m.thinking
              ? { ...m.thinking, phase: "generating", isComplete: false }
              : {
                  duration: elapsedThinkingSeconds(),
                  isComplete: false,
                  phase: "generating",
                },
            tools: [{ name: "视频生成", status: "loading" }],
          }));
          try {
            const { url } = await generateVideoWithPrompt(
              {
                prompt: videoPrompt,
                skill: null,
                referenceImageUrl,
                videoModel: selectedVideoModelRef.current,
                durationSeconds: DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS,
                resolution: null,
              },
              { signal }
            );
            if (signal.aborted || !editorMountedRef.current) return;
            if (chatThinkingIntervalRef.current != null) {
              clearInterval(chatThinkingIntervalRef.current);
              chatThinkingIntervalRef.current = null;
            }
            if (!tryConsumeCreditsRef.current(videoBill)) {
              toast("视频已生成，但当前积分不足以支付，请充值。");
            }
            const w = 800 * CANVAS_U;
            const h = 450 * CANVAS_U;
            const { x: cx, y: cy } = getViewportCenterCanvas();
            const newId = Math.random().toString(36).slice(2, 11);
            setCanvasObjects((prev) => [
              ...prev,
              {
                id: newId,
                type: "video",
                x: cx - w / 2,
                y: cy - h / 2,
                width: w,
                height: h,
                content: url,
              },
            ]);
            setSelectedIds(new Set([newId]));
            patchAi((m) => ({
              ...m,
              thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
              tools: [{ name: "视频生成完成", status: "complete" }],
              content: formatAiReplyToHtml(
                "已根据你的描述生成视频，并添加到画布。可继续说明风格、时长或画幅。"
              ),
              videoUrl: url,
            }));
          } catch (e) {
            if (chatThinkingIntervalRef.current != null) {
              clearInterval(chatThinkingIntervalRef.current);
              chatThinkingIntervalRef.current = null;
            }
            const err = e instanceof Error ? e.message : String(e);
            toast(err);
            patchAi((m) => ({
              ...m,
              thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
              tools: [
                {
                  name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                  status: "complete",
                },
              ],
              content: formatAiReplyToHtml(
                `<p class="text-sm text-red-600">${escapeHtmlText(err)}</p>`
              ),
            }));
          }
          setReplyTypewriterMsgId(aiMsgId);
          creagicPlanReadyRef.current = false;
          queueMicrotask(() => {
            void syncCreagicServerMessages(chatSessionId, messagesRef.current);
          });
        } else if (imageIntent) {
          const refChips = extractRefImageSrcsFromUserHtml(userContent);
          let referenceImageUrl: string | null = refChips[0] ?? null;
          let referenceSource: "chip" | "last" | "storyboard" | "none" =
            referenceImageUrl ? "chip" : "none";
          if (
            !referenceImageUrl &&
            wantsSinglePanelStoryboardRef &&
            storyboardPanelRefUrlEarly
          ) {
            referenceImageUrl = storyboardPanelRefUrlEarly;
            referenceSource = "storyboard";
          }
          if (
            !referenceImageUrl &&
            lastAssistantImageUrlRef.current &&
            looksLikeImageEditFollowUp(userPlain)
          ) {
            referenceImageUrl = lastAssistantImageUrlRef.current;
            referenceSource = "last";
          }
          const referenceDebugLabel = referenceImageUrl
            ? referenceSource === "chip"
              ? "参考图：已带入（来源：上传/预设）"
              : referenceSource === "storyboard"
                ? `参考图：已带入（分镜第 ${
                    panelIdxForStoryboard ?? "?"
                  } 格静帧）`
              : "参考图：已带入（来源：上一张生成图）"
            : "参考图：未带入";
          const imagePromptForApi = directUserImagePrompt(promptForImage);
          const userHint = userPlainSizeHint(userPlain);
          const aspectBucket = inferAspectBucketForUser(userPlain);
          const imageSizeUsed = resolveImageGenerationSizeForRequest({
            prompt: imagePromptForApi,
            userPlainForSizeHint: userHint,
          });
          patchAi((m) => ({
            ...m,
            tools: [
              { name: "解析创意与参考", status: "complete" },
              { name: "图像模型渲染", status: "loading" },
              { name: referenceDebugLabel, status: "loading" },
            ],
          }));
          patchAi((m) => ({
            ...m,
            thinking: m.thinking
              ? { ...m.thinking, phase: "generating", isComplete: false }
              : {
                  duration: elapsedThinkingSeconds(),
                  isComplete: false,
                  phase: "generating",
                },
          }));
          const { url, urls: multiUrls, billedBytes } =
            await generateImageWithPrompt(
              {
                prompt: imagePromptForApi,
                skill: null,
                referenceImageUrl,
                userPlainForSizeHint: userHint,
                imageAspectBucket: aspectBucket,
                imageModel: selectedImageModelRef.current,
                imageCount: sidechatImageCount,
              },
              { signal }
            );
          if (chatThinkingIntervalRef.current != null) {
            clearInterval(chatThinkingIntervalRef.current);
            chatThinkingIntervalRef.current = null;
          }
          if (signal.aborted || !editorMountedRef.current) return;
          const urlsOut = multiUrls ?? [url];
          lastAssistantImageUrlRef.current = urlsOut[urlsOut.length - 1] ?? url;
          const nOut = urlsOut.length;
          const baseAlign = referenceImageUrl
            ? nOut > 1
              ? `已结合参考图与你的说明生成 ${nOut} 张图，并添加到画布。可继续说明要改的细节或比例。`
              : referenceSource === "storyboard"
                ? `已结合分镜第 ${
                    panelIdxForStoryboard ?? "?"
                  } 格参考图与你的画面要求生成新图，并添加到画布。可继续说明要改的细节或比例。`
                : "已结合参考图与你的说明生成新图，并添加到画布。可继续说明要改的细节或比例。"
            : nOut > 1
              ? `已根据你的描述生成 ${nOut} 张图，并添加到画布。你可继续让我改风格、比例或细节。`
              : "已根据你的描述生成图片，并添加到画布。你可继续让我改风格、比例或细节。";
          patchAi((m) => ({
            ...m,
            thinking: {
              duration: elapsedThinkingSeconds(),
              isComplete: true,
              phase: undefined,
            },
            tools: [
              { name: "解析创意与参考", status: "complete" },
              { name: "图像模型渲染", status: "complete" },
              { name: referenceDebugLabel, status: "complete" },
              { name: "已同步到画布", status: "complete" },
            ],
            content: formatAiReplyToHtml(baseAlign),
            image: urlsOut[0]!,
            images: nOut > 1 ? urlsOut : undefined,
            imageRegen: {
              prompts: Array.from({ length: nOut }, () => imagePromptForApi),
              imageModel: selectedImageModelRef.current,
              referenceImageUrl,
              imageSize: imageSizeUsed,
              imageAspectBucket: aspectBucket ?? undefined,
            },
            ctas: undefined,
          }));
          setReplyTypewriterMsgId(aiMsgId);
          creagicPlanReadyRef.current = false;
          urlsOut.forEach((u, idx) => {
            addImageToCanvas(u, { centerInViewport: idx === 0 });
          });
          const imgCost = creditsForImageBytes(billedBytes ?? 0);
          const totalRound = creditsForChatRound() + imgCost;
          if (!tryConsumeCreditsRef.current(totalRound)) {
            toast("生成已完成，但当前积分不足以全额支付，请充值后继续畅用。");
          }
          queueMicrotask(() => {
            void syncCreagicServerMessages(chatSessionId, messagesRef.current);
          });
        } else if (useQuickChat) {
          const baseChat = {
            messages: apiMessages,
            referenceImageUrls: refChipsEarly,
            skill: skillPayload,
            sessionId: chatSessionId,
            userId: "local" as const,
            deepThink: deepThinkRef.current,
          };
          const data = await sendChatCompletion(
            { ...baseChat, quickChat: true },
            { signal }
          );
          if (chatThinkingIntervalRef.current != null) {
            clearInterval(chatThinkingIntervalRef.current);
            chatThinkingIntervalRef.current = null;
          }
          if (signal.aborted || !editorMountedRef.current) return;
          const cleaned =
            data.type === "task_plan"
              ? [
                  data.message || "我已为你规划多图任务。",
                  data.plan?.summary ? `\n${data.plan.summary}` : "",
                  Array.isArray(data.plan?.tasks) && data.plan!.tasks!.length > 0
                    ? `\n\n任务清单：\n${data.plan!.tasks!
                        .slice(0, 8)
                        .map((t, i) => `${i + 1}. ${String(t?.label || "未命名任务")}`)
                        .join("\n")}`
                    : "",
                ].join("")
              : data.content ?? "";
          const ctas = Array.isArray(data.ctas)
            ? (data.ctas as string[]).filter(
                (x): x is string => typeof x === "string" && x.trim().length > 0
              )
            : [];
          const quickPlan = data.creagic?.plan as
            | { ready_for_image?: boolean }
            | undefined;
          const quickPlanReady = Boolean(quickPlan?.ready_for_image);
          creagicPlanReadyRef.current = quickPlanReady;
          const quickAssistantPlain = htmlToPlainText(cleaned);
          const quickPromisedToGenerate =
            ASSISTANT_PROMISED_IMAGE_GENERATION_RE.test(quickAssistantPlain);
          const quickTimelineVideoAsk =
            /分镜|脚本|镜头|时长|转场|配音|旁白|剪辑|导出视频|mp4|动效|逐帧|短片|宣传片/i.test(
              userPlain
            );
          const ctaAsksGenerateQuick = ctas.some((c) =>
            /确认生成|就按此生成|开始出图|立刻生成|马上出图/i.test(c.trim())
          );
          const quickUserExplicit = userAskedExplicitImageGeneration(userPlain);
          const quickForceGenerateByUserText =
            quickUserExplicit ||
            isShortAffirmToGenerateImage(userPlain) ||
            /^(请)?(直接)?(现在|马上|立刻)?\s*(生成|出图|画|来一张)/i.test(
              userPlain.trim()
            );
          const shouldQuickAutoImage =
            data.source !== "agent" &&
            quickForceGenerateByUserText &&
            !quickTimelineVideoAsk &&
            (quickPromisedToGenerate ||
              assistantOfferedOrPreparedImageGeneration(quickAssistantPlain) ||
              quickPlanReady ||
              ctaAsksGenerateQuick ||
              // 兜底：用户已明确说“生成XX”，即便助手本轮没回“可生成”话术也应直接出图
              quickForceGenerateByUserText);
          const generateCtaStripReQuick =
            /确认生成|就按此生成|开始出图|立刻生成|马上出图|开始生成/i;
          const ctasForUiQuick =
            shouldQuickAutoImage && ctas.length > 0
              ? ctas.filter((c) => !generateCtaStripReQuick.test(c.trim()))
              : ctas;
          const ctasOutQuick =
            ctasForUiQuick.length > 0 ? ctasForUiQuick : undefined;

          patchAi((m) => ({
            ...m,
            thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
            tools: [
              { name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline], status: "complete" },
            ],
            content: formatAiReplyToHtml(cleaned),
            ctas: ctasOutQuick,
          }));
          if (shouldQuickAutoImage) {
            const imagePromptForApi = directUserImagePrompt(
              buildMergedImagePromptFromAssistant(
                quickAssistantPlain,
                userPlain
              )
            );
            const refChips = extractRefImageSrcsFromUserHtml(userContent);
            const referenceImageUrl = refChips[0] ?? null;
            const userHintQ = userPlainSizeHint(userPlain);
            const aspectBucketQ = inferAspectBucketForUser(userPlain);
            const imageSizeUsedQ = resolveImageGenerationSizeForRequest({
              prompt: imagePromptForApi,
              userPlainForSizeHint: userHintQ,
            });
            const quickImgCount = inferRequestedImageCountFromPlain(userPlain);
            try {
              patchAi((m) => ({
                ...m,
                tools: [
                  {
                    name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                    status: "complete",
                  },
                  { name: "正在文生图", status: "loading" },
                ],
                thinking: m.thinking
                  ? { ...m.thinking, phase: "generating", isComplete: false }
                  : {
                      duration: elapsedThinkingSeconds(),
                      isComplete: false,
                      phase: "generating",
                    },
              }));
              const { url, urls: qMulti, billedBytes } =
                await generateImageWithPrompt(
                  {
                    prompt: imagePromptForApi,
                    skill: null,
                    referenceImageUrl,
                    userPlainForSizeHint: userHintQ,
                    imageAspectBucket: aspectBucketQ,
                    imageModel: selectedImageModelRef.current,
                    imageCount: quickImgCount,
                  },
                  { signal }
                );
              if (signal.aborted || !editorMountedRef.current) return;
              const qList = qMulti ?? [url];
              lastAssistantImageUrlRef.current =
                qList[qList.length - 1] ?? url;
              patchAi((m) => ({
                ...m,
                image: qList[0]!,
                images: qList.length > 1 ? qList : undefined,
                imageRegen: {
                  prompts: Array.from({ length: qList.length }, () =>
                    imagePromptForApi
                  ),
                  imageModel: selectedImageModelRef.current,
                  referenceImageUrl,
                  imageSize: imageSizeUsedQ,
                  imageAspectBucket: aspectBucketQ ?? undefined,
                },
                content: formatAiReplyToHtml(cleaned),
                thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
                tools: [
                  {
                    name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                    status: "complete",
                  },
                  { name: "文生图完成", status: "complete" },
                ],
              }));
              qList.forEach((u, idx) => {
                addImageToCanvas(u, { centerInViewport: idx === 0 });
              });
              const imgCost = creditsForImageBytes(billedBytes ?? 0);
              if (!tryConsumeCreditsRef.current(imgCost)) {
                toast("图片已生成，但当前积分不足以支付生图费用，请充值。");
              }
            } catch (e) {
              const errMsg =
                e instanceof Error
                  ? e.message
                  : "补偿生图失败，请稍后再试或查看积分与模型权限。";
              toast(
                errMsg
              );
              patchAi((m) => ({
                ...m,
                content: formatAiReplyToHtml(
                  `已尝试立即生成图片，但本次生图失败：${errMsg}\n\n请切换一个可用图像模型后重试（例如 V_2 / FLUX 系列），或直接说“换模型后重新生成”。`
                ),
                thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
                tools: [
                  {
                    name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                    status: "complete",
                  },
                ],
              }));
            }
          }
          setReplyTypewriterMsgId(aiMsgId);
          if (!tryConsumeCreditsRef.current(creditsForChatRound())) {
            toast("回复已完成，但当前积分不足，请充值。");
          }
          queueMicrotask(() => {
            void syncCreagicServerMessages(chatSessionId, messagesRef.current);
          });
        } else {
          const prior: {
            intent?: string;
            opening?: string;
            analysis?: string;
          } = {};
          const baseChat = {
            messages: apiMessages,
            referenceImageUrls: refChipsEarly,
            skill: skillPayload,
            sessionId: chatSessionId,
            userId: "local" as const,
            deepThink: deepThinkRef.current,
          };

          const clearThinkingTimer = () => {
            if (chatThinkingIntervalRef.current != null) {
              clearInterval(chatThinkingIntervalRef.current);
              chatThinkingIntervalRef.current = null;
            }
          };

          const finishFromFinalResponse = async (
            data: ChatResponseBody,
            analyzeFocus: "image" | "requirement"
          ) => {
            clearThinkingTimer();
            if (signal.aborted || !editorMountedRef.current) return;

            const cleaned = data.content ?? "";
            const finalText =
              data.type === "task_plan"
                ? [
                    data.message || "我已为你规划多图任务。",
                    data.plan?.summary ? `\n${data.plan.summary}` : "",
                    Array.isArray(data.plan?.tasks) && data.plan!.tasks!.length > 0
                      ? `\n\n任务清单：\n${data.plan!.tasks!
                          .slice(0, 8)
                          .map((t, i) => `${i + 1}. ${String(t?.label || "未命名任务")}`)
                          .join("\n")}`
                      : "",
                  ].join("")
                : cleaned;
            const ctas = Array.isArray(data.ctas)
              ? (data.ctas as string[]).filter(
                  (x): x is string =>
                    typeof x === "string" && x.trim().length > 0
                )
              : [];
            const plan = data.creagic?.plan as
              | { ready_for_image?: boolean }
              | undefined;
            creagicPlanReadyRef.current = Boolean(plan?.ready_for_image);

            const assistantPlain = htmlToPlainText(cleaned);
            const assistantPromisedToGenerate =
              ASSISTANT_PROMISED_IMAGE_GENERATION_RE.test(assistantPlain);
            const userExplicitImage = userAskedExplicitImageGeneration(userPlain);
            const hasStoryboardOrTimelineIntent =
              /分镜|脚本|镜头|时长|转场|配音|旁白|剪辑|导出视频|mp4|动效|逐帧|短片|宣传片/i.test(
                userPlain
              );
            const ctaAsksGenerate = ctas.some((c) =>
              /确认生成|就按此生成|开始出图|立刻生成|马上出图/i.test(c.trim())
            );
            const forceGenerateByUserText =
              userExplicitImage ||
              isShortAffirmToGenerateImage(userPlain) ||
              /^(请)?(直接)?(现在|马上|立刻)?\s*(生成|出图|画|来一张)/i.test(
                userPlain.trim()
              );
            /** 编排结束时：已具备出图条件则自动调用文生图（含「确认生成」类 CTA），无需再点一次发送 */
            const shouldAutoGenerateImage =
              data.source !== "agent" &&
              forceGenerateByUserText &&
              !hasStoryboardOrTimelineIntent &&
              (assistantPromisedToGenerate ||
                assistantOfferedOrPreparedImageGeneration(assistantPlain) ||
                creagicPlanReadyRef.current ||
                ctaAsksGenerate ||
                // 兜底：用户明确要求生成图时直接生图，避免只回复“正在生成”但没有图片
                forceGenerateByUserText);
            const generateCtaStripRe =
              /确认生成|就按此生成|开始出图|立刻生成|马上出图|开始生成/i;
            const ctasForUi =
              shouldAutoGenerateImage && ctas.length > 0
                ? ctas.filter((c) => !generateCtaStripRe.test(c.trim()))
                : ctas;
            const ctasOut =
              ctasForUi.length > 0 ? ctasForUi : undefined;

            patchAi((m) => ({
              ...m,
              thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
              tools: [
                {
                  name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                  status: "complete",
                },
              ],
              multiStage: {
                phase: "done",
                pipelineT0: m.multiStage?.pipelineT0 ?? Date.now(),
                analyzeFocus,
              },
              content: formatAiReplyToHtml(finalText),
              ctas: ctasOut,
            }));

            if (shouldAutoGenerateImage) {
              const imagePromptForApi = directUserImagePrompt(
                buildMergedImagePromptFromAssistant(assistantPlain, userPlain)
              );
              const refChips = extractRefImageSrcsFromUserHtml(userContent);
              const referenceImageUrl = refChips[0] ?? null;
              const userHintA = userPlainSizeHint(userPlain);
              const aspectBucketA = inferAspectBucketForUser(userPlain);
              const imageSizeUsedA = resolveImageGenerationSizeForRequest({
                prompt: imagePromptForApi,
                userPlainForSizeHint: userHintA,
              });
              try {
                patchAi((m) => ({
                  ...m,
                  tools: [
                    {
                      name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                      status: "complete",
                    },
                    { name: "正在文生图", status: "loading" },
                  ],
                  thinking: m.thinking
                    ? { ...m.thinking, phase: "generating", isComplete: false }
                    : {
                        duration: elapsedThinkingSeconds(),
                        isComplete: false,
                        phase: "generating",
                      },
                }));
                const { url, billedBytes } = await generateImageWithPrompt(
                  {
                    prompt: imagePromptForApi,
                    skill: null,
                    referenceImageUrl,
                    userPlainForSizeHint: userHintA,
                    imageAspectBucket: aspectBucketA,
                    imageModel: selectedImageModelRef.current,
                  },
                  { signal }
                );
                if (signal.aborted || !editorMountedRef.current) return;
                lastAssistantImageUrlRef.current = url;
                patchAi((m) => ({
                  ...m,
                  image: url,
                  imageRegen: {
                    prompts: [imagePromptForApi],
                    imageModel: selectedImageModelRef.current,
                    referenceImageUrl,
                    imageSize: imageSizeUsedA,
                    imageAspectBucket: aspectBucketA ?? undefined,
                  },
                  content: formatAiReplyToHtml(cleaned),
                  thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
                  tools: [
                    {
                      name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                      status: "complete",
                    },
                    { name: "文生图完成", status: "complete" },
                  ],
                }));
                addImageToCanvas(url, { centerInViewport: true });
                const imgCost = creditsForImageBytes(billedBytes ?? 0);
                if (!tryConsumeCreditsRef.current(imgCost)) {
                  toast("图片已生成，但当前积分不足以支付生图费用，请充值。");
                }
              } catch (e) {
                toast(
                  e instanceof Error
                    ? e.message
                    : "补偿生图失败，请稍后再试或查看积分与模型权限。"
                );
                patchAi((m) => ({
                  ...m,
                  thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
                  tools: [
                    {
                      name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                      status: "complete",
                    },
                  ],
                }));
              }
            }

            if (
              shouldAutoKeyframeAfterStoryboardChat({
                sidechatPipeline,
                userPlain,
              })
            ) {
              const prompt = directUserImagePrompt(
                buildMergedImagePromptFromAssistant(assistantPlain, userPlain)
              );
              const refChips = extractRefImageSrcsFromUserHtml(userContent);
              const referenceImageUrl = refChips[0] ?? null;
              const userHintKf = userPlainSizeHint(userPlain);
              const aspectBucketKf = inferAspectBucketForUser(userPlain);
              const imageSizeUsedKf = resolveImageGenerationSizeForRequest({
                prompt: prompt.slice(0, 3800),
                userPlainForSizeHint: userHintKf,
              });
              try {
                patchAi((m) => ({
                  ...m,
                  tools: [
                    { name: "关键帧绘制", status: "loading" },
                  ],
                }));
                patchAi((m) => ({
                  ...m,
                  thinking: m.thinking
                    ? { ...m.thinking, phase: "generating", isComplete: false }
                    : {
                        duration: elapsedThinkingSeconds(),
                        isComplete: false,
                        phase: "generating",
                      },
                }));
                const { url, billedBytes } = await generateImageWithPrompt(
                  {
                    prompt: prompt.slice(0, 3800),
                    skill: null,
                    referenceImageUrl,
                    userPlainForSizeHint: userHintKf,
                    imageAspectBucket: aspectBucketKf,
                    imageModel: selectedVideoModelRef.current,
                  },
                  { signal }
                );
                if (signal.aborted || !editorMountedRef.current) return;
                lastAssistantImageUrlRef.current = url;
                patchAi((m) => ({
                  ...m,
                  image: url,
                  imageRegen: {
                    prompts: [prompt.slice(0, 3800)],
                    imageModel: selectedVideoModelRef.current,
                    referenceImageUrl,
                    imageSize: imageSizeUsedKf,
                    imageAspectBucket: aspectBucketKf ?? undefined,
                  },
                  content: formatAiReplyToHtml(cleaned),
                  thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
                  tools: [
                    {
                      name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                      status: "complete",
                    },
                    { name: "关键帧", status: "complete" },
                  ],
                }));
                addImageToCanvas(url, { centerInViewport: true });
                const imgCost = creditsForImageBytes(billedBytes ?? 0);
                if (!tryConsumeCreditsRef.current(imgCost)) {
                  toast(
                    "关键帧已生成，但当前积分不足以支付生图费用，请充值。"
                  );
                }
              } catch {
                patchAi((m) => ({
                  ...m,
                  thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
                  tools: [
                    {
                      name: SIDECHAT_PIPELINE_LABEL[sidechatPipeline],
                      status: "complete",
                    },
                  ],
                }));
              }
            }

            setReplyTypewriterMsgId(aiMsgId);
            if (!tryConsumeCreditsRef.current(creditsForChatRound())) {
              toast("回复已完成，但当前积分不足，请充值。");
            }
            queueMicrotask(() => {
              void syncCreagicServerMessages(chatSessionId, messagesRef.current);
            });
          };

          const fastLane = isConcreteCreativeBrief(userPlain);
          const skipAnalyze = shouldSkipOrchestrationAnalyze(userPlain);

          if (fastLane) {
            const data = await sendChatCompletion({ ...baseChat }, { signal });
            if (signal.aborted || !editorMountedRef.current) {
              clearThinkingTimer();
              return;
            }
            await finishFromFinalResponse(
              data,
              pickAnalyzeFocus(userPlain, creagicPlanReadyRef.current)
            );
          } else {
            const dIntent = await sendChatCompletion(
              {
                ...baseChat,
                orchestrationStage: "intent",
              },
              { signal }
            );
            if (signal.aborted || !editorMountedRef.current) {
              clearThinkingTimer();
              return;
            }
            prior.intent = (dIntent.content ?? "").trim();

            const dOpen = await sendChatCompletion(
              {
                ...baseChat,
                orchestrationStage: "opening",
                priorPipelineOutputs: { intent: prior.intent },
              },
              { signal }
            );
            if (signal.aborted || !editorMountedRef.current) {
              clearThinkingTimer();
              return;
            }
            prior.opening = (dOpen.content ?? "").trim();

            const analyzeFocus = pickAnalyzeFocus(
              userPlain,
              creagicPlanReadyRef.current
            );

            if (!skipAnalyze) {
              const dAnalyze = await sendChatCompletion(
                {
                  ...baseChat,
                  orchestrationStage: "analyze",
                  analyzeFocus,
                  priorPipelineOutputs: {
                    intent: prior.intent,
                    opening: prior.opening,
                  },
                },
                { signal }
              );
              if (signal.aborted || !editorMountedRef.current) {
                clearThinkingTimer();
                return;
              }
              prior.analysis = (dAnalyze.content ?? "").trim();
            } else {
              prior.analysis = "";
            }

            const data = await sendChatCompletion(
              { ...baseChat, priorPipelineOutputs: prior },
              { signal }
            );
            if (signal.aborted || !editorMountedRef.current) {
              clearThinkingTimer();
              return;
            }
            await finishFromFinalResponse(data, analyzeFocus);
          }
        }
      } catch (e) {
        if (chatThinkingIntervalRef.current != null) {
          clearInterval(chatThinkingIntervalRef.current);
          chatThinkingIntervalRef.current = null;
        }
        const aborted =
          signal.aborted ||
          (e instanceof DOMException && e.name === "AbortError") ||
          (e instanceof Error && e.name === "AbortError");
        if (aborted || !editorMountedRef.current) {
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        patchAi((m) => ({
          ...m,
          thinking: { duration: elapsedThinkingSeconds(), isComplete: true, phase: undefined },
          tools: [
            {
              name: m.pipeline
                ? SIDECHAT_PIPELINE_LABEL[m.pipeline]
                : SIDECHAT_PIPELINE_LABEL.chat,
              status: "complete",
            },
          ],
          multiStage: m.multiStage
            ? { ...m.multiStage, phase: "done" }
            : undefined,
          content: `<p class="text-sm text-red-600">${escapeHtmlText(msg)}</p>`,
          ctas: undefined,
        }));
      } finally {
        inFlightAiMsgIdRef.current = null;
        if (editorMountedRef.current) {
          setIsAITyping(false);
        }
        chatSubmitLockRef.current = false;
      }
    })();
    })().catch((e) => {
      if (chatThinkingIntervalRef.current != null) {
        clearInterval(chatThinkingIntervalRef.current);
        chatThinkingIntervalRef.current = null;
      }
      inFlightAiMsgIdRef.current = null;
      chatFlyAbortRef.current = null;
      if (editorMountedRef.current) {
        setIsAITyping(false);
      }
      chatSubmitLockRef.current = false;
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[chat] outer send flow failed:", msg);
      toast(msg || "请求异常，已恢复输入状态");
    });
  };
  handleSendMessageRef.current = handleSendMessage;

  // Canvas Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isZoomDragging) return;

    cancelPendingObjectDrag();
    
    const { x, y } = getCanvasPoint(e.clientX, e.clientY);

    if (activeTool === "text") {
      const newId = Math.random().toString(36).substr(2, 9);
      setCanvasObjects(prev => [...prev, {
        id: newId,
        type: 'text',
        x,
        y,
        width: 220 * CANVAS_U,
        height: 56 * CANVAS_U,
        content: '点击输入文字',
        color: '#000000'
      }]);
      setSelectedIds(new Set([newId]));
      setActiveTool("select");
      return;
    }

    if (activeTool === "shape" && selectedShape) {
      e.preventDefault();
      setShapeDrawRect({ ax: x, ay: y, bx: x, by: y });
      return;
    }

    if (activeTool === "pencil") {
      const newId = Math.random().toString(36).slice(2, 11);
      pencilDrawingIdRef.current = newId;
      pencilDrawingActiveRef.current = true;
      const sw = pencilStrokeWidth * CANVAS_U;
      const pad = sw / 2 + 2;
      const payload: DrawingPayload = {
        strokeWidth: sw,
        points: [[x, y]],
      };
      const b = bboxFromPoints(payload.points, pad);
      setCanvasObjects((prev) => [
        ...prev,
        {
          id: newId,
          type: "drawing",
          x: b.x,
          y: b.y,
          width: b.w,
          height: b.h,
          color: pencilColor,
          content: JSON.stringify(payload),
        },
      ]);
      return;
    }

    if (activeTool === "mark") {
      const hit = [...canvasObjects].reverse().find((obj) => {
        if (obj.type !== "image" && obj.type !== "video") return false;
        const b = getCanvasObjectAabb(obj);
        return x >= b.ox && x <= b.ox + b.w && y >= b.oy && y <= b.oy + b.h;
      });

      if (!hit) return;

      const newId = Math.random().toString(36).substr(2, 9);
      const markNumber = canvasObjects.filter(o => o.type === 'mark').length + 1;
      setCanvasObjects(prev => [...prev, {
        id: newId,
        type: 'mark',
        x,
        y,
        content: markNumber.toString()
      }]);
      
      // Insert tag into contentEditable
      if (chatInputRef.current) {
        const tagHtml = `
          <span contenteditable="false" class="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-0.5 shadow-sm mx-1 align-middle" data-tag-id="${newId}">
            <span class="h-5 w-5 rounded-full overflow-hidden border border-neutral-100 flex">
              <img src="${hit.content}" class="h-full w-full object-cover" />
            </span>
            <span class="flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[8px] font-bold text-white">
              ${markNumber}
            </span>
          </span>&nbsp;`;
        
        chatInputRef.current.focus();
        document.execCommand('insertHTML', false, tagHtml);
      }
      
      setActiveTool("select");
      return;
    }

    if (activeTool === "pan") {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    if (activeTool === "select") {
      const hit = [...canvasObjects].reverse().find((obj) => {
        if (obj.type === "drawing") {
          return pointNearDrawing(x, y, obj);
        }
        if (obj.type === "image-gen" || obj.type === "video-gen") {
          const w =
            obj.width ??
            (obj.type === "image-gen" ? 600 * CANVAS_U : 800 * CANVAS_U);
          const h =
            obj.height ??
            (obj.type === "image-gen" ? 600 * CANVAS_U : 450 * CANVAS_U);
          return x >= obj.x && x <= obj.x + w && y >= obj.y && y <= obj.y + h;
        }
        const { ox, oy, w, h } = getCanvasObjectAabb(obj);
        return x >= ox && x <= ox + w && y >= oy && y <= oy + h;
      });
      if (hit) {
        let nextGroup: Set<string>;
        if (selectedIds.has(hit.id) && selectedIds.size > 1) {
          nextGroup = new Set(selectedIds);
        } else {
          nextGroup = new Set([hit.id]);
          setSelectedIds(nextGroup);
        }
        objectDragGroupRef.current = nextGroup;
        setObjectDragStart({ x, y });
        objectPointerDownRef.current = true;
        objectDragClientStartRef.current = { x: e.clientX, y: e.clientY };
        const refUrl = canvasObjectToReferenceImageUrl(hit);
        if (refUrl) {
          canvasRefImagePointerRef.current = {
            objectId: hit.id,
            url: refUrl,
            sx: e.clientX,
            sy: e.clientY,
          };
        } else {
          canvasRefImagePointerRef.current = null;
          setPendingRefImageObjectId(null);
          const input = chatInputRef.current;
          if (input) {
            input
              .querySelectorAll("[data-pending-ref-chip]")
              .forEach((n) => n.parentNode?.removeChild(n));
            setChatHasContent(richHasContent(input.innerHTML));
          }
        }
        return;
      }
      canvasRefImagePointerRef.current = null;
      setPendingRefImageObjectId(null);
      const inputClear = chatInputRef.current;
      if (inputClear) {
        inputClear
          .querySelectorAll("[data-pending-ref-chip]")
          .forEach((n) => n.parentNode?.removeChild(n));
        setChatHasContent(richHasContent(inputClear.innerHTML));
      }
      setMarquee({ ax: x, ay: y, bx: x, by: y });
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isZoomDragging && zoomTrackRef.current) {
      const rect = zoomTrackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const newZoom = 0.1 + percent * (2.0 - 0.1);
      setZoom(newZoom);
      return;
    }

    const { x, y } = getCanvasPoint(e.clientX, e.clientY);

    if (shapeDrawRectRef.current) {
      setShapeDrawRect((r) => (r ? { ...r, bx: x, by: y } : null));
      return;
    }

    if (pencilDrawingActiveRef.current && pencilDrawingIdRef.current) {
      const id = pencilDrawingIdRef.current;
      setCanvasObjects((prev) =>
        prev.map((obj) => {
          if (obj.id !== id || obj.type !== "drawing") return obj;
          const d = parseDrawing(obj);
          if (!d) return obj;
          const last = d.points[d.points.length - 1];
          if (last && last[0] === x && last[1] === y) return obj;
          const points = [...d.points, [x, y] as [number, number]];
          const pad = d.strokeWidth / 2 + 2;
          const b = bboxFromPoints(points, pad);
          const payload: DrawingPayload = { strokeWidth: d.strokeWidth, points };
          return {
            ...obj,
            x: b.x,
            y: b.y,
            width: b.w,
            height: b.h,
            content: JSON.stringify(payload),
          };
        })
      );
      return;
    }

    if (
      activeTool === "select" &&
      objectPointerDownRef.current &&
      !isDraggingObject &&
      objectDragClientStartRef.current
    ) {
      const p0 = objectDragClientStartRef.current;
      const ddx = e.clientX - p0.x;
      const ddy = e.clientY - p0.y;
      if (ddx * ddx + ddy * ddy >= OBJECT_DRAG_THRESHOLD_PX * OBJECT_DRAG_THRESHOLD_PX) {
        objectDragSyncRef.current = true;
        setIsDraggingObject(true);
      }
    }

    if (marqueeRef.current) {
      setMarquee((m) => (m ? { ...m, bx: x, by: y } : null));
      return;
    }

    if (isResizingObject && resizeSessionRef.current) {
      const s = resizeSessionRef.current;
      const minW = 48 * CANVAS_U;
      const minH = 32 * CANVAS_U;
      const sw = s.startW;
      const sh = s.startH;
      const ox = s.startObjX;
      const oy = s.startObjY;
      const px0 = s.pointerStartX;
      const py0 = s.pointerStartY;
      const hnd = s.handle;
      const isCorner = hnd === "nw" || hnd === "ne" || hnd === "sw" || hnd === "se";
      const aspect = sh / Math.max(sw, 1);
      const lockAspect = Boolean(s.lockAspect);

      let newX = ox;
      let newY = oy;
      let newW = sw;
      let newH = sh;

      if (isCorner) {
        if (hnd === "se") {
          newW = Math.max(minW, x - ox);
          newH = Math.max(minH, newW * aspect);
          newX = ox;
          newY = oy;
        } else if (hnd === "sw") {
          newW = Math.max(minW, ox + sw - x);
          newH = Math.max(minH, newW * aspect);
          newX = ox + sw - newW;
          newY = oy;
        } else if (hnd === "ne") {
          newW = Math.max(minW, x - ox);
          newH = Math.max(minH, newW * aspect);
          newX = ox;
          newY = oy + sh - newH;
        } else if (hnd === "nw") {
          newW = Math.max(minW, ox + sw - x);
          newH = Math.max(minH, newW * aspect);
          newX = ox + sw - newW;
          newY = oy + sh - newH;
        }
      } else {
        newX = ox;
        newY = oy;
        newW = sw;
        newH = sh;
        if (hnd === "e") newW = Math.max(minW, sw + (x - px0));
        if (hnd === "w") {
          const dw = x - px0;
          newW = Math.max(minW, sw - dw);
          newX = ox + (sw - newW);
        }
        if (hnd === "s") newH = Math.max(minH, sh + (y - py0));
        if (hnd === "n") {
          const dh = y - py0;
          newH = Math.max(minH, sh - dh);
          newY = oy + (sh - newH);
        }

        if (lockAspect) {
          // 仅边缘拖拽时也保持等比：让选框始终贴合图片实际画面，不出现上下/左右留白
          if (hnd === "e" || hnd === "w") {
            newH = Math.max(minH, newW * aspect);
            newY = oy + (sh - newH) / 2;
          } else if (hnd === "n" || hnd === "s") {
            newW = Math.max(minW, newH / Math.max(aspect, 1e-6));
            newX = ox + (sw - newW) / 2;
          }
        }
      }

      setCanvasObjects((prev) =>
        prev.map((obj) => {
          if (obj.id !== s.objectId) return obj;
          if (
            obj.type === "drawing" &&
            s.drawingPoints &&
            s.drawingPoints.length > 0 &&
            s.drawingStrokeWidth != null
          ) {
            const sx = newW / Math.max(sw, 1e-6);
            const sy = newH / Math.max(sh, 1e-6);
            const points = s.drawingPoints.map(
              ([pbx, pby]) =>
                [newX + (pbx - ox) * sx, newY + (pby - oy) * sy] as [number, number]
            );
            const scaleStroke = isCorner ? sx : Math.sqrt(sx * sy);
            const newSw = Math.max(0.5, s.drawingStrokeWidth * scaleStroke);
            const pad = newSw / 2 + 2;
            const b = bboxFromPoints(points, pad);
            return {
              ...obj,
              x: b.x,
              y: b.y,
              width: b.w,
              height: b.h,
              content: JSON.stringify({
                strokeWidth: newSw,
                points,
              }),
            };
          }
          return { ...obj, x: newX, y: newY, width: newW, height: newH };
        })
      );
      return;
    }

    if (isDraggingObject && objectDragGroupRef.current.size > 0) {
      const ids = objectDragGroupRef.current;
      if (objectDragSyncRef.current) {
        setObjectDragStart({ x, y });
        objectDragSyncRef.current = false;
        return;
      }
      const dx = x - objectDragStart.x;
      const dy = y - objectDragStart.y;
      setCanvasObjects((prev) =>
        prev.map((obj) => {
          if (!ids.has(obj.id)) return obj;
          if (obj.type === "drawing") {
            const d = parseDrawing(obj);
            if (!d) return { ...obj, x: obj.x + dx, y: obj.y + dy };
            const points = d.points.map(
              ([px, py]) => [px + dx, py + dy] as [number, number]
            );
            const pad = d.strokeWidth / 2 + 2;
            const b = bboxFromPoints(points, pad);
            return {
              ...obj,
              x: b.x,
              y: b.y,
              width: b.w,
              height: b.h,
              content: JSON.stringify({
                strokeWidth: d.strokeWidth,
                points,
              }),
            };
          }
          return { ...obj, x: obj.x + dx, y: obj.y + dy };
        })
      );
      setObjectDragStart({ x, y });
      return;
    }

    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const ptr = canvasRefImagePointerRef.current;
    canvasRefImagePointerRef.current = null;
    if (
      ptr &&
      activeToolRef.current === "select" &&
      !isDraggingObject &&
      ptr.url
    ) {
      const dx = e.clientX - ptr.sx;
      const dy = e.clientY - ptr.sy;
      if (dx * dx + dy * dy < 10 * 10) {
        const el = chatInputRef.current;
        if (el) {
          el.querySelectorAll("[data-pending-ref-chip]").forEach((n) => {
            n.parentNode?.removeChild(n);
          });
          el.insertAdjacentHTML(
            "afterbegin",
            buildPendingRefChipHtmlFromUrl(ptr.url)
          );
          setChatHasContent(richHasContent(el.innerHTML));
        }
        setPendingRefImageObjectId(ptr.objectId);
      }
    }

    /** 侧栏划选复制时 mouseup 会冒泡到根节点；画布无进行中交互时不应批量 setState，否则会打断选中态 */
    const canvasInteractionActive =
      Boolean(shapeDrawRectRef.current) ||
      Boolean(marqueeRef.current) ||
      Boolean(resizeSessionRef.current) ||
      pencilDrawingActiveRef.current ||
      isDragging ||
      isDraggingObject ||
      isResizingObject ||
      isZoomDragging;

    if (!canvasInteractionActive) {
      cancelPendingObjectDrag();
      return;
    }

    const sd = shapeDrawRectRef.current;
    if (sd) {
      setShapeDrawRect(null);
      const st = selectedShapeRef.current;
      if (st && activeToolRef.current === "shape") {
        const rw = Math.abs(sd.bx - sd.ax);
        const rh = Math.abs(sd.by - sd.ay);
        if (rw >= 4 * CANVAS_U && rh >= 4 * CANVAS_U) {
          const rx = Math.min(sd.ax, sd.bx);
          const ry = Math.min(sd.ay, sd.by);
          const newId = Math.random().toString(36).substr(2, 9);
          setCanvasObjects((prev) => [
            ...prev,
            {
              id: newId,
              type: "shape",
              x: rx,
              y: ry,
              width: rw,
              height: rh,
              shapeType: st,
              color: "#94a3b8",
              cornerRadius: SHAPE_DEFAULT_CORNER_RADIUS,
              ...(st.startsWith("text-") ? { content: "文本" } : {}),
            },
          ]);
          setSelectedIds(new Set([newId]));
          setActiveTool("select");
        }
      }
    }

    const m = marqueeRef.current;
    if (m) {
      setMarquee(null);
      const rw = Math.abs(m.bx - m.ax);
      const rh = Math.abs(m.by - m.ay);
      if (rw < 4 * CANVAS_U && rh < 4 * CANVAS_U) {
        setSelectedIds(new Set());
      } else {
        const rx = Math.min(m.ax, m.bx);
        const ry = Math.min(m.ay, m.by);
        const picked = canvasObjectsRef.current
          .filter((obj) => {
            const b = getCanvasObjectAabb(obj);
            return aabbIntersects(rx, ry, rw, rh, b.ox, b.oy, b.w, b.h);
          })
          .map((o) => o.id);
        setSelectedIds(new Set(picked));
      }
    }
    setIsDragging(false);
    setIsDraggingObject(false);
    setIsResizingObject(false);
    resizeSessionRef.current = null;
    cancelPendingObjectDrag();
    setIsZoomDragging(false);
    pencilDrawingActiveRef.current = false;
    pencilDrawingIdRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(prev * delta, 0.1));
  };

  const handleZoomMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomDragging(true);
    if (zoomTrackRef.current) {
      const rect = zoomTrackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const newZoom = 0.1 + percent * (2.0 - 0.1);
      setZoom(newZoom);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex bg-white text-neutral-900 overflow-hidden"
    >
      <input
        ref={unifiedMediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          handleUnifiedMediaFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {imageToolbarViewport &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[220]"
            style={{
              left: imageToolbarViewport.cx,
              top: imageToolbarViewport.top,
              transform: "translate(-50%, calc(-100% - 10px))",
            }}
          >
            <div className="pointer-events-auto">
              <ImageSelectionToolbar
                onAction={(id) => handleImageToolbarAction(id)}
              />
            </div>
          </div>,
          document.body
        )}
      {imageEditSession && (
        <ImageObjectEditOverlays
          session={imageEditSession}
          rect={imageEditRect}
          imageUrl={String(
            canvasObjects.find((o) => o.id === imageEditSession.objectId)?.content ||
              ""
          )}
          onClose={() => setImageEditSession(null)}
          onCommitContentAndSize={({
            objectId,
            dataUrl,
            naturalW,
            naturalH,
            prevNaturalW,
            prevNaturalH,
          }) => {
            const obj = canvasObjectsRef.current.find((o) => o.id === objectId);
            if (!obj || obj.width == null || obj.height == null) return;
            const rw = naturalW / prevNaturalW;
            const rh = naturalH / prevNaturalH;
            handleUpdateObject(objectId, {
              content: dataUrl,
              width: obj.width * rw,
              height: obj.height * rh,
            });
          }}
          toast={toast}
          tryConsumeCredits={tryConsumeCredits}
        />
      )}
      {/* Top Left Logo & Title */}
      <div className="absolute left-4 top-6 z-50 flex items-center gap-1 rounded-full bg-white/80 p-1.5 backdrop-blur-xl border border-neutral-200 shadow-lg shadow-neutral-200/20">
        <div 
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white border-0 shadow-none cursor-pointer hover:bg-neutral-50 transition-all active:scale-95 overflow-hidden"
        >
          <CreagicLogo className="h-8 w-8 origin-center scale-[1.2]" />
        </div>
        <div ref={projectMenuAnchorRef} className="relative flex items-center pr-3">
          <div 
            onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
            className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-neutral-50 transition-colors group cursor-pointer"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-900 transition-all", isProjectMenuOpen && "rotate-180")} />
            {isEditingName ? (
              <input
                autoFocus
                className="bg-transparent text-sm font-bold text-neutral-900 outline-none border-b border-neutral-900 min-w-[60px]"
                value={canvasName}
                onChange={(e) => setCanvasName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className="text-sm font-bold text-neutral-900 ml-1 cursor-text"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
              >
                {canvasName}
              </span>
            )}
          </div>
          <AnimatePresence>
            {isProjectMenuOpen && (
              <ProjectMenu
                onClose={() => setIsProjectMenuOpen(false)}
                onOpenProjects={onOpenProjects}
                onNewProject={onNewProject}
                onDeleteCurrentProject={onDeleteCurrentProject}
                onImportImage={() => triggerMediaPick({ kind: "canvas" })}
                onUndo={restoreCanvasUndo}
                onDuplicate={duplicateSelection}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Left Floating Sidebar (Capsule) */}
      <div className="absolute left-4 top-1/2 z-50 -translate-y-1/2 flex flex-col items-center gap-0.5 overflow-visible rounded-full bg-white/90 p-1.5 backdrop-blur-xl border border-neutral-200 shadow-2xl shadow-neutral-200/40">
        <div
          ref={selectToolbarAnchorRef}
          className="relative"
          onMouseEnter={() => setIsSelectPopoverOpen(true)}
          onMouseLeave={() => setIsSelectPopoverOpen(false)}
        >
          <ToolbarButton 
            icon={activeTool === "pan" ? Hand : (activeTool === "mark" ? MapPin : MousePointer2)} 
            label="选择" 
            isActive={["select", "pan", "mark"].includes(activeTool)} 
            onClick={() => handleToolClick(activeTool === "pan" ? "pan" : (activeTool === "mark" ? "mark" : "select"))}
          />
          <AnimatePresence>
            {isSelectPopoverOpen && (
              <SelectPopover 
                activeTool={activeTool}
                onSelect={(tool) => {
                  handleToolClick(tool);
                  setIsSelectPopoverOpen(false);
                }} 
              />
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-0.5">
          <div className="relative" ref={shapeToolbarAnchorRef}>
            <ToolbarButton 
              icon={Square} 
              label="形状" 
              isActive={activeTool === "shape"} 
              onClick={() => handleToolClick("shape")}
            />
            <AnimatePresence>
              {isShapePopoverOpen && (
                <ShapePopover 
                  onSelect={(shape) => {
                    setSelectedShape(shape);
                    setIsShapePopoverOpen(false);
                    setActiveTool("shape");
                  }} 
                  onClose={() => setIsShapePopoverOpen(false)} 
                />
              )}
            </AnimatePresence>
          </div>
          <ToolbarButton 
            icon={Pencil} 
            label="画笔" 
            isActive={activeTool === "pencil"} 
            onClick={() => handleToolClick("pencil")}
          />
          <ToolbarButton 
            icon={Type} 
            label="文字" 
            isActive={activeTool === "text"} 
            onClick={() => handleToolClick("text")}
          />
        </div>
        <div className="my-1.5 h-px w-5 bg-neutral-200" />
        <div className="flex flex-col items-center gap-0.5 pb-0.5">
          <ToolbarButton 
            icon={ImageIcon} 
            label="生图" 
            hasSparkle 
            isActive={false}
            onClick={() => handleToolClick("image-gen")}
          />
          <ToolbarButton 
            icon={Play} 
            label="生视频" 
            hasSparkle 
            isActive={false}
            onClick={() => handleToolClick("video-gen")}
          />
        </div>
        <div className="my-1.5 h-px w-5 bg-neutral-200" />
        <ProfileAvatarHover
          onUpgrade={onUpgrade}
          onLogout={onLogout}
          points={creditBalance}
          panelClassName="z-[160]"
        />
      </div>

      {/* Center Canvas Area */}
      <div 
        ref={canvasHitAreaRef}
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center bg-[#F3F4F5] overflow-hidden",
          activeTool === "pan" && "cursor-grab active:cursor-grabbing",
          activeTool === "pencil" && "cursor-crosshair",
          activeTool === "shape" && "cursor-crosshair",
          activeTool === "select" && isDraggingObject && "cursor-grabbing",
          activeTool === "select" && marquee && "cursor-crosshair",
          shapeDrawRect && "cursor-crosshair",
        )}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        <div className="pointer-events-none absolute inset-x-0 top-[27px] z-40 flex justify-center px-4">
          <AnimatePresence>
            {showMultiAlignToolbar && (
              <motion.div
                key="multi-align-toolbar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="pointer-events-auto"
              >
                <div className="flex items-center gap-1.5 rounded-[13px] border border-neutral-200 bg-white/95 p-1.5 backdrop-blur-xl shadow-xl shadow-neutral-200/30">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1 rounded-[7px] px-2.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                  >
                    <Frame className="h-3.5 w-3.5 text-neutral-500" />
                    创建编组
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1 rounded-[7px] px-2.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                  >
                    <CopyIcon className="h-3.5 w-3.5 text-neutral-500" />
                    合并图层
                  </button>
                  <div className="mx-0.5 h-6 w-px bg-neutral-200" />
                  <div ref={alignMenuAnchorRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAlignMenuOpen((v) => !v);
                        setIsDistributeMenuOpen(false);
                      }}
                      className="group inline-flex h-8 items-center gap-1 rounded-[7px] px-2.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                    >
                      对齐
                      <ChevronDown className={cn("h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:text-neutral-700", isAlignMenuOpen && "rotate-180")} />
                    </button>
                    {isAlignMenuOpen && (
                      <div className="absolute left-0 top-[38px] z-50 w-40 rounded-[13px] border border-neutral-200 bg-white p-1 shadow-xl">
                        <button type="button" onClick={() => { alignSelectedObjects("left"); setIsAlignMenuOpen(false); }} className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100">左对齐</button>
                        <button type="button" onClick={() => { alignSelectedObjects("centerX"); setIsAlignMenuOpen(false); }} className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100">水平居中</button>
                        <button type="button" onClick={() => { alignSelectedObjects("right"); setIsAlignMenuOpen(false); }} className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100">右对齐</button>
                        <div className="my-1 h-px bg-neutral-200" />
                        <button type="button" onClick={() => { alignSelectedObjects("top"); setIsAlignMenuOpen(false); }} className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100">顶部对齐</button>
                        <button type="button" onClick={() => { alignSelectedObjects("centerY"); setIsAlignMenuOpen(false); }} className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100">垂直居中</button>
                        <button type="button" onClick={() => { alignSelectedObjects("bottom"); setIsAlignMenuOpen(false); }} className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100">底部对齐</button>
                      </div>
                    )}
                  </div>
                  <div ref={distributeMenuAnchorRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDistributeMenuOpen((v) => !v);
                        setIsAlignMenuOpen(false);
                      }}
                      className="group inline-flex h-8 items-center gap-1 rounded-[7px] px-2.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                    >
                      分布
                      <ChevronDown className={cn("h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:text-neutral-700", isDistributeMenuOpen && "rotate-180")} />
                    </button>
                    {isDistributeMenuOpen && (
                      <div className="absolute left-0 top-[38px] z-50 w-40 rounded-[13px] border border-neutral-200 bg-white p-1 shadow-xl">
                        <button type="button" onClick={() => { distributeSelectedObjects("horizontal"); setIsDistributeMenuOpen(false); }} className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100">水平等间距</button>
                        <button type="button" onClick={() => { distributeSelectedObjects("vertical"); setIsDistributeMenuOpen(false); }} className="flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] text-neutral-700 hover:bg-neutral-100">垂直等间距</button>
                      </div>
                    )}
                  </div>
                  <div className="mx-0.5 h-6 w-px bg-neutral-200" />
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[7px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    aria-label="下载"
                    title="下载"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
            {((activeTool === "shape" && Boolean(shapeDrawRect)) ||
              (activeTool === "select" &&
                selectedIds.size === 1 &&
                selectedObject?.type === "shape")) && (
              <motion.div
                key="shape-toolbar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="pointer-events-auto"
              >
                <ShapeToolbar
                  width={
                    shapeDrawRect
                      ? Math.abs(shapeDrawRect.bx - shapeDrawRect.ax)
                      : selectedObject?.type === "shape"
                        ? selectedObject.width
                        : undefined
                  }
                  height={
                    shapeDrawRect
                      ? Math.abs(shapeDrawRect.by - shapeDrawRect.ay)
                      : selectedObject?.type === "shape"
                        ? selectedObject.height
                        : undefined
                  }
                  cornerRadius={
                    shapeDrawRect
                      ? SHAPE_DEFAULT_CORNER_RADIUS
                      : selectedObject?.type === "shape"
                        ? selectedObject.cornerRadius
                        : undefined
                  }
                  shapeType={
                    shapeDrawRect
                      ? selectedShape ?? undefined
                      : selectedObject?.type === "shape"
                        ? selectedObject.shapeType
                        : undefined
                  }
                  color={
                    selectedObject?.type === "shape" ? selectedObject.color : undefined
                  }
                  editable={selectedObject?.type === "shape" && !shapeDrawRect}
                  onUpdate={(updates) =>
                    primarySelectedId &&
                    selectedObject?.type === "shape" &&
                    handleUpdateObject(primarySelectedId, updates)
                  }
                />
              </motion.div>
            )}
            {(activeTool === "text" ||
              (activeTool === "select" &&
                selectedIds.size === 1 &&
                selectedObject?.type === "text")) && (
              <motion.div
                key="text-toolbar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="pointer-events-auto"
              >
                <TextToolbar
                  onUpdate={(updates) =>
                    primarySelectedId && handleUpdateObject(primarySelectedId, updates)
                  }
                />
              </motion.div>
            )}
            {activeTool === "pencil" && (
              <motion.div
                key="pencil-toolbar"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="pointer-events-auto"
              >
                <PencilToolbar
                  strokeWidth={pencilStrokeWidth}
                  onStrokeWidthChange={setPencilStrokeWidth}
                  color={pencilColor}
                  onColorChange={setPencilColor}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div 
          className="relative overflow-visible will-change-transform"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            // 勿对整块画布 transform 做 CSS transition：滚轮缩放会与过渡叠在一起，产生明显迟滞感
          }}
        >
          {canvasObjects.map((obj) => {
            const isSel = selectedIds.has(obj.id);
            const isGen = obj.type === "image-gen" || obj.type === "video-gen";
            const genPanelOpen = isGen && isSel && selectedIds.size === 1;
            const showResizeHandles =
              activeTool === "select" &&
              selectedIds.size === 1 &&
              isSel &&
              !isDraggingObject &&
              !isResizingObject &&
              (obj.type === "image" ||
                obj.type === "video" ||
                obj.type === "shape" ||
                obj.type === "text" ||
                obj.type === "drawing" ||
                obj.type === "image-gen" ||
                obj.type === "video-gen") &&
              (obj.type === "text" || (obj.width != null && obj.height != null));
            return (
            <div
              key={obj.id}
              ref={(el) => {
                if (obj.type === "image") {
                  if (el) imageObjectDomRef.current.set(obj.id, el);
                  else imageObjectDomRef.current.delete(obj.id);
                }
              }}
              className={cn(
                "absolute transition-shadow",
                (obj.type === "image" || obj.type === "video") && "overflow-hidden",
                isSel && "ring-2 ring-[#00A3FF] ring-offset-0",
                activeTool === "select" && !isDraggingObject && !isResizingObject && !marquee && "cursor-pointer",
                activeTool === "select" &&
                  isDraggingObject &&
                  objectDragGroupRef.current.has(obj.id) &&
                  "cursor-grabbing",
                isGen && "overflow-visible"
              )}
              style={(() => {
                const pos = {
                  left: canvasToCssPx(obj.x),
                  top: canvasToCssPx(obj.y),
                };
                if (obj.type === "mark") return pos;
                if (isGen) {
                  return {
                    ...pos,
                    width: canvasToCssPx(
                      obj.width ??
                        (obj.type === "image-gen" ? 600 * CANVAS_U : 800 * CANVAS_U)
                    ),
                    height: canvasToCssPx(
                      obj.height ??
                        (obj.type === "image-gen" ? 600 * CANVAS_U : 450 * CANVAS_U)
                    ),
                  };
                }
                if (obj.type === "text") {
                  return {
                    ...pos,
                    width: canvasToCssPx(obj.width ?? 220 * CANVAS_U),
                    height: canvasToCssPx(obj.height ?? 56 * CANVAS_U),
                  };
                }
                const { w: aw, h: ah } = getCanvasObjectAabb(obj);
                return {
                  ...pos,
                  width: canvasToCssPx(obj.width ?? aw),
                  height: canvasToCssPx(obj.height ?? ah),
                };
              })()}
              onDoubleClick={(e) => {
                if (activeToolRef.current !== "select") return;
                const url = canvasObjectToReferenceImageUrl(obj);
                if (!url) return;
                if (
                  obj.type === "image-gen" &&
                  (e.target as HTMLElement).closest(
                    "[contenteditable='true']"
                  )
                ) {
                  return;
                }
                e.stopPropagation();
                const el = chatInputRef.current;
                if (!el) return;
                const pending = el.querySelector("[data-pending-ref-chip]");
                if (
                  pending &&
                  pendingRefImageObjectId === obj.id
                ) {
                  pending.removeAttribute("data-pending-ref-chip");
                  pending.classList.remove("preset-ref-chip--pending");
                  setPendingRefImageObjectId(null);
                  setChatHasContent(richHasContent(el.innerHTML));
                  toast("已确认参考图");
                  focusContentEditableAfterNode(el, pending);
                  return;
                }
                el.querySelectorAll("[data-pending-ref-chip]").forEach((n) => {
                  n.parentNode?.removeChild(n);
                });
                const idx = nextRefChipIndex(el.innerHTML);
                insertHtmlIntoContentEditable(
                  el,
                  buildRefChipHtmlFromUrl(url, idx)
                );
                setChatHasContent(richHasContent(el.innerHTML));
                setPendingRefImageObjectId(null);
                toast(`已添加参考图（${idx}）`);
              }}
            >
              {showResizeHandles && (
                <>
                  <div
                    role="presentation"
                    className="absolute left-2 right-2 top-0 z-20 h-2.5 -translate-y-1/2 cursor-ns-resize"
                    onMouseDown={(e) => handleResizeMouseDown(e, obj, "n")}
                  />
                  <div
                    role="presentation"
                    className="absolute bottom-0 left-2 right-2 z-20 h-2.5 translate-y-1/2 cursor-ns-resize"
                    onMouseDown={(e) => handleResizeMouseDown(e, obj, "s")}
                  />
                  <div
                    role="presentation"
                    className="absolute bottom-2 left-0 top-2 z-20 w-2.5 -translate-x-1/2 cursor-ew-resize"
                    onMouseDown={(e) => handleResizeMouseDown(e, obj, "w")}
                  />
                  <div
                    role="presentation"
                    className="absolute bottom-2 right-0 top-2 z-20 w-2.5 translate-x-1/2 cursor-ew-resize"
                    onMouseDown={(e) => handleResizeMouseDown(e, obj, "e")}
                  />
                  <div
                    role="presentation"
                    className="absolute -left-1.5 -top-1.5 z-[21] h-2.5 w-2.5 cursor-nwse-resize rounded-full border-2 border-[#00A3FF] bg-white shadow-sm"
                    onMouseDown={(e) => handleResizeMouseDown(e, obj, "nw")}
                  />
                  <div
                    role="presentation"
                    className="absolute -right-1.5 -top-1.5 z-[21] h-2.5 w-2.5 cursor-nesw-resize rounded-full border-2 border-[#00A3FF] bg-white shadow-sm"
                    onMouseDown={(e) => handleResizeMouseDown(e, obj, "ne")}
                  />
                  <div
                    role="presentation"
                    className="absolute -bottom-1.5 -left-1.5 z-[21] h-2.5 w-2.5 cursor-nesw-resize rounded-full border-2 border-[#00A3FF] bg-white shadow-sm"
                    onMouseDown={(e) => handleResizeMouseDown(e, obj, "sw")}
                  />
                  <div
                    role="presentation"
                    className="absolute -bottom-1.5 -right-1.5 z-[21] h-2.5 w-2.5 cursor-nwse-resize rounded-full border-2 border-[#00A3FF] bg-white shadow-sm"
                    onMouseDown={(e) => handleResizeMouseDown(e, obj, "se")}
                  />
                </>
              )}
              {obj.type === "image" && (
                <>
                  <img
                    src={obj.content}
                    className="h-full w-full select-none object-cover"
                    referrerPolicy="no-referrer"
                    draggable={false}
                  />
                  {imageProcessingById[obj.id] && (
                    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-sm">
                      <div className="absolute inset-0 animate-pulse bg-black/28" />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
                      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{imageProcessingById[obj.id]!.label}</span>
                      </div>
                    </div>
                  )}
                  {showResizeHandles && (() => {
                    const { w: aw, h: ah } = getCanvasObjectAabb(obj);
                    const imgW = Math.round(
                      canvasToCssPx(obj.width ?? aw)
                    );
                    const imgH = Math.round(
                      canvasToCssPx(obj.height ?? ah)
                    );
                    const invZoom = zoom > 0 ? 1 / zoom : 1;
                    return (
                      <>
                        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-sm">
                          <div
                            className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-[2px]"
                            style={{
                              transform: `scale(${invZoom})`,
                              transformOrigin: "top left",
                            }}
                          >
                            <ImageIcon className="h-3.5 w-3.5 shrink-0 opacity-95" />
                            Image
                          </div>
                          <div
                            className="absolute left-1/2 top-2 rounded-md bg-black/35 px-2 py-1 text-[11px] tabular-nums text-white/95 backdrop-blur-[2px]"
                            style={{
                              transform: `translateX(-50%) scale(${invZoom})`,
                              transformOrigin: "top center",
                            }}
                          >
                            {imgW} × {imgH}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
              {obj.type === "video" && obj.content && (
                <video
                  src={obj.content}
                  className="h-full w-full object-fill shadow-lg select-none"
                  controls
                  muted
                  playsInline
                  draggable={false}
                />
              )}
              {obj.type === "drawing" && (() => {
                const d = parseDrawing(obj);
                if (!d || d.points.length === 0) return null;
                const w = Math.max(1, obj.width ?? 1);
                const h = Math.max(1, obj.height ?? 1);
                const ox = obj.x;
                const oy = obj.y;
                const sw = d.strokeWidth;
                const strokeCol = obj.color || "#18181b";
                if (d.points.length === 1) {
                  const [px, py] = d.points[0];
                  return (
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${w} ${h}`}
                      className="pointer-events-none overflow-visible"
                      preserveAspectRatio="xMinYMin meet"
                    >
                      <circle
                        cx={px - ox}
                        cy={py - oy}
                        r={sw / 2}
                        fill={strokeCol}
                      />
                    </svg>
                  );
                }
                const pathD = d.points
                  .map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px - ox} ${py - oy}`)
                  .join(" ");
                return (
                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${w} ${h}`}
                    className="pointer-events-none overflow-visible"
                    preserveAspectRatio="xMinYMin meet"
                  >
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeCol}
                      strokeWidth={sw}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                );
              })()}
              {obj.type === "shape" && (
                <div
                  className="relative h-full w-full overflow-hidden"
                  style={
                    shapeSupportsCornerRadius(obj.shapeType)
                      ? { borderRadius: `${Math.max(0, Math.min(50, obj.cornerRadius ?? SHAPE_DEFAULT_CORNER_RADIUS))}%` }
                      : undefined
                  }
                >
                  <CanvasShapeSvg
                    shapeType={obj.shapeType}
                    fill={obj.color || "#94a3b8"}
                    cornerRadius={obj.cornerRadius}
                    omitLabel={isTextShapeType(obj.shapeType)}
                  />
                  {isTextShapeType(obj.shapeType) && (
                    <EditableShapeTextLayer obj={obj} onUpdate={handleUpdateObject} />
                  )}
                </div>
              )}
              {obj.type === 'text' && (
                <div className="h-full w-full overflow-hidden rounded-md px-2 py-1">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="min-h-0 whitespace-pre-wrap break-words text-lg font-bold outline-none"
                    style={{ color: obj.color }}
                  >
                    {obj.content}
                  </div>
                </div>
              )}
              {obj.type === 'mark' && (
                <div 
                  className="flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white shadow-lg ring-2 ring-white"
                  style={{ transform: `scale(${1/zoom})` }}
                >
                  {obj.content || '1'}
                </div>
              )}
              {obj.type === "image-gen" && (
                <ImageGenerator
                  panelOpen={genPanelOpen}
                  onHtmlChange={(html) =>
                    handleUpdateObject(obj.id, { content: html })
                  }
                  setInputRef={(el) => {
                    if (el) generatorInputRefs.current.set(obj.id, el);
                    else generatorInputRefs.current.delete(obj.id);
                  }}
                  onAppendImageChip={() =>
                    triggerMediaPick({ kind: "image-gen", id: obj.id })
                  }
                  onSubmit={() => void submitImageGenerator(obj.id)}
                  submitBusy={canvasGenBusyId === obj.id}
                  selectedImageModelLabel={selectedImageModelLabel}
                  imageModelRows={imageModelRows}
                  videoModelRows={videoModelRows}
                  selectedImageModel={selectedImageModel}
                  selectedVideoModel={selectedVideoModel}
                  onSelectedImageModelChange={onSelectedImageModelChange}
                  onSelectedVideoModelChange={onSelectedVideoModelChange}
                  frameWidth={canvasToCssPx(
                    obj.width ?? 600 * CANVAS_U
                  )}
                  frameHeight={canvasToCssPx(
                    obj.height ?? 600 * CANVAS_U
                  )}
                />
              )}
              {obj.type === "video-gen" && (
                <VideoGenerator
                  panelOpen={genPanelOpen}
                  onHtmlChange={(html) =>
                    handleUpdateObject(obj.id, { content: html })
                  }
                  setInputRef={(el) => {
                    if (el) generatorInputRefs.current.set(obj.id, el);
                    else generatorInputRefs.current.delete(obj.id);
                  }}
                  onAppendVideoChip={() =>
                    triggerMediaPick({ kind: "video-gen", id: obj.id })
                  }
                  onSubmit={() => void submitVideoGenerator(obj.id)}
                  submitBusy={canvasGenBusyId === obj.id}
                  selectedVideoModelLabel={selectedVideoModelLabel}
                  imageModelRows={imageModelRows}
                  videoModelRows={videoModelRows}
                  selectedImageModel={selectedImageModel}
                  selectedVideoModel={selectedVideoModel}
                  onSelectedImageModelChange={onSelectedImageModelChange}
                  onSelectedVideoModelChange={onSelectedVideoModelChange}
                  frameWidth={canvasToCssPx(
                    obj.width ?? 800 * CANVAS_U
                  )}
                  frameHeight={canvasToCssPx(
                    obj.height ?? 450 * CANVAS_U
                  )}
                />
              )}
            </div>
          );
          })}

          {marquee && (
            <div
              className="pointer-events-none absolute z-30 border-2 border-dashed border-[#00A3FF] bg-[#00A3FF]/10"
              style={{
                left: canvasToCssPx(Math.min(marquee.ax, marquee.bx)),
                top: canvasToCssPx(Math.min(marquee.ay, marquee.by)),
                width: canvasToCssPx(Math.abs(marquee.bx - marquee.ax)),
                height: canvasToCssPx(Math.abs(marquee.by - marquee.ay)),
              }}
            />
          )}

          {shapeDrawRect && selectedShape && (
            <div
              className="pointer-events-none absolute z-30 overflow-hidden rounded-sm"
              style={{
                left: canvasToCssPx(
                  Math.min(shapeDrawRect.ax, shapeDrawRect.bx)
                ),
                top: canvasToCssPx(
                  Math.min(shapeDrawRect.ay, shapeDrawRect.by)
                ),
                width: canvasToCssPx(
                  Math.abs(shapeDrawRect.bx - shapeDrawRect.ax)
                ),
                height: canvasToCssPx(
                  Math.abs(shapeDrawRect.by - shapeDrawRect.ay)
                ),
              }}
            >
              <div className="pointer-events-none absolute inset-0 rounded-sm border-2 border-dashed border-[#00A3FF]" />
              <div className="absolute inset-0 opacity-50">
                <CanvasShapeSvg
                  shapeType={selectedShape}
                  fill="#94a3b8"
                  cornerRadius={SHAPE_DEFAULT_CORNER_RADIUS}
                  omitLabel={Boolean(selectedShape?.startsWith("text-"))}
                />
              </div>
            </div>
          )}

        </div>
        {/* Top Right Credits Indicator */}
        <div className="absolute top-6 right-6 z-50">
          <Button
            variant="outline"
            onClick={onUpgrade}
            className="h-9 gap-0 rounded-full border-neutral-100 bg-white px-3 text-neutral-900 shadow-sm transition-all hover:bg-neutral-50"
          >
            <div className="flex items-center gap-1.5 pr-2.5">
              <Zap className="h-3.5 w-3.5 fill-cyan-400 text-cyan-400" />
              <span className="text-xs font-bold">{creditBalance}</span>
            </div>
            <div className="h-3 w-[1px] bg-neutral-200" />
            <span className="pl-2.5 text-xs font-bold">升级</span>
          </Button>
        </div>

        {/* Chat Toggle Button (when collapsed) */}
        <AnimatePresence>
          {isChatCollapsed && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              onClick={() => setIsChatCollapsed(false)}
              aria-label="展开对话"
              className="absolute right-8 bottom-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-white border border-neutral-200 shadow-xl hover:bg-neutral-50"
            >
              <CollapsedChatFabIcon className="h-10 w-10 shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bottom Left Controls */}
        <div className="absolute bottom-8 left-4 flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-full bg-white/80 p-1.5 backdrop-blur-xl border border-neutral-200 shadow-lg shadow-neutral-200/20">
            <button
              type="button"
              aria-label="显示画布全部内容"
              onClick={() => fitAllObjectsInView()}
              className="p-2 text-neutral-400 transition-colors rounded-full hover:bg-neutral-100 hover:text-neutral-900"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <div className="mx-2 h-4 w-[1px] bg-neutral-200" />
            <div className="flex items-center gap-3 px-2">
              <div 
                ref={zoomTrackRef}
                className="h-1.5 w-16 rounded-full bg-neutral-200 cursor-pointer relative"
                onMouseDown={handleZoomMouseDown}
              >
                <div 
                  className="h-full rounded-full bg-neutral-900 relative"
                  style={{ 
                    width: `${Math.min(100, ((zoom - 0.1) / (2.0 - 0.1)) * 100)}%`,
                    transition: isZoomDragging ? 'none' : 'width 0.2s ease-out'
                  }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white border border-neutral-200 shadow-sm cursor-grab active:cursor-grabbing" />
                </div>
              </div>
              <span className="text-[10px] font-bold text-neutral-400 min-w-[30px]">{Math.round(zoom * 100)}%</span>
            </div>
          </div>
          <div className="group/help relative flex h-11 w-11 items-center justify-center">
            <button
              type="button"
              aria-label="帮助与信息"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-400 shadow-lg shadow-neutral-200/20 backdrop-blur-xl transition-colors hover:text-neutral-900"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <div className="pointer-events-none absolute bottom-full left-0 mb-3 hidden w-60 rounded-[13px] border border-neutral-100 bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.08)] group-hover/help:pointer-events-auto group-hover/help:block z-[120]">
              <div className="flex flex-col gap-3">
                <a
                  href={TERMS_URL || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex cursor-pointer items-center justify-between rounded-lg px-0.5 py-0.5 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                  onClick={(e) => {
                    if (!TERMS_URL) e.preventDefault();
                  }}
                >
                  <span className="text-sm font-medium text-neutral-900">用户协议</span>
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                </a>
                <a
                  href={PRIVACY_URL || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex cursor-pointer items-center justify-between rounded-lg px-0.5 py-0.5 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                  onClick={(e) => {
                    if (!PRIVACY_URL) e.preventDefault();
                  }}
                >
                  <span className="text-sm font-medium text-neutral-900">隐私政策</span>
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                </a>
                <a
                  href={
                    SUPPORT_EMAIL
                      ? `mailto:${SUPPORT_EMAIL}?subject=客服咨询`
                      : "#"
                  }
                  className="flex cursor-pointer items-center justify-between rounded-lg px-0.5 py-0.5 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
                  onClick={(e) => {
                    if (!SUPPORT_EMAIL) e.preventDefault();
                  }}
                >
                  <span className="text-sm font-medium text-neutral-900">联系客服</span>
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                </a>
              </div>
              <div className="my-4 h-px w-full bg-neutral-100" />
              <div className="flex items-center justify-between px-1">
                <img src="https://raw.githubusercontent.com/taotao-taos/-/main/bilibili.png" className="h-4 cursor-pointer opacity-40 grayscale transition-all hover:opacity-100 hover:grayscale-0" alt="Bilibili" />
                <img src="https://raw.githubusercontent.com/taotao-taos/-/main/douyin.png" className="h-4 cursor-pointer opacity-40 grayscale transition-all hover:opacity-100 hover:grayscale-0" alt="Douyin" />
                <img src="https://raw.githubusercontent.com/taotao-taos/-/main/xhs.png" className="h-4 cursor-pointer opacity-40 grayscale transition-all hover:opacity-100 hover:grayscale-0" alt="Xiaohongshu" />
                <img src="https://raw.githubusercontent.com/taotao-taos/-/main/wechat.png" className="h-4 cursor-pointer opacity-40 grayscale transition-all hover:opacity-100 hover:grayscale-0" alt="WeChat" />
              </div>
              <div className="my-4 h-px w-full bg-neutral-100" />
              <div className="flex flex-col gap-1 text-[10px] leading-relaxed text-neutral-400">
                <p>Copyright by Creagic AI © 2026</p>
                <p>北京创意魔法公司</p>
                <p>京ICP备2025147903号-6</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar (AI Chat) — 字号层级：text-xl 主欢迎语 | text-sm 主阅读区（输入/气泡/正文）| text-xs 辅助说明 */}
      <AnimatePresence>
        {!isChatCollapsed && (
          <motion.div 
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="flex min-h-0 w-[420px] shrink-0 flex-col overflow-x-hidden overflow-y-visible bg-white"
          >
            {/* Chat Header */}
            <div className="flex shrink-0 items-center justify-between overflow-visible border-b border-neutral-50 px-6 py-4">
              <span className="min-w-0 truncate text-sm font-semibold text-neutral-900">
                {chatHeaderTitle}
              </span>
              <div className="flex shrink-0 items-center gap-3">
                <ChatHeaderIconTip label="新对话">
                  <button
                    type="button"
                    onClick={handleNewChat}
                    aria-label="新对话"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-all hover:bg-neutral-50 hover:text-neutral-900"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </ChatHeaderIconTip>
                <div className="relative" ref={historyMenuAnchorRef}>
                  <ChatHeaderIconTip label="对话历史">
                    <button
                      type="button"
                      aria-label="对话历史"
                      aria-expanded={isHistoryOpen}
                      onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                        isHistoryOpen
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900"
                      )}
                    >
                      <History className="h-4 w-4" />
                    </button>
                  </ChatHeaderIconTip>
                  
                  <AnimatePresence>
                    {isHistoryOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-64 rounded-[13px] border border-neutral-100 bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50"
                      >
                        <div className="px-3 py-2 border-b border-neutral-50 mb-1">
                          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">对话历史</span>
                        </div>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
                          {(() => {
                            const boundPid = projectId?.trim();
                            const list = boundPid
                              ? historySessions.filter(
                                  (c) =>
                                    c.projectId === boundPid ||
                                    (!c.projectId && c.id === boundPid)
                                )
                              : historySessions;
                            if (list.length === 0) {
                              return (
                                <p className="px-3 py-4 text-xs text-neutral-400">
                                  {boundPid
                                    ? "暂无本条目的记录。发送消息后会保存到当前项目。"
                                    : "暂无历史。发送消息后会自动保存到此设备。"}
                                </p>
                              );
                            }
                            return list.map((chat) => (
                              <button
                                key={chat.id}
                                type="button"
                                onClick={() => {
                                  try {
                                    localStorage.setItem(
                                      CREAGIC_SESSION_LS_KEY,
                                      chat.id
                                    );
                                  } catch {
                                    /* ignore */
                                  }
                                  setChatSessionId(chat.id);
                                  const raw = loadChatThreadJson(chat.id);
                                  if (raw) {
                                    try {
                                      const parsed = JSON.parse(raw) as Message[];
                                      if (Array.isArray(parsed)) {
                                        messagesRef.current = parsed;
                                        setMessages(parsed);
                                      } else {
                                        messagesRef.current = [];
                                        setMessages([]);
                                      }
                                    } catch {
                                      messagesRef.current = [];
                                      setMessages([]);
                                    }
                                  } else {
                                    messagesRef.current = [];
                                    setMessages([]);
                                  }
                                  setIsHistoryOpen(false);
                                }}
                                className={cn(
                                  "flex w-full flex-col items-start rounded-[13px] px-3 py-2.5 text-left transition-all hover:bg-neutral-50 group",
                                  chatSessionId === chat.id && "bg-neutral-50"
                                )}
                              >
                                <span className="text-sm font-medium text-neutral-900 group-hover:text-cyan-600 transition-colors">
                                  {chat.title}
                                </span>
                                <span className="text-xs text-neutral-400 mt-0.5">
                                  {formatChatHistoryDate(chat.updatedAt)}
                                </span>
                              </button>
                            ));
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsChatCollapsed(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 transition-all"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="editor-chat-scroll min-h-0 flex-1 cursor-text overflow-y-auto overflow-x-hidden px-6 py-4 scrollbar-hide select-text"
              onMouseUp={captureChatSelection}
              onKeyUp={captureChatSelection}
              onMouseDownCapture={(e) => e.stopPropagation()}
              onMouseMoveCapture={(e) => e.stopPropagation()}
            >
          {displayedMessages.length === 0 ? (
            <div className="flex h-full flex-col pt-10 pb-10">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-neutral-900 leading-tight mb-1">Hi，我是你的AI设计师</h2>
                <p className="text-sm font-medium text-neutral-400 leading-tight">让我们开始今天的创作吧！</p>
              </div>

              <div className="flex flex-col gap-3">
                {CHAT_STARTER_PROMPT_GROUPS[starterGroupIndex].cards.map((card, i) => (
                  <div
                    key={`${CHAT_STARTER_PROMPT_GROUPS[starterGroupIndex].id}-${i}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => applyChatStarterCard(card)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        applyChatStarterCard(card);
                      }
                    }}
                    className="group/card relative cursor-pointer rounded-[13px] border border-neutral-100 bg-white shadow-sm transition-colors hover:bg-neutral-50/90"
                  >
                    <div className="relative min-h-[96px] px-4 py-3">
                      {/* 默认：左文右图，与参考稿一致；无「使用」按钮 */}
                      <div className="relative z-0 transition-opacity duration-200 group-hover/card:pointer-events-none group-hover/card:opacity-0">
                        <div className="flex min-h-[80px] items-center">
                          <div className="min-w-0 flex-1 pr-[118px] text-left">
                            <h3 className="text-sm font-bold leading-tight text-neutral-900">
                              {card.title}
                            </h3>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-400">
                              {card.desc}
                            </p>
                          </div>
                        </div>
                        <div className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 -space-x-8">
                          {card.images.map((img, j) => (
                            <div
                              key={j}
                              className="h-[72px] w-[50px] rotate-[-5deg] overflow-hidden rounded-lg border-2 border-white shadow-lg first:rotate-[-12deg] last:rotate-[8deg]"
                              style={{ zIndex: 3 - j }}
                            >
                              <img
                                src={img}
                                className="h-full w-full object-cover"
                                alt=""
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hover：标题 + 提示词一行 + 使用；右侧叠图无阴影 */}
                      <div className="pointer-events-none absolute inset-0 z-20 rounded-[13px] border border-transparent bg-transparent opacity-0 shadow-none transition-all duration-200 group-hover/card:pointer-events-auto group-hover/card:border-neutral-100 group-hover/card:bg-neutral-50/95 group-hover/card:opacity-100">
                        <div className="flex h-full min-h-[88px] gap-3 px-4 py-3">
                          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                            <h3 className="text-sm font-bold leading-tight text-neutral-900">{card.title}</h3>
                            <p className="line-clamp-1 text-xs leading-snug text-neutral-500">{card.fullText}</p>
                            <span className="mt-0.5 inline-flex w-fit rounded-lg bg-neutral-200/90 px-3 py-1.5 text-xs font-semibold text-neutral-800">
                              使用
                            </span>
                          </div>
                          <div className="relative h-[76px] w-[82px] shrink-0 self-center">
                            {card.images.map((img, j) => (
                              <div
                                key={j}
                                className={cn(
                                  "absolute overflow-hidden rounded-md border border-neutral-200/90 bg-white shadow-none",
                                  j === 0 && "bottom-0 left-0 h-[54px] w-[38px] -rotate-12",
                                  j === 1 && "bottom-1 left-1/2 z-10 h-[64px] w-[44px] -translate-x-1/2",
                                  j === 2 && "bottom-0 right-0 h-[54px] w-[38px] rotate-12"
                                )}
                              >
                                <img src={img} className="h-full w-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() =>
                    setStarterGroupIndex((i) => (i + 1) % CHAT_STARTER_PROMPT_GROUPS.length)
                  }
                  className="flex items-center gap-2 text-neutral-400 transition-colors hover:text-neutral-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">切换</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 pb-4">
              {displayedMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex flex-col gap-3",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  {msg.role === "user" ? (
                    <div className="group relative flex min-w-0 max-w-full items-center gap-2">
                      <div className="relative flex items-center justify-center">
                        {renderChatTooltip("复制", hoveredIcon === `copy-user-${idx}`)}
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredIcon(`copy-user-${idx}`)}
                          onMouseLeave={() => setHoveredIcon(null)}
                          onClick={() => {
                            const raw = msg.content?.trim() || "";
                            const safeHtml = raw ? sanitizeUserChatHtml(raw) : "";
                            const t = safeHtml ? htmlToPlainText(safeHtml) : "";
                            if (!t && !safeHtml) return;
                            void copyChatContentToClipboard(safeHtml, t).catch(() =>
                              void navigator.clipboard.writeText(t)
                            );
                          }}
                          className="pointer-events-none group-hover:pointer-events-auto opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-600 transition-all"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="relative flex items-center justify-center">
                        {renderChatTooltip("删除", hoveredIcon === `delete-${idx}`)}
                        <button
                          type="button"
                          onMouseEnter={() => setHoveredIcon(`delete-${idx}`)}
                          onMouseLeave={() => setHoveredIcon(null)}
                          onClick={() => handleDeleteMessage(idx)}
                          className="pointer-events-none group-hover:pointer-events-auto opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div
                        className="chat-copyable relative z-10 max-w-[min(90%,420px)] cursor-text select-text rounded-[13px] bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 break-all [overflow-wrap:anywhere] whitespace-pre-wrap selection:bg-sky-200/90 selection:text-neutral-900"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeUserChatHtml(
                            normalizeRefChipMarkerText(msg.content)
                          ),
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full flex flex-col gap-3">
                      {(msg.pipeline ||
                        msg.thinking ||
                        (msg.tools && msg.tools.length > 0)) && (
                        <motion.div
                          layout
                          className="flex w-full items-start justify-between gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-2.5 py-2"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <FileText
                              className="h-3 w-3 shrink-0 text-neutral-400"
                              aria-hidden
                            />
                            <span className="text-xs font-medium leading-snug text-neutral-500">
                              {currentSidechatStepText(msg) ||
                                (msg.thinking && !msg.thinking.isComplete
                                  ? "处理中"
                                  : "")}
                            </span>
                          </div>
                          {msg.thinking && (
                            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-neutral-400">
                              {!msg.thinking.isComplete && (
                                <Loader2
                                  className="h-3.5 w-3.5 shrink-0 animate-spin text-neutral-400"
                                  aria-hidden
                                />
                              )}
                              {!msg.thinking.isComplete
                                ? thinkingInFlightLabel(msg.thinking.phase)
                                : `思考 ${msg.thinking.duration}s`}
                            </span>
                          )}
                        </motion.div>
                      )}

                      {/* AI Content */}
                      <div className="flex flex-col gap-3">
                        {msg.content && (
                          <CollapsibleMessage
                            contentKey={`ai-${idx}-${msg.id ?? "none"}-${msg.content.length}`}
                            maxHeight={560}
                          >
                            <TypewriterAiReply
                              html={msg.content}
                              active={false}
                              className="chat-copyable select-text text-sm font-medium leading-relaxed text-neutral-900 break-all [overflow-wrap:anywhere] whitespace-pre-wrap"
                            />
                          </CollapsibleMessage>
                        )}

                        {(() => {
                          const imgs: string[] =
                            msg.images && msg.images.length > 0
                              ? msg.images
                              : msg.image
                                ? [msg.image]
                                : [];
                          const expected = msg.imageGenerationExpected;
                          const multiGrid =
                            typeof expected === "number" &&
                            expected > 1 &&
                            imgs.length < expected;

                          if (multiGrid) {
                            const total = expected!;
                            return (
                              <div className="w-full max-w-[min(100%,420px)]">
                                <p className="mb-2 text-[11px] font-medium leading-snug text-neutral-500">
                                  分镜生成中 · 共 {total} 格
                                  {imgs.length > 0
                                    ? ` · 已出 ${imgs.length}/${total}`
                                    : null}
                                </p>
                                <div
                                  className={cn(
                                    "grid gap-2",
                                    total <= 2
                                      ? "grid-cols-2"
                                      : total === 3
                                        ? "grid-cols-3"
                                        : "grid-cols-2 sm:grid-cols-3"
                                  )}
                                >
                                  {Array.from({ length: total }).map((_, i) => {
                                    const src = imgs[i];
                                    if (src) {
                                      return (
                                        <div
                                          key={`${idx}-gen-${i}`}
                                          className="min-w-0"
                                        >
                                          <ChatImageGenSlot label={`${i + 1}`}>
                                            <img
                                              src={src}
                                              alt={`分镜 ${i + 1}`}
                                              className="h-full w-full cursor-pointer object-cover transition-opacity hover:opacity-95"
                                              onClick={() =>
                                                addImageToCanvas(src, {
                                                  centerInViewport: true,
                                                })
                                              }
                                              referrerPolicy="no-referrer"
                                            />
                                          </ChatImageGenSlot>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div
                                        key={`${idx}-ph-${i}`}
                                        className="min-w-0"
                                      >
                                        <ChatImageGenSlot label={`${i + 1}`}>
                                          <div className="absolute inset-0">
                                            <GenPlaceholder className="h-full w-full" />
                                          </div>
                                          <Loader2
                                            style={{
                                              animationDelay: `${i * 120}ms`,
                                            }}
                                            className="absolute left-1/2 top-1/2 z-[1] h-5 w-5 -translate-x-1/2 -translate-y-1/2 animate-spin text-neutral-400"
                                            aria-hidden
                                          />
                                        </ChatImageGenSlot>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          const genBusy = Boolean(
                            msg.thinking &&
                              !msg.thinking.isComplete &&
                              msg.thinking.phase === "generating" &&
                              !msg.videoUrl
                          );
                          if (
                            genBusy &&
                            imgs.length === 0 &&
                            !multiGrid
                          ) {
                            return (
                              <div className="w-full max-w-[min(100%,420px)]">
                                <div className="h-[180px] w-full overflow-hidden rounded-[4px]">
                                  <GenPlaceholder className="h-full w-full" />
                                </div>
                              </div>
                            );
                          }

                          if (imgs.length === 0) return null;

                          return (
                            <>
                              {imgs.map((src, imgIdx) => (
                                <div
                                  key={`${idx}-img-${imgIdx}`}
                                  className="relative max-w-[min(100%,420px)] overflow-hidden rounded-sm border border-neutral-100"
                                >
                                  <img
                                    src={src}
                                    alt={
                                      imgs.length > 1
                                        ? `分镜 ${imgIdx + 1}`
                                        : "Generated"
                                    }
                                    className="h-auto w-full cursor-pointer transition-opacity hover:opacity-95"
                                    onClick={() =>
                                      addImageToCanvas(src, {
                                        centerInViewport: true,
                                      })
                                    }
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ))}
                            </>
                          );
                        })()}

                        {msg.videoUrl ? (
                          <div className="relative overflow-hidden rounded-sm border border-neutral-100">
                            <video
                              src={msg.videoUrl}
                              controls
                              playsInline
                              className="h-auto w-full max-h-[360px] bg-black"
                              preload="metadata"
                            />
                          </div>
                        ) : null}

                        {msg.ctas && msg.ctas.length > 0 && (
                          <div className="mt-1 flex w-full max-w-[min(100%,420px)] flex-col gap-2">
                            {msg.ctas.map((label, cIdx) => (
                              <button
                                key={`${idx}-cta-${cIdx}`}
                                type="button"
                                onClick={() => applyCtaToChatInput(label)}
                                className="flex w-full items-center justify-between gap-3 rounded-[13px] bg-neutral-100 px-3.5 py-2.5 text-left text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-200/80 active:scale-[0.99]"
                              >
                                <span className="min-w-0 flex-1 leading-snug">{label}</span>
                                <ArrowDownRight
                                  className="h-4 w-4 shrink-0 text-neutral-400"
                                  strokeWidth={2}
                                  aria-hidden
                                />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* AI Actions */}
                        {(msg.content ||
                          msg.image ||
                          (msg.images && msg.images.length > 0) ||
                          msg.videoUrl) && (
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              title="复制文本"
                              className="text-neutral-400 hover:text-neutral-600 transition-colors"
                              onClick={() => {
                                const raw = msg.content?.trim() || "";
                                const urls =
                                  msg.images && msg.images.length > 0
                                    ? msg.images.join("\n")
                                    : msg.image
                                      ? msg.image
                                      : "";
                                const safeHtml = raw ? sanitizeUserChatHtml(raw) : "";
                                const t = safeHtml ? htmlToPlainText(safeHtml) : urls;
                                if (!t) return;
                                void copyChatContentToClipboard(safeHtml, t).catch(() =>
                                  void navigator.clipboard.writeText(t)
                                );
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            {msg.role === "ai" &&
                              msg.id &&
                              msg.imageRegen &&
                              msg.imageRegen.prompts.length > 0 && (
                                <button
                                  type="button"
                                  title="重新生成"
                                  disabled={
                                    isAITyping || regenerateBusyId !== null
                                  }
                                  className="text-neutral-400 transition-colors hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() =>
                                    void handleRegenerateMessageImages(msg)
                                  }
                                >
                                  {regenerateBusyId === msg.id ? (
                                    <Loader2
                                      className="h-3 w-3 animate-spin"
                                      aria-hidden
                                    />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            <button
                              type="button"
                              title="赞"
                              className={cn(
                                "transition-colors",
                                (() => {
                                  const fk =
                                    msg.role === "ai" && msg.id
                                      ? `${chatSessionId}-ai-${msg.id}`
                                      : `${chatSessionId}-u-${idx}`;
                                  return msgVote[fk] === "up"
                                    ? "text-cyan-600"
                                    : "text-neutral-400 hover:text-neutral-600";
                                })()
                              )}
                              onClick={() => {
                                const fk =
                                  msg.role === "ai" && msg.id
                                    ? `${chatSessionId}-ai-${msg.id}`
                                    : `${chatSessionId}-u-${idx}`;
                                setMsgVote((p) => {
                                  const n = { ...p };
                                  if (n[fk] === "up") delete n[fk];
                                  else n[fk] = "up";
                                  return n;
                                });
                              }}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              title="踩"
                              className={cn(
                                "transition-colors",
                                (() => {
                                  const fk =
                                    msg.role === "ai" && msg.id
                                      ? `${chatSessionId}-ai-${msg.id}`
                                      : `${chatSessionId}-u-${idx}`;
                                  return msgVote[fk] === "down"
                                    ? "text-red-500"
                                    : "text-neutral-400 hover:text-neutral-600";
                                })()
                              )}
                              onClick={() => {
                                const fk =
                                  msg.role === "ai" && msg.id
                                    ? `${chatSessionId}-ai-${msg.id}`
                                    : `${chatSessionId}-u-${idx}`;
                                setMsgVote((p) => {
                                  const n = { ...p };
                                  if (n[fk] === "down") delete n[fk];
                                  else n[fk] = "down";
                                  return n;
                                });
                              }}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                            <div className="relative flex items-center justify-center ml-auto">
                              {renderChatTooltip("删除", hoveredIcon === `delete-${idx}`)}
                              <button 
                                onMouseEnter={() => setHoveredIcon(`delete-${idx}`)}
                                onMouseLeave={() => setHoveredIcon(null)}
                                onClick={() => handleDeleteMessage(idx)}
                                className="text-neutral-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="px-6 pb-6">
          <CreagicChatComposer
            variant="editor"
            richInputRef={chatInputRef}
            onRichSync={() => {
              const el = chatInputRef.current;
              setChatHasContent(el ? richHasContent(el.innerHTML) : false);
            }}
            onEnter={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (isAITyping) {
                  handleCancelInFlightChat();
                } else {
                  handleSendMessage();
                }
              }
            }}
            selectedSkill={selectedSkill}
            onSelectedSkillChange={onSelectedSkillChange}
            deepThinkMode={deepThinkMode}
            onDeepThinkToggle={() => onDeepThinkModeChange(!deepThinkMode)}
            imageModelRows={imageModelRows}
            videoModelRows={videoModelRows}
            selectedImageModel={selectedImageModel}
            selectedVideoModel={selectedVideoModel}
            onSelectedImageModelChange={onSelectedImageModelChange}
            onSelectedVideoModelChange={onSelectedVideoModelChange}
            skillToggleClearsSelection
            sendAreaSlot={
              !isAITyping ? (
                <Button
                  size="icon"
                  type="button"
                  onClick={() => handleSendMessage()}
                  className={cn(
                    "h-9 w-9 rounded-full transition-all shadow-sm",
                    chatHasContent
                      ? "scale-105 bg-neutral-900 text-white hover:bg-neutral-800"
                      : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
                  )}
                  disabled={!chatHasContent}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              ) : chatSendSlotPhase === "loading" ? (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 shadow-sm"
                  aria-busy
                  aria-label="正在处理"
                >
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCancelInFlightChat()}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                  aria-label="停止生成"
                >
                  <span className="block h-2.5 w-2.5 shrink-0 rounded-[3px] bg-white" />
                </button>
              )
            }
          />
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
  );
}

function ToolbarButton({ 
  icon: Icon, 
  label, 
  hasSparkle, 
  isActive, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  hasSparkle?: boolean, 
  isActive?: boolean,
  onClick?: () => void
}) {
  return (
    <div className="group relative">
      <button 
        onClick={onClick}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full transition-all",
          isActive 
            ? "bg-neutral-900 text-white shadow-sm" 
            : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
        )}
      >
        <Icon className="h-4 w-4" />
        {hasSparkle && (
          <Sparkles className={cn(
            "absolute right-1.5 top-1.5 h-2.5 w-2.5",
            isActive ? "text-neutral-300" : "text-neutral-400"
          )} />
        )}
      </button>
      <div className="absolute left-full top-1/2 -translate-y-1/2 pl-6 hidden group-hover:block z-[100]">
        <div className="relative flex items-center">
          <div className="h-0 w-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-neutral-800" />
          <div className="whitespace-nowrap rounded-lg bg-neutral-800 px-3 py-2 text-xs font-medium text-white shadow-xl">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

const SelectPopover = ({ activeTool, onSelect }: { activeTool: string, onSelect: (tool: string) => void }) => {
  const items = [
    { id: 'select', label: '选择', icon: MousePointer2, shortcut: 'V' },
    { id: 'pan', label: '平移画布', icon: Hand, shortcut: 'H' },
    { id: 'mark', label: '标记', icon: MapPin, shortcut: 'M' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 10, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 10, scale: 0.95 }}
      className="absolute left-full top-0 ml-4 w-48 rounded-[13px] border border-neutral-100 bg-white p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50"
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={cn(
            "flex w-full items-center justify-between rounded-[13px] px-3 py-2.5 transition-all",
            activeTool === item.id ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4" />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          <span className="text-[10px] font-bold text-neutral-300">{item.shortcut}</span>
        </button>
      ))}
    </motion.div>
  );
};

const ProjectMenu = ({
  onClose,
  onOpenProjects,
  onNewProject,
  onDeleteCurrentProject,
  onImportImage,
  onUndo,
  onDuplicate,
}: {
  onClose: () => void;
  onOpenProjects?: () => void;
  onNewProject?: () => void;
  onDeleteCurrentProject?: () => void;
  onImportImage: () => void;
  onUndo: () => void;
  onDuplicate: () => void;
}) => {
  const menuGroups: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    shortcut?: string;
    variant?: "danger";
    disabled?: boolean;
    onSelect: () => void;
  }[][] = [
    [{ icon: Library, label: "项目库", onSelect: () => onOpenProjects?.() }],
    [
      { icon: PlusCircle, label: "新建项目", onSelect: () => onNewProject?.() },
      {
        icon: Trash2,
        label: "删除当前项目",
        variant: "danger",
        onSelect: () => onDeleteCurrentProject?.(),
      },
    ],
    [{ icon: ImagePlus, label: "导入图片", onSelect: onImportImage }],
    [
      { icon: Undo2, label: "撤销", shortcut: "⌘ Z", onSelect: onUndo },
      {
        icon: Redo2,
        label: "重做",
        shortcut: "⌘ ⇧ Z",
        disabled: true,
        onSelect: () => {},
      },
      { icon: CopyIcon, label: "复制对象", shortcut: "⌘ D", onSelect: onDuplicate },
    ],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute left-0 top-full z-[100] mt-2 w-64 rounded-[13px] border border-neutral-100 bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {menuGroups.map((group, gIdx) => (
        <React.Fragment key={gIdx}>
          {gIdx > 0 && <div className="mx-2 my-1.5 h-px bg-neutral-100" />}
          <div className="flex flex-col gap-0.5">
            {group.map((item, iIdx) => (
              <button
                key={iIdx}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onSelect();
                    onClose();
                  }
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-[13px] px-3 py-2.5 text-left transition-all",
                  item.variant === "danger"
                    ? "text-red-500 hover:bg-red-50"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                  item.disabled && "cursor-not-allowed opacity-30"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-[10px] font-bold text-neutral-300">{item.shortcut}</span>
                )}
              </button>
            ))}
          </div>
        </React.Fragment>
      ))}
    </motion.div>
  );
};
const ShapePopover = ({ onSelect, onClose }: { onSelect: (shape: string) => void, onClose: () => void }) => {
  const shapes = [
    { id: "square", icon: Square },
    { id: "circle", icon: Circle },
    { id: "triangle", icon: Triangle },
    { id: "star", icon: Star },
    { id: "pentagon", icon: Pentagon },
    { id: "hexagon", icon: Hexagon },
  ];
  
  const shapeTexts = [
    { id: 'text-square', icon: Square },
    { id: 'text-circle', icon: Circle },
    { id: 'text-bubble', icon: MessageIcon },
    { id: 'text-left', icon: ArrowLeft },
    { id: 'text-right', icon: ArrowRight },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 10, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 10, scale: 0.95 }}
      className="absolute left-full top-0 ml-4 w-64 rounded-[13px] border border-neutral-100 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50"
    >
      <div className="mb-4">
        <div className="text-[10px] font-bold text-neutral-400 mb-3 uppercase tracking-wider">形状</div>
        <div className="flex flex-wrap gap-2">
          {shapes.map((shape) => (
            <button
              key={shape.id}
              onClick={() => onSelect(shape.id)}
              className="flex h-10 w-10 items-center justify-center rounded-[7px] hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-all text-neutral-600 hover:text-neutral-900"
            >
              <shape.icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[10px] font-bold text-neutral-400 mb-3 uppercase tracking-wider">形状文本</div>
        <div className="flex flex-wrap gap-2">
          {shapeTexts.map((shape) => (
            <button
              key={shape.id}
              onClick={() => onSelect(shape.id)}
              className="flex h-10 w-10 items-center justify-center rounded-[7px] hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-all text-neutral-600 hover:text-neutral-900"
            >
              <shape.icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const ShapeToolbar = ({
  width,
  height,
  cornerRadius,
  shapeType,
  color,
  editable,
  onUpdate,
}: {
  width?: number;
  height?: number;
  cornerRadius?: number;
  shapeType?: string;
  color?: string;
  editable?: boolean;
  onUpdate?: (updates: Partial<CanvasObject>) => void;
}) => {
  const colors = ["#94a3b8", "#ef4444", "#3b82f6"];
  const [wDraft, setWDraft] = useState("");
  const [hDraft, setHDraft] = useState("");
  const [rDraft, setRDraft] = useState("");
  const canEditCorner = shapeSupportsCornerRadius(shapeType);

  useEffect(() => {
    if (width != null && Number.isFinite(width))
      setWDraft(String(Math.round(width / CANVAS_U)));
    else setWDraft("");
  }, [width]);

  useEffect(() => {
    if (height != null && Number.isFinite(height))
      setHDraft(String(Math.round(height / CANVAS_U)));
    else setHDraft("");
  }, [height]);

  useEffect(() => {
    const base = Number.isFinite(cornerRadius) ? (cornerRadius as number) : SHAPE_DEFAULT_CORNER_RADIUS;
    setRDraft(String(Math.round(Math.max(0, Math.min(50, base)))));
  }, [cornerRadius]);

  /** 与画布页面显示一致的 CSS 像素范围；存储为 ×CANVAS_U */
  const clampDimCss = (n: number) =>
    Math.min(4000, Math.max(4, Math.round(n)));

  const commitW = () => {
    if (!editable) return;
    let nCss = parseInt(wDraft, 10);
    if (Number.isNaN(nCss) || nCss < 4)
      nCss = width != null ? Math.round(width / CANVAS_U) : 100;
    nCss = clampDimCss(nCss);
    onUpdate?.({ width: nCss * CANVAS_U });
    setWDraft(String(nCss));
  };

  const commitH = () => {
    if (!editable) return;
    let nCss = parseInt(hDraft, 10);
    if (Number.isNaN(nCss) || nCss < 4)
      nCss = height != null ? Math.round(height / CANVAS_U) : 100;
    nCss = clampDimCss(nCss);
    onUpdate?.({ height: nCss * CANVAS_U });
    setHDraft(String(nCss));
  };

  const commitR = () => {
    if (!editable || !canEditCorner) return;
    let n = parseInt(rDraft, 10);
    if (Number.isNaN(n) || n < 0) {
      n = Number.isFinite(cornerRadius) ? Math.round(cornerRadius as number) : SHAPE_DEFAULT_CORNER_RADIUS;
    }
    n = Math.max(0, Math.min(50, Math.round(n)));
    onUpdate?.({ cornerRadius: n });
    setRDraft(String(n));
  };

  return (
    <div
      className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white/90 p-2 backdrop-blur-xl shadow-2xl shadow-neutral-200/20"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            disabled={!editable}
            aria-label={`形状颜色 ${c}`}
            onClick={() => onUpdate?.({ color: c })}
            className={cn(
              "h-6 w-6 rounded-full border-2 shadow-sm transition-transform",
              editable ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-40",
              color === c ? "border-neutral-900 ring-2 ring-neutral-300" : "border-neutral-200"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="h-6 w-px bg-neutral-200" />
      <div className="flex items-center gap-2 px-2">
        <Settings2 className="h-4 w-4 shrink-0 text-neutral-400" />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            W
          </span>
          <input
            type="text"
            inputMode="numeric"
            disabled={!editable}
            aria-label="宽度（像素）"
            className={cn(
              "w-12 rounded-lg border border-neutral-200 bg-neutral-50 py-1 text-center text-[10px] font-bold tabular-nums text-neutral-900 outline-none",
              editable ? "focus:border-neutral-400" : "cursor-not-allowed opacity-50"
            )}
            value={wDraft}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              setWDraft(d);
              if (d === "" || !editable) return;
              const n = parseInt(d, 10);
              if (!Number.isNaN(n))
                onUpdate?.({ width: clampDimCss(n) * CANVAS_U });
            }}
            onBlur={commitW}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            H
          </span>
          <input
            type="text"
            inputMode="numeric"
            disabled={!editable}
            aria-label="高度（像素）"
            className={cn(
              "w-12 rounded-lg border border-neutral-200 bg-neutral-50 py-1 text-center text-[10px] font-bold tabular-nums text-neutral-900 outline-none",
              editable ? "focus:border-neutral-400" : "cursor-not-allowed opacity-50"
            )}
            value={hDraft}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              setHDraft(d);
              if (d === "" || !editable) return;
              const n = parseInt(d, 10);
              if (!Number.isNaN(n))
                onUpdate?.({ height: clampDimCss(n) * CANVAS_U });
            }}
            onBlur={commitH}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            R
          </span>
          <input
            type="text"
            inputMode="numeric"
            disabled={!editable || !canEditCorner}
            aria-label="圆角大小"
            className={cn(
              "w-12 rounded-lg border border-neutral-200 bg-neutral-50 py-1 text-center text-[10px] font-bold tabular-nums text-neutral-900 outline-none",
              editable && canEditCorner
                ? "focus:border-neutral-400"
                : "cursor-not-allowed opacity-50"
            )}
            value={rDraft}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "");
              setRDraft(d);
              if (d === "" || !editable || !canEditCorner) return;
              const n = parseInt(d, 10);
              if (!Number.isNaN(n))
                onUpdate?.({ cornerRadius: Math.max(0, Math.min(50, Math.round(n))) });
            }}
            onBlur={commitR}
          />
        </div>
      </div>
    </div>
  );
};

const TextToolbar = ({ onUpdate }: { onUpdate?: (updates: Partial<CanvasObject>) => void }) => {
  const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'];
  
  return (
    <div className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white/90 p-2 backdrop-blur-xl shadow-2xl shadow-neutral-200/20">
      <div className="flex items-center gap-2 px-2">
        {colors.map(color => (
          <div 
            key={color}
            onClick={() => onUpdate?.({ color })}
            className="h-6 w-6 rounded-full border border-neutral-200 shadow-sm cursor-pointer hover:scale-110 transition-transform" 
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="h-6 w-[1px] bg-neutral-200" />
      <div className="flex items-center gap-3 px-3">
        <div className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-900 transition-colors">
          <span className="text-xs font-bold text-neutral-900">苹方</span>
          <ChevronDown className="h-3 w-3 text-neutral-400" />
        </div>
        <div className="h-4 w-[1px] bg-neutral-200" />
        <div className="flex items-center gap-1.5 cursor-pointer hover:text-neutral-900 transition-colors">
          <span className="text-xs font-bold text-neutral-900">Regular</span>
          <ChevronDown className="h-3 w-3 text-neutral-400" />
        </div>
      </div>
    </div>
  );
};

const PencilToolbar = ({
  strokeWidth,
  onStrokeWidthChange,
  color,
  onColorChange,
}: {
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
  color: string;
  onColorChange: (c: string) => void;
}) => {
  const swatches = ["#18181b", "#ef4444", "#3b82f6"];
  const [widthDraft, setWidthDraft] = useState(String(strokeWidth));

  useEffect(() => {
    setWidthDraft(String(strokeWidth));
  }, [strokeWidth]);

  const clampW = (n: number) => Math.min(200, Math.max(1, Math.round(n)));

  return (
    <div
      className="flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white px-2.5 py-2 shadow-xl shadow-neutral-200/20"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 pl-0.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`笔触颜色 ${c}`}
            onClick={() => onColorChange(c)}
            className={cn(
              "h-7 w-7 rounded-full border-2 shadow-sm transition-transform hover:scale-105",
              color === c ? "border-neutral-900 ring-2 ring-neutral-300" : "border-neutral-200"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="h-4 w-px bg-neutral-200" />
      <div className="flex items-center gap-1.5 pr-0.5">
        <div className="flex flex-col gap-0.5" aria-hidden>
          {[0, 1, 2].map((k) => (
            <div key={k} className="h-0.5 w-3.5 rounded-full bg-neutral-400" />
          ))}
        </div>
        <button
          type="button"
          aria-label="减小笔刷"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50"
          onClick={() => onStrokeWidthChange(clampW(strokeWidth - 1))}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label="笔刷像素"
          className="w-10 rounded-lg border border-neutral-200 bg-neutral-50 py-1 text-center text-xs font-bold tabular-nums text-neutral-900 outline-none focus:border-neutral-400"
          value={widthDraft}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "");
            setWidthDraft(d);
            if (d === "") return;
            const n = parseInt(d, 10);
            if (!Number.isNaN(n)) onStrokeWidthChange(clampW(n));
          }}
          onBlur={() => {
            let n = parseInt(widthDraft, 10);
            if (Number.isNaN(n) || n < 1) n = 8;
            n = clampW(n);
            onStrokeWidthChange(n);
            setWidthDraft(String(n));
          }}
        />
        <button
          type="button"
          aria-label="增大笔刷"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50"
          onClick={() => onStrokeWidthChange(clampW(strokeWidth + 1))}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="text-[10px] font-bold text-neutral-400">Px</span>
      </div>
    </div>
  );
};

const IMAGE_GEN_PANEL_WIDTH_PX = 600;
const VIDEO_GEN_PANEL_WIDTH_PX = 720;
const GEN_PANEL_VIEWPORT_MARGIN = 12;
const GEN_PANEL_BELOW_FRAME_GAP = 12;

const ImageGenerator = ({
  panelOpen,
  onHtmlChange,
  setInputRef,
  onAppendImageChip,
  onSubmit,
  submitBusy = false,
  selectedImageModelLabel,
  imageModelRows,
  videoModelRows,
  selectedImageModel,
  selectedVideoModel,
  onSelectedImageModelChange,
  onSelectedVideoModelChange,
  frameWidth = 600,
  frameHeight = 600,
}: {
  panelOpen: boolean;
  onHtmlChange: (html: string) => void;
  setInputRef: (el: HTMLDivElement | null) => void;
  onAppendImageChip: () => void;
  onSubmit?: () => void;
  submitBusy?: boolean;
  selectedImageModelLabel: string;
  imageModelRows: MediaModelManifestRow[];
  videoModelRows: MediaModelManifestRow[];
  selectedImageModel: string;
  selectedVideoModel: string;
  onSelectedImageModelChange: (apiModelId: string) => void;
  onSelectedVideoModelChange: (apiModelId: string) => void;
  frameWidth?: number;
  frameHeight?: number;
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const modelTriggerRef = useRef<HTMLDivElement>(null);
  const modelPanelRef = useRef<HTMLDivElement>(null);
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  useDismissOnOutsidePressAny(
    isModelPopoverOpen,
    [modelTriggerRef, modelPanelRef],
    () => setIsModelPopoverOpen(false)
  );

  useLayoutEffect(() => {
    if (!panelOpen) {
      setPanelPos(null);
      return;
    }
    let raf = 0;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const el = frameRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const panelW = IMAGE_GEN_PANEL_WIDTH_PX;
        const minL = GEN_PANEL_VIEWPORT_MARGIN;
        const maxL = Math.max(minL, window.innerWidth - panelW - GEN_PANEL_VIEWPORT_MARGIN);
        const frameCenterX = r.left + r.width / 2;
        const rawLeft = Math.round(frameCenterX - panelW / 2);
        const left = Math.min(Math.max(rawLeft, minL), maxL);
        const top = Math.round(r.bottom + GEN_PANEL_BELOW_FRAME_GAP);
        setPanelPos((prev) => {
          if (prev && prev.left === left && prev.top === top) return prev;
          return { left, top };
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [panelOpen]);

  const panelPortal =
    panelOpen &&
    panelPos &&
    createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[200] box-border rounded-[13px] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/40"
        style={{
          left: panelPos.left,
          top: panelPos.top,
          width: IMAGE_GEN_PANEL_WIDTH_PX,
          maxWidth: `min(${IMAGE_GEN_PANEL_WIDTH_PX}px, calc(100vw - ${GEN_PANEL_VIEWPORT_MARGIN * 2}px))`,
        }}
        data-generator-panel="1"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="mb-3 rounded-[13px] bg-neutral-50 px-3 py-2 text-[11px] leading-snug text-neutral-600">
          交互流程：描述画面与用途 → 可选上传参考图 → 调用侧栏所选<strong>图像模型</strong> → 结果自动落入画布。
        </p>
        <div
          ref={setInputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onHtmlChange(e.currentTarget.innerHTML)}
          data-placeholder="今天我们要创作什么"
          className="min-h-[96px] w-full border-none bg-transparent text-sm text-neutral-900 outline-none empty:before:text-neutral-300 empty:before:content-[attr(data-placeholder)]"
        />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div ref={modelTriggerRef} className="relative">
              {isModelPopoverOpen && (
                <div ref={modelPanelRef}>
                  <AiModelPopover
                    variant="editor"
                    initialTab="image"
                    lockTab="image"
                    imageModels={imageModelRows}
                    videoModels={videoModelRows}
                    selectedImageApiModelId={selectedImageModel}
                    selectedVideoApiModelId={selectedVideoModel}
                    onSelectImage={(id) => onSelectedImageModelChange(id)}
                    onSelectVideo={(id) => onSelectedVideoModelChange(id)}
                    onClose={() => setIsModelPopoverOpen(false)}
                  />
                </div>
              )}
              <div
                className="group flex cursor-pointer items-center gap-2 rounded-[13px] px-3 py-1.5 transition-colors hover:bg-neutral-50"
                onClick={() => setIsModelPopoverOpen((open) => !open)}
              >
                <Grid3X3 className="h-4 w-4 text-neutral-900" />
                <span className="text-xs font-bold text-neutral-900">{selectedImageModelLabel}</span>
                <ChevronDown className="h-3 w-3 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </div>
            <button
              type="button"
              className="p-2 text-neutral-400 transition-colors hover:text-neutral-900"
              onClick={(e) => {
                e.stopPropagation();
                onAppendImageChip();
              }}
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="group flex cursor-pointer items-center gap-2 rounded-[7px] px-3 py-1.5 transition-colors hover:bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900">16:9</span>
              <ChevronDown className="h-3 w-3 text-neutral-400 transition-colors group-hover:text-neutral-900" />
            </div>
            <Button
              type="button"
              disabled={submitBusy}
              onClick={(e) => {
                e.stopPropagation();
                onSubmit?.();
              }}
              className="h-10 gap-2 rounded-[7px] bg-neutral-900 px-4 text-white transition-all hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitBusy ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
              ) : (
                <Zap className="h-4 w-4 fill-cyan-400 text-cyan-400" />
              )}
              <span className="text-xs font-bold">
                {submitBusy ? "生成中…" : "生成"}
              </span>
            </Button>
          </div>
        </div>
      </motion.div>,
      document.body
    );

  return (
    <div className="relative h-full w-full">
      <div
        ref={frameRef}
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-sm border-2 border-cyan-400 bg-cyan-50/10"
      >
        <div className="absolute left-4 top-4 flex items-center gap-2 text-neutral-900">
          <ImageIcon className="h-4 w-4" />
          <span className="text-xs font-bold">图像生成器</span>
        </div>
        <div className="absolute right-4 top-4 text-xs font-bold text-neutral-400">
          接 /api/images · 自然尺寸入画
        </div>
        {submitBusy ? (
          <div className="absolute inset-3">
            <GenPlaceholder className="rounded-lg" />
          </div>
        ) : (
          <ImageIcon className="h-32 w-32 text-cyan-200" />
        )}
        <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-cyan-400 bg-white" />
        <div className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full border-2 border-cyan-400 bg-white" />
        <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-cyan-400 bg-white" />
        <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-cyan-400 bg-white" />
      </div>
      {panelPortal}
    </div>
  );
};

const VideoGenerator = ({
  panelOpen,
  onHtmlChange,
  setInputRef,
  onAppendVideoChip,
  onSubmit,
  submitBusy = false,
  selectedVideoModelLabel,
  imageModelRows,
  videoModelRows,
  selectedImageModel,
  selectedVideoModel,
  onSelectedImageModelChange,
  onSelectedVideoModelChange,
  frameWidth = 800,
  frameHeight = 450,
}: {
  panelOpen: boolean;
  onHtmlChange: (html: string) => void;
  setInputRef: (el: HTMLDivElement | null) => void;
  onAppendVideoChip: () => void;
  onSubmit?: () => void;
  submitBusy?: boolean;
  selectedVideoModelLabel: string;
  imageModelRows: MediaModelManifestRow[];
  videoModelRows: MediaModelManifestRow[];
  selectedImageModel: string;
  selectedVideoModel: string;
  onSelectedImageModelChange: (apiModelId: string) => void;
  onSelectedVideoModelChange: (apiModelId: string) => void;
  frameWidth?: number;
  frameHeight?: number;
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const modelTriggerRef = useRef<HTMLDivElement>(null);
  const modelPanelRef = useRef<HTMLDivElement>(null);
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
  useDismissOnOutsidePressAny(
    isModelPopoverOpen,
    [modelTriggerRef, modelPanelRef],
    () => setIsModelPopoverOpen(false)
  );

  useLayoutEffect(() => {
    if (!panelOpen) {
      setPanelPos(null);
      return;
    }
    let raf = 0;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      const el = frameRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const panelW = VIDEO_GEN_PANEL_WIDTH_PX;
        const minL = GEN_PANEL_VIEWPORT_MARGIN;
        const maxL = Math.max(minL, window.innerWidth - panelW - GEN_PANEL_VIEWPORT_MARGIN);
        const frameCenterX = r.left + r.width / 2;
        const rawLeft = Math.round(frameCenterX - panelW / 2);
        const left = Math.min(Math.max(rawLeft, minL), maxL);
        const top = Math.round(r.bottom + GEN_PANEL_BELOW_FRAME_GAP);
        setPanelPos((prev) => {
          if (prev && prev.left === left && prev.top === top) return prev;
          return { left, top };
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [panelOpen]);

  const panelPortal =
    panelOpen &&
    panelPos &&
    createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[200] box-border rounded-[13px] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/40"
        style={{
          left: panelPos.left,
          top: panelPos.top,
          width: VIDEO_GEN_PANEL_WIDTH_PX,
          maxWidth: `min(${VIDEO_GEN_PANEL_WIDTH_PX}px, calc(100vw - ${GEN_PANEL_VIEWPORT_MARGIN * 2}px))`,
        }}
        data-generator-panel="1"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="mb-3 rounded-[13px] bg-cyan-50/90 px-3 py-2 text-[11px] leading-snug text-cyan-950">
          视频流程（当前产品阶段）：① 写清镜头、时长感、情绪与画幅 ② 可选贴参考图 ③ 用侧栏所选<strong>视频/关键帧模型</strong>生成<strong>单帧概念静图</strong>并落画布。成片 MP4 需单独接入视频推理 API。
        </p>
        <div
          ref={setInputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onHtmlChange(e.currentTarget.innerHTML)}
          data-placeholder="今天我们要创作什么"
          className="mb-4 min-h-[96px] w-full border-none bg-transparent text-sm text-neutral-900 outline-none empty:before:text-neutral-300 empty:before:content-[attr(data-placeholder)]"
        />
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-[13px] border-2 border-neutral-100 bg-neutral-50 transition-all hover:bg-neutral-100"
            onClick={(e) => {
              e.stopPropagation();
              onAppendVideoChip();
            }}
          >
            <Plus className="h-6 w-6 text-neutral-300" />
          </button>
          <button
            type="button"
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-[13px] border-2 border-neutral-100 bg-neutral-50 transition-all hover:bg-neutral-100"
            onClick={(e) => {
              e.stopPropagation();
              onAppendVideoChip();
            }}
          >
            <Plus className="h-6 w-6 text-neutral-300" />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex cursor-pointer items-center gap-2 rounded-[13px] border border-neutral-100 px-3 py-1.5 transition-colors hover:bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900">首尾帧</span>
            </div>
            <div className="flex cursor-pointer items-center gap-2 rounded-[13px] border border-neutral-100 px-3 py-1.5 transition-colors hover:bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900">多图参考</span>
            </div>
            <div ref={modelTriggerRef} className="relative">
              {isModelPopoverOpen && (
                <div ref={modelPanelRef}>
                  <AiModelPopover
                    variant="editor"
                    initialTab="video"
                    lockTab="video"
                    imageModels={imageModelRows}
                    videoModels={videoModelRows}
                    selectedImageApiModelId={selectedImageModel}
                    selectedVideoApiModelId={selectedVideoModel}
                    onSelectImage={(id) => onSelectedImageModelChange(id)}
                    onSelectVideo={(id) => onSelectedVideoModelChange(id)}
                    onClose={() => setIsModelPopoverOpen(false)}
                  />
                </div>
              )}
              <div
                className="group flex cursor-pointer items-center gap-2 rounded-[13px] px-3 py-1.5 transition-colors hover:bg-neutral-50"
                onClick={() => setIsModelPopoverOpen((open) => !open)}
              >
                <RefreshCw className="h-4 w-4 text-neutral-900" />
                <span className="text-xs font-bold text-neutral-900">{selectedVideoModelLabel}</span>
                <ChevronDown className="h-3 w-3 text-neutral-400 transition-colors group-hover:text-neutral-900" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="group flex cursor-pointer items-center gap-2 rounded-[7px] px-3 py-1.5 transition-colors hover:bg-neutral-50">
              <span className="text-xs font-bold text-neutral-900">16:9 · 8s · 1080p</span>
              <ChevronDown className="h-3 w-3 text-neutral-400 transition-colors group-hover:text-neutral-900" />
            </div>
            <Button
              type="button"
              disabled={submitBusy}
              onClick={(e) => {
                e.stopPropagation();
                onSubmit?.();
              }}
              className="h-10 gap-2 rounded-[7px] bg-neutral-900 px-4 text-white transition-all hover:bg-neutral-800 disabled:opacity-60"
            >
              {submitBusy ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
              ) : (
                <Zap className="h-4 w-4 fill-cyan-400 text-cyan-400" />
              )}
              <span className="text-xs font-bold">
                {submitBusy ? "生成中…" : "生成"}
              </span>
            </Button>
          </div>
        </div>
      </motion.div>,
      document.body
    );

  return (
    <div className="relative h-full w-full">
      <div
        ref={frameRef}
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-sm border-2 border-cyan-400 bg-cyan-50/10"
      >
        <div className="absolute left-4 top-4 flex items-center gap-2 text-neutral-900">
          <Play className="h-4 w-4" />
          <span className="text-xs font-bold">视频生成器</span>
        </div>
        <div className="absolute right-4 top-4 max-w-[200px] text-right text-[10px] font-bold leading-tight text-neutral-400">
          当前为「关键帧概念」静图；完整视频需另接模型
        </div>
        {submitBusy ? (
          <div className="absolute inset-3">
            <GenPlaceholder className="rounded-lg" />
          </div>
        ) : (
          <Play className="h-32 w-32 fill-cyan-200 text-cyan-200 opacity-50" />
        )}
      </div>
      {panelPortal}
    </div>
  );
};

const renderChatTooltip = (label: string, isVisible: boolean) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className="pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-white shadow-lg z-[60]"
      >
        {label}
        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-neutral-900" />
      </motion.div>
    )}
  </AnimatePresence>
);

function SuggestionCard({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <button className="flex flex-col items-start gap-3 rounded-[13px] bg-white p-4 text-left border border-neutral-100 shadow-sm hover:bg-neutral-50 transition-all group">
      <Icon className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
      <span className="text-xs font-medium text-neutral-500 group-hover:text-neutral-900 transition-colors leading-tight">{label}</span>
    </button>
  );
}
