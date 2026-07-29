/**
 * 结合「上一则助手 + 当前短句」判断是否应直接文生图（不再走编排追问）。
 */

import { stripRefChipPlainNoise } from "./chatRefImage";

/** 明显画面/版式约束：命中时优先整句用户输入，避免仅用工助手长文做图 */
const USER_VISUAL_CONSTRAINT_RE =
  /16\s*:\s*9|9\s*:\s*16|21\s*:\s*9|4\s*:\s*3|3\s*:\s*4|1\s*:\s*1|竖版|横版|方图|宽幅|宽屏|竖屏|超宽|landscape|portrait|1920|1080|1080p|主视觉|比例|画幅|构图/i;

export function shouldPreferUserOnlyForImagePrompt(userPlain: string): boolean {
  const uc = stripRefChipPlainNoise(userPlain);
  if (!uc) return false;
  if (uc.length >= 40) return true;
  if (USER_VISUAL_CONSTRAINT_RE.test(uc)) return true;
  return false;
}

/**
 * 助手抽取的 prompt 易偏离用户刚输入的约束；将用户本回合文字并入，并优先满足用户句。
 */
export function mergeExtractedImagePromptWithUser(
  extractedFromAssistant: string,
  userPlain: string
): string {
  const extr = extractedFromAssistant.trim();
  const uc = stripRefChipPlainNoise(userPlain);
  if (!extr) return uc.slice(0, 3800);
  if (!uc) return extr.slice(0, 3800);

  if (shouldPreferUserOnlyForImagePrompt(userPlain)) {
    return `${uc}\n\n【对话摘录（须符合上述用户约束，不得改题；可补充细节）】\n${extr.slice(
      0,
      1400
    )}`.slice(0, 3800);
  }

  if (extr.includes(uc) && uc.length >= 8) return extr.slice(0, 3800);
  if (
    uc.length <= 28 &&
    /^(确认|好|行|嗯|可以|OK|ok|那就|就这样|开始|立刻|马上|生成|出图)/i.test(
      uc
    ) &&
    extr.length >= 32
  ) {
    return `【用户已确认】${uc}\n\n【沿用对话中的画面描述】\n${extr}`.slice(
      0,
      3800
    );
  }
  // 用户句置前：部分模型对长助手摘录过重，易忽略文末「须优先满足」
  return `【用户本回合要求（最高优先级｜不得改题）】\n${uc}\n\n【可从下列摘录延展（须与上文一致）】\n${extr}`.slice(
    0,
    3800
  );
}

/** 模型口头承诺会去生成图（用于补偿实际未调生图 API 的兜底） */
export const ASSISTANT_PROMISED_IMAGE_GENERATION_RE =
  /请稍等|稍后|我将|马上|即将|正在为您|为您完成这幅作品|为你完成这幅作品|图片正在|正在生成中|正在为您生成|正在生成|生成中[，。、\s]|马上出图|立刻生成|开始生成|正在绘制|为您绘制|帮您绘制|正在出图|已为您开始|已提交生成|稍候|片刻|请稍候|这就去生成|这就为您|去生成|帮您出图/i;

/** 助手侧是否已出现「可以/准备生图、给出生图提示」等语义 */
export function assistantOfferedOrPreparedImageGeneration(
  assistantPlain: string
): boolean {
  const t = assistantPlain.trim();
  if (t.length < 16) return false;
  return /生图提示|定稿提示|出图提示|文生图|画面提示|提示词|为您生成|帮你生成|尝试生成|可以生成|准备生成|可以出图|准备出图|确认.{0,14}生成|(?:说|回复).{0,4}生成|若确认|若您确认|需要我.{0,10}生成|为您出图|先出图|试.{0,2}生成|关键帧|概念图|分镜.*图|静帧|插图|插画.{0,8}生成|按此.{0,10}出图|按以上.{0,12}出图|以上.{0,14}出图|是否为您|要不要.{0,12}(生成|出图|来一)/i.test(
    t
  );
}

/**
 * 用户短句确认「那就生成吧」类（避免长句里误判）
 * 须与 assistantOfferedOrPreparedImageGeneration 或 creagicPlanReady 等并用。
 */
export function isShortAffirmToGenerateImage(userPlain: string): boolean {
  const t = userPlain.trim();
  if (t.length < 2 || t.length > 48) return false;
  if (/^确认生成([。.!！…~\s]*)?$/i.test(t)) return true;
  if (/^就按(这个|此|以上|前面说的)(出图|生成)/i.test(t) && t.length <= 36) {
    return true;
  }
  if (/^(开始|立刻|马上)(出图|生成)([。.!！…~\s]*)?$/i.test(t)) return true;
  if (/^(生成|出图)(吧|了|下|啦|呗)?[。.!！…~\s]*$/i.test(t)) return true;
  if (
    /^(好|行|可以|嗯|OK|ok|那就|就这样|OK啦)[，,]?\s*(吧|呢)?[，,]?\s*(生成|出图)(吧|了|下)?[。.!！…~\s]*$/i.test(
      t
    )
  ) {
    return true;
  }
  if (
    /^(好|行|可以)[，,]?\s*(那|就)?\s*(生成|出图)/i.test(t) &&
    t.length <= 28
  ) {
    return true;
  }
  return false;
}

/**
 * 从上一则助手纯文本里抽生图可用的 prompt：优先 ``` 块，其次「提示词：」段，否则取尾部描述。
 */
export function extractImagePromptFromLastAssistant(
  assistantPlain: string,
  fallbackUserPlain: string
): string {
  const t = assistantPlain.trim();
  if (!t) return fallbackUserPlain.slice(0, 3800);

  const fence = /```(?:[^\n`]*\n)?([\s\S]*?)```/;
  const fm = t.match(fence);
  if (fm?.[1]?.trim()) {
    const block = fm[1].trim();
    if (block.length >= 12) return block.slice(0, 3800);
  }

  const label =
    /(?:生图|出图|定稿|画面|静帧|关键帧)[^。\n]{0,24}?提示[词]?[：:]\s*([\s\S]+?)(?=\n\n*(?:[#*]|$|\d+[\.\、]\s)|$)/i;
  const lm = t.match(label);
  if (lm?.[1]?.trim()) {
    const seg = lm[1].trim();
    if (seg.length >= 12) return seg.slice(0, 3800);
  }
  const labelPlain =
    /(?:^|[\n。])\s*提示[词]?[：:]\s*([\s\S]+?)(?=\n\n*(?:[#*]|---|$)|\n(?=[\d一二三四五六七八九十]+[\.、\s])|$)/im;
  const lpm = t.match(labelPlain);
  if (lpm?.[1]?.trim()) {
    const seg = lpm[1].trim();
    if (seg.length >= 12) return seg.slice(0, 3800);
  }

  const tail = t.slice(Math.max(0, t.length - 3200)).trim();
  if (tail.length >= 48) return tail.slice(0, 3800);

  return fallbackUserPlain.slice(0, 3800);
}
