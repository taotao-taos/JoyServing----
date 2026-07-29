/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 统一弹窗：遮罩 + 面板 + 标题区 + 底部操作区。
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { MODAL_OVERLAY, MODAL_PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  icon,
  title,
  children,
  footer,
  maxWidth = 'max-w-sm',
}) => {
  if (!open) return null;

  return createPortal(
    <div className={cn(MODAL_OVERLAY, 'z-[130]')} onClick={onClose}>
      <div
        className={cn(MODAL_PANEL, maxWidth)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="text-sm font-semibold tracking-tight text-neutral-900 mb-4 flex items-center gap-1.5">
          {icon ? (
            <span className="text-neutral-400 shrink-0 flex items-center">{icon}</span>
          ) : null}
          <span>{title}</span>
        </h2>

        <div className="text-xs text-neutral-800 leading-relaxed">{children}</div>

        {footer ? (
          <div className="flex gap-2 justify-end mt-6 pt-3 border-t border-neutral-100">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};
