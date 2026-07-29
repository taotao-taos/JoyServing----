/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 悬停展开的操作菜单 — 用于主按钮下拉的轻量选项列表。
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { PANEL } from '@/lib/ui';

export interface HoverActionMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface HoverActionMenuProps {
  trigger: React.ReactNode;
  items: HoverActionMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const HoverActionMenu: React.FC<HoverActionMenuProps> = ({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {trigger}
      {open && (
        <div
          className={cn(
            'absolute top-full z-30 pt-1.5 min-w-[148px]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className={cn(PANEL, 'py-1 shadow-[0_2px_10px_rgba(31,35,41,0.02)] ring-foreground/10')}>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-neutral-100 transition cursor-pointer"
              >
                {item.icon ? (
                  <span className="mt-0.5 text-neutral-500 shrink-0">{item.icon}</span>
                ) : null}
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold text-neutral-800">{item.label}</span>
                  {item.description ? (
                    <span className="block text-[10px] text-neutral-500 mt-0.5 leading-snug">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
