export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "generate_image",
      description:
        "当用户要求生成图片、画图、制作封面、设计海报时调用。调用后用 Markdown ![图](url) 展示结果。",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "英文图像描述，越详细越好" },
          platform: {
            type: "string",
            enum: [
              "xiaohongshu",
              "weibo",
              "wechat",
              "instagram",
              "youtube",
              "bilibili",
              "custom",
            ],
            description: "目标平台",
          },
          style: {
            type: "string",
            enum: ["realistic", "illustration", "anime", "flat", "3d", "minimal"],
            description: "风格",
          },
          quality: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "质量，影响生成时间和 Credits",
          },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "optimize_prompt",
      description: "在生图前调用，将用户中文描述优化为高质量英文 Prompt。",
      parameters: {
        type: "object",
        properties: {
          userInput: { type: "string", description: "用户原始描述" },
          platform: { type: "string", description: "目标平台（可选）" },
        },
        required: ["userInput"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "export_sizes",
      description: "将已生成的图片导出为多个平台尺寸版本。",
      parameters: {
        type: "object",
        properties: {
          sourceImageUrl: { type: "string", description: "原始图片 URL" },
          platforms: { type: "array", items: { type: "string" }, description: "目标平台列表" },
        },
        required: ["sourceImageUrl", "platforms"],
      },
    },
  },
] as const;

export const PLATFORM_SIZES: Record<string, string> = {
  xiaohongshu: "864x1152",
  weibo: "1080x1080",
  wechat: "1280x720",
  instagram: "1080x1080",
  youtube: "1280x720",
  bilibili: "1146x717",
  douyin: "1080x1920",
  custom: "1024x1024",
};
