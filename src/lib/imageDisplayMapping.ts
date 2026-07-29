/** object-contain：图片在容器内的实际绘制区域（与 CSS object-contain 一致） */
export function getObjectContainRect(
  boxW: number,
  boxH: number,
  iw: number,
  ih: number
): {
  scale: number;
  dw: number;
  dh: number;
  ox: number;
  oy: number;
  iw: number;
  ih: number;
} {
  if (boxW <= 0 || boxH <= 0 || iw <= 0 || ih <= 0) {
    return { scale: 1, dw: boxW, dh: boxH, ox: 0, oy: 0, iw, ih };
  }
  const scale = Math.min(boxW / iw, boxH / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (boxW - dw) / 2;
  const oy = (boxH - dh) / 2;
  return { scale, dw, dh, ox, oy, iw, ih };
}

/** 容器内坐标 → 原图像素坐标 */
export function displayToNatural(
  px: number,
  py: number,
  contain: ReturnType<typeof getObjectContainRect>
): { nx: number; ny: number } {
  const nx = (px - contain.ox) / contain.scale;
  const ny = (py - contain.oy) / contain.scale;
  return { nx, ny };
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
