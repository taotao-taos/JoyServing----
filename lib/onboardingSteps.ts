/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 雇佣员工向导 — 4 步流程（对齐 joypi-dev-workbench employee/center）
 */

export const ONBOARDING_STEP_COUNT = 4;

export type OnboardingDemoStep = 'A1' | 'A2' | 'A3' | 'A4';

export const ONBOARDING_DEMO_STEPS: OnboardingDemoStep[] = [
  'A1',
  'A2',
  'A3',
  'A4',
];

export interface OnboardingStepDef {
  n: number;
  title: string;
  demoStep: OnboardingDemoStep;
  tab: 'market' | 'employees' | 'staff';
  /** 跳转时打开最近雇佣员工的入职培训页 */
  openOnboarding?: boolean;
}

/** 与 joypi 一致的 4 步标题 */
export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  {
    n: 1,
    title: '在市场挑一个数字员工并雇佣',
    demoStep: 'A1',
    tab: 'market',
  },
  {
    n: 2,
    title: '填写员工信息并保存配置',
    demoStep: 'A2',
    tab: 'employees',
    openOnboarding: true,
  },
  {
    n: 3,
    title: '能力测试效果并准予上岗',
    demoStep: 'A3',
    tab: 'employees',
    openOnboarding: true,
  },
  {
    n: 4,
    title: '绑定给坐席使用',
    demoStep: 'A4',
    tab: 'staff',
  },
];

export function isOnboardingDemoStep(step: string | null | undefined): step is OnboardingDemoStep {
  return ONBOARDING_DEMO_STEPS.includes(step as OnboardingDemoStep);
}

/** 当前 demoStep 下已完成步数（A2 → 已完成 1 步） */
export function onboardingCompletedCount(demoStep: string | null, hasOnlineAgent = false): number {
  if (isOnboardingDemoStep(demoStep)) {
    return ONBOARDING_DEMO_STEPS.indexOf(demoStep);
  }
  if (hasOnlineAgent) return ONBOARDING_STEP_COUNT;
  return 0;
}

export function onboardingProgressPercent(demoStep: string | null, hasOnlineAgent = false): number {
  const completed = onboardingCompletedCount(demoStep, hasOnlineAgent);
  return Math.round((completed / ONBOARDING_STEP_COUNT) * 100);
}

export function resolveOnboardingStepState(
  demoStep: string | null,
  stepDemoKey: OnboardingDemoStep,
  hasOnlineAgent = false,
): { done: boolean; active: boolean } {
  if (hasOnlineAgent && !isOnboardingDemoStep(demoStep)) {
    return { done: true, active: false };
  }
  if (!isOnboardingDemoStep(demoStep)) {
    return { done: false, active: false };
  }
  const currentIdx = ONBOARDING_DEMO_STEPS.indexOf(demoStep);
  const stepIdx = ONBOARDING_DEMO_STEPS.indexOf(stepDemoKey);
  return {
    done: currentIdx > stepIdx,
    active: currentIdx === stepIdx,
  };
}
