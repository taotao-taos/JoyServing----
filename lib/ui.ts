/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JoyServing 共享样式 — 以「我的数字员工」首页（ui.md / EmployeeHomeRelay）为唯一标准。
 *
 * 约定：
 * - 画布白底；描边 #E5E5E5（Tailwind: border-neutral-200）
 * - 卡片 / 弹窗圆角 13px；按钮 / 输入 7px
 * - 控件默认高 32px（h-8）；分段 Tab 总高 38px
 * - 主操作墨黑 neutral-800；语义色只用于状态
 * - 动效 200ms；卡片 hover 轻抬起
 * - 业务页禁止裸 Hex；颜色走本文件 / Tailwind neutral + 语义色
 */

/** 页面外壳：主内容区滚动画布 */
export const PAGE =
  'flex-1 min-h-0 overflow-y-auto p-5 bg-white text-neutral-800 font-sans text-xs antialiased';

/** 内容卡片（员工卡 / 内容块） */
export const CARD =
  'bg-white border border-neutral-200 rounded-[13px] shadow-[0_2px_10px_rgba(31,35,41,0.02)] transition-all duration-200';
export const CARD_HOVER =
  'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)]';

/** 面板 / 表格容器（静态，无 hover 抬起） */
export const PANEL = 'bg-white border border-neutral-200 rounded-[13px]';

const BTN_BASE =
  'inline-flex items-center justify-center gap-1 font-semibold rounded-[7px] text-xs transition cursor-pointer outline-none select-none disabled:opacity-50 disabled:pointer-events-none';

/** 主操作（墨黑） */
export const BTN_INK = `${BTN_BASE} h-8 px-3 bg-neutral-800 text-white hover:opacity-90`;

/** 次级（柔灰） */
export const BTN_SOFT = `${BTN_BASE} h-8 px-3 bg-neutral-100 text-neutral-800 border border-neutral-200 hover:bg-neutral-200`;

/** 描边（白底） */
export const BTN_OUTLINE = `${BTN_BASE} h-8 px-3 bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50 shadow-[0_1px_0_rgba(0,0,0,0.05)]`;

/** 页头 / Banner 主 CTA（与 BTN_INK 同高；保留别名） */
export const BTN_MD = BTN_INK;

/** 危险描边 */
export const BTN_DANGER = `${BTN_BASE} h-8 px-3 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:text-rose-600`;

/** 输入框 / 下拉 / 文本域（多行勿加 FIELD_CTRL） */
export const FIELD =
  'w-full bg-white border border-neutral-200/60 rounded-[7px] text-xs text-neutral-800 placeholder:text-neutral-800/50 px-2.5 outline-none transition duration-200 focus:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed';

/** 单行控件高度（与 FIELD 组合：cn(FIELD, FIELD_CTRL)） */
export const FIELD_CTRL = 'h-8';

/** 页头 / 列表顶栏搜索框宽度（与 FIELD、FIELD_CTRL 组合：cn(FIELD, FIELD_CTRL, SEARCH_WIDTH, 'pl-9')） */
export const SEARCH_WIDTH = 'w-64 shrink-0';

/** 页头搜索框整包样式（已含高度与宽度；用 cn() 叠加 pl-9 等） */
export const SEARCH_FIELD = `${FIELD_CTRL} ${SEARCH_WIDTH} bg-white border border-neutral-200/60 rounded-[7px] text-xs text-neutral-800 placeholder:text-neutral-800/50 px-2.5 outline-none transition duration-200 focus:border-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed`;

/** 筛选下拉 Trigger（市场 / 我的员工等页头筛选，对齐 shadcn Select） */
export const SELECT_TRIGGER =
  'h-8 w-auto min-w-[7.5rem] bg-white border-neutral-200/60 rounded-[7px] text-xs text-neutral-800 shadow-none';

/** 表单标签 */
export const LABEL = 'block text-xs font-medium text-neutral-500 mb-1';

/** 分段 Tab 容器（总高 38px） */
export const SEGMENTED_BAR =
  'inline-flex h-[38px] items-center gap-1 bg-neutral-100 rounded-lg p-1 w-fit shrink-0';

/** 分段 Tab 项 */
export function segmentedItemClass(active: boolean): string {
  return [
    'h-[30px] px-3 rounded-md text-[13px] font-medium leading-none transition-all duration-200 cursor-pointer whitespace-nowrap',
    'flex items-center justify-center gap-1.5 border-0 outline-none',
    active
      ? 'bg-white text-neutral-950 shadow-[0_1px_3px_rgba(0,0,0,0.05)]'
      : 'bg-transparent text-neutral-500 hover:text-neutral-950',
  ].join(' ');
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** 弹窗遮罩 + 面板 */
export const MODAL_OVERLAY =
  'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200';
export const MODAL_PANEL =
  'bg-white text-neutral-900 rounded-[13px] w-full shadow-lg ring-1 ring-black/10 p-5 animate-in fade-in zoom-in-95 duration-200';

/** 语义徽章（首页 Tag 风格） */
export const badgeTones = {
  neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  ink: 'bg-neutral-800 text-white border-transparent',
  success: 'bg-[#ECFDF5] text-[#009966] border-[#A4F4CF]/60',
  warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]/60',
  danger: 'bg-rose-50 text-rose-600 border-rose-100',
  live: 'bg-[#F0F7FF] text-[#0050D2] border-[#91C5FF]/60',
} as const;

export type BadgeTone = keyof typeof badgeTones;

export function badgeClass(tone: BadgeTone = 'neutral') {
  return `inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-px rounded border ${badgeTones[tone]}`;
}
