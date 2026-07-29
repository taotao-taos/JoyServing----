/**
 * AI 侧栏回复：支持 Markdown 句法、可选 HTML、以及 ```lovart-reply``` 结构化 JSON（经 jsonrepair 容错）。
 */
import { jsonrepair } from "jsonrepair";
import { parseCtaFromAiContent } from "./parseCtaFromAiContent";

const LOVART_REPLY_FENCE = /```lovart-reply\s*\n([\s\S]*?)```/i;

export type LovartSectionLevel = "h2" | "h3" | "h4";

export type LovartStructuredSection = {
  heading?: string;
  level?: LovartSectionLevel;
  paragraphs?: string[];
  bullets?: string[];
};

/** 有序混合块：文字 / 标题 / 图片 / 视频 / 表格，按数组顺序渲染 */
export type LovartContentBlock =
  | { type: "heading"; text: string; level?: LovartSectionLevel }
  | { type: "text"; content: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "video"; url: string; poster?: string; caption?: string }
  | { type: "table"; headers: string[]; rows: string[][] };

/** 与模型约定字段（均可选），见服务端 system 提示 */
export type LovartStructuredReply = {
  title?: string;
  subtitle?: string;
  summary?: string;
  /** 与 sections 可同时存在：先渲染 blocks，再渲染 sections（适合同一轮内图文表混合 + 传统分节） */
  blocks?: LovartContentBlock[];
  sections?: LovartStructuredSection[];
  suggestions?: string[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 仅允许 http(s)，用于 img/video/src 与 poster */
function attrSafeHttpUrl(url: string): string | null {
  const t = typeof url === "string" ? url.trim() : "";
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function formatInline(s: string): string {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .map((p) => {
      if (p.startsWith("**") && p.endsWith("**") && p.length >= 4) {
        return `<strong class="font-semibold text-zinc-900">${escapeHtml(p.slice(2, -2))}</strong>`;
      }
      return escapeHtml(p);
    })
    .join("");
}

function isLikelyImageUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  if (!t) return false;
  if (
    /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/.test(t) ||
    /(^|\/\/)(image\.pollinations\.ai)(\/|$)/.test(t)
  ) {
    return true;
  }
  return false;
}

function extractFirstHttpUrl(text: string): string | null {
  const t = (text || "").trim();
  if (!t) return null;
  const m = t.match(/https?:\/\/[^\s<>"'`]+/i);
  if (!m?.[0]) return null;
  let u = m[0].trim();
  u = u.replace(/[，。；：！？、）】》〉」』”’.,;:!?)\]}]+$/g, "");
  return u || null;
}

function imageFigureHtml(url: string, altText = ""): string {
  const safe = attrSafeHttpUrl(url);
  if (!safe) return "";
  const alt = escapeHtml(altText.slice(0, 240));
  const src = escapeAttr(safe);
  return (
    `<figure class="mt-3 space-y-1.5 first:mt-0">` +
    `<img src="${src}" alt="${alt}" class="w-full max-h-[min(70vh,520px)] object-contain rounded-lg border border-zinc-100 bg-zinc-50/80" loading="lazy" referrerpolicy="no-referrer" />` +
    `</figure>`
  );
}

function linesToBodyHtml(lines: string[]): string {
  const out: string[] = [];
  let i = 0;
  const para: string[] = [];
  const pBody =
    "text-sm text-zinc-800 leading-relaxed mt-2 first:mt-0 [&:empty]:hidden";

  const flushPara = () => {
    const text = para.join("\n").trim();
    if (text) {
      out.push(`<p class="${pBody}">${formatInline(text)}</p>`);
    }
    para.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^```image\s*$/i.test(trimmed)) {
      flushPara();
      i++;
      const blockLines: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        blockLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && /^```/.test(lines[i].trim())) i++;
      const blockRaw = blockLines.join("\n");
      const firstUrl = extractFirstHttpUrl(blockRaw);
      const firstNonEmpty = blockLines.map((x) => x.trim()).find(Boolean) ?? "";
      const safe = attrSafeHttpUrl(firstUrl ?? "");
      if (safe && isLikelyImageUrl(safe)) {
        out.push(imageFigureHtml(safe));
      } else if (firstNonEmpty) {
        out.push(`<p class="${pBody}">${escapeHtml(firstNonEmpty)}</p>`);
      }
      continue;
    }
    if (trimmed === "") {
      flushPara();
      i++;
      continue;
    }
    const mdImage = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/i);
    if (mdImage) {
      flushPara();
      const alt = (mdImage[1] ?? "").trim();
      const url = (mdImage[2] ?? "").trim();
      const safe = attrSafeHttpUrl(url);
      if (safe && isLikelyImageUrl(safe)) {
        out.push(imageFigureHtml(safe, alt));
        i++;
        continue;
      }
    }
    if (/https?:\/\//i.test(trimmed)) {
      const firstUrl = extractFirstHttpUrl(trimmed);
      const safe = attrSafeHttpUrl(firstUrl ?? "");
      if (safe && isLikelyImageUrl(safe)) {
        flushPara();
        out.push(imageFigureHtml(safe));
        i++;
        continue;
      }
    }
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      flushPara();
      const t = escapeHtml(line.replace(/^##\s+/, "").trim());
      out.push(
        `<p class="text-sm font-semibold text-zinc-900 mt-3 first:mt-0 leading-snug">${t}</p>`
      );
      i++;
      continue;
    }
    if (/^####\s+/.test(line)) {
      flushPara();
      const t = escapeHtml(line.replace(/^####\s+/, "").trim());
      out.push(
        `<p class="text-xs font-semibold text-zinc-800 mt-2.5 first:mt-0 leading-snug">${t}</p>`
      );
      i++;
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushPara();
      const t = escapeHtml(line.replace(/^###\s+/, "").trim());
      out.push(
        `<p class="text-sm font-medium text-zinc-900 mt-2.5 first:mt-0 leading-snug">${t}</p>`
      );
      i++;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      const liCls =
        "text-sm text-zinc-800 leading-relaxed pl-0.5 [&_strong]:font-semibold";
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const item = lines[i].replace(/^[-*]\s+/, "").trim();
        items.push(`<li class="${liCls}">${formatInline(item)}</li>`);
        i++;
      }
      out.push(
        `<ul class="mt-2 ml-4 list-disc space-y-0.5 marker:text-zinc-400">${items.join("")}</ul>`
      );
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      flushPara();
      const items: string[] = [];
      const liCls =
        "text-sm text-zinc-800 leading-relaxed pl-0.5 [&_strong]:font-semibold";
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\d+\.\s+/, "").trim();
        items.push(`<li class="${liCls}">${formatInline(item)}</li>`);
        i++;
      }
      out.push(
        `<ol class="mt-2 ml-4 list-decimal space-y-0.5 marker:text-zinc-400 marker:font-medium">${items.join("")}</ol>`
      );
      continue;
    }
    para.push(line);
    i++;
  }
  flushPara();
  return out.join("");
}

function stringArrayish(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim());
}

function normalizeBlocks(raw: unknown): LovartContentBlock[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const blocks: LovartContentBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const type = b.type;
    if (type === "heading" && typeof b.text === "string" && b.text.trim()) {
      const lv = b.level;
      const level =
        lv === "h2" || lv === "h3" || lv === "h4" ? lv : undefined;
      blocks.push({ type: "heading", text: b.text.trim(), level });
      continue;
    }
    if (type === "text" && typeof b.content === "string" && b.content.trim()) {
      blocks.push({ type: "text", content: b.content.trim() });
      continue;
    }
    if (type === "image" && typeof b.url === "string") {
      const u = attrSafeHttpUrl(b.url);
      if (!u) continue;
      blocks.push({
        type: "image",
        url: u,
        alt: typeof b.alt === "string" ? b.alt.slice(0, 500) : undefined,
        caption:
          typeof b.caption === "string" && b.caption.trim()
            ? b.caption.trim()
            : undefined,
      });
      continue;
    }
    if (type === "video" && typeof b.url === "string") {
      const u = attrSafeHttpUrl(b.url);
      if (!u) continue;
      const posterRaw =
        typeof b.poster === "string" ? b.poster.trim() : "";
      const poster = posterRaw ? attrSafeHttpUrl(posterRaw) : null;
      blocks.push({
        type: "video",
        url: u,
        poster: poster ?? undefined,
        caption:
          typeof b.caption === "string" && b.caption.trim()
            ? b.caption.trim()
            : undefined,
      });
      continue;
    }
    if (type === "table" && Array.isArray(b.headers)) {
      const headers = b.headers
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean);
      if (headers.length === 0) continue;
      const rowsRaw = b.rows;
      const rows: string[][] = [];
      if (Array.isArray(rowsRaw)) {
        for (const row of rowsRaw) {
          if (!Array.isArray(row)) continue;
          const r = row.map((c) =>
            typeof c === "string" ? c : String(c ?? "")
          );
          if (r.some((c) => c.length > 0)) rows.push(r);
        }
      }
      blocks.push({ type: "table", headers, rows });
    }
  }
  return blocks.length ? blocks : undefined;
}

function normalizeStructured(o: unknown): LovartStructuredReply | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const sectionsRaw = r.sections;
  let sections: LovartStructuredSection[] | undefined;
  if (Array.isArray(sectionsRaw)) {
    sections = sectionsRaw
      .map((item): LovartStructuredSection | null => {
        if (!item || typeof item !== "object") return null;
        const s = item as Record<string, unknown>;
        const lv = s.level;
        const level =
          lv === "h2" || lv === "h3" || lv === "h4" ? lv : undefined;
        return {
          heading: typeof s.heading === "string" ? s.heading : undefined,
          level,
          paragraphs: stringArrayish(s.paragraphs),
          bullets: stringArrayish(s.bullets),
        };
      })
      .filter((x): x is LovartStructuredSection => x !== null);
    if (sections.length === 0) sections = undefined;
  }
  const blocks = normalizeBlocks(r.blocks);
  const out: LovartStructuredReply = {
    title: typeof r.title === "string" ? r.title : undefined,
    subtitle: typeof r.subtitle === "string" ? r.subtitle : undefined,
    summary: typeof r.summary === "string" ? r.summary : undefined,
    blocks,
    sections,
    suggestions: stringArrayish(r.suggestions).slice(0, 4),
  };
  if (
    !out.title &&
    !out.subtitle &&
    !out.summary &&
    !out.sections?.length &&
    !out.blocks?.length &&
    !out.suggestions?.length
  ) {
    return null;
  }
  return out;
}

function parseLovartJsonInner(inner: string): LovartStructuredReply | null {
  const t = inner.trim();
  if (!t) return null;
  try {
    const repaired = jsonrepair(t);
    const parsed = JSON.parse(repaired) as unknown;
    return normalizeStructured(parsed);
  } catch {
    try {
      return normalizeStructured(JSON.parse(t) as unknown);
    } catch {
      return null;
    }
  }
}

function headingClass(level: LovartSectionLevel | undefined): string {
  switch (level) {
    case "h2":
      return "text-base font-bold text-zinc-900 mt-4 first:mt-0";
    case "h4":
      return "text-xs font-semibold text-zinc-700 mt-3";
    case "h3":
    default:
      return "text-sm font-semibold text-zinc-900 mt-3 first:mt-0";
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function lovartBlocksToHtml(blocks: LovartContentBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "heading":
        parts.push(
          `<p class="${headingClass(b.level)}">${escapeHtml(b.text)}</p>`
        );
        break;
      case "text":
        parts.push(
          `<p class="mt-2 text-sm leading-relaxed text-zinc-800 first:mt-0">${formatInline(b.content)}</p>`
        );
        break;
      case "image": {
        const alt = escapeHtml((b.alt ?? "").slice(0, 240));
        const src = escapeAttr(b.url);
        const cap = b.caption?.trim();
        parts.push(
          `<figure class="mt-3 space-y-1.5 first:mt-0">` +
            `<img src="${src}" alt="${alt}" class="w-full max-h-[min(70vh,520px)] object-contain rounded-lg border border-zinc-100 bg-zinc-50/80" loading="lazy" referrerpolicy="no-referrer" />` +
            (cap
              ? `<figcaption class="text-xs text-zinc-500">${formatInline(cap)}</figcaption>`
              : "") +
            `</figure>`
        );
        break;
      }
      case "video": {
        const cap = b.caption?.trim();
        const src = escapeAttr(b.url);
        const posterAttr = b.poster
          ? ` poster="${escapeAttr(b.poster)}"`
          : "";
        parts.push(
          `<figure class="mt-3 space-y-1.5 first:mt-0">` +
            `<video class="w-full max-h-[min(70vh,520px)] rounded-lg border border-zinc-100 bg-black/5" controls playsInline preload="metadata"${posterAttr}>` +
            `<source src="${src}" />` +
            `</video>` +
            (cap
              ? `<figcaption class="text-xs text-zinc-500">${formatInline(cap)}</figcaption>`
              : "") +
            `</figure>`
        );
        break;
      }
      case "table": {
        const th = b.headers
          .map(
            (h) =>
              `<th class="border-b border-zinc-200 px-3 py-2 font-medium text-zinc-900">${escapeHtml(h)}</th>`
          )
          .join("");
        const tb = b.rows
          .map((row) => {
            const cells = b.headers.map((_, j) => {
              const c = row[j] ?? "";
              return `<td class="border-b border-zinc-100 px-3 py-2 text-zinc-700">${escapeHtml(c)}</td>`;
            });
            return `<tr>${cells.join("")}</tr>`;
          })
          .join("");
        parts.push(
          `<div class="mt-3 overflow-x-auto rounded-lg border border-zinc-200 first:mt-0">` +
            `<table class="w-full min-w-[240px] border-collapse text-left text-sm">` +
            `<thead><tr class="bg-zinc-50">${th}</tr></thead>` +
            `<tbody>${tb}</tbody>` +
            `</table></div>`
        );
        break;
      }
      default:
        break;
    }
  }
  return parts.join("");
}

function lovartStructuredToHtml(data: LovartStructuredReply): string {
  const parts: string[] = [];
  parts.push(
    '<div class="rounded-xl border border-zinc-100 bg-gradient-to-b from-zinc-50/90 to-white px-3.5 py-3 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">'
  );
  if (data.title?.trim()) {
    parts.push(
      `<h3 class="text-[15px] font-bold leading-snug tracking-tight text-zinc-900">${escapeHtml(data.title.trim())}</h3>`
    );
  }
  if (data.subtitle?.trim()) {
    parts.push(
      `<p class="mt-1 text-xs font-medium text-zinc-500">${escapeHtml(data.subtitle.trim())}</p>`
    );
  }
  if (data.summary?.trim()) {
    parts.push(
      `<p class="mt-2.5 text-sm leading-relaxed text-zinc-700">${formatInline(data.summary.trim())}</p>`
    );
  }
  if (data.blocks?.length) {
    parts.push(
      '<div class="mt-3 flex flex-col gap-1 border-t border-zinc-100/90 pt-3">'
    );
    parts.push(lovartBlocksToHtml(data.blocks));
    parts.push("</div>");
  }
  if (data.sections?.length) {
    parts.push(
      '<div class="mt-3 flex flex-col gap-3 border-t border-zinc-100/90 pt-3">'
    );
    for (const sec of data.sections) {
      if (sec.heading?.trim()) {
        const lvl = sec.level ?? "h3";
        parts.push(
          `<p class="${headingClass(lvl)}">${escapeHtml(sec.heading.trim())}</p>`
        );
      }
      if (sec.paragraphs?.length) {
        for (const p of sec.paragraphs) {
          if (p.trim()) {
            parts.push(
              `<p class="text-sm leading-relaxed text-zinc-800">${formatInline(p.trim())}</p>`
            );
          }
        }
      }
      if (sec.bullets?.length) {
        const lis = sec.bullets
          .filter((b) => b.trim())
          .map(
            (b) =>
              `<li class="text-sm text-zinc-800 leading-relaxed pl-0.5">${formatInline(b.trim())}</li>`
          )
          .join("");
        if (lis) {
          parts.push(
            `<ul class="mt-1.5 ml-4 list-disc space-y-0.5 marker:text-zinc-400">${lis}</ul>`
          );
        }
      }
    }
    parts.push("</div>");
  }
  parts.push("</div>");
  return parts.join("");
}

function mergeCtas(
  fromCta: string[],
  fromStructured: string[] | undefined
): string[] {
  const out = [...fromCta];
  if (fromStructured?.length) {
    for (const s of fromStructured) {
      const t = s.trim();
      if (!t || out.includes(t) || out.length >= 4) continue;
      out.push(t);
    }
  }
  return out.slice(0, 4);
}

/**
 * 统一解析：lovart-reply JSON（自动修复）+ ```cta``` + 余下 Markdown/HTML。
 * 供服务端写入 cleaned / ctas，与前端 formatAiReplyToHtml 一致。
 */
export function composeAiReplyForApi(raw: string): {
  cleaned: string;
  ctas: string[];
} {
  const rawNorm = raw.replace(/\r\n/g, "\n");
  const fenceMatch = rawNorm.match(LOVART_REPLY_FENCE);
  let structured: LovartStructuredReply | null = null;
  let withoutLovart = rawNorm;

  if (fenceMatch) {
    structured = parseLovartJsonInner(fenceMatch[1] ?? "");
    if (structured) {
      withoutLovart = rawNorm.replace(LOVART_REPLY_FENCE, "").trimEnd();
    }
  }

  const { cleaned: textAfterCta, ctas: ctasFromFence } =
    parseCtaFromAiContent(withoutLovart);
  const ctas = mergeCtas(ctasFromFence, structured?.suggestions);

  const prose = textAfterCta
    .replace(/```image\s*([\s\S]*?)```/gi, (_all, inner: string) => {
      const url = extractFirstHttpUrl(String(inner ?? ""));
      return url ? `\n${url}\n` : "\n";
    })
    .trim();

  if (structured) {
    const structHtml = lovartStructuredToHtml(structured);
    const proseBlock = prose
      ? `<div class="ai-chat-reply ai-chat-reply-prose mt-4 border-t border-zinc-100 pt-4">${linesToBodyHtml(prose.split("\n"))}</div>`
      : "";
    return {
      cleaned: `<div class="ai-chat-reply ai-chat-reply-structured">${structHtml}${proseBlock}</div>`,
      ctas,
    };
  }

  if (/^<[a-z][\s\S]*>/i.test(prose)) {
    return { cleaned: prose, ctas };
  }
  return {
    cleaned: `<div class="ai-chat-reply">${linesToBodyHtml(prose.split("\n"))}</div>`,
    ctas,
  };
}

/** 将 AI 原文转为展示用 HTML（含结构化 JSON 路径） */
export function formatAiReplyToHtml(text: string): string {
  return composeAiReplyForApi(text).cleaned;
}

/** System 提示中附加给模型的结构化说明（与 LOVART_REPLY_FENCE 一致） */
export const LOVART_STRUCTURED_OUTPUT_GUIDE = `你可在答复末尾用**唯一**一个代码块输出结构化结果，fence 名必须为 lovart-reply（全小写），内容为 JSON。字段均为可选：title, subtitle, summary；sections（传统分节：每项可含 heading, level 取 h2|h3|h4, paragraphs, bullets）；**blocks**（**有序混合流**，与 sections 可同时存在，按数组顺序渲染；用于同一轮内交替输出文字/图/视频/表）：blocks 为对象数组，每项含 type 字段：type 为 heading 时还需 text（可含「1. xxx」编号标题）与可选 level(h2|h3|h4)；type 为 text 时需 content（一段中文，可含 **加粗**）；type 为 image 时需 url（必填，须为 https 可公开访问的图片地址），可选 alt、caption；type 为 video 时需 url（https 视频直链，如 .mp4），可选 poster（封面图 url）、caption；type 为 table 时需 headers（表头字符串数组）与 rows（二维字符串数组，列数与 headers 一致）。图片/视频 URL 须真实可播放；若无现成链接可省略该块、仅用文字说明。suggestions（1～4 条中文后续方向）将用作快捷按钮。JSON 必须用双引号；若使用 lovart-reply，快捷选项只放在 suggestions 里，**不要**再写 \`\`\`cta\`\`\`。也可在 lovart-reply 前先写自然语言，再输出该 JSON。`;
