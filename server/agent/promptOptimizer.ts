import { BASE, KEY, CHAT_MODEL } from "../aiHandlers";

const OPTIMIZER_SYSTEM = `你是专业 AI 绘画 Prompt 工程师。
将用户的描述转化为高质量英文 Prompt，规则：
1. 保留用户原始主体、场景、风格、关键物体，不得改写成无关主题
2. 补充：光线、构图、镜头、材质、质量词（high quality, 4K, professional）
3. 参考图存在时：假定下游看得到该图，prompt 需与图配合
4. 只输出英文 Prompt，不要解释，不要 markdown`;

export async function optimizePrompt(params: {
  userText: string;
  hasReferenceImage: boolean;
  style?: string;
  platform?: string;
}): Promise<string> {
  const userMsg = [
    `原始描述: ${params.userText}`,
    params.style ? `风格偏好: ${params.style}` : null,
    params.platform ? `目标平台: ${params.platform}` : null,
    params.hasReferenceImage ? "【用户已上传参考图，请在 Prompt 中体现与图的配合】" : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: OPTIMIZER_SYSTEM },
          { role: "user", content: userMsg },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });
    const data = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const optimized = data.choices?.[0]?.message?.content?.trim();
    return optimized || params.userText;
  } catch {
    return params.userText;
  }
}
