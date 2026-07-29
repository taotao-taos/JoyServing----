/**
 * 逻辑画布坐标相对「页面 CSS 像素」的倍率：存储/运算为 2×，渲染时除以该值，
 * 屏幕上的元素占位与原先一致，导出与像素对齐更细。
 */
export const CANVAS_COORD_UNITS_PER_CSS_PX = 2;

export const CANVAS_JSON_CS_KEY = "cs" as const;
export const CANVAS_JSON_CS_VALUE = 2;

export function canvasToCssPx(u: number): number {
  return u / CANVAS_COORD_UNITS_PER_CSS_PX;
}

type LegacyCanvasLike = {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
};

/** 将旧版（1:1 逻辑坐标）画布物体转为当前倍率下的存储坐标 */
export function scaleLegacyCanvasObjects<T extends LegacyCanvasLike>(
  objects: T[],
  factor: number
): T[] {
  return objects.map((obj) => {
    const next = {
      ...obj,
      x: obj.x * factor,
      y: obj.y * factor,
    } as T;
    if (obj.width != null) (next as { width?: number }).width = obj.width * factor;
    if (obj.height != null) (next as { height?: number }).height = obj.height * factor;
    if (obj.type === "drawing" && obj.content) {
      try {
        const p = JSON.parse(obj.content) as {
          strokeWidth?: number;
          points?: [number, number][];
        };
        if (Array.isArray(p.points)) {
          const sw = (p.strokeWidth ?? 8) * factor;
          const pts = p.points.map(
            ([a, b]) => [a * factor, b * factor] as [number, number]
          );
          (next as { content?: string }).content = JSON.stringify({
            strokeWidth: sw,
            points: pts,
          });
        }
      } catch {
        /* ignore */
      }
    }
    return next;
  });
}
