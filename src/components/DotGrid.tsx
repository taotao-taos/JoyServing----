import * as React from "react";
import { useEffect, useRef } from "react";

/** 首页 / 登录页共用的点阵背景：指针邻近高亮 + 可选环境漂移动效 */
export function DotGrid({
  dotSize = 4,
  gap = 10,
  baseColor = "#ffffff",
  activeColor = "#c4c4c4",
  proximity = 60,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  ambientDriftPx = 0,
  /** 登录页等场景：加深「重」点区域、略放大高 mix 圆点，层次更明显 */
  ambientAccent = false,
}: {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  ambientDriftPx?: number;
  ambientAccent?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({
    x: -9999,
    y: -9999,
    prevX: -9999,
    prevY: -9999,
    ts: 0,
    speed: 0,
  });
  const parseHex = (hex: string) => {
    const normalized = hex.replace("#", "");
    const full =
      normalized.length === 3
        ? normalized
            .split("")
            .map((ch) => ch + ch)
            .join("")
        : normalized;
    const int = Number.parseInt(full, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      width = Math.floor(rect.width);
      height = Math.floor(rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const getPointerInWrapper = (clientX: number, clientY: number) => {
      const rect = wrapper.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onPointerMove = (e: PointerEvent) => {
      const p = getPointerInWrapper(e.clientX, e.clientY);
      const now = performance.now();
      const prev = pointerRef.current;
      const dt = Math.max(16, now - prev.ts);
      const dist = Math.hypot(p.x - prev.prevX, p.y - prev.prevY);
      const speedPxPerSec = (dist / dt) * 1000;
      pointerRef.current = {
        x: p.x,
        y: p.y,
        prevX: p.x,
        prevY: p.y,
        ts: now,
        speed: Math.min(speedPxPerSec, maxSpeed),
      };
    };

    const onPointerLeave = () => {
      pointerRef.current.x = -9999;
      pointerRef.current.y = -9999;
      pointerRef.current.speed = 0;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", resize);

    let shock = 0;
    let lastTime = performance.now();

    const draw = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      const p = pointerRef.current;

      if (p.speed > speedTrigger) {
        shock = Math.min(1, shock + dt * shockStrength);
      } else {
        shock = Math.max(0, shock - dt / Math.max(0.0001, returnDuration));
      }

      ctx.clearRect(0, 0, width, height);
      const baseRgb = parseHex(baseColor);
      const activeRgb = parseHex(activeColor);
      const effectProximity = proximity * 0.9;
      const effectShockRadius = shockRadius * 0.62;

      const driftAmp = ambientDriftPx;
      const useAmbient = Math.abs(driftAmp) > 0.0001;
      /** 无鼠标时也保持明显动效：相位更快 + 双频漂移，避免整屏同相位移 */
      const phase = now * (useAmbient ? 0.0028 : 0.001);

      for (let y = gap; y < height; y += gap) {
        for (let x = gap; x < width; x += gap) {
          const ox =
            useAmbient
              ? driftAmp *
                (Math.sin(phase * 0.8 + x * 0.012 + y * 0.009) +
                  0.48 * Math.sin(phase * 1.25 - y * 0.016 + x * 0.011))
              : 0;
          const oy =
            useAmbient
              ? driftAmp *
                (Math.cos(phase * 0.65 + y * 0.011 + x * 0.014) +
                  0.45 * Math.cos(phase * 1.1 + x * 0.018 - y * 0.012))
              : 0;
          const px = x + ox;
          const py = y + oy;
          const dx = px - p.x;
          const dy = py - p.y;
          const distance = Math.hypot(dx, dy);
          const innerRadius = effectProximity * 0.62;
          const proximityPower = Math.max(0, 1 - distance / innerRadius);
          const proximityFade = proximityPower * proximityPower;
          const inShock = distance <= effectShockRadius && shock > 0;
          const force = inShock ? (1 - distance / effectShockRadius) * shock : 0;
          const resistanceScale = Math.max(
            0.1,
            Math.min(2, 1000 / Math.max(1, resistance))
          );
          let radius = dotSize / 2 + force * resistanceScale;
          let mix = Math.min(1, proximityFade + force * 0.35);
          if (useAmbient) {
            const breatheAmp = ambientAccent ? 0.26 : 0.14;
            const breathe =
              breatheAmp *
              (0.5 +
                0.5 * Math.sin(phase * 0.95 + x * 0.028 + y * 0.022));
            mix = Math.min(1, mix + breathe);
            if (ambientAccent) {
              radius *= 1 + mix * 0.62;
            }
          }
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * mix);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * mix);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * mix);
          const alpha = useAmbient
            ? (ambientAccent ? 0.22 : 0.17) +
              mix * (ambientAccent ? 0.72 : 0.58)
            : 0.12 + mix * 0.62;

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.5, radius), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", resize);
    };
  }, [
    activeColor,
    ambientAccent,
    ambientDriftPx,
    baseColor,
    dotSize,
    gap,
    maxSpeed,
    proximity,
    resistance,
    returnDuration,
    shockRadius,
    shockStrength,
    speedTrigger,
  ]);

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
