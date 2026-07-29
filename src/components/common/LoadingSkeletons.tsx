/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 常用加载 / 骨架布局 — 未就绪区块用点阵；已就绪不显示。
 */

import React from 'react';
import { MatrixLoader } from './MatrixLoader';
import { Skeleton } from '@/components/ui/skeleton';
import { badgeClass } from '@/lib/ui';
import { cn } from '@/lib/utils';

export const ChatReplySkeleton: React.FC<{ className?: string; align?: 'left' | 'right' }> = ({
  className,
  align = 'left',
}) => (
  <div
    className={cn(
      'flex gap-2 items-center animate-in fade-in duration-200 py-1.5 px-1',
      align === 'right' && 'flex-row-reverse',
      className,
    )}
  >
    <MatrixLoader size={28} className="h-7 w-7 shrink-0" title="加载中" />
  </div>
);

export const WorkLogSkeleton: React.FC<{ className?: string; rows?: number }> = ({
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center py-8 gap-2', className)}>
    <MatrixLoader size={28} className="h-7 w-7" title="加载中" />
  </div>
);

export const UploadZoneSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex flex-col items-center justify-center py-6 gap-2', className)}>
    <MatrixLoader size={40} className="h-10 w-10" title="加载中" />
  </div>
);

export const DocumentRowSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center gap-3 w-full', className)}>
    <Skeleton className="h-4 w-4 rounded shrink-0" />
    <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
    <div className="flex-1 min-w-0 space-y-1.5">
      <Skeleton className="h-3 w-[45%]" />
      <Skeleton className="h-2.5 w-[68%]" />
    </div>
    <Skeleton className="h-6 w-14 rounded-md shrink-0" />
  </div>
);

export const CardListSkeleton: React.FC<{ count?: number; className?: string }> = ({
  className,
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12 gap-2', className)}>
    <MatrixLoader size={48} className="h-12 w-12" title="加载中" />
  </div>
);

export const UploadLoadingPanel: React.FC<{ title: string; fileName: string }> = ({
  title,
  fileName,
}) => (
  <>
    <MatrixLoader size={40} className="mx-auto mb-3 h-10 w-10" title={title} />
    <p className="text-sm font-semibold text-neutral-800">{title}</p>
    <p className="text-[11px] text-neutral-500 mt-1 truncate max-w-xs mx-auto">{fileName}</p>
  </>
);

export const ParsingStatusSkeleton: React.FC = () => (
  <div className="min-w-[88px] flex items-center gap-1.5">
    <MatrixLoader size={14} className="h-3.5 w-3.5" />
  </div>
);

function ParsingStatusCell({ progress }: { progress?: number }) {
  return (
    <div className="min-w-[88px] flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-1.5">
        <MatrixLoader size={14} className="h-3.5 w-3.5" />
        <span className={badgeClass('live')}>解析中</span>
      </div>
      <div className="h-1 w-full rounded-full bg-neutral-100 overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-all duration-300"
          style={{ width: `${progress ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export { ParsingStatusCell };
