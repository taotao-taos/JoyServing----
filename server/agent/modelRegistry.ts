export const CHAT_MODELS = [
  { id: "qwen3-vl-flash-2026-01-22", label: "Qwen 闪电", description: "速度最快，日常首选", badge: "默认" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet", description: "均衡高质量，策划推荐", badge: "推荐" },
  { id: "gpt-4o", label: "GPT-4o", description: "中文理解强，多模态输入", badge: null },
  { id: "deepseek-r2", label: "DeepSeek R2", description: "推理深度强", badge: null },
] as const;

export const IMAGE_MODELS = [
  { id: "gpt-image-1", label: "GPT Image", description: "质量最高，商业级", badge: "推荐", creditsPerImage: 2 },
  { id: "flux-2-flex", label: "FLUX 2 Flex", description: "速度快，风格自由", badge: "快速", creditsPerImage: 1 },
  { id: "doubao-seedream-4-5", label: "豆包 Seedream", description: "中文场景好，电商推荐", badge: null, creditsPerImage: 1 },
  { id: "Stable-Diffusion-3-5-Large", label: "SD 3.5", description: "细节丰富，插画强", badge: null, creditsPerImage: 1 },
] as const;

export type ChatModelId = (typeof CHAT_MODELS)[number]["id"];
export type ImageModelId = (typeof IMAGE_MODELS)[number]["id"];

export function isValidChatModel(id: string): boolean {
  return CHAT_MODELS.some((m) => m.id === id);
}
export function isValidImageModel(id: string): boolean {
  return IMAGE_MODELS.some((m) => m.id === id);
}

export const PLATFORM_SIZES: Record<string, string> = {
  xiaohongshu: "864x1152",
  weibo: "1080x1080",
  wechat: "1280x720",
  instagram: "1080x1080",
  youtube: "1280x720",
  bilibili: "1146x717",
  douyin: "1080x1920",
  custom: "1024x1024",
};
