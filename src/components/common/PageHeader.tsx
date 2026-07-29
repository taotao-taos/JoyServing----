/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 统一页面标题区：图标 + 标题 + 描述 + 右侧操作槽。
 */

import React from 'react';

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  /** 标题下方子标题 */
  description?: string;
  /** 右侧操作区（按钮、搜索框、切换器等） */
  children?: React.ReactNode;
  /** inline：与标题同行；below：置于子标题行右侧 */
  actionsPlacement?: 'inline' | 'below';
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  children,
  actionsPlacement = 'inline',
  className = '',
}) => {
  const actionsBelow = actionsPlacement === 'below' && Boolean(children);

  if (actionsBelow) {
    return (
      <div className={`flex flex-col mb-5 text-left ${className}`}>
        <div className="pb-3.5 border-b border-neutral-200/60">
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
            {icon && <span className="text-neutral-900 shrink-0 flex items-center">{icon}</span>}
            <span>{title}</span>
          </h1>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3.5">
          {description ? (
            <h2 className="text-xs font-semibold text-neutral-800 px-0.5 shrink-0">{description}</h2>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3 shrink-0">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 pb-3.5 mb-5 border-b border-neutral-200/60 text-left ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
            {icon && <span className="text-neutral-900 shrink-0 flex items-center">{icon}</span>}
            <span>{title}</span>
          </h1>
        </div>

        {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
      </div>

      {description && <p className="text-[11px] text-neutral-500 leading-relaxed -mt-1">{description}</p>}
    </div>
  );
};
