import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Grid3X3, Layers, Loader2 } from '@/lib/icons';
import { cn } from "@/lib/utils";
import type { MediaModelManifestRow } from "@/src/lib/aiModelsRegistry";

function ModelRowIcon({ icon }: { icon?: string }) {
  if (icon === "grid") {
    return <Grid3X3 className="h-3.5 w-3.5 text-zinc-900" />;
  }
  if (icon === "layers") {
    return <Layers className="h-3.5 w-3.5 text-zinc-900" />;
  }
  return <Loader2 className="h-4 w-4" />;
}

/** 图像 / 视频（关键帧）上游模型；对话模型仍由服务端固定，与此无关 */
export function AiModelPopover({
  onClose,
  imageModels,
  videoModels,
  selectedImageApiModelId,
  selectedVideoApiModelId,
  onSelectImage,
  onSelectVideo,
  variant = "home",
  initialTab = "image",
  lockTab,
}: {
  onClose: () => void;
  imageModels: MediaModelManifestRow[];
  videoModels: MediaModelManifestRow[];
  selectedImageApiModelId: string;
  selectedVideoApiModelId: string;
  onSelectImage: (apiModelId: string) => void;
  onSelectVideo: (apiModelId: string) => void;
  variant?: "home" | "editor";
  initialTab?: "image" | "video";
  lockTab?: "image" | "video";
}) {
  const [activeTab, setActiveTab] = useState<"image" | "video">(
    lockTab ?? initialTab
  );
  useEffect(() => {
    setActiveTab(lockTab ?? initialTab);
  }, [initialTab, lockTab]);
  const wide = variant === "home";
  const rows = activeTab === "image" ? imageModels : videoModels;
  const selected =
    activeTab === "image"
      ? selectedImageApiModelId
      : selectedVideoApiModelId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={cn(
        "absolute bottom-20 right-0 overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50",
        wide ? "w-[480px] p-4" : "w-72 p-3.5"
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <h3
          className={cn(
            "font-bold text-zinc-900",
            wide ? "text-sm" : "text-base"
          )}
        >
          模型选择
        </h3>
      </div>

      {!lockTab && (
        <div className="mb-3 flex rounded-xl bg-zinc-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("image")}
            className={cn(
              "flex-1 rounded-lg py-1 text-[11px] font-semibold transition-all",
              activeTab === "image"
                ? "border border-zinc-100 bg-white text-zinc-900 shadow-sm"
                : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            图像
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("video")}
            className={cn(
              "flex-1 rounded-lg py-1 text-[11px] font-semibold transition-all",
              activeTab === "video"
                ? "border border-zinc-100 bg-white text-zinc-900 shadow-sm"
                : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            视频
          </button>
        </div>
      )}

      <div
          className={cn("mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400")}
      >
        {activeTab === "image" ? "图像模型" : "视频 / 关键帧模型"}
      </div>
      {rows.length === 0 ? (
        <p className="px-1 py-3 text-xs text-zinc-400">
          未配置{" "}
          {activeTab === "image" ? "imageModels" : "videoModels"}，请检查
          manifest。
        </p>
      ) : (
        <div
          className={cn(
            "overflow-y-auto pr-1 scrollbar-hide",
            wide ? "max-h-[228px] grid grid-cols-1 gap-1.5" : "max-h-[228px] space-y-1.5"
          )}
        >
          {rows.map((model) => (
            <div
              key={model.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (activeTab === "image") {
                  onSelectImage(model.apiModelId);
                } else {
                  onSelectVideo(model.apiModelId);
                }
                onClose();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (activeTab === "image") {
                    onSelectImage(model.apiModelId);
                  } else {
                    onSelectVideo(model.apiModelId);
                  }
                  onClose();
                }
              }}
              className={cn(
                "group relative flex cursor-pointer items-center gap-2 rounded-xl border border-transparent transition-all",
                wide ? "p-2" : "p-2.5",
                selected === model.apiModelId
                  ? "border-zinc-100 bg-zinc-50"
                  : "hover:border-zinc-100 hover:bg-zinc-50"
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                <ModelRowIcon icon={model.icon} />
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div className="min-w-0 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "shrink-0 font-semibold text-zinc-900",
                      wide ? "text-[12px]" : "text-[13px]"
                    )}
                  >
                    {model.title}
                  </span>
                </div>
                <span
                  className={cn(
                    "min-w-0 truncate text-zinc-500",
                    wide ? "text-[11px]" : "text-[12px]"
                  )}
                  title={model.desc}
                >
                  {model.desc || model.apiModelId}
                </span>
                {model.isDefault && (
                  <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-500">
                    默认
                  </span>
                )}
                {model.memberOnly && (
                  <span className="shrink-0 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-600">
                    会员
                  </span>
                )}
                {model.etaHint && model.etaHint !== "—" && (
                  <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500">
                    {model.etaHint}
                  </span>
                )}
              </div>
              {selected === model.apiModelId && (
                <div
                  className={cn(
                    "mt-0.5 flex shrink-0 items-center justify-center rounded bg-zinc-900 text-white",
                    wide ? "h-3.5 w-3.5" : "h-4 w-4"
                  )}
                >
                  <Plus
                    className={
                      wide ? "h-2 w-2 rotate-45" : "h-2.5 w-2.5 rotate-45"
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
