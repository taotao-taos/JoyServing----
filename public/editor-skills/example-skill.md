# 示例 Skill 文档

在此写入长说明：创作流程、禁忌、输出格式等。构建时前端会抓取本文件并拼入该技能的 `description`（约 12000 字以内），随 `/api/chat` 发给模型。

你可以：

1. 在 `manifest.json` 的 `skills` 数组里增删条目；
2. 每条可填 `id`（唯一）、`title`、`description`（短）、`doc`（可选，指向本目录下 `.md` 或 `.txt`）；
3. `id` 与 `src/config/editorSkills.ts` 中同名时会**覆盖**内置项的标题与描述。
