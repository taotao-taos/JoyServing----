/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 数字员工域顶部分段导航 — 我的数字员工 / 数字员工市场
 */

export function buildEmployeeTabItems(hiredCount: number) {
  return [
    { tab: 'employees', label: `我的数字员工 (${hiredCount})` },
    { tab: 'market', label: '数字员工市场' },
  ] as const;
}
