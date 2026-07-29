/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 加载超过 delayMs（默认 3s）时返回 true，用于切换骨架屏。
 */

import { useEffect, useState } from 'react';

export const LOADING_SKELETON_DELAY_MS = 3000;

export function useLoadingSkeleton(
  isLoading: boolean,
  delayMs: number = LOADING_SKELETON_DELAY_MS,
): boolean {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }

    const timer = window.setTimeout(() => setShowSkeleton(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [isLoading, delayMs]);

  return showSkeleton;
}
