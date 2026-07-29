import DOMPurify from "dompurify";

/** 用户侧聊天气泡来自 contentEditable，渲染前白名单清洗以降低 XSS 面；保留预设参考图 chip 结构。 */
export function sanitizeUserChatHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "span",
      "div",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "img",
    ],
    ALLOWED_ATTR: [
      "class",
      "data-preset-ref-chip",
      "data-pending-ref-chip",
      "contenteditable",
      "src",
      "alt",
      "draggable",
      "referrerpolicy",
    ],
  });
}
