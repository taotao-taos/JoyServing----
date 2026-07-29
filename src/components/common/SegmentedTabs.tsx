/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 顶部分段切换器 — 全站统一 38px，样式来自 lib/ui SEGMENTED_*
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { SEGMENTED_BAR, segmentedItemClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

/** @deprecated 请优先用 SEGMENTED_BAR；保留别名以免旧引用断裂 */
export const SEGMENTED_TAB_BAR_CLASS = SEGMENTED_BAR;

export function segmentedTabButtonClass(active: boolean, className?: string) {
  return cn(segmentedItemClass(active), className);
}

export interface SegmentedTabOption {
  id: string;
  label: React.ReactNode;
  onSelect?: () => void;
}

interface SegmentedTabBarProps {
  items: SegmentedTabOption[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  stretch?: boolean;
  ariaLabel?: string;
}

export const SegmentedTabBar: React.FC<SegmentedTabBarProps> = ({
  items,
  value,
  onChange,
  className,
  stretch,
  ariaLabel,
}) => (
  <nav
    className={cn(SEGMENTED_BAR, stretch && 'w-full', className)}
    aria-label={ariaLabel}
  >
    {items.map((item) => {
      const isActive = value === item.id;
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            onChange(item.id);
            item.onSelect?.();
          }}
          className={segmentedTabButtonClass(isActive, stretch ? 'flex-1' : undefined)}
        >
          {item.label}
        </button>
      );
    })}
  </nav>
);

export interface SegmentedTabItem {
  tab: string;
  label: React.ReactNode;
  match?: (active: string) => boolean;
  onSelect?: () => void;
}

interface SegmentedTabsProps {
  items: SegmentedTabItem[];
  className?: string;
}

/** 绑定 AppContext.activeTab 的全局顶导分段切换 */
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({ items, className = '' }) => {
  const { activeTab, setActiveTab } = useApp();

  const activeItem =
    items.find((item) => (item.match ? item.match(activeTab) : activeTab === item.tab)) ??
    items[0];

  return (
    <SegmentedTabBar
      className={cn('mb-5', className)}
      value={activeItem?.tab ?? activeTab}
      onChange={(tab) => {
        const item = items.find((i) => i.tab === tab);
        setActiveTab(tab);
        item?.onSelect?.();
      }}
      items={items.map((item) => ({
        id: item.tab,
        label: item.label,
        onSelect: item.onSelect,
      }))}
    />
  );
};
