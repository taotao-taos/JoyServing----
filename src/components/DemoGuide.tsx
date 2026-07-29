/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, CheckCircle2, Circle, Loader2, ChevronRight, RefreshCw } from '@/lib/icons';
import { ONBOARDING_TOAST_STEP1, ONBOARDING_TOAST_STEP2, ONBOARDING_TOAST_STEP4 } from '@/lib/onboardingCopy';
import {
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEPS,
  onboardingCompletedCount,
  onboardingProgressPercent,
  resolveOnboardingStepState,
  type OnboardingStepDef,
} from '@/lib/onboardingSteps';
import { cn } from '@/lib/utils';

const PANEL_W = 304;
const MARGIN = 16;
const STORAGE_KEY = 'js_demo_guide_pos';

type PanelPos = { x: number; y: number };

function loadStoredPos(): PanelPos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelPos;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function clampPos(x: number, y: number, panelH: number): PanelPos {
  const maxX = Math.max(MARGIN, window.innerWidth - PANEL_W - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - panelH - MARGIN);
  return {
    x: Math.min(Math.max(MARGIN, x), maxX),
    y: Math.min(Math.max(MARGIN, y), maxY),
  };
}

function defaultPos(dockRight: boolean, panelH: number): PanelPos {
  const y = Math.max(MARGIN, window.innerHeight - panelH - 96);
  const x = dockRight
    ? Math.max(MARGIN, window.innerWidth - PANEL_W - MARGIN)
    : MARGIN;
  return clampPos(x, y, panelH);
}

export const DemoGuide: React.FC = () => {
  const {
    setActiveTab,
    demoStep,
    setDemoStep,
    showDemoGuide,
    setShowDemoGuide,
    showToast,
    hiredAgents,
    setActiveOnboardingAgentId,
    activeOnboardingAgentId,
  } = useApp();

  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PanelPos | null>(() => loadStoredPos());
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );

  const dockRight = !!activeOnboardingAgentId;

  const syncDefaultIfNeeded = useCallback(() => {
    if (pos || !panelRef.current) return;
    const h = panelRef.current.offsetHeight;
    setPos(defaultPos(dockRight, h));
  }, [pos, dockRight]);

  useLayoutEffect(() => {
    syncDefaultIfNeeded();
  }, [syncDefaultIfNeeded, showDemoGuide]);

  useEffect(() => {
    const onResize = () => {
      if (!panelRef.current) return;
      setPos((prev) => {
        const p = prev ?? defaultPos(dockRight, panelRef.current!.offsetHeight);
        return clampPos(p.x, p.y, panelRef.current!.offsetHeight);
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [dockRight]);

  useEffect(() => {
    if (pos) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    }
  }, [pos]);

  if (!showDemoGuide) {
    return null;
  }

  const hasOnlineAgent = hiredAgents.some((a) => a.status === 'online');
  const completed = onboardingCompletedCount(demoStep, hasOnlineAgent);
  const pct = onboardingProgressPercent(demoStep, hasOnlineAgent);

  const resolveOnboardingTargetId = () => {
    const draft = hiredAgents.find((a) => a.status === 'draft');
    return draft?.id ?? hiredAgents[0]?.id ?? null;
  };

  const handleStepClick = (step: OnboardingStepDef) => {
    setActiveTab(step.tab);
    setDemoStep(step.demoStep);

    if (step.openOnboarding) {
      const targetId = resolveOnboardingTargetId();
      if (targetId) setActiveOnboardingAgentId(targetId);
    }

    if (step.n === 1) showToast(ONBOARDING_TOAST_STEP1);
    if (step.n === 2) showToast(ONBOARDING_TOAST_STEP2);
    if (step.n === 4) showToast(ONBOARDING_TOAST_STEP4);
  };

  const beginDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !panelRef.current) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
    const origin = pos ?? { x: rect.left, y: rect.top };
    if (!pos) setPos(origin);

    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: origin.x,
      originY: origin.y,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    if (!d || d.pointerId !== e.pointerId || !panelRef.current) return;
    const panelH = panelRef.current.offsetHeight;
    const next = clampPos(
      d.originX + (e.clientX - d.startX),
      d.originY + (e.clientY - d.startY),
      panelH,
    );
    setPos(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragState.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragState.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const panelStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y, width: PANEL_W }
    : { left: dockRight ? undefined : MARGIN, right: dockRight ? MARGIN : undefined, bottom: 96, width: PANEL_W };

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className={cn(
        'fixed z-50 bg-white border border-neutral-200 rounded-[13px] shadow-[0_16px_48px_rgba(31,35,41,0.14)] font-sans text-neutral-800 animate-in fade-in duration-200 flex flex-col max-h-[min(460px,calc(100vh-32px))]',
        !pos && (dockRight ? 'slide-in-from-right-3' : 'slide-in-from-bottom-3'),
        dragging && 'select-none',
      )}
    >
      {/* 可拖动标题栏 */}
      <div
        role="toolbar"
        aria-label="拖动雇佣员工向导"
        onPointerDown={beginDrag}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn(
          'shrink-0 px-3 py-2.5 border-b border-neutral-100 flex items-center gap-2.5 touch-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-extrabold text-neutral-900 truncate">雇佣员工向导</h3>
            <span className="text-[11px] font-semibold text-neutral-400 shrink-0 tabular-nums">
              {completed}/{ONBOARDING_STEP_COUNT}
            </span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full bg-neutral-800 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(pct, completed > 0 ? 8 : 4)}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowDemoGuide(false)}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md hover:bg-neutral-100 transition cursor-pointer shrink-0"
          title="收起"
        >
          <X size={14} />
        </button>
      </div>

      {/* 步骤列表 — 紧凑 + 可滚动 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 custom-scrollbar">
        <div className="space-y-1">
          {ONBOARDING_STEPS.map((step) => {
            const { done, active } = resolveOnboardingStepState(
              demoStep,
              step.demoStep,
              hasOnlineAgent,
            );
            return (
              <button
                key={step.n}
                type="button"
                title={step.title}
                onClick={() => handleStepClick(step)}
                className={cn(
                  'w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition cursor-pointer group',
                  active
                    ? 'bg-neutral-100 border border-neutral-200'
                    : 'hover:bg-neutral-50',
                )}
              >
                {done ? (
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : active ? (
                  <Loader2 size={15} className="text-neutral-700 animate-spin shrink-0 mt-0.5" />
                ) : (
                  <Circle size={15} className="text-neutral-300 shrink-0 mt-0.5" />
                )}
                <span
                  className={cn(
                    'flex-1 text-[11.5px] font-medium leading-snug line-clamp-2',
                    done ? 'text-neutral-400 line-through decoration-neutral-300' : 'text-neutral-800',
                  )}
                >
                  <span className="text-neutral-400 font-semibold mr-1 tabular-nums">{step.n}.</span>
                  {step.title}
                </span>
                <ChevronRight size={13} className="text-neutral-300 group-hover:text-neutral-500 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 底栏 */}
      <div className="shrink-0 px-3 py-2 border-t border-neutral-100 flex items-center justify-between text-[10px]">
        <span className="text-neutral-400">拖标题栏可移动</span>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('js_build_tour_seen');
            localStorage.clear();
            window.location.reload();
          }}
          className="text-neutral-400 hover:text-neutral-600 flex items-center gap-0.5 cursor-pointer"
        >
          <RefreshCw size={10} /> 重置
        </button>
      </div>
    </div>
  );
};
