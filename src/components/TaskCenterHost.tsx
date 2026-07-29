/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 任务中心全屏弹层 — Portal 到 body，不受侧栏分栏约束。
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { TaskCenterPage } from './TaskCenterPage';
import { X } from '@/lib/icons';
import { MODAL_OVERLAY, MODAL_PANEL } from '@/lib/ui';

export const TaskCenterHost: React.FC = () => {
  const { showTaskCenter, setShowTaskCenter } = useApp();

  if (!showTaskCenter) return null;

  return createPortal(
    <div
      className={`${MODAL_OVERLAY} z-[120]`}
      onClick={() => setShowTaskCenter(false)}
      role="presentation"
    >
      <div
        className={`${MODAL_PANEL} w-full max-w-5xl max-h-[88vh] overflow-y-auto custom-scrollbar mx-auto relative`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-center-title"
      >
        <button
          type="button"
          onClick={() => setShowTaskCenter(false)}
          title="关闭"
          className="absolute top-4 right-4 z-20 p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
        >
          <X size={16} />
        </button>
        <TaskCenterPage embedded />
      </div>
    </div>,
    document.body,
  );
};
