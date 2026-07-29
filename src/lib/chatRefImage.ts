const CN_COUNT: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

function chineseNumeralToInt(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (CN_COUNT[t] != null) return CN_COUNT[t];
  if (t.length === 2 && t[0] === "十" && CN_COUNT[t[1]] != null) {
    return 10 + CN_COUNT[t[1]]!;
  }
  if (t.length === 2 && CN_COUNT[t[0]] != null && t[1] === "十") {
    return CN_COUNT[t[0]]! * 10;
  }
  return null;
}

/**
 * 从用户自然语言中推断希望一次生成的张数（1～10），无法识别则 1。
 * 如：四张、4 张图、生成两张插画。
 */
export function inferRequestedImageCountFromPlain(text: string): number {
  const t = text.trim();
  if (!t) return 1;
  if (/四宫格|4\s*宫格/i.test(t)) return 4;
  if (/九宫格|9\s*宫格/i.test(t)) return 9;
  const digitPatterns = [
    /(\d{1,2})\s*(?:张|幅|个)(?:图|插画|海报|画面|版本|版)?/,
    /(?:共|一共|各|来|要|出|生成)\s*(\d{1,2})\s*(?:张|幅|个)/,
  ];
  for (const re of digitPatterns) {
    const m = re.exec(t);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 10) return n;
    }
  }
  const mCn = /([一二三四五六七八九十两]+)\s*(?:张|幅)(?:图|插画)?/.exec(t);
  if (mCn) {
    const n = chineseNumeralToInt(mCn[1]);
    if (n != null && n >= 1 && n <= 10) return n;
  }
  return 1;
}

/** 去掉参考图 chip 转纯文本后的占位文案（如「参考图 (1)」），避免生图 prompt 只剩无意义词 */
export function stripRefChipPlainNoise(plain: string): string {
  return plain
    .replace(/参考图\s*\(\d+\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 从侧栏输入 HTML 提取参考图 chip 的 src（顺序与 DOM 一致） */
export function extractRefImageSrcsFromUserHtml(html: string): string[] {
  if (typeof document === "undefined") return [];
  const d = document.createElement("div");
  d.innerHTML = html;
  const out: string[] = [];
  const nodes = d.querySelectorAll(
    "[data-preset-ref-chip] img[src], img.preset-ref-chip-thumb[src]"
  );
  for (const el of nodes) {
    const s = (el as HTMLImageElement).src?.trim();
    if (s) out.push(s);
  }
  return out;
}

/** 规范化后再做画幅推断（全角冒号、比例符 NFKC 等） */
function normalizeSizeInferenceText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\u2236/g, ":")
    .replace(/[﹕：]/g, ":")
    .trim();
}

function sizeFromAspectNumbers(w: number, h: number): string | null {
  if (w <= 0 || h <= 0 || !Number.isFinite(w) || !Number.isFinite(h)) {
    return null;
  }
  const r = w / h;
  if (Math.abs(r - 21 / 9) < 0.08 || Math.abs(r - 16 / 9) < 0.07) {
    return "1536x1024";
  }
  if (Math.abs(r - 9 / 16) < 0.07) return "1024x1536";
  if (Math.abs(r - 1) < 0.06) return "1024x1024";
  if (Math.abs(r - 4 / 3) < 0.09 || Math.abs(r - 3 / 2) < 0.09) {
    return "1536x1024";
  }
  if (Math.abs(r - 3 / 4) < 0.09 || Math.abs(r - 2 / 3) < 0.09) {
    return "1024x1536";
  }
  if (r > 1.22) return "1536x1024";
  if (r < 0.82) return "1024x1536";
  return null;
}

type SocialPlatform =
  | "xiaohongshu"
  | "douyin"
  | "kuaishou"
  | "bilibili"
  | "wechat_mp"
  | "wechat_video"
  | "weibo";

type SocialAsset = "avatar" | "banner" | "story" | "cover" | "feed";

export type ImageAspectBucket =
  | "square"
  | "landscape_16_9"
  | "portrait_9_16"
  | "portrait_3_4"
  | "landscape_4_3"
  | "landscape_3_2"
  | "portrait_2_3";

function detectSocialPlatform(t: string): SocialPlatform | null {
  if (/小红书|小红薯|xhs\b/i.test(t)) return "xiaohongshu";
  if (/抖音|douyin\b/i.test(t)) return "douyin";
  if (/快手|kuaishou\b/i.test(t)) return "kuaishou";
  if (/b\s*站|bilibili\b|哔哩哔哩/i.test(t)) return "bilibili";
  if (/公众号|微信公众(?:号)?|wechat\s*mp/i.test(t)) return "wechat_mp";
  if (/视频号|微信视频号|wechat\s*channels?/i.test(t)) return "wechat_video";
  if (/微博|weibo\b/i.test(t)) return "weibo";
  return null;
}

function detectSocialAsset(t: string): SocialAsset | null {
  if (/头像|profile\s*pic|avatar/i.test(t)) return "avatar";
  if (/banner|横幅|主页横幅|频道横幅|头图横幅|背景图|封面横幅/i.test(t)) {
    return "banner";
  }
  if (/story|限时动态|快拍|reels|竖屏故事/i.test(t)) return "story";
  if (/封面|封面图|头图|视频封面|直播封面/i.test(t)) return "cover";
  if (/信息流|帖子|笔记|正文配图|配图|主图|feed/i.test(t)) return "feed";
  return null;
}

/**
 * 社交媒体常见画幅 bucket（不直接绑定像素，交由服务端按 imageModel 决策最终 size）。
 */
export function inferSocialMediaAspectBucket(text: string): ImageAspectBucket | null {
  const t = normalizeSizeInferenceText(text);
  if (!t) return null;

  const platform = detectSocialPlatform(t);
  const asset = detectSocialAsset(t);
  if (!platform && !asset) return null;

  if (asset === "avatar") return "square";
  if (asset === "story") return "portrait_9_16";

  if (platform === "xiaohongshu") {
    if (asset === "banner") return "landscape_16_9";
    // 小红书笔记封面/主图更贴近 3:4
    return "portrait_3_4";
  }
  if (platform === "douyin" || platform === "kuaishou" || platform === "wechat_video") {
    if (asset === "banner") return "landscape_16_9";
    return "portrait_9_16";
  }
  if (platform === "bilibili") {
    if (asset === "feed") {
      return "square";
    }
    return "landscape_16_9";
  }
  if (platform === "wechat_mp") {
    return "landscape_16_9";
  }
  if (platform === "weibo") {
    if (asset === "banner") return "landscape_16_9";
    // 微博配图不强制，优先交给后续通用规则；此处不返回
    return null;
  }

  // 未识别平台但识别到素材类型：给出保守默认
  if (asset === "banner") return "landscape_16_9";
  if (asset === "cover") return "landscape_16_9";
  if (asset === "feed") return null;

  return null;
}

export function normalizeAspectBucketFromText(text: string): ImageAspectBucket | null {
  const t = normalizeSizeInferenceText(text);
  if (!t) return null;

  const social = inferSocialMediaAspectBucket(t);
  if (social) return social;

  if (/1\s*:\s*1|1:1|方形|方图|正方|square/i.test(t)) return "square";
  if (/3\s*:\s*4|3:4|笔记封面|小红书封面/i.test(t)) return "portrait_3_4";
  if (/4\s*:\s*3|4:3|传统画幅/i.test(t)) return "landscape_4_3";
  if (/16\s*:\s*9|16:9|横版|横屏|landscape|b\s*站|bilibili/i.test(t)) {
    return "landscape_16_9";
  }
  if (/9\s*:\s*16|9:16|竖版|竖屏|portrait|短视频竖屏|抖音|快手|视频号/i.test(t)) {
    return "portrait_9_16";
  }

  return null;
}

/**
 * 文生图尺寸推断（横 1536×1024、竖 1024×1536；服务端按模型映射为 1792 档等）。
 */
export function inferOpenAiGenerationSize(text: string): string {
  const t = normalizeSizeInferenceText(text);
  if (!t) return "1024x1024";

  /** 社交媒体优先：先推 bucket，再映射到通用尺寸（非最终落地像素，最终仍以服务端 family 为准） */
  const socialBucket = inferSocialMediaAspectBucket(t);
  if (socialBucket === "square") return "1024x1024";
  if (socialBucket === "landscape_16_9") return "1536x1024";
  if (socialBucket === "portrait_9_16") return "1024x1536";
  if (socialBucket === "portrait_3_4") return "1024x1536";
  if (socialBucket === "landscape_4_3") return "1536x1024";
  if (socialBucket === "landscape_3_2") return "1536x1024";
  if (socialBucket === "portrait_2_3") return "1024x1536";

  /** 显式像素「宽×高」，按比例归入横/竖/方（如 1200×630、1080×1920） */
  const pxDim = /(\d{3,4})\s*[×xX]\s*(\d{3,4})/.exec(t);
  if (pxDim) {
    const w = parseInt(pxDim[1]!, 10);
    const h = parseInt(pxDim[2]!, 10);
    const inferred = sizeFromAspectNumbers(w, h);
    if (inferred) return inferred;
  }

  if (
    /21\s*:\s*9|21:9|超宽屏|超宽|电影宽屏|ultrawide|cinematic\s*wide/i.test(t)
  ) {
    return "1536x1024";
  }

  const ratioWords = /(\d{1,4})\s*比\s*(\d{1,4})/.exec(t);
  if (ratioWords) {
    const a = parseInt(ratioWords[1]!, 10);
    const b = parseInt(ratioWords[2]!, 10);
    const inferred = sizeFromAspectNumbers(a, b);
    if (inferred) return inferred;
  }

  if (
    /16\s*:\s*9|16:9|1920\s*[×x]\s*1080|1080p|b\s*站|bilibili|横版海报|横版画面|宽屏|宽幅|landscape|宽图|\b1792\b|\b1536\b/i.test(
      t
    ) ||
    (/横版/.test(t) && !/竖版/.test(t))
  ) {
    return "1536x1024";
  }
  if (
    /9\s*:\s*16|9:16|1080\s*[×x]\s*1920|竖版海报|竖版画面|纵向|portrait|竖屏|手机屏|短视频竖屏/i.test(
      t
    ) ||
    (/竖版/.test(t) && !/横版/.test(t))
  ) {
    return "1024x1536";
  }
  if (/4\s*:\s*3|4:3|传统画幅/i.test(t)) {
    return "1536x1024";
  }
  if (/3\s*:\s*4|3:4/i.test(t)) {
    return "1024x1536";
  }
  if (/1\s*:\s*1|1:1|方形|方图|正方/i.test(t)) {
    return "1024x1024";
  }

  /** 未写比例但语境偏横屏物料（封面/头图/banner），且句中无竖版用语 */
  if (
    /封面(?:图)?|头图|顶部图|开屏横|banner|主视觉横|横图|扁图|宽幅主图|全屏横|横向长图/i.test(
      t
    ) &&
    !/竖版|竖屏|9\s*:\s*16|短视频竖|手机屏竖|立屏|易拉宝|展架/i.test(t)
  ) {
    return "1536x1024";
  }

  /** 易拉宝 / 门型展架等以竖幅为主 */
  if (/易拉宝|门型展架|[xX]\s*展架|展架竖|展板竖/i.test(t)) {
    return "1024x1536";
  }

  /** 未写比例时：小红书 / 抖音信息流默认竖幅（用户写「横」则上面已匹配横版规则） */
  if (
    /小红书|小红薯|抖音信息流|快手封面竖|视频号竖/i.test(t) &&
    !/横版|横屏|16\s*:\s*9|宽屏|landscape/i.test(t)
  ) {
    return "1024x1536";
  }

  return "1024x1024";
}

/**
 * 合并画幅推断：优先采用先验文本中的非 1:1 结果（通常传用户原句 + 合并后的 prompt），
 * 避免助手摘录的 prompt 丢了用户句里的「竖版 / 16:9」等词。
 */
export function coalesceInferOpenAiGenerationSize(
  primaryText: string,
  secondaryText: string
): string {
  const a = inferOpenAiGenerationSize(primaryText);
  if (a !== "1024x1024") return a;
  return inferOpenAiGenerationSize(secondaryText);
}

/** 请求 /api/images 时的尺寸：优先用户原句中的比例词，再回落到合并后的 prompt。 */
export function resolveImageGenerationSizeForRequest(args: {
  prompt: string;
  userPlainForSizeHint?: string | null;
}): string {
  const hint = args.userPlainForSizeHint?.trim();
  if (hint) {
    return coalesceInferOpenAiGenerationSize(hint, args.prompt);
  }
  return inferOpenAiGenerationSize(args.prompt);
}

/** 助手回复里展示的画幅说明（与服务端规范化前的常见档对齐） */
export function formatImageSizeUserLabel(size: string): string {
  const s = String(size ?? "")
    .trim()
    .toLowerCase()
    .replace(/×/g, "x");
  if (!s || s === "auto") return "默认约 1:1";
  if (s === "1024x1024") return "1:1（1024×1024 档）";
  if (s === "1536x1024" || s === "1792x1024") return "横版约 16:9 档";
  if (s === "1024x1536" || s === "1024x1792") return "竖版约 9:16 档";
  return size.trim();
}

/**
 * 是否像在对上一张图做编辑（无参考 chip 时才会挂上轮生成图）。
 * 勿把纯画幅描述（如「16:9 横版海报」）当成编辑，否则易误走 edits 得 1:1。
 */
export function looksLikeImageEditFollowUp(text: string): boolean {
  const t = normalizeSizeInferenceText(text);
  if (!t) return false;
  return /改|编辑|调整|换|重画|基于上|这张图|上一张|在图上|调色|裁剪|放大|缩小|再来一版|修图|按上|参照|照着|改成|改为|转横|转竖|修一下|把(?:这张|那张|图)|上一幅|刚生成的|再生成(?:这|那|张|幅)/i.test(
    t
  );
}
