/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 开发预览：?toastPreview=1 时显示，可手动触发各状态 Toast。
 */

import React from 'react';
import type { ToastType } from '@/lib/ui';
import { cn } from '@/lib/utils';

const PRESETS: { label: string; type: ToastType; message: string }[] = [
  {
    label: '成功',
    type: 'success',
    message: '培训已存档，可以开始试岗对话了',
  },
  {
    label: '错误',
    type: 'error',
    message: '请先填写必填项后再保存',
  },
  {
    label: '警告',
    type: 'warning',
    message: '尚有未保存的更改，离开前请先存档',
  },
  {
    label: '提示',
    type: 'info',
    message: '已按当前筛选条件刷新看板数据',
  },
];

const TYPE_BTN: Record<ToastType, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  error: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
  info: 'bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-100/80',
};

export const ToastPreviewPanel: React.FC<{
  showToast: (message: string, type?: ToastType) => void;
}> = ({ showToast }) => {
  const playAll = () => {
    PRESETS.forEach((item, index) => {
      window.setTimeout(() => showToast(item.message, item.type), index * 2200);
    });
  };

  return (
    <div
      className="fixed bottom-5 right-5 z-[300] w-[220px] rounded-[13px] border border-neutral-200 bg-white/95 backdrop-blur-sm p-3 shadow-lg border border-neutral-200 text-left"
      role="region"
      aria-label="Toast 预览面板"
    >
      <p className="text-[11px] font-semibold text-neutral-800 mb-0.5">Toast 预览</p>
      <p className="text-[10px] text-neutral-500 mb-2.5 leading-snug">
        点击按钮触发对应状态
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => showToast(item.message, item.type)}
            className={cn(
              'h-7 rounded-md border text-[11px] font-medium transition-colors cursor-pointer',
              TYPE_BTN[item.type],
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={playAll}
        className="mt-2 w-full h-7 rounded-md border border-neutral-200 bg-white text-[11px] font-medium text-neutral-800 hover:bg-neutral-100/60 transition-colors cursor-pointer"
      >
        依次播放全部
      </button>
    </div>
  );
};
