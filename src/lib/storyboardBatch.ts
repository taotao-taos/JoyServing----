import {
  inferRequestedImageCountFromPlain,
  stripRefChipPlainNoise,
} from "./chatRefImage";

/** 用户是否要求根据已有分镜脚本批量出静帧 */
/** 从用户短句推断希望生成的分镜格数，如「出 4 格」「四张分镜」 */
export function inferStoryboardShotCountFromUserPlain(
  userPlain: string
): number | null {
  const t = userPlain.trim();
  if (!t) return null;
  const digitM = t.match(
    /(\d{1,2})\s*(?:格|镜|张|幅|个)|(?:生成|出|画|做)\s*(\d{1,2})\s*(?:格|镜|张)?/
  );
  if (digitM) {
    const n = Number(digitM[1] ?? digitM[2]);
    if (n >= 2 && n <= 12) return n;
  }
  const cn: Record<string, number> = {
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
    两: 2,
  };
  for (const [w, v] of Object.entries(cn)) {
    if (new RegExp(`${w}\\s*[格镜张幅]`).test(t)) return v;
  }
  return null;
}

/**
 * 从用户话里解析「第几格 / 第几张」分镜（1-based），如「第一张」「第 2 格」「第3镜」。
 */
export function parseRequestedStoryboardPanelIndex(
  userPlain: string
): number | null {
  const t = userPlain.trim();
  if (!t) return null;
  if (/首\s*[格镜幅]|第\s*一\s*[张格镜幅]/.test(t)) return 1;
  const mDig = t.match(/第\s*(\d{1,2})\s*[张格镜幅]/);
  if (mDig) {
    const n = Number(mDig[1]);
    if (n >= 1 && n <= 12) return n;
  }
  const mCn = t.match(/第\s*([一二三四五六七八九十两]+)\s*[张格镜幅]/);
  if (mCn) {
    const w = mCn[1]!;
    const map: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
      十: 10,
      两: 2,
    };
    if (w.length === 1 && map[w] != null) return map[w]!;
    if (w === "十一") return 11;
    if (w === "十二") return 12;
  }
  return null;
}

/**
 * 用户是否想**基于某一格已生成分镜图**再出**单张**新图（应把该格 URL 作为 referenceImageUrl，而非再走批量分镜或只合并文字）。
 */
export function userWantsSingleStoryboardPanelReference(
  userPlain: string
): boolean {
  const idx = parseRequestedStoryboardPanelIndex(userPlain);
  if (idx == null) return false;
  const t = userPlain;
  if (!/分镜|故事板|关键帧|静帧|镜头/.test(t)) return false;
  if (/\b(?:全部|所有|各(?:格|镜|张)|每(?:格|镜|张)|逐格|逐一|成套|整组)\b/.test(t)) {
    return false;
  }
  const batchN = inferStoryboardShotCountFromUserPlain(userPlain);
  if (batchN !== null && batchN >= 2) {
    if (!/第\s*(?:[一二三四五六七八九十两]|\d{1,2})\s*[张格镜幅]/.test(t)) {
      return false;
    }
  }
  return true;
}

/**
 * 去掉「生成分镜图第 N 张的…」等套话，保留实际画面需求（作文生图 / 编辑 prompt）。
 */
export function stripStoryboardPanelDirectiveForImagePrompt(
  userPlain: string
): string {
  let s = stripRefChipPlainNoise(userPlain) || userPlain.trim();
  s = s
    .replace(
      /^(?:请|帮我|麻烦)?\s*(?:基于|根据|参照)\s*(?:上面|上文|上一则|画布)?\s*(?:的)?\s*/i,
      ""
    )
    .replace(
      /生(?:成)?\s*分镜图?\s*第\s*[一二三四五六七八九十两\d]+\s*[张格镜幅的之]*\s*/gi,
      " "
    )
    .replace(
      /(?:按|依照)\s*分镜(?:图)?\s*第\s*[一二三四五六七八九十两\d]+\s*[张格镜幅的之]*\s*/gi,
      " "
    )
    .replace(
      /分镜(?:图)?\s*第\s*[一二三四五六七八九十两\d]+\s*[张格镜幅的之]*\s*/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return userPlain.trim().slice(0, 3800);
  return s.slice(0, 3800);
}

export function userWantsStoryboardBatchImages(userPlain: string): boolean {
  const t = userPlain.trim();
  if (t.length < 2) return false;
  return (
    /分镜.*图|故事板.*图|分镜图|板绘图|格.*图|逐格出|每格出|每镜出|各镜出|各格出|按.{0,6}分镜|按上面.{0,8}出|按脚本.{0,8}出|出全.{0,6}格|全部出图|都出图|成套图|编号.{0,6}格|几格.{0,6}图|storyboard.*(image|panel|frame)/i.test(
      t
    ) ||
    (/生成|出|画|做|来/.test(t) &&
      /\d\s*[格镜张伟幅]|\d+张|\d+格|\d+镜|[一二三四五六七八九十]+[格镜张]/.test(t) &&
      /图|画面|帧|关键帧/.test(t))
  );
}

/** 匹配「1. xxx」「1、xxx」「1) xxx」「（1）xxx」等 */
const LINE_RE =
  /^\s*(?:[（(](\d{1,2})[）)]\s*[\.、:：]?\s*|(\d{1,2})\s*[\.、\):：])\s*(.+)$/;
/** 「镜头1：…」「第2镜：…」「第3格 …」等常见分镜写法 */
const SHOT_LINE_RE =
  /^\s*(?:镜头|镜|格|场|第)\s*(\d{1,2})\s*(?:镜|格|场)?\s*[：:\s]\s*(.+)$/;

/**
 * 从助手纯文本中提取编号分镜条（太短多为小标题，跳过）
 */
export function extractNumberedShotsFromAssistantText(
  plain: string,
  opts?: { max?: number; minLineLen?: number }
): string[] {
  const max = opts?.max ?? 12;
  const minLineLen = opts?.minLineLen ?? 4;
  const lines = plain.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    let body: string | null = null;
    const mNum = line.match(LINE_RE);
    if (mNum) {
      body = (mNum[3] ?? "").trim();
    } else {
      const mShot = line.match(SHOT_LINE_RE);
      if (mShot) body = (mShot[2] ?? "").trim();
    }
    if (!body || body.length < minLineLen) continue;
    out.push(body.slice(0, 1200));
    if (out.length >= max) break;
  }
  return out;
}

/**
 * 按用户话里的「六张」「4 格」等与已抽到的分镜条对齐预览行数（不足补空行，便于与加载格数一致）
 */
export function expandStoryboardDraftsToUserIntent(
  shots: string[],
  userPlain: string
): string[] {
  const fromStory = inferStoryboardShotCountFromUserPlain(userPlain);
  const fromPlain = inferRequestedImageCountFromPlain(userPlain);
  const target = Math.min(
    12,
    Math.max(
      shots.length,
      fromStory ?? 0,
      fromPlain >= 2 ? fromPlain : 0
    )
  );
  if (target <= shots.length) return shots.slice();
  const out = [...shots];
  while (out.length < target) out.push("");
  return out;
}
