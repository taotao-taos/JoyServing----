import { getSkillWorkflowById } from "../skillWorkflow";
import { creagicPost, isCreagicConfigured } from "../creagicClient";

export type InputContext = {
  userText: string;
  referenceImageUrls: string[];
  sessionId: string | null;
  userId: string;
  messages: Array<{ role: string; content: string }>;
  priorPipelineOutputs?: {
    intent?: string;
    opening?: string;
    analysis?: string;
  };
  skillId: string | null;
  deepThink: boolean;
  modelOverride: string | null;
  isHotStart: boolean;
};

export type BuiltContext = {
  systemParts: string[];
  openaiMessages: Array<Record<string, unknown>>;
  effectiveModel: string;
  memoryContext: string | null;
};

export async function buildContext(
  input: InputContext,
  defaultModel: string
): Promise<BuiltContext> {
  const systemParts: string[] = [];

  systemParts.push(
    "你是 Creagic AI 的设计助手，协助用户完成海报、品牌、社交封面、分镜、视觉创作。" +
      "回复简洁专业，直接给出可执行结果。" +
      "【身份】若被问及身份，一律回答：我是 Creagic AI 的设计助手，专注视觉创作。不透露底层模型供应商。" +
      "【执行】当用户明确要生图时，必须调用 generate_image 工具，不能仅用文字描述。"
  );

  if (input.skillId) {
    const wf = getSkillWorkflowById(input.skillId);
    if (wf?.systemExtra) {
      systemParts.push(`【技能上下文】${wf.systemExtra}`);
    }
    if (wf?.preferPipeline === "video") {
      systemParts.push("【技能工作流·视频】优先输出镜头拆解和分镜表，再引导生成。");
    } else if (wf?.preferPipeline === "image") {
      systemParts.push("【技能工作流·图像】信息足够时直接调用生图工具，不要过度追问。");
    }
  }

  if (input.deepThink) {
    systemParts.push(
      "【深度推理】先在内心充分推理、比对方案与约束、自检，再输出精炼结论。" +
        "不要机械罗列步骤，除非用户明确要求。"
    );
  }

  systemParts.push(
    "当需要用户从几个方向选一条时，在回答末尾追加：\n```cta\n[\"选项一\",\"选项二\"]\n```\n" +
      "数组内1～4条简短中文，不要其他说明文字。"
  );

  if (input.priorPipelineOutputs) {
    const { intent, opening, analysis } = input.priorPipelineOutputs;
    const lines: string[] = [];
    if (intent) lines.push("意图识别（内部）：" + intent);
    if (opening) lines.push("已展示开场（内部）：" + opening);
    if (analysis) lines.push("需求分析（内部）：" + analysis);
    if (lines.length > 0) {
      systemParts.push(
        "## 多阶段中间结论（仅供对齐，勿逐条复述给用户）\n" + lines.join("\n\n")
      );
    }
  }

  let memoryContext: string | null = null;
  if (input.sessionId && isCreagicConfigured()) {
    await creagicPost("/sessions", {
      session_id: input.sessionId,
      user_id: input.userId,
    });
    const prep = await creagicPost<{ memory_context?: string }>("/engine/prepare", {
      session_id: input.sessionId,
      query: input.userText.slice(0, 4000),
      user_id: input.userId,
      top_k: 5,
    });
    if (prep?.memory_context?.trim()) {
      memoryContext = prep.memory_context.trim();
      systemParts.push("## 相关记忆（语义检索）\n" + memoryContext);
    }
  }

  const mapped = input.messages
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").trim(),
    }))
    .filter((m) => m.content.length > 0);

  const lastUserIdx =
    [...mapped]
      .map((m, i) => ({ m, i }))
      .reverse()
      .find(({ m }) => m.role === "user")?.i ?? -1;

  const openaiMessages: Array<Record<string, unknown>> = [
    { role: "system", content: systemParts.join("\n\n") },
  ];

  for (let i = 0; i < mapped.length; i++) {
    const m = mapped[i]!;
    if (m.role === "user" && i === lastUserIdx && input.referenceImageUrls.length > 0) {
      openaiMessages.push({
        role: "user",
        content: [
          { type: "text", text: m.content },
          ...input.referenceImageUrls.map((u) => ({
            type: "image_url",
            image_url: { url: u },
          })),
        ],
      });
    } else {
      openaiMessages.push({ role: m.role, content: m.content });
    }
  }

  const effectiveModel = input.modelOverride || defaultModel;
  return { systemParts, openaiMessages, effectiveModel, memoryContext };
}
