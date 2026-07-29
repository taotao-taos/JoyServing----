/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 轻量 SVG 图表 — 数据看板用，无第三方 chart 依赖
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type ChartSegment = {
  label: string;
  value: number;
  color: string;
};

export type BarItem = {
  label: string;
  value: number;
  color?: string;
  suffix?: string;
};

function formatNumber(n: number) {
  return n.toLocaleString();
}

/** 迷你面积折线 — 指标卡底部趋势 */
export function SparklineArea({
  data,
  className,
  height = 48,
}: {
  data: number[];
  className?: string;
  height?: number;
}) {
  if (data.length < 2) return null;

  const width = 280;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id="dashSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#dashSparkFill)" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function parsePercent(value: string): number {
  const num = parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
}

/** 环图 / 饼图 — 适合占比构成类数据 */
export function DonutChart({
  segments,
  size = 168,
  strokeWidth = 22,
  centerLabel,
  centerValue,
  className,
}: {
  segments: ChartSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total <= 0) {
    return (
      <div className={cn('flex items-center justify-center text-sm text-neutral-400', className)} style={{ width: size, height: size }}>
        暂无数据
      </div>
    );
  }

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#f5f5f5"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg) => {
          const pct = seg.value / total;
          const dash = pct * circumference;
          const el = (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className="transition-all duration-500"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          {centerValue && (
            <span className="text-lg font-bold text-neutral-900 tabular-nums leading-tight">{centerValue}</span>
          )}
          {centerLabel && (
            <span className="text-[10px] text-neutral-500 mt-0.5 leading-snug">{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ChartLegend({ segments, showValue = true }: { segments: ChartSegment[]; showValue?: boolean }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <ul className="space-y-2 min-w-0 flex-1">
      {segments.map((seg) => {
        const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0';
        return (
          <li key={seg.label} className="flex items-center gap-2 text-xs min-w-0">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="flex-1 truncate text-neutral-700">{seg.label}</span>
            {showValue && (
              <span className="tabular-nums text-neutral-500 shrink-0">
                {formatNumber(seg.value)} · {pct}%
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 横向条形图 — 适合量级对比 */
export function HorizontalBarChart({
  items,
  className,
  compact = false,
}: {
  items: BarItem[];
  className?: string;
  compact?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-3', className)}>
      {items.map((item) => (
        <div key={item.label} className={compact ? 'space-y-0.5' : 'space-y-1'}>
          <div className={cn('flex items-center justify-between gap-2', compact ? 'text-[10px]' : 'text-xs')}>
            <span className="text-neutral-600 truncate">{item.label}</span>
            <span className="font-mono font-semibold text-neutral-900 tabular-nums shrink-0">
              {formatNumber(item.value)}
              {item.suffix ?? ''}
            </span>
          </div>
          <div className={cn('bg-neutral-100 rounded-full overflow-hidden', compact ? 'h-2' : 'h-2.5')}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color ?? '#404040',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 环形进度 — 适合单一比率指标 */
export function RadialGauge({
  label,
  value,
  color = '#404040',
  size = 88,
  strokeWidth = 8,
}: {
  label: string;
  value: number;
  color?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', size <= 64 ? 'gap-1' : 'gap-2')}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f5f5f5" strokeWidth={strokeWidth} />
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold text-neutral-900 tabular-nums', size <= 64 ? 'text-[11px]' : 'text-sm')}>
            {clamped.toFixed(1)}%
          </span>
        </div>
      </div>
      <span className={cn('text-neutral-600 text-center leading-snug', size <= 64 ? 'text-[9px]' : 'text-[11px]')}>
        {label}
      </span>
    </div>
  );
}

/** 漏斗条 — 适合进线 → 接待 → 转人工流程 */
export function FunnelChart({
  steps,
  className,
  compact = false,
}: {
  steps: { label: string; value: number; color: string }[];
  className?: string;
  compact?: boolean;
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className={cn(compact ? 'space-y-1' : 'space-y-2', className)}>
      {steps.map((step, idx) => {
        const widthPct = Math.max(compact ? 24 : 28, (step.value / max) * 100);
        const conv =
          idx > 0 && steps[idx - 1].value > 0
            ? ((step.value / steps[idx - 1].value) * 100).toFixed(1)
            : null;
        return (
          <div key={step.label} className={cn('flex flex-col items-center', compact ? 'gap-0.5' : 'gap-1')}>
            <div
              className={cn(
                'rounded-md flex items-center justify-between px-2.5 font-semibold text-white transition-all duration-500',
                compact ? 'h-7 text-[10px] min-w-[36%]' : 'h-9 text-[11px] min-w-[40%] rounded-lg',
              )}
              style={{ width: `${widthPct}%`, backgroundColor: step.color }}
            >
              <span className="truncate">{step.label}</span>
              <span className="tabular-nums shrink-0 ml-1.5">{formatNumber(step.value)}</span>
            </div>
            {conv && (
              <span className={cn('text-neutral-400 tabular-nums', compact ? 'text-[8px]' : 'text-[9px]')}>
                转化率 {conv}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { parsePercent, formatNumber };

/** 南丁格尔玫瑰图 — 等角度、半径随数值变化，适合多分类占比 */
export function RoseChart({
  segments,
  size = 200,
  className,
}: {
  segments: ChartSegment[];
  size?: number;
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 20;
  const maxVal = Math.max(...segments.map((s) => s.value), 1);
  const n = segments.length;
  const angleStep = (2 * Math.PI) / Math.max(n, 1);

  if (total <= 0) {
    return (
      <div className={cn('flex items-center justify-center text-sm text-neutral-400', className)} style={{ width: size, height: size }}>
        暂无数据
      </div>
    );
  }

  function polarToXY(r: number, angle: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  function sectorPath(index: number, radius: number) {
    const start = index * angleStep - Math.PI / 2;
    const end = start + angleStep * 0.92;
    const p1 = polarToXY(radius, start);
    const p2 = polarToXY(radius, end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
  }

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((ring) => (
          <circle
            key={ring}
            cx={cx}
            cy={cy}
            r={maxR * ring}
            fill="none"
            stroke="#f5f5f5"
            strokeWidth={1}
          />
        ))}
        {segments.map((seg, i) => {
          const r = (seg.value / maxVal) * maxR;
          return (
            <path
              key={seg.label}
              d={sectorPath(i, Math.max(r, 8))}
              fill={seg.color}
              opacity={0.88}
              className="transition-all duration-500 hover:opacity-100"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-base font-bold text-neutral-900 tabular-nums">{formatNumber(total)}</span>
        <span className="text-[9px] text-neutral-500">总回答</span>
      </div>
    </div>
  );
}

/** 分类占比卡片网格 — 配合玫瑰图或独立使用 */
export function CategoryStatGrid({
  segments,
  className,
}: {
  segments: ChartSegment[];
  className?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const sorted = [...segments].sort((a, b) => b.value - a.value);

  return (
    <div className={cn('grid grid-cols-2 gap-2 min-w-0 flex-1', className)}>
      {sorted.map((seg, idx) => {
        const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0.0';
        return (
          <div
            key={seg.label}
            className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-2.5 py-2 min-w-0"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[10px] text-neutral-600 truncate">{seg.label}</span>
              {idx === 0 && (
                <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1 rounded shrink-0">TOP</span>
              )}
            </div>
            <p className="text-lg font-bold text-neutral-900 tabular-nums leading-none">{pct}%</p>
            <p className="text-[9px] text-neutral-400 tabular-nums mt-1">{formatNumber(seg.value)} 次</p>
          </div>
        );
      })}
    </div>
  );
}
