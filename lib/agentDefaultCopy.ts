/**
 * 数字员工开场白 / 应急话术默认文案与模板变量解析
 */

/** 开场白模板：{{数字员工名称}} 在雇佣或展示时映射为员工名称 */
export const DEFAULT_OPENING_LINE_TEMPLATE =
  '您好，我是 {{数字员工名称}}，请问需要我帮您处理什么？';

/** 应急话术（兜底回复）默认文案 */
export const DEFAULT_FALLBACK_SCRIPT =
  '抱歉，我暂时没能帮上忙，为不耽误您，我这就为您转接人工客服';

const AGENT_NAME_PLACEHOLDER = /\{\{数字员工名称(?:，映射名称)?\}\}/g;

/** 去掉名称后缀 #2，用于开场白等对外展示 */
export function agentDisplayName(rawName: string): string {
  return rawName.replace(/\s*#\d+$/, '').trim();
}

export function resolveAgentCopyTemplate(rawName: string, template: string): string {
  const name = agentDisplayName(rawName);
  return template.replace(AGENT_NAME_PLACEHOLDER, name);
}

export function defaultOpeningLineForAgent(rawName: string): string {
  return resolveAgentCopyTemplate(rawName, DEFAULT_OPENING_LINE_TEMPLATE);
}

export function defaultFallbackScriptForAgent(): string {
  return DEFAULT_FALLBACK_SCRIPT;
}
