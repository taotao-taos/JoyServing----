/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 当前登录演示账号（侧栏底部 / 对话「我」头像共用）
 * 产品无法获取真实头像，统一用首字 + soft mesh 渐变底。
 */

export const PROFILE_USER = {
  name: '朱子涛',
  initial: '朱',
  /** 青 → 天蓝 → 淡紫（见 index.css .avatar-soft-gradient） */
  fallbackClass:
    'avatar-soft-gradient text-white text-[13px] font-semibold tracking-tight shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
} as const;
