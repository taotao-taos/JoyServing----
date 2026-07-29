/** 侧栏/首页输入框统一的参考图胶囊 */

export function countRefChipsInHtml(html: string): number {
  if (typeof document === "undefined") return 0;
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.querySelectorAll("[data-preset-ref-chip]").length;
}

export function nextRefChipIndex(html: string): number {
  return countRefChipsInHtml(html) + 1;
}

export function buildRefChipHtmlFromUrl(imageUrl: string, index: number): string {
  const safeUrl = imageUrl.replace(/"/g, "");
  return `<span contenteditable="false" data-preset-ref-chip="1" class="preset-ref-chip"><img src="${safeUrl}" alt="" draggable="false" referrerpolicy="no-referrer" class="preset-ref-chip-thumb" /><span class="preset-ref-chip-label">参考图</span></span>`;
}

/** 画布单击待选：输入框内灰色胶囊，双击画布同图后去掉 data-pending-ref-chip 与样式 */
export function buildPendingRefChipHtmlFromUrl(imageUrl: string): string {
  const safeUrl = imageUrl.replace(/"/g, "");
  return `<span contenteditable="false" data-preset-ref-chip="1" data-pending-ref-chip="1" class="preset-ref-chip preset-ref-chip--pending"><img src="${safeUrl}" alt="" draggable="false" referrerpolicy="no-referrer" class="preset-ref-chip-thumb" /><span class="preset-ref-chip-label">参考图</span></span>`;
}
