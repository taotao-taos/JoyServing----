/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 全站加载动画 — matrix-loader.svg
 */

import React from 'react';
import { cn } from '@/lib/utils';

/** 与用户编辑的根目录 matrix-loader.svg 保持同源 */
export const MATRIX_LOADER_SRC = '/matrix-loader.svg';

function stripSpinClasses(className?: string) {
  return (className ?? '')
    .replace(/\banimate-spin(?:-slow)?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type MatrixLoaderProps = {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
};

/** 点阵加载动画；忽略传入的 animate-spin（自身已带动画） */
export const MatrixLoader: React.FC<MatrixLoaderProps> = ({
  size = 16,
  className,
  style,
  title,
}) => {
  const numericSize =
    typeof size === 'string' ? Number.parseInt(size, 10) || 16 : size;
  const cleaned = stripSpinClasses(className);
  const hasExplicitBox = /\b(h-|w-|size-)/.test(cleaned);

  return (
    <img
      src={MATRIX_LOADER_SRC}
      alt=""
      title={title}
      width={hasExplicitBox ? undefined : numericSize}
      height={hasExplicitBox ? undefined : numericSize}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={cn(
        'inline-block shrink-0 object-contain select-none pointer-events-none',
        cleaned,
      )}
      style={style}
      draggable={false}
    />
  );
};

export default MatrixLoader;
