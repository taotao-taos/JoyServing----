/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * key 变化时进入 busy，经 mock 延迟后结束 — 模拟真实请求。
 * key 不变不重复转圈；key 为空则立即空闲。
 */

import { useEffect, useState } from 'react';
import {
  pickMockLatencyMs,
  type MockLatencyProfile,
} from '@/lib/mockLatency';

export function useMockLatency(
  key: string | number | null | undefined,
  profile: MockLatencyProfile = 'pageList',
): boolean {
  const [busy, setBusy] = useState(() => key != null && key !== '');

  useEffect(() => {
    if (key == null || key === '') {
      setBusy(false);
      return;
    }

    const ms = pickMockLatencyMs(profile);
    if (ms <= 0) {
      setBusy(false);
      return;
    }

    setBusy(true);
    const timer = window.setTimeout(() => setBusy(false), ms);
    return () => window.clearTimeout(timer);
  }, [key, profile]);

  return busy;
}
