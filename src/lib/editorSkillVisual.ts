import type { LucideIcon } from '@/lib/icons';
import {
  Layout,
  LayoutGrid,
  Sparkles,
  Play,
  ShoppingCart,
  Star,
  Palette,
  Image as ImageIcon,
} from '@/lib/icons';

/** 技能列表 UI 装饰（与 manifest id 对应） */
export const EDITOR_SKILL_VISUAL: Record<
  string,
  { icon: LucideIcon; color: string }
> = {
  "category-design": { icon: ImageIcon, color: "bg-sky-50 text-sky-600" },
  "category-social": { icon: Layout, color: "bg-orange-50 text-orange-600" },
  "category-branding": { icon: Star, color: "bg-zinc-100 text-zinc-600" },
  "category-illustration": { icon: Palette, color: "bg-zinc-100 text-zinc-600" },
  "category-ecommerce": { icon: ShoppingCart, color: "bg-zinc-100 text-zinc-600" },
  "category-video": { icon: Play, color: "bg-zinc-100 text-zinc-600" },
  "seedance-creation": { icon: LayoutGrid, color: "bg-sky-50 text-sky-500" },
  "dressing-change": { icon: Sparkles, color: "bg-sky-50 text-sky-500" },
  "drone-video": { icon: Play, color: "bg-sky-50 text-sky-500" },
  "amazon-listing": { icon: ShoppingCart, color: "bg-rose-50 text-rose-500" },
  "storyboard-pack": { icon: Play, color: "bg-sky-50 text-sky-500" },
};
