/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { OnboardingWorkspaceTabDef } from '@/lib/onboardingWorkspaceTabs';
import { SegmentedTabBar } from '../common/SegmentedTabs';
import { BTN_SOFT } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { ArrowLeft } from '@/lib/icons';

interface OnboardingWorkspaceHeaderProps {
  tabs: readonly OnboardingWorkspaceTabDef[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onBack: () => void;
  actions?: React.ReactNode;
}

export const OnboardingWorkspaceHeader: React.FC<OnboardingWorkspaceHeaderProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onBack,
  actions,
}) => {
  return (
    <header className="bg-white border-b border-neutral-200 shrink-0">
      <div className="px-4 md:px-6 py-2.5 flex items-center gap-3 min-h-[56px]">
        <button
          type="button"
          onClick={onBack}
          className={cn(BTN_SOFT, 'shrink-0 -ml-1 gap-1.5 text-neutral-500 hover:text-neutral-800')}
        >
          <ArrowLeft size={14} />
          返回我的团队
        </button>

        <div className="flex-1 min-w-0 flex justify-center overflow-x-auto custom-scrollbar">
          {tabs.length > 1 ? (
            <SegmentedTabBar
              ariaLabel="数字员工入职培训"
              value={activeTabId}
              onChange={onTabChange}
              items={tabs.map((tab) => ({ id: tab.id, label: tab.label }))}
            />
          ) : null}
        </div>

        {actions ? <div className="shrink-0 flex items-center gap-1.5">{actions}</div> : null}
      </div>
    </header>
  );
};
