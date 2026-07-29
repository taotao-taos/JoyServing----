/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 入职培训页分部遮罩引导（对齐 joypi employee build tour）
 */

export const BUILD_TOUR_STORAGE_KEY = 'js_build_tour_seen';

export interface BuildTourStep {
  target: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  /** 引导前确保对应折叠区块展开 */
  ensureOpen?: 'persona' | 'kb' | 'skills';
}

/** 点击培训后的 5 步遮罩引导 — 与 joypi-dev-workbench 一致 */
export const BUILD_TOUR_STEPS: BuildTourStep[] = [
  {
    target: '[data-tour-id="config-basic"]',
    title: '配置基础信息',
    description: '在这里配置员工的名称、描述和头像等基础信息。',
    placement: 'right',
    ensureOpen: 'persona',
  },
  {
    target: '[data-tour-id="config-knowledge"]',
    title: '添加员工知识',
    description: '为员工绑定知识库，让它能基于知识回答问题。',
    placement: 'right',
    ensureOpen: 'kb',
  },
  {
    target: '[data-tour-id="config-skills"]',
    title: '添加员工技能',
    description: '为员工绑定技能，赋予它执行任务的能力。',
    placement: 'right',
    ensureOpen: 'skills',
  },
  {
    target: '[data-tour-id="save-btn"]',
    title: '保存配置',
    description: '完成配置后，点击保存按钮进行培训存档。',
    placement: 'bottom',
  },
  {
    target: '[data-tour-id="test-panel"]',
    title: '能力测试并上岗',
    description: '保存后可在右侧进行能力测试，确认效果后准予上岗。',
    placement: 'left',
  },
];

export function loadBuildTourSeen(): boolean {
  try {
    return localStorage.getItem(BUILD_TOUR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveBuildTourSeen(seen: boolean) {
  try {
    if (seen) localStorage.setItem(BUILD_TOUR_STORAGE_KEY, '1');
    else localStorage.removeItem(BUILD_TOUR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
