import * as React from "react";
import { Plus, Home, Folder, Info, ExternalLink } from '@/lib/icons';
import { cn } from "@/lib/utils";
import { ProfileAvatarHover } from "@/components/ProfileAvatarHover";
import { PRIVACY_URL, SUPPORT_EMAIL, TERMS_URL } from "@/src/lib/siteLinks";
import { INITIAL_USER_CREDITS } from "@/src/lib/creditsStorage";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onNewProject?: () => void;
  onUpgrade?: () => void;
  onLogout?: () => void;
  creditBalance?: number;
  onRefillCredits?: () => void;
}

const Tooltip = ({ text }: { text: string }) => (
  <div className="absolute left-full top-1/2 -translate-y-1/2 pl-6 hidden group-hover:block z-[100]">
    <div className="relative flex items-center">
      <div className="h-0 w-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-neutral-800" />
      <div className="whitespace-nowrap rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-white shadow-xl">
        {text}
      </div>
    </div>
  </div>
);

const InfoPopover = () => (
  <div className="absolute left-full top-1/2 -translate-y-1/2 pl-6 hidden group-hover:block z-[100]">
    <div className="w-60 rounded-[13px] border border-neutral-100 bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-3">
        <a
          href={TERMS_URL || "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg px-1 py-0.5 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
          onClick={(e) => {
            if (!TERMS_URL) e.preventDefault();
          }}
        >
          <span className="text-sm font-medium text-neutral-900">用户协议</span>
          <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
        </a>
        <a
          href={PRIVACY_URL || "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-lg px-1 py-0.5 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
          onClick={(e) => {
            if (!PRIVACY_URL) e.preventDefault();
          }}
        >
          <span className="text-sm font-medium text-neutral-900">隐私政策</span>
          <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
        </a>
        <a
          href={
            SUPPORT_EMAIL
              ? `mailto:${SUPPORT_EMAIL}?subject=客服咨询`
              : "#"
          }
          className="flex items-center justify-between rounded-lg px-1 py-0.5 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
          onClick={(e) => {
            if (!SUPPORT_EMAIL) e.preventDefault();
          }}
        >
          <span className="text-sm font-medium text-neutral-900">联系客服</span>
          <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
        </a>
      </div>

      <div className="my-4 h-px w-full bg-neutral-100" />

      <div className="flex items-center justify-between px-1">
        <img src="https://raw.githubusercontent.com/taotao-taos/-/main/bilibili.png" className="h-4 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer" alt="Bilibili" />
        <img src="https://raw.githubusercontent.com/taotao-taos/-/main/douyin.png" className="h-4 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer" alt="Douyin" />
        <img src="https://raw.githubusercontent.com/taotao-taos/-/main/xhs.png" className="h-4 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer" alt="Xiaohongshu" />
        <img src="https://raw.githubusercontent.com/taotao-taos/-/main/wechat.png" className="h-4 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer" alt="WeChat" />
      </div>

      <div className="my-4 h-px w-full bg-neutral-100" />

      <div className="flex flex-col gap-1 text-[10px] leading-relaxed text-neutral-400">
        <p>Copyright by Creagic AI © 2026</p>
        <p>北京创意魔法公司</p>
        <p>京ICP备2025147903号-6</p>
      </div>
    </div>
  </div>
);

export function Sidebar({
  activeView,
  onViewChange,
  onNewProject,
  onUpgrade,
  onLogout,
  creditBalance = INITIAL_USER_CREDITS,
  onRefillCredits,
}: SidebarProps) {
  return (
    <aside className="fixed left-4 top-1/2 z-50 flex -translate-y-1/2 flex-col items-center">
      <div className="flex flex-col items-center gap-2 rounded-full border border-neutral-200 bg-white/90 px-1.5 py-2 backdrop-blur-xl shadow-2xl shadow-neutral-200/40">
        {/* Floating Plus Button */}
        <div className="group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-95">
          <button
            className="flex h-full w-full items-center justify-center"
            onClick={() => onNewProject ? onNewProject() : onViewChange("editor")}
          >
            <Plus className="h-4 w-4" />
          </button>
          <Tooltip text="新建项目" />
        </div>

        <div className="h-px w-5 shrink-0 bg-neutral-200" aria-hidden />

        {/* Navigation Pill */}
        <div className="flex flex-col items-center gap-1">
          <div className="group relative">
            <button
              onClick={() => onViewChange("home")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                activeView === "home" ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <Home className="h-4 w-4" />
            </button>
            <Tooltip text="首页" />
          </div>

          <div className="group relative">
            <button
              onClick={() => onViewChange("projects")}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                activeView === "projects" ? "bg-neutral-100 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <Folder className="h-4 w-4" />
            </button>
            <Tooltip text="项目" />
          </div>

          <div className="group relative">
            <div
              className="flex h-9 w-9 cursor-default items-center justify-center rounded-full text-neutral-600"
              aria-hidden
            >
              <Info className="h-4 w-4" />
            </div>
            <InfoPopover />
          </div>

          <ProfileAvatarHover
            onUpgrade={onUpgrade}
            onLogout={onLogout}
            points={creditBalance}
            onRefillCredits={onRefillCredits}
          />
        </div>
      </div>
    </aside>
  );
}
