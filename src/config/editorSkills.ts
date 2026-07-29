/**
 * 类型与默认值；线上列表以 public/editor-skills/manifest.json 为准，
 * 运行时由 editorSkillsRegistry 加载并可选合并 doc 全文。
 */
import type { SkillWorkflow } from "./editorSkillWorkflow";

export type { SkillWorkflow };

export type EditorSkill = {
  id: string;
  title: string;
  description: string;
  workflow?: SkillWorkflow;
};

export const EDITOR_SKILLS: EditorSkill[] = [
  {
    id: "seedance-creation",
    title: "Seedance 2.0 视频创作",
    description:
      "从构思到可发布视频，人物形象一致，故事板清晰；侧重视频节奏、镜头语言与可落地的分镜描述。",
  },
  {
    id: "dressing-change",
    title: "丝滑装扮的变换",
    description:
      "使用 Seedance 2.0 生成流畅换装短视频；关注服装过渡自然、光影一致与动作连贯。",
  },
  {
    id: "drone-video",
    title: "无人机式视频",
    description:
      "生成无人机风格运镜：大场景俯瞰、推进与环绕；描述镜头路径与节奏感。",
  },
  {
    id: "amazon-listing",
    title: "亚马逊产品列表",
    description:
      "亚马逊商品主图与 A+ 内容方向：卖点提炼、合规表述、多图叙事与转化导向文案。",
  },
];

export function getEditorSkillById(id: string | null): EditorSkill | null {
  if (!id) return null;
  return EDITOR_SKILLS.find((s) => s.id === id) ?? null;
}
