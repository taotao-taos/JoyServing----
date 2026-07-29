/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 左右分栏 + 可拖拽分隔条，两侧 min-width 约束下自适应。
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ResizableSplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  /** 左栏占比 0–1，默认 7/12 */
  defaultRatio?: number;
  /** 无持久化记录时，左栏默认像素宽（优先于 defaultRatio） */
  defaultLeftPx?: number;
  minLeftPx?: number;
  minRightPx?: number;
  /** localStorage key；不传则不持久化 */
  storageKey?: string;
  className?: string;
  /** 折叠左栏为固定窄宽（如侧栏收起） */
  collapsed?: boolean;
  collapsedLeftPx?: number;
  /** 左栏宽度低于此值时自动折叠为极简态 */
  collapseThresholdPx?: number;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export const ResizableSplitPane: React.FC<ResizableSplitPaneProps> = ({
  left,
  right,
  defaultRatio = 7 / 12,
  defaultLeftPx,
  minLeftPx = 300,
  minRightPx = 280,
  storageKey,
  className,
  collapsed = false,
  collapsedLeftPx = 64,
  collapseThresholdPx,
  onCollapsedChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const collapsedRef = useRef(collapsed);
  const ratioRef = useRef(defaultRatio);

  collapsedRef.current = collapsed;

  const [ratio, setRatio] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const n = parseFloat(saved);
        if (!Number.isNaN(n) && n > 0.05 && n < 0.95) return n;
      }
    }
    if (defaultLeftPx && typeof window !== 'undefined') {
      return defaultLeftPx / window.innerWidth;
    }
    return defaultRatio;
  });

  ratioRef.current = ratio;

  const clampRatio = useCallback(
    (next: number, width: number) => {
      const effectiveMinLeft =
        collapseThresholdPx && onCollapsedChange
          ? collapseThresholdPx / width
          : minLeftPx / width;
      const minLeft = effectiveMinLeft;
      const minRight = minRightPx / width;
      return Math.min(Math.max(next, minLeft), 1 - minRight);
    },
    [minLeftPx, minRightPx, collapseThresholdPx, onCollapsedChange],
  );

  // 首屏按容器实际宽度校准默认左栏像素宽
  useLayoutEffect(() => {
    if (!containerRef.current || !defaultLeftPx) return;
    if (storageKey && localStorage.getItem(storageKey)) return;
    const width = containerRef.current.getBoundingClientRect().width;
    if (width <= 0) return;
    setRatio(clampRatio(defaultLeftPx / width, width));
  }, [defaultLeftPx, storageKey, clampRatio]);

  // 从极简态展开时，恢复为默认展开宽度
  useEffect(() => {
    if (collapsed || !containerRef.current || !defaultLeftPx) return;
    const width = containerRef.current.getBoundingClientRect().width;
    if (width <= 0) return;
    const leftPx = ratioRef.current * width;
    if (leftPx <= collapsedLeftPx + 8) {
      setRatio(clampRatio(defaultLeftPx / width, width));
    }
  }, [collapsed, defaultLeftPx, collapsedLeftPx, clampRatio]);

  const tryAutoCollapse = useCallback(
    (leftPx: number) => {
      if (!collapseThresholdPx || !onCollapsedChange || collapsedRef.current) return false;
      if (leftPx < collapseThresholdPx) {
        onCollapsedChange(true);
        draggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        return true;
      }
      return false;
    },
    [collapseThresholdPx, onCollapsedChange],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const { left: l, width } = containerRef.current.getBoundingClientRect();
      const leftPx = e.clientX - l;
      if (tryAutoCollapse(leftPx)) return;
      setRatio(clampRatio(leftPx / width, width));
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (containerRef.current && collapseThresholdPx && onCollapsedChange && !collapsedRef.current) {
        const { left: l, width } = containerRef.current.getBoundingClientRect();
        const leftPx = ratioRef.current * width;
        if (leftPx < collapseThresholdPx) {
          onCollapsedChange(true);
          return;
        }
      }

      if (storageKey && !collapsedRef.current) {
        localStorage.setItem(storageKey, String(ratioRef.current));
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [clampRatio, storageKey, collapseThresholdPx, onCollapsedChange, tryAutoCollapse]);

  // 窗口缩放等导致左栏变窄时，同步切到极简态
  useEffect(() => {
    if (!collapseThresholdPx || !onCollapsedChange || !leftPanelRef.current) return;
    const el = leftPanelRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (!collapsedRef.current && w > 0 && w < collapseThresholdPx) {
        onCollapsedChange(true);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapseThresholdPx, onCollapsedChange]);

  const startDrag = () => {
    if (collapsed && onCollapsedChange) {
      onCollapsedChange(false);
    }
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const leftStyle = collapsed
    ? { width: collapsedLeftPx, flexShrink: 0 as const }
    : { width: `${ratio * 100}%`, flexShrink: 0 as const };

  return (
    <div
      ref={containerRef}
      className={cn('relative flex flex-1 min-h-0 min-w-0 overflow-hidden', className)}
    >
      <div
        ref={leftPanelRef}
        className="h-full min-w-0 overflow-hidden flex flex-col"
        style={leftStyle}
      >
        {left}
      </div>

      <div className="flex-1 h-full min-w-0 overflow-hidden flex flex-col">{right}</div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={collapsed ? '展开侧边栏' : '调整左右面板宽度'}
        onMouseDown={startDrag}
        className="group absolute top-0 bottom-0 z-10 w-0 cursor-col-resize touch-none"
        style={{ left: collapsed ? collapsedLeftPx : `${ratio * 100}%` }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 left-0 h-full w-px bg-neutral-200/80 transition-colors group-hover:bg-neutral-300/70 group-active:bg-neutral-300"
        />
        <span aria-hidden className="absolute top-0 bottom-0 -left-1.5 -right-1.5" />
      </div>
    </div>
  );
};
