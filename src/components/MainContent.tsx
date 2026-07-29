import * as React from "react";
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookOpen, Lightbulb, Box, ArrowUp, ChevronRight, Image as ImageIcon, Star, Palette, ShoppingCart, Play, Layout, LayoutGrid, Trash2, X } from '@/lib/icons';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getProjectPreviewImages } from "@/src/lib/projectsStorage";
import type { MediaModelManifestRow } from "@/src/lib/aiModelsRegistry";
import { CreagicChatComposer } from "@/src/components/CreagicChatComposer";
import { DotGrid } from "@/src/components/DotGrid";

/** 最近项目：项目缩略图区；1.6:1 随列宽 */
const RECENT_PROJECT_THUMB_FRAME_CLASS =
  "relative isolate w-full shrink-0 aspect-[1.6/1] overflow-hidden rounded-[13px] bg-neutral-100/90 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] transition-[background-color,box-shadow] group-hover:bg-neutral-100 group-hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]";

/**
 * 「新建项目」整块灰区：与项目卡同列高时 flex-1 填满（等同 缩略图+间距+标题区 总高度），无额外占位节点
 */
const RECENT_NEW_PROJECT_GRAY_CLASS =
  "relative isolate flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-[13px] bg-neutral-100/90 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] transition-[background-color,box-shadow] group-hover:bg-neutral-100 group-hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]";

/** 与 ui/card 默认 gap-4 解耦；栅格 items-stretch 下同列等高 */
const RECENT_PROJECT_CARD_BASE_CLASS =
  "flex h-full min-h-0 min-w-0 flex-col gap-0 overflow-hidden rounded-[13px] border border-neutral-100 bg-white p-2.5";

export function Hero() {
  return (
    <div className="relative flex flex-col items-center justify-center pt-[5vh] pb-8 text-center">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[1600px] w-[1600px] -translate-x-1/2 -translate-y-1/2 opacity-70">
        <DotGrid
          dotSize={4}
          gap={10}
          baseColor="#ffffff"
          activeColor="#c4c4c4"
          proximity={60}
          speedTrigger={100}
          shockRadius={250}
          shockStrength={5}
          maxSpeed={5000}
          resistance={750}
          returnDuration={1.5}
        />
      </div>
      <div className="relative z-10 mb-3 flex items-center justify-center gap-0 whitespace-nowrap">
        <span className="text-[36px] font-semibold leading-none text-neutral-900">无尽创造，始于</span>
        <img
          src="https://raw.githubusercontent.com/taotao-taos/-/main/Frame%2028%20(1).png"
          alt="Creagic AI"
          className="ml-1 h-[88px] w-auto shrink-0"
          referrerPolicy="no-referrer"
        />
      </div>
      <p className="absolute top-[120px] z-10 text-base font-normal text-neutral-400">让每个人都能轻松创作出专业级作品</p>
    </div>
  );
}

interface Category {
  id: string;
  label: string;
  icon: any;
  variant?: "blue" | "orange";
}

function escapeHtmlText(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 分类推荐 / 侧栏推荐：图文预制提示（chip 内嵌在句中，与首页插入逻辑一致） */
export function buildRecommendationPresetHtml(params: {
  title: string;
  prompt: string;
  imageUrl?: string;
  needsReferenceImage?: boolean;
}) {
  const safeTitle = escapeHtmlText(params.title);
  const safePrompt = escapeHtmlText(params.prompt);
  const needsRef = Boolean(params.needsReferenceImage && params.imageUrl);
  const safeUrl = (params.imageUrl ?? "").replace(/"/g, "");
  const chip = needsRef
    ? `<span contenteditable="false" data-preset-ref-chip="1" class="preset-ref-chip"><img src="${safeUrl}" alt="" draggable="false" referrerpolicy="no-referrer" class="preset-ref-chip-thumb" /><span class="preset-ref-chip-label">参考图</span></span>`
    : "";
  const lead = needsRef ? `参考下图风格（${chip}），` : "";
  return `<div class="preset-prompt"><p class="text-sm font-normal leading-relaxed text-neutral-800">${lead}生成与主题相关的作品：${safeTitle}\n\n${safePrompt}</p></div>`;
}

export { insertHtmlIntoContentEditable } from "@/src/lib/richChatContent";

const categories: Category[] = [
  { id: "design", label: "海报宣传", icon: ImageIcon, variant: "blue" },
  { id: "social", label: "社交封面", icon: Layout, variant: "orange" },
  { id: "branding", label: "品牌设计", icon: Star },
  { id: "illustration", label: "风格插画", icon: Palette },
  { id: "ecommerce", label: "电商营销", icon: ShoppingCart },
  { id: "video", label: "视频分镜", icon: Play },
];

type RecommendationItem = {
  title: string;
  image: string;
  /** 真正插入输入框的提示词（可长） */
  prompt?: string;
  /** 是否需要参考图胶囊（默认 false） */
  needsReferenceImage?: boolean;
};

const recommendations: Record<string, RecommendationItem[]> = {
  design: [
    {
      title: "庆贺新年主题海报",
      image: "https://picsum.photos/seed/newyear/400/300",
      needsReferenceImage: true,
      prompt:
        "请参考参考图的视觉语言与排版节奏，设计一张“新年庆贺”主题海报。要求：主标题醒目、信息层级清晰，留出安全区；配色喜庆但高级（避免大红大绿俗气），可加入烫金/纸张肌理细节；适配社交媒体投放（竖版优先）。输出：一张成片海报主视觉。",
    },
    {
      title: "复古粘贴画海报",
      image: "https://picsum.photos/seed/retro/400/300",
      needsReferenceImage: true,
      prompt:
        "请参考参考图的拼贴质感与元素密度，做一张复古粘贴画风格海报：撕纸边缘、胶带、复印噪点、手写涂鸦；主体为“周末市集”活动，包含时间地点与 3 个卖点。整体有手工感但可读性强。",
    },
    {
      title: "马卡龙风格家具海报",
      image: "https://picsum.photos/seed/macaron/400/300",
      needsReferenceImage: true,
      prompt:
        "请参考参考图的马卡龙色系与轻盈留白，设计一张家具促销海报：主视觉为沙发/单椅组合，配色柔和（奶油白/薄荷绿/粉蓝），有柔光与轻阴影；文案强调“春季上新/限时折扣/包邮”。",
    },
    {
      title: "地标建筑未来简洁风格海报",
      image: "https://picsum.photos/seed/landmark/400/300",
      needsReferenceImage: true,
      prompt:
        "请参考参考图的构图与质感，做一张未来简洁风格地标建筑主视觉海报：大留白、几何网格、微弱霓虹线条点缀；标题极简（中英可混排），信息区采用模块化卡片布局。",
    },
    {
      title: "电子像素风主视觉海报",
      image: "https://picsum.photos/seed/pixel/400/300",
      needsReferenceImage: true,
      prompt:
        "参考图像素/电子故障风格，生成一张“新品发布会”主视觉海报：包含像素块、扫描线、RGB 分离、故障条；主体是一枚抽象的科技徽标；文字采用等宽字体并保持可读。",
    },
    {
      title: "动物拟人MBTI海报",
      image: "https://picsum.photos/seed/animal/400/300",
      needsReferenceImage: true,
      prompt:
        "参考图的插画风格与配色，做一张动物拟人 MBTI 海报：主角是一只拟人化动物，穿搭体现性格；海报包含 MBTI 四字母、3 条性格标签、1 句俏皮口号。整体可爱但不幼稚。",
    },
  ],
  social: [
    {
      title: "小红书封面设计",
      image: "https://picsum.photos/seed/social1/400/300",
      prompt:
        "为我生成一张小红书封面：高饱和配色与手写字体，突出人物主体，上方留白放标题。竖版 3:4，风格年轻活泼、有贴纸感。",
    },
    {
      title: "朋友圈背景图",
      image: "https://picsum.photos/seed/social2/400/300",
      prompt:
        "生成一张朋友圈背景图：超宽横幅、弱文案（不抢眼）、大面积氛围渐变；适合放个人宣言；构图要让头像区域不被遮挡。",
    },
    {
      title: "B站视频封面",
      image: "https://picsum.photos/seed/social3/400/300",
      prompt:
        "制作一张 B 站视频封面：人物/主体突出，标题 6~10 字强对比，右下角留出角标区；整体抓眼但不低俗，适配 16:9。",
    },
    {
      title: "抖音主页背景",
      image: "https://picsum.photos/seed/social4/400/300",
      prompt:
        "生成抖音主页背景：极简风格，品牌色+辅助色，包含一句口号与小图标点缀；让头像、昵称区域保持干净。",
    },
  ],
  branding: [
    {
      title: "极简主义品牌视觉",
      image: "https://picsum.photos/seed/brand1/400/300",
      prompt:
        "生成一张极简主义品牌视觉 KV：黑白灰为主，使用严谨网格系统与大留白；标题采用高质感无衬线；加入 1 个抽象几何符号作为品牌记忆点。",
    },
    {
      title: "科技感企业标识",
      image: "https://picsum.photos/seed/brand2/400/300",
      prompt:
        "设计科技感企业标识主视觉：蓝紫渐变、微光、线框几何；标识应简洁、可缩放；画面体现“可靠/效率/智能”。",
    },
    {
      title: "时尚潮流品牌手册",
      image: "https://picsum.photos/seed/brand3/400/300",
      prompt:
        "生成时尚潮流品牌手册封面：摄影大片质感、排版克制；包含品牌名、季节系列名与一个图形元素；留白高级。",
    },
    {
      title: "自然有机护肤品牌",
      image: "https://picsum.photos/seed/brand4/400/300",
      prompt:
        "生成自然有机护肤品牌 KV：米白+浅绿，纸张纹理、植物剪影、柔和光；文字强调“温和/成分透明/敏感肌可用”。",
    },
  ],
  illustration: [
    {
      title: "1970年代复古漫画书页面",
      image: "https://picsum.photos/seed/illu-comic70/400/300",
      prompt:
        "1970年代复古漫画书页面，描绘了一个多格超级英雄故事序列。艺术风格是经典的纯手工绘制的漫画插图，具有醒目的轮廓和鲜艳但略显褪色的色彩调色板，包括可见的贝内-戴点。漫画条中展示了穿着标志性服装的神奇女侠，以及两位穿着西装的男士，背景是纽约市。叙事展示了神奇女侠从他们无聊的朝九晚五办公室工作中拯救了这两位男士。该页面采用传统的漫画分格布局，配有对话气泡、叙述框，营造出怀旧、冒险和古怪复古的感觉。",
      needsReferenceImage: false,
    },
    {
      title: "手绘风格插画",
      image: "https://picsum.photos/seed/illu1/400/300",
      prompt:
        "手绘插画：铅笔线稿+水彩上色，纸张纹理可见；主体为“周末野餐”，包含人物、食物、草地与阳光；整体温暖治愈。",
    },
    {
      title: "扁平化矢量插画",
      image: "https://picsum.photos/seed/illu2/400/300",
      prompt:
        "扁平化矢量插画：大色块、少阴影、几何形状；主题“远程办公的一天”；画面干净，信息清晰。",
    },
    {
      title: "3D渲染风格插画",
      image: "https://picsum.photos/seed/illu3/400/300",
      prompt:
        "3D 渲染插画：柔光、圆润材质、浅景深；主题“智能家居控制面板”；色彩现代、拟物但简洁。",
    },
    {
      title: "赛博朋克城市插画",
      image: "https://picsum.photos/seed/illu4/400/300",
      prompt:
        "赛博朋克城市插画：雨夜霓虹、反光地面、密集招牌；主体是一条街景透视；加入轻薄雾气与颗粒噪点。",
    },
  ],
  ecommerce: [
    {
      title: "亚马逊产品主图",
      image: "https://picsum.photos/seed/shop1/400/300",
      prompt:
        "生成亚马逊产品主图：纯白背景，产品居中，真实阴影，细节清晰；构图遵守平台规范（不加多余装饰/文字）；突出材质与卖点。",
    },
    {
      title: "电商详情页设计",
      image: "https://picsum.photos/seed/shop2/400/300",
      prompt:
        "电商详情页长图：顶部主视觉+一句核心卖点；中部 3 个功能点模块化展示；底部参数与购买引导；整体统一风格，移动端可读。",
    },
    {
      title: "美妆产品渲染图",
      image: "https://picsum.photos/seed/shop3/400/300",
      prompt:
        "美妆产品渲染：高质感瓶身、柔光、微水雾；背景简洁渐变；强调“保湿/修护/敏感肌”。",
    },
    {
      title: "数码配件展示图",
      image: "https://picsum.photos/seed/shop4/400/300",
      prompt:
        "数码配件展示：产品特写+场景化使用图；科技感背景但不花；用 3 个图标标注关键规格（快充/兼容/耐用）。",
    },
  ],
  video: [
    { title: "短视频转场特效", image: "https://picsum.photos/seed/vid1/400/300" },
    { title: "动态Logo展示", image: "https://picsum.photos/seed/vid2/400/300" },
    { title: "产品宣传短片", image: "https://picsum.photos/seed/vid3/400/300" },
    { title: "社交媒体动态海报", image: "https://picsum.photos/seed/vid4/400/300" },
  ],
};

export function SearchBox({
  onConfirm,
  activeCategory,
  onClearCategory,
  presetPayload,
  deepThinkMode = false,
  onDeepThinkToggle,
  selectedSkill = null,
  onSelectedSkillChange,
  imageModelRows = [],
  videoModelRows = [],
  selectedImageModel = "Stable-Diffusion-3-5-Large",
  selectedVideoModel = "wan2.6-t2v",
  onSelectedImageModelChange,
  onSelectedVideoModelChange,
}: {
  onConfirm?: (richHtml: string) => void;
  activeCategory?: string | null;
  onClearCategory?: () => void;
  presetPayload?: { html: string; nonce: number } | null;
  deepThinkMode?: boolean;
  onDeepThinkToggle?: () => void;
  selectedSkill?: string | null;
  onSelectedSkillChange?: (id: string | null) => void;
  imageModelRows?: MediaModelManifestRow[];
  videoModelRows?: MediaModelManifestRow[];
  selectedImageModel?: string;
  selectedVideoModel?: string;
  onSelectedImageModelChange?: (apiModelId: string) => void;
  onSelectedVideoModelChange?: (apiModelId: string) => void;
}) {
  const searchRichInputRef = useRef<HTMLDivElement>(null);
  const activeCatData = categories.find((c) => c.id === activeCategory);

  const handleConfirm = () => {
    const el = searchRichInputRef.current;
    if (!el || !onConfirm) return;
    const plain = el.innerText?.trim() ?? "";
    if (
      !plain &&
      el.querySelectorAll("img").length === 0 &&
      el.querySelectorAll("[data-preset-ref-chip]").length === 0
    )
      return;
    onConfirm(el.innerHTML);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4">
      <CreagicChatComposer
        variant="home"
        richInputRef={searchRichInputRef}
        enableTypewriterPlaceholder
        presetPayload={presetPayload ?? null}
        skillToggleClearsSelection
        belowInputSlot={
          activeCatData ? (
            <div className="flex">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                  activeCatData.variant === "blue"
                    ? "border-blue-200 bg-sky-50 text-sky-600"
                    : activeCatData.variant === "orange"
                      ? "border-orange-200 bg-orange-50 text-orange-600"
                      : "border-neutral-200 bg-neutral-50 text-neutral-600"
                )}
              >
                <activeCatData.icon className="h-4 w-4" />
                {activeCatData.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearCategory?.();
                  }}
                  className="ml-1 rounded-full p-0.5 hover:bg-black/5"
                >
                  <Plus className="h-3 w-3 rotate-45" />
                </button>
              </div>
            </div>
          ) : null
        }
        selectedSkill={selectedSkill}
        onSelectedSkillChange={(id) => onSelectedSkillChange?.(id)}
        deepThinkMode={deepThinkMode}
        onDeepThinkToggle={() => onDeepThinkToggle?.()}
        imageModelRows={imageModelRows}
        videoModelRows={videoModelRows}
        selectedImageModel={selectedImageModel}
        selectedVideoModel={selectedVideoModel}
        onSelectedImageModelChange={(id) => onSelectedImageModelChange?.(id)}
        onSelectedVideoModelChange={(id) => onSelectedVideoModelChange?.(id)}
        onEnter={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleConfirm();
          }
        }}
        onSend={handleConfirm}
      />
    </div>
  );
}

export function CategoryChips({ 
  activeCategory, 
  onSelectCategory 
}: { 
  activeCategory?: string | null;
  onSelectCategory?: (id: string) => void;
}) {
  return (
    <div className="mx-auto mt-4 flex w-full max-w-5xl items-center justify-center gap-2 overflow-x-auto px-3 pb-0.5 scrollbar-hide">
      <div className="flex flex-nowrap gap-2">
        {categories.map((cat, idx) => (
          <button
            key={idx}
            onClick={() => onSelectCategory?.(cat.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-normal transition-all hover:bg-neutral-50",
              activeCategory === cat.id 
                ? "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800"
                : "border-neutral-100 bg-white text-neutral-600",
              cat.variant === "blue" && activeCategory !== cat.id && "border-blue-200 bg-sky-50 text-sky-600 hover:bg-sky-100",
              cat.variant === "orange" && activeCategory !== cat.id && "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
            )}
          >
            <cat.icon className={cn(
              "h-3.5 w-3.5", 
              activeCategory === cat.id ? "text-white" :
              cat.variant === "blue" ? "text-sky-500" : 
              cat.variant === "orange" ? "text-orange-500" : 
              "text-neutral-400"
            )} />
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RecommendationGrid({
  categoryId,
  onApplyPreset,
}: {
  categoryId: string;
  onApplyPreset?: (html: string) => void;
}) {
  const items = recommendations[categoryId] || recommendations.design;

  return (
    <div className="mx-auto mt-4 w-full max-w-4xl px-4 pb-6">
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            role="button"
            tabIndex={0}
            onClick={() =>
              onApplyPreset?.(
                buildRecommendationPresetHtml({
                  title: item.title,
                  prompt: item.prompt ?? item.title,
                  imageUrl: item.image,
                  needsReferenceImage: item.needsReferenceImage ?? false,
                })
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onApplyPreset?.(
                  buildRecommendationPresetHtml({
                    title: item.title,
                    prompt: item.prompt ?? item.title,
                    imageUrl: item.image,
                    needsReferenceImage: item.needsReferenceImage ?? false,
                  })
                );
              }
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ y: -2 }}
            className="group relative flex aspect-[1.67/1] cursor-pointer flex-col overflow-hidden rounded-[12px] border border-neutral-200 bg-neutral-100/40 p-4 transition-colors hover:bg-neutral-100/60"
          >
            <h3 className="text-sm font-medium leading-snug text-neutral-900 line-clamp-1">
              {item.title}
            </h3>
            
            <div className="relative mt-auto h-[112px] w-full overflow-visible">
              {/* 三张图作为一个整体居中定位，内部用固定几何关系散开 */}
              <div className="pointer-events-none absolute left-1/2 bottom-[-56px] -translate-x-1/2 scale-[0.92]">
                <div className="relative h-[132px] w-[240px] overflow-visible">
                  <motion.div
                    className="absolute left-[0px] bottom-[0px] z-0 h-[120px] w-[90px] overflow-hidden rounded-[4px] bg-white shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.1),0px_10px_15px_-3px_rgba(0,0,0,0.1)] ring-[0.5px] ring-[#B0B0B0]"
                    style={{ rotate: -8 }}
                    whileHover={{ rotate: -12, y: 2, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <img
                      src={item.image}
                      className="h-full w-full object-cover opacity-85"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>

                  <motion.div
                    className="absolute left-[75px] bottom-[14px] z-10 h-[120px] w-[90px] overflow-hidden rounded-[4px] bg-white shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.1),0px_10px_15px_-3px_rgba(0,0,0,0.1)] ring-[0.5px] ring-[#B0B0B0]"
                    style={{ rotate: 0, scale: 1.04 }}
                    whileHover={{ scale: 1.015, y: -1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <img
                      src={item.image}
                      className="h-full w-full object-cover"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>

                  <motion.div
                    className="absolute right-[0px] bottom-[0px] z-20 h-[120px] w-[90px] overflow-hidden rounded-[4px] bg-white shadow-[0px_4px_6px_-4px_rgba(0,0,0,0.1),0px_10px_15px_-3px_rgba(0,0,0,0.1)] ring-[0.5px] ring-[#B0B0B0]"
                    style={{ rotate: 8 }}
                    whileHover={{ rotate: 12, y: 2, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <img
                      src={item.image}
                      className="h-full w-full object-cover opacity-85"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function RecentProjects({ 
  onSeeAll, 
  onNewProject,
  onOpenProject,
  onDeleteProject,
  projects = []
}: { 
  onSeeAll?: () => void;
  onNewProject?: () => void;
  onOpenProject?: (project: {
    id: string;
    title: string;
    date: string;
    image?: string;
    canvasJson?: string;
    editorSkillId?: string | null;
    editorDeepThink?: boolean;
  }) => void;
  onDeleteProject?: (id: string) => void;
  projects?: {
    id: string;
    title: string;
    date: string;
    image?: string;
    canvasJson?: string;
    editorSkillId?: string | null;
    editorDeepThink?: boolean;
  }[];
}) {
  /**
   * 首页只展示一行：
   * - 窄屏：新建 + 2 个最近项目
   * - 中屏：新建 + 3 个最近项目
   * - 宽屏：新建 + 4 个最近项目
   */
  const [recentRowSlots, setRecentRowSlots] = useState(4);

  useEffect(() => {
    const computeSlots = () => {
      if (typeof window === "undefined") return 4;
      if (window.innerWidth < 1024) return 2;
      if (window.innerWidth < 1280) return 3;
      return 4;
    };

    const sync = () => setRecentRowSlots(computeSlots());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const visibleProjects = projects.slice(0, recentRowSlots);

  return (
    <div className="mt-16 w-full">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-900">最近项目</h2>
        <button 
          type="button"
          onClick={onSeeAll}
          className="flex items-center gap-1 text-sm font-medium text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          查看全部
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
      
      <div className="grid grid-cols-3 items-stretch gap-2 sm:gap-4 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {/* 新建项目：白壳与项目卡一致；灰区 flex-1 与同行项目卡总高度对齐，无假页脚 */}
        <Card
          onClick={onNewProject}
          className={cn(
            "group cursor-pointer",
            RECENT_PROJECT_CARD_BASE_CLASS,
            "shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_18px_44px_rgba(15,23,42,0.08)]"
          )}
        >
          <div className={RECENT_NEW_PROJECT_GRAY_CLASS}>
            <div className="flex flex-col items-center gap-3">
              <Plus className="h-8 w-8 text-neutral-700/80" />
              <p className="text-base font-semibold tracking-tight text-neutral-900">
                新建项目
              </p>
            </div>
          </div>
        </Card>

        {visibleProjects.map((project) => (
          <Card
            key={project.id}
            onClick={() => onOpenProject?.(project)}
            className={cn(
              "group cursor-pointer",
              RECENT_PROJECT_CARD_BASE_CLASS,
              "shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
            )}
          >
            <div className={cn(RECENT_PROJECT_THUMB_FRAME_CLASS, "relative")}>
              {(() => {
                const thumbs = getProjectPreviewImages(project);
                if (thumbs.length >= 4) {
                  return (
                    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-[2px] bg-white/60">
                      {thumbs.slice(0, 4).map((src, i) => (
                        <img
                          key={`${project.id}-thumb-${i}`}
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  );
                }
                if (thumbs.length > 0) {
                  return (
                    <img
                      src={thumbs[0]}
                      className="h-full w-full object-cover"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  );
                }
                return (
                  <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-neutral-300">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject?.(project.id);
                }}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-700 text-white opacity-0 transition-all hover:bg-neutral-800 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2.5 min-w-0">
              <h3 className="line-clamp-2 text-sm font-medium text-neutral-900">{project.title || "未命名"}</h3>
              <p className="mt-0.5 text-xs text-neutral-400">更新于 {project.date}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** 灵感发现标签（与首页分类 chips 独立，避免影响推荐网格） */
const inspirationTabs = [
  { id: "all", label: "全部" },
  { id: "branding", label: "品牌设计" },
  { id: "posters", label: "海报与广告" },
  { id: "illustration", label: "插画" },
  { id: "ui", label: "UI设计" },
  { id: "character", label: "角色设计" },
  { id: "video", label: "影片与分镜" },
  { id: "product", label: "产品设计" },
  { id: "architecture", label: "建筑设计" },
] as const;

const HEADER_OFFSET_PX = 64; /* 与 Header h-16、标签栏 sticky top-16 对齐 */

export function InspirationDiscovery({
  onInspirationTabStickyChange,
}: {
  onInspirationTabStickyChange?: (stuck: boolean) => void;
} = {}) {
  const [activeTab, setActiveTab] = useState<string>("all");
  const stickySentinelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = stickySentinelRef.current;
    const notify = onInspirationTabStickyChange;
    if (!el || !notify) return;

    const update = () => {
      const top = el.getBoundingClientRect().top;
      notify(top < HEADER_OFFSET_PX);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      notify(false);
    };
  }, [onInspirationTabStickyChange]);

  const inspirationItems = [
    { title: "极简主义海报", image: "https://picsum.photos/seed/insp1/400/500" },
    { title: "赛博朋克风格", image: "https://picsum.photos/seed/insp2/400/600" },
    { title: "复古杂志封面", image: "https://picsum.photos/seed/insp3/400/400" },
    { title: "3D电商展示", image: "https://picsum.photos/seed/insp4/400/550" },
    { title: "自然风光摄影", image: "https://picsum.photos/seed/insp5/400/450" },
    { title: "抽象艺术设计", image: "https://picsum.photos/seed/insp6/400/650" },
    { title: "城市建筑摄影", image: "https://picsum.photos/seed/insp7/400/500" },
    { title: "时尚潮流插画", image: "https://picsum.photos/seed/insp8/400/400" },
  ];

  return (
    <div className="mx-auto mt-6 w-full max-w-7xl pb-12">
      <h2 className="mb-6 text-xl font-bold text-neutral-900">灵感发现</h2>

      {/* 吸顶检测：顶边越过 Header 底缘即视为标签栏已 sticky */}
      <div
        ref={stickySentinelRef}
        className="pointer-events-none h-px w-full opacity-0"
        aria-hidden
      />

      {/* 标签栏：紧凑展示，不使用横向滚动 */}
      <div className="sticky top-16 z-30 -mx-4 bg-white px-4 pt-0 pb-1 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          {inspirationTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[13px] font-medium leading-none whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-neutral-100 text-neutral-900"
                  : "bg-transparent text-neutral-600 hover:text-neutral-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {inspirationItems.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
            className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-neutral-50 transition-all hover:ring-2 hover:ring-neutral-200"
          >
            <img 
              src={item.image} 
              alt={item.title} 
              className="w-full object-cover transition-transform duration-500 group-hover:scale-110" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
              <h3 className="text-sm font-bold text-white">{item.title}</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-white/20 backdrop-blur-sm" />
                <span className="text-[10px] font-medium text-white/80">Creagic AI</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
