/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 区块级加载占位：只盖住需要加载的那一块；尺寸按槽位选。
 */

import React from 'react';
import { MatrixLoader } from './MatrixLoader';
import { cn } from '@/lib/utils';

/** inline 按钮旁 / slot 列表空位 / panel 主内容区 */
export const LOADER_SIZE = {
  inline: 16,
  slot: 28,
  panel: 40,
} as const;

export type ContentBusySize = number | keyof typeof LOADER_SIZE;

export type ContentBusyProps = {
  busy: boolean;
  children?: React.ReactNode;
  className?: string;
  /** 默认 slot(28)；列表区用 panel(40)；按钮内用 inline(16) */
  size?: ContentBusySize;
  label?: string;
  /** busy 时半透明保留底层（少用） */
  keepChildren?: boolean;
  /** 列表/表体最小占位高度，避免布局跳动 */
  minHeight?: number | string;
};

function resolveSize(size: ContentBusySize): number {
  if (typeof size === 'number') return size;
  return LOADER_SIZE[size];
}

export const ContentBusy: React.FC<ContentBusyProps> = ({
  busy,
  children,
  className,
  size = 'slot',
  label,
  keepChildren = false,
  minHeight,
}) => {
  if (!busy) return <>{children}</>;

  const px = resolveSize(size);
  const loader = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 text-neutral-500 w-full',
        !minHeight && 'py-10',
        keepChildren && 'absolute inset-0 z-[1] bg-white/75',
        className,
      )}
      style={minHeight != null ? { minHeight } : undefined}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <MatrixLoader size={px} className="shrink-0" title={label || '加载中'} />
      {label ? <p className="text-[12px] leading-none">{label}</p> : null}
    </div>
  );

  if (!keepChildren) return loader;

  return (
    <div className="relative w-full" style={minHeight != null ? { minHeight } : undefined}>
      <div className="opacity-35 pointer-events-none select-none" aria-hidden>
        {children}
      </div>
      {loader}
    </div>
  );
};
