/** 对话每轮（一次用户发送并得到本轮结果） */
export const CREDITS_PER_CHAT_ROUND = 2;
/** 视频：每秒钟 */
export const CREDITS_PER_VIDEO_SECOND = 10;
/** 单次文生图固定消耗（与文件体积无关） */
export const CREDITS_PER_IMAGE = 10;
/** @deprecated 与 CREDITS_PER_IMAGE 对齐，供旧代码 import */
export const CREDITS_PER_IMAGE_MB = CREDITS_PER_IMAGE;
/** 画布「生视频」关键帧当前仍走图像接口，按估算时长计费（秒） */
export const DEFAULT_VIDEO_KEYFRAME_BILL_SECONDS = 6;
/** 预估费用不足时阻止发送（按单次生图计） */
export const MIN_ESTIMATED_IMAGE_CHARGE = CREDITS_PER_IMAGE;
/** 侧栏生图预检：对话 + 最多按 3 张图预留 */
export const PRECHECK_IMAGE_SIDECHAT =
  CREDITS_PER_CHAT_ROUND + CREDITS_PER_IMAGE * 3;
/** 画布仅生图预检：按约 3 张预留 */
export const PRECHECK_CANVAS_IMAGE = CREDITS_PER_IMAGE * 3;
