/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 全局 Toast — Sonner 封装，供 AppContext / 各页面统一调用。
 */

import { toast } from 'sonner';
import type { ToastType } from '@/lib/ui';

const TOAST_DURATION_MS = 2500;

function normalizeMessage(message: string): string {
  return message.replace(/\s*\n+\s*/g, ' ').trim();
}

export function showAppToast(message: string, type: ToastType = 'info'): void {
  const text = normalizeMessage(message);
  const options = { duration: TOAST_DURATION_MS };

  switch (type) {
    case 'success':
      toast.success(text, options);
      break;
    case 'error':
      toast.error(text, options);
      break;
    case 'warning':
      toast.warning(text, options);
      break;
    default:
      toast.info(text, options);
      break;
  }
}
