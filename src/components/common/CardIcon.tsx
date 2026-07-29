/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 统一的卡片图标：参考清言/智谱技能市场的「彩色圆角方块」App 图标风格。
 * - variant="solid"：饱和渐变底 + 白色字形（用于字母 / IconPark 图标）
 * - variant="soft" ：浅色渐变底（用于 emoji 头像，保证 emoji 可读且整体有彩色感）
 * 颜色按 seed 稳定派生，使同一对象始终是同一颜色。
 */

import React from 'react';

const TONES = [
  { solid: 'from-sky-500 to-sky-600', soft: 'from-sky-50 to-sky-100 border-blue-200/60' },
  { solid: 'from-sky-500 to-sky-600', soft: 'from-sky-50 to-sky-100 border-sky-200/60' },
  { solid: 'from-emerald-500 to-emerald-600', soft: 'from-emerald-50 to-emerald-100 border-emerald-200/60' },
  { solid: 'from-amber-500 to-orange-500', soft: 'from-amber-50 to-orange-100 border-amber-200/60' },
  { solid: 'from-rose-500 to-pink-600', soft: 'from-rose-50 to-pink-100 border-rose-200/60' },
  { solid: 'from-cyan-500 to-sky-600', soft: 'from-cyan-50 to-sky-100 border-cyan-200/60' },
  { solid: 'from-sky-500 to-neutral-800', soft: 'from-sky-50 to-sky-100 border-sky-200/60' },
  { solid: 'from-fuchsia-500 to-sky-600', soft: 'from-fuchsia-50 to-sky-100 border-fuchsia-200/60' },
];

function toneFromSeed(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

const SIZES = {
  sm: 'h-9 w-9 rounded-[7px] text-base',
  md: 'h-10 w-10 rounded-[7px] text-lg',
  lg: 'h-11 w-11 rounded-[13px] text-xl',
  xl: 'h-12 w-12 rounded-[13px] text-2xl',
} as const;

interface CardIconProps {
  /** 用于稳定派生颜色的种子（如 id / 名称） */
  seed?: string;
  variant?: 'solid' | 'soft';
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}

export const CardIcon: React.FC<CardIconProps> = ({
  seed = '',
  variant = 'solid',
  size = 'md',
  className = '',
  children,
}) => {
  const tone = toneFromSeed(seed);
  const base =
    variant === 'solid'
      ? `bg-gradient-to-br ${tone.solid} text-white shadow-sm`
      : `bg-gradient-to-br ${tone.soft} border`;

  return (
    <div
      className={`${SIZES[size]} ${base} flex items-center justify-center font-bold shrink-0 select-none overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};
