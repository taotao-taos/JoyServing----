/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 数字员工头像展示 — 统一解析 emoji / Relay 插画 / 自定义 URL
 */

import { RELAY_CARD_AVATARS, relayAvatarForAgent } from './relayHomeAssets';

export function isAvatarImageUrl(avatar: string): boolean {
  return (
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('data:')
  );
}

/** 卡片 / 列表：自定义 URL 直接用；emoji 回退 Relay 插画 */
export function agentAvatarSrc(avatar: string, relayIndex: number): string {
  return relayAvatarForAgent(avatar, relayIndex);
}

export { RELAY_CARD_AVATARS };

export type AgentAvatarRender =
  | { kind: 'image'; src: string }
  | { kind: 'emoji'; emoji: string };

/** 入职考核页头像按钮：未自定义时展示 Relay 插画；自定义后展示所选 emoji / 图片 */
export function agentAvatarForEditor(
  avatar: string,
  relayIndex: number,
  avatarCustomized = false,
): AgentAvatarRender {
  if (isAvatarImageUrl(avatar)) {
    return { kind: 'image', src: avatar };
  }
  if (!avatarCustomized) {
    return {
      kind: 'image',
      src: RELAY_CARD_AVATARS[relayIndex % RELAY_CARD_AVATARS.length],
    };
  }
  return { kind: 'emoji', emoji: avatar };
}

/** 员工卡片：URL 直接用；自选 emoji 展示 emoji；否则 Relay 插画 */
export function agentAvatarForCard(
  avatar: string,
  relayIndex: number,
  avatarCustomized = false,
): AgentAvatarRender {
  if (isAvatarImageUrl(avatar)) {
    return { kind: 'image', src: avatar };
  }
  if (avatarCustomized) {
    return { kind: 'emoji', emoji: avatar };
  }
  return {
    kind: 'image',
    src: RELAY_CARD_AVATARS[relayIndex % RELAY_CARD_AVATARS.length],
  };
}

export function isRelayAvatarUrl(avatar: string): boolean {
  return (RELAY_CARD_AVATARS as readonly string[]).includes(avatar);
}
