/** 解析模型在文末附带的快捷选项块，格式：```cta\n["选项1","选项2"]\n```，最多取 4 条 */
const CTA_FENCE = /```cta\s*\n([\s\S]*?)```/i;

export function parseCtaFromAiContent(raw: string): {
  cleaned: string;
  ctas: string[];
} {
  const m = raw.match(CTA_FENCE);
  if (!m) return { cleaned: raw.trimEnd(), ctas: [] };

  let ctas: string[] = [];
  try {
    const parsed = JSON.parse(m[1].trim()) as unknown;
    if (Array.isArray(parsed)) {
      ctas = parsed
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, 4);
    }
  } catch {
    /* 非合法 JSON 则忽略 */
  }

  const cleaned = raw.replace(CTA_FENCE, "").trimEnd();
  return { cleaned, ctas };
}
