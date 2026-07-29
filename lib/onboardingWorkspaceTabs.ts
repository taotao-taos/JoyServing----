/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 员工岗前工作台顶栏 Tab — 立即雇佣后老板管理该数字员工
 */

import { LIFECYCLE_TERMS, NAV_TERMS } from './platformTerminology';

export type OnboardingWorkspaceTabId = 'build' | 'kb' | 'skills' | 'channels';

export interface OnboardingWorkspaceTabDef {
  id: OnboardingWorkspaceTabId;
  label: string;
}

export const ONBOARDING_WORKSPACE_TABS: readonly OnboardingWorkspaceTabDef[] = [
  { id: 'build', label: LIFECYCLE_TERMS.onboardExam },
  { id: 'kb', label: NAV_TERMS.companyKb },
  { id: 'skills', label: NAV_TERMS.skillCenter },
  { id: 'channels', label: NAV_TERMS.dispatchChannels },
] as const;

export const DEFAULT_ONBOARDING_WORKSPACE_TAB: OnboardingWorkspaceTabId = 'build';

export function isOnboardingWorkspaceTab(id: string): id is OnboardingWorkspaceTabId {
  return ONBOARDING_WORKSPACE_TABS.some((t) => t.id === id);
}
