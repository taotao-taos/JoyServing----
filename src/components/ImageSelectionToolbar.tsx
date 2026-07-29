import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Crop,
  Download,
  Eraser,
  Expand,
  ImageUpscale,
  ImageOff,
  Layers2,
  Loader2,
  MoreHorizontal,
  Shirt,
  Type,
} from '@/lib/icons';
import { cn } from "@/lib/utils";

export type ActionId =
  | "upscale"
  | "removeBg"
  | "mockup"
  | "erase"
  | "editElements"
  | "editText"
  | "outpaint"
  | "crop"
  | "download";

const MAIN_ITEMS: {
  id: ActionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "upscale", label: "质感增强", icon: ImageUpscale },
  { id: "removeBg", label: "移除背景", icon: ImageOff },
  { id: "mockup", label: "Mockup", icon: Shirt },
  { id: "erase", label: "擦除", icon: Eraser },
  { id: "editElements", label: "编辑元素", icon: Layers2 },
  { id: "editText", label: "编辑文字", icon: Type },
  { id: "outpaint", label: "扩展", icon: Expand },
];

/** 选中画布图片时悬停工具栏；未传 onAction 时仅为约 1.4s 加载占位（便于 UI 调试） */
export function ImageSelectionToolbar({
  className,
  onAction,
}: {
  className?: string;
  onAction?: (id: ActionId) => Promise<void> | void;
}) {
  const [loadingId, setLoadingId] = useState<ActionId | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const runAction = async (id: ActionId) => {
    if (loadingId) return;
    setLoadingId(id);
    try {
      if (onAction) {
        await onAction(id);
      } else {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 1400));
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div
      ref={wrapRef}
      role="toolbar"
      aria-orientation="horizontal"
      aria-label="图像编辑"
      className={cn(
        "flex h-10 items-center gap-0.5 rounded-[13px] border border-neutral-200/90 bg-white px-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
        className
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {MAIN_ITEMS.map(({ id, label, icon: Icon }) => {
        const busy = loadingId === id;
        const anyBusy = loadingId != null;
        return (
          <button
            key={id}
            type="button"
            disabled={anyBusy}
            aria-busy={busy}
            aria-label={label}
            onClick={() => void runAction(id)}
            className={cn(
              "flex h-8 shrink-0 flex-row items-center gap-1.5 rounded-lg px-2 text-left transition-colors",
              anyBusy && !busy && "opacity-45",
              busy && "bg-neutral-100",
              !anyBusy && "hover:bg-neutral-50"
            )}
          >
            {busy ? (
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-[#00A3FF]"
                aria-hidden
              />
            ) : (
              <Icon className="h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
            )}
            <span className="max-w-[5.5rem] truncate text-xs font-medium text-neutral-700">
              {label}
            </span>
          </button>
        );
      })}

      <div className="relative flex items-center">
        <button
          type="button"
          disabled={loadingId != null}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          aria-label="更多"
          onClick={() => setMoreOpen((o) => !o)}
          className={cn(
            "flex h-8 shrink-0 flex-row items-center gap-1 rounded-lg px-2 transition-colors",
            moreOpen ? "bg-neutral-100" : "hover:bg-neutral-50",
            loadingId != null && "opacity-45"
          )}
        >
          <MoreHorizontal className="h-4 w-4 shrink-0 text-neutral-700" />
          <span className="text-xs font-medium text-neutral-700">更多</span>
        </button>
        {moreOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-10 mt-1.5 min-w-[140px] rounded-[13px] border border-neutral-200 bg-white py-1 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              disabled={loadingId != null}
              className="flex w-full flex-row items-center gap-2 px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              onClick={() => {
                setMoreOpen(false);
                void runAction("crop");
              }}
            >
              {loadingId === "crop" ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#00A3FF]" />
              ) : (
                <Crop className="h-4 w-4 shrink-0 text-neutral-600" />
              )}
              <span>裁剪</span>
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={loadingId != null}
        aria-label="下载"
        onClick={() => void runAction("download")}
        className={cn(
          "flex h-8 shrink-0 flex-row items-center gap-1.5 rounded-lg px-2 transition-colors hover:bg-neutral-50 disabled:opacity-45",
          loadingId === "download" && "bg-neutral-100"
        )}
      >
        {loadingId === "download" ? (
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-[#00A3FF]"
            aria-hidden
          />
        ) : (
          <Download className="h-4 w-4 shrink-0 text-neutral-700" aria-hidden />
        )}
        <span className="text-xs font-medium text-neutral-700">下载</span>
      </button>
    </div>
  );
}
