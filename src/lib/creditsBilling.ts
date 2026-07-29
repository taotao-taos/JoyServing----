import {
  CREDITS_PER_CHAT_ROUND,
  CREDITS_PER_IMAGE,
  CREDITS_PER_VIDEO_SECOND,
} from "./creditsConstants";

/** 文生图按次固定扣费（与返回体积无关） */
export function creditsForImageBytes(_billedBytes: number): number {
  return CREDITS_PER_IMAGE;
}

export function creditsForVideoSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return CREDITS_PER_VIDEO_SECOND;
  }
  return Math.ceil(seconds) * CREDITS_PER_VIDEO_SECOND;
}

export function creditsForChatRound(): number {
  return CREDITS_PER_CHAT_ROUND;
}
