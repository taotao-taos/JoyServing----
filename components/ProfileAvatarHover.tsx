import { useRef, useState } from "react";
import { User, HelpCircle, Mail, LogOut, ChevronRight } from '@/lib/icons';
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDismissOnOutsidePress } from "@/src/lib/useDismissOnOutsidePress";
import { PROFILE_USER } from "@/lib/profileUser";

export interface ProfileAvatarHoverProps {
  onUpgrade?: () => void;
  onRefillCredits?: () => void;
  onLogout?: () => void;
  displayName?: string;
  points?: number;
  avatarSrc?: string;
  className?: string;
  /** Tailwind z class for the flyout (editor 全屏时需高于画布) */
  panelClassName?: string;
}

export function ProfileAvatarHover({
  onUpgrade,
  onRefillCredits,
  onLogout,
  displayName = PROFILE_USER.name,
  points = 48,
  avatarSrc,
  className,
  panelClassName = "z-[110]",
}: ProfileAvatarHoverProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useDismissOnOutsidePress(open, wrapRef, () => setOpen(false));
  const menuItems: Array<{
    icon: typeof User;
    label: string;
    danger?: boolean;
    action?: () => void;
  }> = [
    { icon: User, label: "账户管理" },
    { icon: HelpCircle, label: "使用教程" },
    { icon: Mail, label: "联系我们" },
    { icon: LogOut, label: "退出登录", danger: true, action: onLogout },
  ];

  const fallback = (
    <AvatarFallback className={cn(PROFILE_USER.fallbackClass, "text-[12px]")}>
      {PROFILE_USER.initial}
    </AvatarFallback>
  );

  return (
    <div ref={wrapRef} className={cn("relative h-9", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-zinc-300"
      >
        <Avatar className="h-9 w-9 transition-transform hover:scale-105 active:scale-95 ring-2 ring-white shadow-sm after:hidden">
          {avatarSrc ? <AvatarImage src={avatarSrc} referrerPolicy="no-referrer" /> : null}
          {fallback}
        </Avatar>
      </button>
      {open && (
        <div
          className={cn(
            "absolute left-full top-1/2 z-[110] -translate-y-1/2 pl-3",
            panelClassName
          )}
        >
          <div className="w-[min(88vw,280px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_12px_48px_rgba(0,0,0,0.12)]">
            <div className="m-3 rounded-2xl border border-zinc-100 bg-zinc-50/90 p-4">
              <div className="flex flex-col items-center">
                <Avatar className="h-16 w-16 border border-zinc-200 shadow-sm after:hidden">
                  {avatarSrc ? <AvatarImage src={avatarSrc} referrerPolicy="no-referrer" /> : null}
                  <AvatarFallback className={cn(PROFILE_USER.fallbackClass, "text-lg")}>
                    {PROFILE_USER.initial}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-4 flex w-full items-center justify-between gap-2">
                  <span className="text-[15px] font-bold tracking-tight text-zinc-900">
                    {displayName}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpgrade?.();
                    }}
                    className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    升级
                  </button>
                </div>
                <div className="my-3 h-px w-full bg-zinc-200/90" />
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left text-sm text-zinc-700 transition-colors hover:text-zinc-900"
                >
                  <span className="font-medium">积分</span>
                  <span className="flex items-center gap-0.5 text-zinc-900">
                    <span className="font-semibold tabular-nums">{points}</span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </span>
                </button>
                {onRefillCredits && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefillCredits();
                    }}
                    className="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    一键补满积分（测试）
                  </button>
                )}
              </div>
            </div>
            <nav className="px-2 pb-3 pt-0">
              {menuItems.map(({ icon: Icon, label, action, danger }) => (
                <button
                  key={label}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    action?.();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      danger ? "text-red-500" : "text-zinc-500"
                    )}
                    strokeWidth={1.5}
                  />
                  <span className={danger ? "text-red-600" : undefined}>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
