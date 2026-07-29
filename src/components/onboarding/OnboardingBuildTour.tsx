/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 入职培训分部遮罩引导 — 对齐 joypi employee center build tour
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from '@/lib/icons';
import { BUILD_TOUR_STEPS, type BuildTourStep } from '@/lib/onboardingBuildTour';
import { cn } from '@/lib/utils';

type Rect = { top: number; left: number; width: number; height: number };

function readTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function tooltipStyle(
  rect: Rect,
  placement: BuildTourStep['placement'],
): React.CSSProperties {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  switch (placement) {
    case 'bottom':
      return { top: rect.top + rect.height + 18, left: Math.max(16, cx - 160) };
    case 'top':
      return {
        bottom: window.innerHeight - rect.top + 18,
        left: Math.max(16, cx - 160),
      };
    case 'right':
      return { top: Math.max(16, cy - 40), left: rect.left + rect.width + 18 };
    case 'left':
      return {
        top: Math.max(16, cy - 40),
        right: window.innerWidth - rect.left + 18,
      };
  }
}

export interface OnboardingBuildTourProps {
  open: boolean;
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onComplete: () => void;
  waitForTarget?: boolean;
  waitTimeoutMs?: number;
}

export const OnboardingBuildTour: React.FC<OnboardingBuildTourProps> = ({
  open,
  currentStep,
  onStepChange,
  onClose,
  onComplete,
  waitForTarget = true,
  waitTimeoutMs = 5000,
}) => {
  const steps = BUILD_TOUR_STEPS;
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(!waitForTarget);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setReady(!waitForTarget);
      return;
    }
    if (!waitForTarget) {
      setReady(true);
      return;
    }
    const first = steps[0]?.target;
    if (!first || document.querySelector(first)) {
      setReady(true);
      return;
    }
    setReady(false);
    const observer = new MutationObserver(() => {
      if (document.querySelector(first)) {
        setReady(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setTimeout(() => {
      setReady(true);
      observer.disconnect();
    }, waitTimeoutMs);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [open, waitForTarget, waitTimeoutMs, steps]);

  const measure = useCallback(() => {
    if (!open || currentStep >= steps.length) return;
    setRect(readTargetRect(steps[currentStep].target));
  }, [open, currentStep, steps]);

  useEffect(() => {
    if (!open || !ready || currentStep >= steps.length) return;
    const step = steps[currentStep];
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    setRect(null);
    try {
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    } catch {
      el.scrollIntoView();
    }
    const timers = [80, 220, 420].map((ms) => window.setTimeout(() => measure(), ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [open, ready, currentStep, steps, measure]);

  useEffect(() => {
    if (!open || !ready) return;
    measure();
    const onScroll = () => measure();
    const onResize = () => measure();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [open, ready, measure]);

  if (!open || !ready || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const hole = rect
    ? `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z M${rect.left - 6},${rect.top - 6} h${rect.width + 12} v${rect.height + 12} h-${rect.width + 12} Z`
    : `M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z`;
  const tipPos = rect
    ? tooltipStyle(rect, step.placement)
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return createPortal(
    <div className="fixed inset-0 z-[80] pointer-events-none" aria-live="polite">
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" width="100%" height="100%">
        <path d={hole} fill="rgba(0,0,0,0.55)" fillRule="evenodd" onClick={onClose} />
      </svg>

      {rect && (
        <div
          className="absolute pointer-events-none rounded-lg ring-2 ring-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      <div
        className="absolute pointer-events-auto w-[320px] max-w-[calc(100vw-32px)] bg-white border border-neutral-200 rounded-[13px] shadow-[0_16px_48px_rgba(31,35,41,0.2)] p-4 animate-in fade-in zoom-in-95 duration-150"
        style={tipPos}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-[13px] font-extrabold text-neutral-900">{step.title}</h4>
          <span className="text-[11px] font-semibold text-neutral-400 tabular-nums shrink-0">
            {currentStep + 1}/{steps.length}
          </span>
        </div>
        <p className="text-[12px] text-neutral-600 leading-relaxed mb-3">{step.description}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 hover:text-neutral-700 cursor-pointer"
          >
            跳过
          </button>
          <div className="flex items-center gap-1.5">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => onStepChange(currentStep - 1)}
                className="px-3 py-1.5 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition cursor-pointer"
              >
                上一步
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onComplete();
                else onStepChange(currentStep + 1);
              }}
              className={cn(
                'px-3 py-1.5 text-[11px] font-medium text-white bg-neutral-800 hover:opacity-90 rounded-lg transition cursor-pointer flex items-center gap-1',
              )}
            >
              {isLast ? '完成' : '下一步'}
              {!isLast && <ChevronRight size={11} />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
