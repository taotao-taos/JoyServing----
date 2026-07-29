/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 大模型式提示输入框 — 圆角面板 + 底部工具栏 + 发送按钮。
 */

import React from 'react';
import { ChevronUp } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';

export interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  submitting?: boolean;
  footerStart?: React.ReactNode;
  className?: string;
  textareaClassName?: string;
  minRows?: number;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  maxLength = 500,
  disabled = false,
  submitting = false,
  footerStart,
  className,
  textareaClassName,
  minRows = 4,
}) => {
  const canSubmit = value.trim().length > 0 && !disabled && !submitting;

  return (
    <div
      className={cn(
        PANEL,
        'overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-ring/30',
        className,
      )}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        rows={minRows}
        maxLength={maxLength}
        disabled={disabled || submitting}
        className={cn(
          'w-full resize-none bg-transparent text-xs/relaxed text-neutral-800',
          'placeholder:text-neutral-500 px-4 pt-4 pb-2 outline-none leading-relaxed min-h-[108px]',
          textareaClassName,
        )}
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <div className="min-w-0">{footerStart ?? <span />}</div>
        <Button
          type="button"
          size="icon"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            'rounded-full shrink-0',
            canSubmit ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '',
          )}
          aria-label="发送"
        >
          <ChevronUp size={16} />
        </Button>
      </div>
    </div>
  );
};
