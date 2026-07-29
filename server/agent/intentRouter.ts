import { handleRouteIntentRequest } from "../aiHandlers";

export type EnhancedIntent = {
  mode: "chat" | "image_gen" | "image_edit" | "plan" | "video";
  optimized_prompt?: string;
  reason?: string;
};

export async function routeIntentEnhanced(params: {
  userText: string;
  hasReferenceImage?: boolean;
  hasPriorGeneratedImage?: boolean;
}): Promise<EnhancedIntent | null> {
  const out = await handleRouteIntentRequest({
    userText: params.userText,
    hasReferenceImage: Boolean(params.hasReferenceImage),
    hasPriorGeneratedImage: Boolean(params.hasPriorGeneratedImage),
  });
  if (out.status !== 200) return null;
  const body = out.body as Record<string, unknown>;
  const mode = body.mode;
  if (
    mode !== "chat" &&
    mode !== "image_gen" &&
    mode !== "image_edit" &&
    mode !== "plan" &&
    mode !== "video"
  ) {
    return null;
  }
  return {
    mode,
    optimized_prompt:
      typeof body.optimized_prompt === "string" ? body.optimized_prompt : undefined,
    reason: typeof body.reason === "string" ? body.reason : undefined,
  };
}
