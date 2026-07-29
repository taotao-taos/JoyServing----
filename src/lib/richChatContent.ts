/** 判断富文本输入是否有可发送内容（纯文本 / 图 / 参考 chip） */
export function richHasContent(html: string): boolean {
  if (typeof document === "undefined") {
    return html.trim().length > 0;
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (
    (tmp.innerText?.trim()?.length ?? 0) > 0 ||
    tmp.querySelectorAll("img").length > 0 ||
    tmp.querySelectorAll("[data-preset-ref-chip]").length > 0
  );
}

/** 在 contentEditable 当前光标处插入 HTML；光标不在框内则追加到末尾 */
export function insertHtmlIntoContentEditable(
  container: HTMLElement,
  html: string
) {
  container.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const anchor = sel.anchorNode;
    if (anchor && container.contains(anchor)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const frag = document.createRange().createContextualFragment(html);
      range.insertNode(frag);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
  }
  container.insertAdjacentHTML("beforeend", html);
  const last = container.lastChild;
  if (last) {
    const range = document.createRange();
    range.setStartAfter(last);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

/** 将焦点移入 contentEditable，并把光标放在某节点之后（用于 chip 确认后输入） */
export function focusContentEditableAfterNode(
  container: HTMLElement,
  node: Node
) {
  container.focus();
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}
