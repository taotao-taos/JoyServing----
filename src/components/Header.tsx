import * as React from "react";
import { Zap } from '@/lib/icons';
import { Button } from "@/components/ui/button";
import { INITIAL_USER_CREDITS } from "@/src/lib/creditsStorage";
import { CreagicLogo } from "@/src/components/CreagicLogo";

interface HeaderProps {
  onUpgrade?: () => void;
  creditBalance?: number;
}

export function Header({
  onUpgrade,
  creditBalance = INITIAL_USER_CREDITS,
}: HeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between px-4 bg-white/0 pointer-events-none">
      <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto">
        <div className="flex items-center rounded-full border border-neutral-200 bg-white/90 p-1 backdrop-blur-xl shadow-2xl shadow-neutral-200/40">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full overflow-hidden bg-white">
            <CreagicLogo />
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 pointer-events-auto">
        <Button
          variant="outline"
          onClick={onUpgrade}
          className="h-9 gap-0 rounded-full border-neutral-100 bg-white px-3 text-neutral-900 shadow-sm transition-all hover:bg-neutral-50"
        >
          <div className="flex items-center gap-1.5 pr-2.5">
            <Zap className="h-3.5 w-3.5 fill-cyan-400 text-cyan-400" />
            <span className="text-xs font-bold">{creditBalance}</span>
          </div>
          <div className="h-3 w-[1px] bg-neutral-200" />
          <span className="pl-2.5 text-xs font-bold">升级</span>
        </Button>
      </div>
    </header>
  );
}
