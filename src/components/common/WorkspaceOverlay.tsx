/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 大型工作台弹层 — 适用于知识库管理、多 Tab 配置等宽屏操作场景。
 * 参考 PricingModal 尺寸策略，复用 MODAL_OVERLAY token。
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/lib/icons';
import { MODAL_OVERLAY } from '@/lib/ui';
import { cn } from '@/lib/utils';

export interface WorkspaceOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** 供读屏使用的标题 */
  ariaLabel: string;
  className?: string;
  /** 由内容区自行提供关闭入口时设为 false */
  showCloseButton?: boolean;
}

export const WorkspaceOverlay: React.FC<WorkspaceOverlayProps> = ({
  open,
  onClose,
  children,
  ariaLabel,
  className,
  showCloseButton = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={cn(MODAL_OVERLAY, 'z-[140] items-center justify-center p-3 sm:p-4')}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          'relative flex flex-col w-[min(94vw,1080px)] h-[min(86vh,720px)]',
          'bg-white text-neutral-800 rounded-[13px] shadow-2xl border border-neutral-200 border border-neutral-200',
          'overflow-hidden animate-in fade-in zoom-in-95 duration-200',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition cursor-pointer"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
};
