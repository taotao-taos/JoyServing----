/**
 * 技能工作流：由 public/editor-skills/manifest.json 的 `workflow` 字段驱动；
 * 服务端从磁盘读取同一份 manifest，避免仅靠长文本 description。
 */
export type SkillWorkflow = {
  /** 挂技能时强制多段编排（默认：有技能且未设 allowQuickChat 时等价于 true） */
  forceOrchestration?: boolean;
  /** 允许挂技能仍走 quickChat（轻量说明类技能） */
  allowQuickChat?: boolean;
  /** 意图为 image_gen 且挂载本技能时：为 true 则先多轮编排再给图；不设或 false 则仍直出图（适合海报/封面类技能） */
  skipDirectImageWhenRouted?: boolean;
  /** 追加到 system（对话 / 编排各阶段） */
  systemExtra?: string;
  /** 影响工具倾向与系统提示 */
  preferPipeline?: "none" | "image" | "video";
  /** 强制按分镜/叙事类终稿规则约束 */
  treatAsStoryboard?: boolean;
  /** 生图前附加约束（在技能文档与用户描述之后） */
  imagePromptPrefix?: string;
  /** 视频生成前附加约束 */
  videoPromptPrefix?: string;
};
