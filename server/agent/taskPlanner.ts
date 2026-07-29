import { BASE, KEY, CHAT_MODEL } from "../aiHandlers";

export type TaskType =
  | "single_image"
  | "batch_parallel"
  | "batch_sequential"
  | "brand_kit"
  | "size_variants";

export type ImageTask = {
  index: number;
  label: string;
  prompt: string;
  size?: string;
  referenceIndex?: number | null;
};

export type TaskPlan = {
  type: TaskType;
  tasks: ImageTask[];
  totalCount: number;
  needsConfirmation: boolean;
  summary: string;
};

const PLANNER_SYSTEM = `你是 Creagic AI 的任务规划器。分析用户请求，输出结构化任务计划。
只输出 JSON，不要任何其他文字，不要 markdown 代码块。

JSON 格式：
{
  "type": "single_image"|"batch_parallel"|"batch_sequential"|"brand_kit"|"size_variants",
  "needsConfirmation": boolean,
  "summary": "一句话说明（中文）",
  "tasks": [
    {
      "index": 0,
      "label": "给用户看的标签（中文）",
      "prompt": "详细英文 Prompt，必须保留用户原始主体",
      "size": "可选，如 1024x1024",
      "referenceIndex": null
    }
  ]
}

判断规则：
- single_image：只要一张图，tasks 只有1个元素
- batch_parallel：分镜/多风格/多角度/用户说"所有/每个/N张"，并发执行
- batch_sequential："参考前一张""保持连贯"，前图 URL 传后图，referenceIndex 指向依赖任务
- brand_kit：品牌套件/VI/整套物料，Logo（index=0）先生成，其他并发
- size_variants：同内容多平台，自动填入对应尺寸

needsConfirmation：tasks 超过 6 个时设为 true

平台标准尺寸：
小红书: 864x1152 | 微博/Instagram方图: 1080x1080 | 公众号: 1280x720
B站: 1146x717 | YouTube: 1280x720 | 抖音/Story: 1080x1920

每个 task 的 prompt 必须全英文，保留用户原始主题，补充质量词`;

export function shouldPlanTask(userText: string): boolean {
  return /所有分镜|每个分镜|全部分镜|生成分镜|每一(张|幅|个)|所有(图|张)|全部(图|张)|(\d+)\s*张图|生成\s*(\d+)\s*张|多(风格|版本|角度|尺寸)|不同(风格|版本|平台)|品牌套件|全套物料|vi系统|小红书.*微博|多平台.*尺寸|各平台/i.test(
    userText
  );
}

export async function planTask(userText: string, priorContent?: string): Promise<TaskPlan | null> {
  const userMsg = priorContent
    ? `用户当前请求：${userText}\n\n之前对话已确定的内容：\n${priorContent.slice(0, 3000)}`
    : userText;

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
          { role: "system", content: PLANNER_SYSTEM },
          { role: "user", content: userMsg },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });
    const data = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const stripped = raw.replace(/```json|```/gi, "").trim();
    let plan: TaskPlan | null = null;
    try {
      plan = JSON.parse(stripped) as TaskPlan;
    } catch {
      const m = stripped.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          plan = JSON.parse(m[0]) as TaskPlan;
        } catch {
          plan = null;
        }
      }
    }
    if (!plan || !Array.isArray(plan.tasks)) return null;
    plan.tasks = plan.tasks.slice(0, 12);
    plan.totalCount = plan.tasks.length;
    return plan;
  } catch {
    return null;
  }
}
