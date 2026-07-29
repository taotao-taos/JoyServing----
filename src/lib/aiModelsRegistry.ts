export type MediaModelManifestRow = {
  id: string;
  apiModelId: string;
  title: string;
  desc: string;
  isDefault?: boolean;
  icon?: "spin" | "grid" | "layers";
  /** 预估耗时等 UI 标签，如「20s」「300s」 */
  etaHint?: string;
  /** 显示「会员专属」等 */
  memberOnly?: boolean;
};

export type AiModelsManifest = {
  /** 部署文档用，客户端对话不读此字段选模型 */
  chatModel?: string;
  routerModel?: string;
  imageModels?: MediaModelManifestRow[];
  videoModels?: MediaModelManifestRow[];
};

let cached: AiModelsManifest = { imageModels: [], videoModels: [] };
let loadPromise: Promise<AiModelsManifest> | null = null;

export async function ensureAiModelsLoaded(): Promise<AiModelsManifest> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const r = await fetch("/ai-models/manifest.json", { cache: "no-store" });
      if (!r.ok) {
        cached = { imageModels: [], videoModels: [] };
        return cached;
      }
      const j = (await r.json()) as AiModelsManifest;
      const imageModels = Array.isArray(j.imageModels) ? j.imageModels : [];
      const videoModelsRaw = Array.isArray(j.videoModels) ? j.videoModels : [];
      const videoModels =
        videoModelsRaw.length > 0 ? videoModelsRaw : imageModels;
      cached = {
        chatModel:
          typeof j.chatModel === "string" ? j.chatModel.trim() : undefined,
        routerModel:
          typeof j.routerModel === "string" ? j.routerModel.trim() : undefined,
        imageModels,
        videoModels,
      };
      return cached;
    } catch {
      cached = { imageModels: [], videoModels: [] };
      return cached;
    }
  })();
  return loadPromise;
}

export function getAiModelsManifest(): AiModelsManifest {
  return cached;
}

export function getDefaultImageApiModelId(): string {
  const rows = cached.imageModels ?? [];
  const d = rows.find((x) => x.isDefault);
  return (d ?? rows[0])?.apiModelId ?? "Stable-Diffusion-3-5-Large";
}

export function getDefaultVideoApiModelId(): string {
  const rows = cached.videoModels ?? cached.imageModels ?? [];
  const d = rows.find((x) => x.isDefault);
  return (d ?? rows[0])?.apiModelId ?? getDefaultImageApiModelId();
}
