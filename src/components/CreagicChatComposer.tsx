import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  BookOpen,
  Lightbulb,
  Box,
  ArrowUp,
  X,
  LayoutGrid,
} from '@/lib/icons';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AiModelPopover } from "@/components/AiModelPopover";
import type { EditorSkill } from "@/src/config/editorSkills";
import {
  ensureEditorSkillsLoaded,
  getEditorSkillsList,
} from "@/src/lib/editorSkillsRegistry";
import type { MediaModelManifestRow } from "@/src/lib/aiModelsRegistry";
import { EDITOR_SKILL_VISUAL } from "@/src/lib/editorSkillVisual";
import {
  buildRefChipHtmlFromUrl,
  nextRefChipIndex,
} from "@/src/lib/refChipHtml";
import { useDismissOnOutsidePressAny } from "@/src/lib/useDismissOnOutsidePress";
import { insertHtmlIntoContentEditable } from "@/src/lib/richChatContent";
import { useAppToast } from "@/src/lib/AppToastProvider";

const HOME_TYPEWRITER_PHRASES = [
  "让 Creagic AI创建一个温馨的咖啡厅风格菜单海报",
  "让 Creagic AI创建一张美丽的婚礼海报",
  "让 Creagic AI创建一张高转化的电商图",
] as const;

export type CreagicChatComposerVariant = "home" | "editor";

export type CreagicChatComposerProps = {
  variant: CreagicChatComposerVariant;
  richInputRef: React.RefObject<HTMLDivElement | null>;
  /** 输入变化时调用（用于父级同步 hasContent 等） */
  onRichSync?: () => void;
  dataPlaceholder?: string;
  /** 首页：打字机空态 */
  enableTypewriterPlaceholder?: boolean;
  presetPayload?: { html: string; nonce: number } | null;
  belowInputSlot?: React.ReactNode;
  selectedSkill: string | null;
  onSelectedSkillChange: (id: string | null) => void;
  deepThinkMode: boolean;
  onDeepThinkToggle: () => void;
  imageModelRows: MediaModelManifestRow[];
  videoModelRows: MediaModelManifestRow[];
  selectedImageModel: string;
  selectedVideoModel: string;
  onSelectedImageModelChange: (id: string) => void;
  onSelectedVideoModelChange: (id: string) => void;
  onEnter: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onSend?: () => void;
  sendButtonDisabled?: boolean;
  /** 替代右侧发送按钮区域（编辑器：loading / 停止） */
  sendAreaSlot?: React.ReactNode;
  /** 关闭技能面板时是否清除已选技能（与首页一致） */
  skillToggleClearsSelection?: boolean;
};

function ComposerTooltip({
  label,
  isVisible,
}: {
  label: string;
  isVisible: boolean;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          className="absolute bottom-full z-[60] mb-2 whitespace-nowrap rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {label}
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-neutral-900" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 首页与画布侧栏共用的富文本输入 + 工具条（参考图、技能、深度思考、模型、发送）。
 */
export function CreagicChatComposer({
  variant,
  richInputRef,
  onRichSync,
  dataPlaceholder = "输入你的创意...",
  enableTypewriterPlaceholder = false,
  presetPayload = null,
  belowInputSlot,
  selectedSkill,
  onSelectedSkillChange,
  deepThinkMode,
  onDeepThinkToggle,
  imageModelRows,
  videoModelRows,
  selectedImageModel,
  selectedVideoModel,
  onSelectedImageModelChange,
  onSelectedVideoModelChange,
  onEnter,
  onSend,
  sendButtonDisabled = false,
  sendAreaSlot,
  skillToggleClearsSelection = false,
}: CreagicChatComposerProps) {
  const toast = useAppToast();
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [hasContent, setHasContent] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isBoxTooltipOpen, setIsBoxTooltipOpen] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const [, bumpSkills] = useState(0);

  const skillsTriggerRef = useRef<HTMLDivElement>(null);
  const skillsPanelRef = useRef<HTMLDivElement>(null);
  const modelTriggerRef = useRef<HTMLDivElement>(null);
  const modelPanelRef = useRef<HTMLDivElement>(null);

  const skillsList: EditorSkill[] = getEditorSkillsList();

  useEffect(() => {
    void ensureEditorSkillsLoaded().then(() => bumpSkills((x) => x + 1));
  }, []);

  useDismissOnOutsidePressAny(
    isSkillsOpen,
    [skillsTriggerRef, skillsPanelRef],
    () => setIsSkillsOpen(false)
  );
  useDismissOnOutsidePressAny(
    isBoxTooltipOpen,
    [modelTriggerRef, modelPanelRef],
    () => setIsBoxTooltipOpen(false)
  );

  useEffect(() => {
    if (!isSkillsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsSkillsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSkillsOpen]);

  useEffect(() => {
    if (!presetPayload || !richInputRef.current) return;
    // 推荐卡片是“替换输入”语义：点击新卡片时先清空旧内容
    richInputRef.current.innerHTML = "";
    insertHtmlIntoContentEditable(
      richInputRef.current,
      presetPayload.html
    );
    const el = richInputRef.current;
    const plain = el.innerText?.trim() ?? "";
    const imgs = el.querySelectorAll("img").length;
    const chips = el.querySelectorAll("[data-preset-ref-chip]").length;
    setHasContent(plain.length > 0 || imgs > 0 || chips > 0);
    onRichSync?.();
  }, [presetPayload?.nonce, presetPayload, richInputRef, onRichSync]);

  useEffect(() => {
    if (!enableTypewriterPlaceholder || hasContent || inputFocused) {
      setTypewriterText("");
      return;
    }

    let cancelled = false;
    let phraseIdx = 0;
    let charIdx = 0;
    let t: ReturnType<typeof setTimeout> | undefined;

    const step = () => {
      if (cancelled) return;
      if (t !== undefined) clearTimeout(t);
      const full =
        HOME_TYPEWRITER_PHRASES[phraseIdx % HOME_TYPEWRITER_PHRASES.length];
      if (charIdx < full.length) {
        setTypewriterText(full.slice(0, charIdx + 1));
        charIdx++;
        t = setTimeout(step, 42);
      } else {
        t = setTimeout(() => {
          if (cancelled) return;
          phraseIdx += 1;
          charIdx = 0;
          setTypewriterText("");
          t = setTimeout(() => {
            if (cancelled) return;
            step();
          }, 450);
        }, 2200);
      }
    };

    t = setTimeout(() => {
      if (!cancelled) step();
    }, 400);

    return () => {
      cancelled = true;
      if (t !== undefined) clearTimeout(t);
    };
  }, [enableTypewriterPlaceholder, hasContent, inputFocused]);

  const sync = () => {
    const el = richInputRef.current;
    if (!el) return;
    const plain = el.innerText?.trim() ?? "";
    setHasContent(
      plain.length > 0 ||
        el.querySelectorAll("img").length > 0 ||
        el.querySelectorAll("[data-preset-ref-chip]").length > 0
    );
    onRichSync?.();
  };

  const onPickImage = () => imageFileRef.current?.click();

  const containerClass =
    variant === "home"
      ? "relative rounded-[28px] border border-[#f0f0f0] bg-white p-6 shadow-[0px_2px_60px_0px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
      : "relative rounded-[24px] border border-neutral-50 bg-white p-4 shadow-[0_4px_20px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_4px_20px_rgb(0,0,0,0.04)]";

  const richClass = cn(
    "relative z-[1] w-full border-none bg-transparent text-neutral-900 outline-none focus:ring-0",
    variant === "home" && "min-h-[64px] text-base",
    variant === "editor" &&
      "max-h-[200px] min-h-[40px] overflow-y-auto text-sm leading-relaxed focus:outline-none focus:ring-0 empty:before:text-sm empty:before:text-neutral-400 empty:before:content-[attr(data-placeholder)]"
  );

  const skillsPanelClass =
    "absolute bottom-28 left-6 z-50 w-[480px] rounded-[13px] border border-neutral-100 bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)]";

  return (
    <div className={containerClass}>
      <AnimatePresence>
        {isSkillsOpen && (
          <div ref={skillsPanelRef}>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={skillsPanelClass}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-neutral-900">技能文档</h3>
                <button
                  type="button"
                  aria-label="关闭技能列表"
                  onClick={() => setIsSkillsOpen(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="scrollbar-hide grid max-h-[240px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                {skillsList.map((skill) => {
                  const vis = EDITOR_SKILL_VISUAL[skill.id] ?? {
                    icon: LayoutGrid,
                    color: "bg-neutral-50 text-neutral-500",
                  };
                  const Icon = vis.icon;
                  return (
                    <div
                      key={skill.id}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectedSkillChange(skill.id);
                          setIsSkillsOpen(false);
                        }
                      }}
                      onClick={() => {
                        onSelectedSkillChange(skill.id);
                        setIsSkillsOpen(false);
                      }}
                      className={cn(
                        "group flex cursor-pointer items-start gap-3 rounded-[13px] border border-transparent p-2 transition-all",
                        selectedSkill === skill.id
                          ? "border-neutral-100 bg-neutral-50"
                          : "hover:border-neutral-100 hover:bg-neutral-50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110",
                          vis.color
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs font-bold text-neutral-900">
                          {skill.title}
                        </span>
                        <span className="mt-0.5 line-clamp-1 text-[9px] text-neutral-400">
                          {skill.description}
                        </span>
                      </div>
                      {selectedSkill === skill.id && (
                        <div className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-neutral-900 text-white">
                          <Plus className="h-2 w-2 rotate-45" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBoxTooltipOpen && (
          <div ref={modelPanelRef}>
            <AiModelPopover
              variant={variant === "home" ? "home" : "editor"}
              imageModels={imageModelRows}
              videoModels={videoModelRows}
              selectedImageApiModelId={selectedImageModel}
              selectedVideoApiModelId={selectedVideoModel}
              onSelectImage={(id) => onSelectedImageModelChange(id)}
              onSelectVideo={(id) => onSelectedVideoModelChange(id)}
              onClose={() => setIsBoxTooltipOpen(false)}
            />
          </div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col gap-2">
        <div
          ref={richInputRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={variant === "editor" ? dataPlaceholder : undefined}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onInput={() => sync()}
          onKeyDown={onEnter}
          className={richClass}
        />
        {enableTypewriterPlaceholder &&
          !hasContent &&
          !inputFocused &&
          variant === "home" && (
            <div
              className="pointer-events-none absolute left-0 top-0 z-0 max-w-full pr-2 text-left text-base font-light leading-relaxed text-neutral-300"
              style={{ minHeight: 64 }}
              aria-hidden
            >
              {typewriterText}
              <span className="ml-px inline-block w-0.5 animate-pulse text-neutral-400">
                |
              </span>
            </div>
          )}
        {belowInputSlot}
      </div>

      <input
        ref={imageFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f?.type.startsWith("image/")) return;
          const reader = new FileReader();
          reader.onload = () => {
            const el = richInputRef.current;
            if (!el) return;
            const url = reader.result as string;
            const idx = nextRefChipIndex(el.innerHTML);
            el.insertAdjacentHTML("beforeend", buildRefChipHtmlFromUrl(url, idx));
            sync();
            toast(`图片上传成功（参考图 ${idx}）`);
          };
          reader.readAsDataURL(f);
        }}
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <ComposerTooltip
              label="上传参考图"
              isVisible={hoveredIcon === "upload"}
            />
            <button
              type="button"
              onMouseEnter={() => setHoveredIcon("upload")}
              onMouseLeave={() => setHoveredIcon(null)}
              onClick={onPickImage}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-100 text-neutral-400 transition-all hover:bg-neutral-50 hover:text-neutral-600"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div
            ref={skillsTriggerRef}
            className="relative flex items-center justify-center"
          >
            <ComposerTooltip
              label="技能文档"
              isVisible={hoveredIcon === "skill"}
            />
            <button
              type="button"
              aria-expanded={isSkillsOpen}
              aria-haspopup="dialog"
              onMouseEnter={() => setHoveredIcon("skill")}
              onMouseLeave={() => setHoveredIcon(null)}
              onClick={() => {
                setIsSkillsOpen((open) => {
                  if (open) {
                    if (skillToggleClearsSelection) {
                      onSelectedSkillChange(null);
                    }
                    return false;
                  }
                  setIsBoxTooltipOpen(false);
                  return true;
                });
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                isSkillsOpen || selectedSkill
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-100 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
              )}
            >
              <BookOpen className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <ComposerTooltip
              label={
                deepThinkMode ? "深度思考：已开启" : "深度思考：关闭"
              }
              isVisible={hoveredIcon === "think"}
            />
            <button
              type="button"
              onMouseEnter={() => setHoveredIcon("think")}
              onMouseLeave={() => setHoveredIcon(null)}
              onClick={() => onDeepThinkToggle()}
              aria-pressed={deepThinkMode}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                deepThinkMode
                  ? "border-amber-400 bg-amber-50 text-amber-600"
                  : "border-neutral-100 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"
              )}
            >
              <Lightbulb className="h-4 w-4" />
            </button>
          </div>
          <div
            ref={modelTriggerRef}
            className="relative flex items-center justify-center"
          >
            <ComposerTooltip
              label="模型选择"
              isVisible={hoveredIcon === "model"}
            />
            <button
              type="button"
              onMouseEnter={() => setHoveredIcon("model")}
              onMouseLeave={() => setHoveredIcon(null)}
              onClick={() => {
                setIsBoxTooltipOpen((o) => !o);
                setIsSkillsOpen(false);
              }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                isBoxTooltipOpen
                  ? "border-cyan-500 bg-cyan-500 text-white"
                  : "border-cyan-100 text-cyan-500 hover:bg-neutral-50"
              )}
            >
              <Box className="h-4 w-4" />
            </button>
          </div>
          {sendAreaSlot ?? (
            <Button
              size="icon"
              type="button"
              onClick={() => onSend?.()}
              disabled={sendButtonDisabled}
              className={cn(
                "h-9 w-9 rounded-full shadow-sm transition-all",
                hasContent && !sendButtonDisabled
                  ? "scale-105 bg-neutral-900 text-white hover:bg-neutral-800"
                  : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
