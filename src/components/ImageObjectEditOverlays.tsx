import * as React from "react";
import { createPortal } from "react-dom";
import {
  Eraser,
  Expand,
  Crop,
  RotateCcw,
  ChevronDown,
  Zap,
  Image as ImageIcon,
  Link2,
} from '@/lib/icons';
import { cn } from "@/lib/utils";
import {
  clamp,
  displayToNatural,
  getObjectContainRect,
} from "@/src/lib/imageDisplayMapping";

export type ImageEditSession = {
  mode: "erase" | "outpaint" | "crop";
  objectId: string;
};

type CommitPayload = {
  objectId: string;
  dataUrl: string;
  naturalW: number;
  naturalH: number;
  prevNaturalW: number;
  prevNaturalH: number;
};

type Props = {
  session: ImageEditSession | null;
  imageUrl: string;
  /** 由父组件用 ResizeObserver 同步的画布图片视口矩形；为空时不渲染交互层 */
  rect: DOMRect | null;
  onClose: () => void;
  onCommitContentAndSize: (args: CommitPayload) => void;
  toast: (msg: string) => void;
  tryConsumeCredits: (amount: number) => boolean;
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!/^data:/i.test(url)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = url;
  });
}

/** 擦除层：紫色画刷；Alt/Option 切换擦除；canvas 尺寸只在实际像素变化时重建，避免 rect 抖动清空笔迹 */
function EraseLayer(props: {
  boxW: number;
  boxH: number;
  dpr: number;
  naturalW: number;
  naturalH: number;
  contain: ReturnType<typeof getObjectContainRect>;
  maskGetterRef: React.MutableRefObject<(() => string | null) | null>;
  onApply: () => void;
}) {
  const { boxW, boxH, dpr, naturalW, naturalH, contain, maskGetterRef, onApply } =
    props;
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [brush, setBrush] = React.useState(28);
  const drawingRef = React.useRef(false);

  React.useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const W = Math.max(1, Math.round(boxW * dpr));
    const H = Math.max(1, Math.round(boxH * dpr));
    if (c.width === W && c.height === H) return;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [boxW, boxH, dpr]);

  React.useLayoutEffect(() => {
    maskGetterRef.current = () =>
      canvasRef.current?.toDataURL("image/png") ?? null;
  }, [maskGetterRef]);

  const paintDot = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    alt: boolean
  ) => {
    const { nx, ny } = displayToNatural(cx, cy, contain);
    if (nx < 0 || ny < 0 || nx > naturalW || ny > naturalH) return;
    ctx.save();
    ctx.globalCompositeOperation = alt ? "destination-out" : "source-over";
    ctx.fillStyle = alt ? "rgba(255,255,255,0.9)" : "rgba(128, 0, 255, 0.42)";
    ctx.beginPath();
    ctx.arc(cx, cy, brush / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const lastRef = React.useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const r = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    lastRef.current = { x, y };
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) paintDot(ctx, x, y, e.altKey);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const r = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const alt = e.altKey;
    const prev = lastRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && prev) {
      ctx.save();
      ctx.globalCompositeOperation = alt ? "destination-out" : "source-over";
      ctx.strokeStyle = alt
        ? "rgba(255,255,255,0.9)"
        : "rgba(128, 0, 255, 0.45)";
      ctx.lineWidth = brush;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }
    lastRef.current = { x, y };
  };

  const onPointerUp = () => {
    drawingRef.current = false;
    lastRef.current = null;
  };

  const reset = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!ctx || !c) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
  };

  return (
    <>
      <div className="pointer-events-auto absolute left-1/2 top-[-54px] z-20 flex -translate-x-1/2 items-center gap-2 rounded-[13px] border border-neutral-200/90 bg-white px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-1.5 pl-1 text-xs font-medium text-neutral-700">
          <Eraser className="h-4 w-4" />
          擦除
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100/80">
          <Eraser className="h-4 w-4 text-sky-800" />
        </div>
        <input
          type="range"
          min={6}
          max={96}
          value={brush}
          onChange={(e) => setBrush(Number(e.target.value))}
          className="h-8 w-28 accent-sky-500"
          title={`笔刷 ${brush}`}
        />
        <button
          type="button"
          onClick={reset}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
          aria-label="重置"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onApply}
          className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white"
        >
          擦除
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="pointer-events-auto absolute inset-0 z-[5] touch-none"
        style={{ width: boxW, height: boxH }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    </>
  );
}

function OutpaintLayer(props: {
  boxW: number;
  boxH: number;
  contain: ReturnType<typeof getObjectContainRect>;
  creditCost: number;
  onApply: () => void;
}) {
  const { boxW, boxH, contain, creditCost, onApply } = props;
  const [aspectLabel, setAspectLabel] = React.useState("1:1");
  const [exp, setExp] = React.useState({ l: 0.1, r: 0.1, t: 0.1, b: 0.1 });
  const [drag, setDrag] = React.useState<null | {
    kind: "nw" | "ne" | "sw" | "se";
    sx: number;
    sy: number;
    start: typeof exp;
  }>(null);

  const inner = { ox: contain.ox, oy: contain.oy, w: contain.dw, h: contain.dh };
  const outer = {
    x: inner.ox - exp.l * boxW,
    y: inner.oy - exp.t * boxH,
    w: inner.w + (exp.l + exp.r) * boxW,
    h: inner.h + (exp.t + exp.b) * boxH,
  };

  React.useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const dx = (e.clientX - drag.sx) / boxW;
      const dy = (e.clientY - drag.sy) / boxH;
      const s = drag.start;
      let next = { ...s };
      if (drag.kind === "se") {
        next.r = clamp(s.r + dx, 0, 0.5);
        next.b = clamp(s.b + dy, 0, 0.5);
      } else if (drag.kind === "nw") {
        next.l = clamp(s.l - dx, 0, 0.5);
        next.t = clamp(s.t - dy, 0, 0.5);
      } else if (drag.kind === "ne") {
        next.r = clamp(s.r + dx, 0, 0.5);
        next.t = clamp(s.t - dy, 0, 0.5);
      } else {
        next.l = clamp(s.l - dx, 0, 0.5);
        next.b = clamp(s.b + dy, 0, 0.5);
      }
      setExp(next);
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, boxW, boxH]);

  const onDown =
    (kind: "nw" | "ne" | "sw" | "se") => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setDrag({ kind, sx: e.clientX, sy: e.clientY, start: { ...exp } });
    };

  return (
    <>
      <div className="pointer-events-auto absolute left-1/2 top-[-54px] z-30 flex -translate-x-1/2 items-center gap-2 rounded-[13px] border border-neutral-200/90 bg-white px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-1 pl-1 text-xs font-medium text-neutral-700">
          <Expand className="h-4 w-4" />
          扩图
        </div>
        <div className="relative">
          <select
            value={aspectLabel}
            onChange={(e) => setAspectLabel(e.target.value)}
            className="appearance-none rounded-lg border border-neutral-200 bg-white py-1 pl-2 pr-7 text-xs text-neutral-800"
          >
            <option value="1:1">1:1</option>
            <option value="3:4">3:4</option>
            <option value="4:3">4:3</option>
            <option value="16:9">16:9</option>
            <option value="自定义">自定义</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        </div>
        <button
          type="button"
          onClick={onApply}
          className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          <Zap className="h-3.5 w-3.5" />
          {creditCost}
        </button>
      </div>

      {/* 点阵外扩区域 */}
      <div
        className="pointer-events-none absolute z-[4]"
        style={{
          left: outer.x,
          top: outer.y,
          width: outer.w,
          height: outer.h,
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.22) 1px, transparent 1px)",
          backgroundSize: "10px 10px",
          backgroundColor: "rgba(244,244,245,0.96)",
        }}
      />
      {/* 原图矩形高亮 */}
      <div
        className="pointer-events-none absolute z-[6]"
        style={{
          left: inner.ox,
          top: inner.oy,
          width: inner.w,
          height: inner.h,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
        }}
      />
      {(["nw", "ne", "sw", "se"] as const).map((k) => {
        const pos =
          k === "nw"
            ? { left: outer.x - 7, top: outer.y - 7 }
            : k === "ne"
              ? { left: outer.x + outer.w - 7, top: outer.y - 7 }
              : k === "sw"
                ? { left: outer.x - 7, top: outer.y + outer.h - 7 }
                : { left: outer.x + outer.w - 7, top: outer.y + outer.h - 7 };
        return (
          <div
            key={k}
            role="presentation"
            className="pointer-events-auto absolute z-20 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-neutral-900 bg-white shadow-[0_2px_10px_rgba(31,35,41,0.02)]"
            style={{ left: pos.left, top: pos.top }}
            onPointerDown={onDown(k)}
          />
        );
      })}
    </>
  );
}

function CropLayer(props: {
  naturalW: number;
  naturalH: number;
  contain: ReturnType<typeof getObjectContainRect>;
  onApply: (cropRel: { x: number; y: number; w: number; h: number }) => void;
}) {
  const { naturalW, naturalH, contain, onApply } = props;
  const [preset, setPreset] = React.useState("自定义");
  const [linked, setLinked] = React.useState(true);
  const [crop, setCrop] = React.useState(() => ({
    x: contain.ox,
    y: contain.oy,
    w: contain.dw,
    h: contain.dh,
  }));
  const [dims, setDims] = React.useState({
    w: Math.round(naturalW),
    h: Math.round(naturalH),
  });

  // 当 contain 变化（比如窗口尺寸改变）时保持裁剪框相对位置不丢失
  const lastContainRef = React.useRef(contain);
  React.useEffect(() => {
    const prev = lastContainRef.current;
    if (
      Math.abs(prev.scale - contain.scale) < 1e-6 &&
      Math.abs(prev.ox - contain.ox) < 0.5 &&
      Math.abs(prev.oy - contain.oy) < 0.5
    ) {
      return;
    }
    // 相对比例迁移
    const relX = (crop.x - prev.ox) / Math.max(1, prev.dw);
    const relY = (crop.y - prev.oy) / Math.max(1, prev.dh);
    const relW = crop.w / Math.max(1, prev.dw);
    const relH = crop.h / Math.max(1, prev.dh);
    setCrop({
      x: contain.ox + relX * contain.dw,
      y: contain.oy + relY * contain.dh,
      w: relW * contain.dw,
      h: relH * contain.dh,
    });
    lastContainRef.current = contain;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在 contain 真实变化时运行
  }, [contain.scale, contain.ox, contain.oy, contain.dw, contain.dh]);

  const applyPreset = (label: string) => {
    setPreset(label);
    if (label === "自定义") return;
    const [a, b] = label.split(":").map(Number);
    if (!a || !b) return;
    const ar = a / b;
    let cw = contain.dw;
    let ch = cw / ar;
    if (ch > contain.dh) {
      ch = contain.dh;
      cw = ch * ar;
    }
    const cx = contain.ox + (contain.dw - cw) / 2;
    const cy = contain.oy + (contain.dh - ch) / 2;
    setCrop({ x: cx, y: cy, w: cw, h: ch });
    const nw = Math.round(cw / contain.scale);
    const nh = Math.round(ch / contain.scale);
    setDims({ w: Math.max(1, nw), h: Math.max(1, nh) });
  };

  // 拖拽手柄
  const [drag, setDrag] = React.useState<null | {
    kind: "nw" | "ne" | "sw" | "se" | "move";
    sx: number;
    sy: number;
    start: typeof crop;
  }>(null);

  React.useEffect(() => {
    if (!drag) return;
    const bound = {
      l: contain.ox,
      t: contain.oy,
      r: contain.ox + contain.dw,
      b: contain.oy + contain.dh,
    };
    const move = (e: PointerEvent) => {
      const dx = e.clientX - drag.sx;
      const dy = e.clientY - drag.sy;
      let c = { ...drag.start };
      if (drag.kind === "move") {
        c.x = clamp(drag.start.x + dx, bound.l, bound.r - c.w);
        c.y = clamp(drag.start.y + dy, bound.t, bound.b - c.h);
      } else if (drag.kind === "nw") {
        const nx = clamp(drag.start.x + dx, bound.l, drag.start.x + drag.start.w - 10);
        const ny = clamp(drag.start.y + dy, bound.t, drag.start.y + drag.start.h - 10);
        c.x = nx;
        c.y = ny;
        c.w = drag.start.x + drag.start.w - nx;
        c.h = drag.start.y + drag.start.h - ny;
      } else if (drag.kind === "ne") {
        const ny = clamp(drag.start.y + dy, bound.t, drag.start.y + drag.start.h - 10);
        c.y = ny;
        c.w = clamp(drag.start.w + dx, 10, bound.r - drag.start.x);
        c.h = drag.start.y + drag.start.h - ny;
      } else if (drag.kind === "sw") {
        const nx = clamp(drag.start.x + dx, bound.l, drag.start.x + drag.start.w - 10);
        c.x = nx;
        c.w = drag.start.x + drag.start.w - nx;
        c.h = clamp(drag.start.h + dy, 10, bound.b - drag.start.y);
      } else {
        c.w = clamp(drag.start.w + dx, 10, bound.r - drag.start.x);
        c.h = clamp(drag.start.h + dy, 10, bound.b - drag.start.y);
      }
      setCrop(c);
      setDims({
        w: Math.max(1, Math.round(c.w / contain.scale)),
        h: Math.max(1, Math.round(c.h / contain.scale)),
      });
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, contain.ox, contain.oy, contain.dw, contain.dh, contain.scale]);

  const onHandle =
    (kind: "nw" | "ne" | "sw" | "se") => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setDrag({ kind, sx: e.clientX, sy: e.clientY, start: { ...crop } });
    };
  const onMoveStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDrag({ kind: "move", sx: e.clientX, sy: e.clientY, start: { ...crop } });
  };

  return (
    <>
      <div className="pointer-events-auto absolute left-1/2 top-[-54px] z-30 flex max-w-[98vw] -translate-x-1/2 flex-wrap items-center gap-2 rounded-[13px] border border-neutral-200/90 bg-white px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-1 pl-1 text-xs font-medium text-neutral-700">
          <Crop className="h-4 w-4" />
          裁剪
        </div>
        <div className="relative">
          <select
            value={preset}
            onChange={(e) => applyPreset(e.target.value)}
            className="appearance-none rounded-lg border border-neutral-200 bg-white py-1 pl-2 pr-7 text-xs text-neutral-800"
          >
            <option value="自定义">自定义</option>
            <option value="1:1">1:1</option>
            <option value="3:4">3:4</option>
            <option value="2:3">2:3</option>
            <option value="9:16">9:16</option>
            <option value="4:3">4:3</option>
            <option value="3:2">3:2</option>
            <option value="16:9">16:9</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
        </div>
        <div className="flex items-center gap-1 text-xs text-neutral-600">
          <span className="text-neutral-400">W</span>
          <input
            type="number"
            className="w-16 rounded border border-neutral-200 px-1 py-0.5 text-xs tabular-nums"
            value={dims.w}
            onChange={(e) => {
              const w = Math.max(1, Number(e.target.value) || 1);
              let h = dims.h;
              if (linked) h = Math.round((w * dims.h) / dims.w);
              setDims({ w, h });
            }}
          />
          <button
            type="button"
            className={cn("rounded p-0.5", linked && "text-sky-600")}
            onClick={() => setLinked(!linked)}
            aria-label="锁定比例"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <span className="text-neutral-400">H</span>
          <input
            type="number"
            className="w-16 rounded border border-neutral-200 px-1 py-0.5 text-xs tabular-nums"
            value={dims.h}
            onChange={(e) => {
              const h = Math.max(1, Number(e.target.value) || 1);
              let w = dims.w;
              if (linked) w = Math.round((h * dims.w) / dims.h);
              setDims({ w, h });
            }}
          />
        </div>
        <button
          type="button"
          onClick={() =>
            onApply({
              x: crop.x - contain.ox,
              y: crop.y - contain.oy,
              w: crop.w,
              h: crop.h,
            })
          }
          className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          裁剪
        </button>
      </div>
      <div
        className="pointer-events-auto absolute z-[5] cursor-move"
        onPointerDown={onMoveStart}
        style={{
          left: crop.x,
          top: crop.y,
          width: crop.w,
          height: crop.h,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
          outline: "2px solid rgba(255,255,255,0.95)",
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/60" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/60" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/60" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/60" />
        </div>
      </div>
      {(["nw", "ne", "sw", "se"] as const).map((k) => {
        const pos =
          k === "nw"
            ? { left: crop.x - 7, top: crop.y - 7 }
            : k === "ne"
              ? { left: crop.x + crop.w - 7, top: crop.y - 7 }
              : k === "sw"
                ? { left: crop.x - 7, top: crop.y + crop.h - 7 }
                : { left: crop.x + crop.w - 7, top: crop.y + crop.h - 7 };
        return (
          <div
            key={k}
            role="presentation"
            className="pointer-events-auto absolute z-20 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-white bg-white shadow-[0_2px_10px_rgba(31,35,41,0.02)]"
            style={{ left: pos.left, top: pos.top }}
            onPointerDown={onHandle(k)}
          />
        );
      })}
    </>
  );
}

export function ImageObjectEditOverlays({
  session,
  imageUrl,
  rect,
  onClose,
  onCommitContentAndSize,
  toast,
  tryConsumeCredits,
}: Props) {
  const active = session != null;
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  const eraseMaskGetterRef = React.useRef<(() => string | null) | null>(null);

  React.useEffect(() => {
    if (!active || !imageUrl) return;
    let cancelled = false;
    setImg(null);
    void loadImage(imageUrl)
      .then((i) => {
        if (!cancelled) setImg(i);
      })
      .catch(() => {
        toast("无法加载图片（可能受跨域限制），请改用本地上传或 data 图。");
        onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [active, imageUrl, toast, onClose]);

  React.useEffect(() => {
    if (!active) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [active, onClose]);

  if (!active || !session || !rect) return null;

  // 关键：用整数像素，避免子像素抖动引发无谓的 state/effects 更新
  const boxW = Math.max(1, Math.round(rect.width));
  const boxH = Math.max(1, Math.round(rect.height));
  const left = Math.round(rect.left);
  const top = Math.round(rect.top);

  const iw = img?.naturalWidth || 0;
  const ih = img?.naturalHeight || 0;
  const contain = getObjectContainRect(boxW, boxH, iw || boxW, ih || boxH);
  const dpr = Math.min(
    2,
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
  );

  const commit = (payload: CommitPayload) => {
    onCommitContentAndSize(payload);
    onClose();
  };

  const commitCrop = (rel: { x: number; y: number; w: number; h: number }) => {
    if (!img) return;
    try {
      const sx = rel.x / contain.scale;
      const sy = rel.y / contain.scale;
      const sw = rel.w / contain.scale;
      const sh = rel.h / contain.scale;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(sw));
      canvas.height = Math.max(1, Math.floor(sh));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      commit({
        objectId: session.objectId,
        dataUrl,
        naturalW: canvas.width,
        naturalH: canvas.height,
        prevNaturalW: iw,
        prevNaturalH: ih,
      });
      toast("已裁剪。");
    } catch {
      toast("裁剪失败（可能受跨域限制）。");
    }
  };

  const commitOutpaint = () => {
    if (!tryConsumeCredits(5)) {
      toast("积分不足。");
      return;
    }
    toast("扩图任务占位：接入工作流 API 后在此提交。");
    onClose();
  };

  const commitErase = () => {
    if (!img) return;
    const maskDataUrl = eraseMaskGetterRef.current?.() ?? null;
    if (!maskDataUrl) {
      toast("请先涂抹选区。");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = iw;
      canvas.height = ih;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const maskImg = new Image();
      maskImg.onload = () => {
        const m = document.createElement("canvas");
        m.width = boxW;
        m.height = boxH;
        const mx = m.getContext("2d");
        if (!mx) return;
        mx.drawImage(maskImg, 0, 0);
        const id = ctx.getImageData(0, 0, iw, ih);
        const md = mx.getImageData(0, 0, boxW, boxH);
        for (let py = 0; py < boxH; py++) {
          for (let px = 0; px < boxW; px++) {
            const { nx, ny } = displayToNatural(px + 0.5, py + 0.5, contain);
            if (nx < 0 || ny < 0 || nx >= iw || ny >= ih) continue;
            const base = (py * boxW + px) * 4;
            const a = md.data[base + 3];
            if (a > 40) {
              const ii = (Math.floor(ny) * iw + Math.floor(nx)) * 4 + 3;
              id.data[ii] = 0;
            }
          }
        }
        ctx.putImageData(id, 0, 0);
        const out = canvas.toDataURL("image/png");
        commit({
          objectId: session.objectId,
          dataUrl: out,
          naturalW: iw,
          naturalH: ih,
          prevNaturalW: iw,
          prevNaturalH: ih,
        });
        toast("已应用本地擦除（透明区域）。");
      };
      maskImg.src = maskDataUrl;
    } catch {
      toast("擦除失败。");
    }
  };

  const portal = (
    <div
      className="pointer-events-none fixed inset-0 z-[250]"
      aria-hidden={false}
    >
      {/* 底层可点击退出遮罩（画布图片除外） */}
      <button
        type="button"
        onClick={onClose}
        aria-label="退出编辑"
        className="pointer-events-auto absolute inset-0 bg-black/5"
      />

      {/* 顶部提示条（跟随画布图片位置居中；不跟缩放变化） */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: Math.round(left + boxW / 2),
          top: Math.max(8, top - 96),
          transform: "translateX(-50%)",
        }}
      >
        <div className="rounded-[13px] border border-neutral-200/90 bg-white px-4 py-2 text-xs text-neutral-600 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {session.mode === "erase" && (
            <>
              在图片上绘制选区，
              <kbd className="mx-0.5 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-sans text-[11px]">
                Option
              </kbd>
              擦除，
              <kbd className="mx-0.5 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 font-sans text-[11px]">
                Esc
              </kbd>
              退出
            </>
          )}
          {session.mode === "outpaint" && (
            <>
              选择扩展倍数
              <kbd className="mx-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5">Esc</kbd>
              退出
            </>
          )}
          {session.mode === "crop" && (
            <>
              拖拽四角或中心调整裁剪框，
              <kbd className="mx-1 rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5">Esc</kbd>
              退出
            </>
          )}
        </div>
      </div>

      {/* 锚定到画布图片矩形的编辑容器 */}
      <div
        className="pointer-events-auto absolute"
        style={{ left, top, width: boxW, height: boxH }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative h-full w-full">
          {!img && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-xs text-neutral-500">
              加载图片…
            </div>
          )}

          {/* 图片尺寸/标签：仅 erase 截图中有，简化处理 */}
          {img && session.mode === "erase" && (
            <>
              <div className="pointer-events-none absolute -left-0 -top-6 flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                <ImageIcon className="h-3.5 w-3.5" />
                图片
              </div>
              <div className="pointer-events-none absolute -right-0 -top-6 text-[11px] tabular-nums text-neutral-500">
                {iw} × {ih}
              </div>
            </>
          )}

          {img && session.mode === "erase" && (
            <EraseLayer
              boxW={boxW}
              boxH={boxH}
              dpr={dpr}
              naturalW={iw}
              naturalH={ih}
              contain={contain}
              maskGetterRef={eraseMaskGetterRef}
              onApply={commitErase}
            />
          )}
          {img && session.mode === "outpaint" && (
            <OutpaintLayer
              boxW={boxW}
              boxH={boxH}
              contain={contain}
              creditCost={5}
              onApply={commitOutpaint}
            />
          )}
          {img && session.mode === "crop" && (
            <CropLayer
              naturalW={iw}
              naturalH={ih}
              contain={contain}
              onApply={commitCrop}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(portal, document.body);
}
