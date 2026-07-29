import * as React from "react";
import { Loader2, Plus, Trash2 } from '@/lib/icons';
import { Button } from "@/components/ui/button";

export type StoryboardBatchConfirmPanelProps = {
  drafts: string[];
  onDraftsChange: (next: string[]) => void;
  onConfirm: (drafts: string[]) => void;
  onCancel: () => void;
  disabled?: boolean;
  splitting?: boolean;
};

export function StoryboardBatchConfirmPanel({
  drafts,
  onDraftsChange,
  onConfirm,
  onCancel,
  disabled,
  splitting,
}: StoryboardBatchConfirmPanelProps) {
  const validCount = drafts.filter((s) => s.trim().length > 0).length;

  return (
    <div
      className="mb-3 max-h-[min(52vh,420px)] overflow-y-auto rounded-[13px] border border-neutral-200 bg-neutral-50/95 p-3 shadow-sm"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-neutral-800">确认分镜提示词</p>
          <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">
            每条对应一格静帧；可编辑、增删行（至少 2 条有效内容）。完成后点「开始生成」。
          </p>
        </div>
        {splitting ? (
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            拆条中
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        {drafts.map((line, idx) => (
          <div key={idx} className="flex gap-1.5">
            <span className="mt-1.5 w-5 shrink-0 text-right text-[10px] font-medium text-neutral-400">
              {idx + 1}
            </span>
            <textarea
              value={line}
              onChange={(e) => {
                const next = [...drafts];
                next[idx] = e.target.value;
                onDraftsChange(next);
              }}
              disabled={disabled || splitting}
              rows={3}
              className="min-h-[72px] flex-1 resize-y rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:outline-none disabled:opacity-60"
              placeholder={`第 ${idx + 1} 格画面描述…`}
            />
            <button
              type="button"
              title="删除本行"
              disabled={
                disabled || splitting || drafts.length <= 2
              }
              onClick={() => {
                if (drafts.length <= 2) return;
                onDraftsChange(drafts.filter((_, i) => i !== idx));
              }}
              className="mt-1 shrink-0 self-start rounded p-1 text-neutral-400 hover:bg-neutral-200/80 hover:text-neutral-700 disabled:opacity-30"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={disabled || splitting || drafts.length >= 12}
          onClick={() => onDraftsChange([...drafts, ""])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          增加一格
        </Button>
        <span className="text-[11px] text-neutral-500">
          有效条数 {validCount} / {drafts.length}
        </span>
      </div>

      <div className="mt-3 flex justify-end gap-2 border-t border-neutral-200/80 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-xs"
          disabled={disabled || splitting}
          onClick={onCancel}
        >
          取消
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 min-w-[100px] text-xs"
          disabled={disabled || splitting || validCount < 2}
          onClick={() => onConfirm(drafts)}
        >
          开始生成
        </Button>
      </div>
    </div>
  );
}
