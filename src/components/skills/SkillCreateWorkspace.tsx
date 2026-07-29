/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 智能创建技能 — 自然语言输入页。
 * 对齐瓴羊 AgentOne「空白技能 / createSkill」：用一句话描述能力，再生成技能草稿。
 * 用于员工技能中心与入职培训配备。
 */

import React, { useState } from 'react';
import { ArrowLeft, Cpu, Sparkles } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { CardIcon } from '../common/CardIcon';
import { PromptComposer } from '../common/PromptComposer';
import { PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';

export interface SkillCreatePayload {
  name: string;
  description: string;
}

export interface SkillCreateWorkspaceProps {
  /**
   * 入职场景传入员工名；团队技能中心可不传。
   * 有值时文案为「配备给该员工」，无值时为「加入团队技能」。
   */
  agentName?: string;
  onBack: () => void;
  onSubmit: (payload: SkillCreatePayload) => void;
  /** 返回按钮文案 */
  backLabel?: string;
}

const TEAM_SUGGESTIONS = [
  '当客户询问理赔金额时，根据保单免赔额与就医票据自动测算预估赔付，并生成报案摘要',
  '识别食安投诉中的激烈言辞与群体风险，达到阈值时自动升级转接理赔专员',
  '将对话中识别的门店信息、保单号与续保意向同步至商户 CRM',
] as const;

/** 从自然语言解析技能名称与描述草稿 */
export function promptToSkillPayload(text: string): SkillCreatePayload {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      name: '自定义技能',
      description: '调用特定服务或工具，赋能数字员工运行更高级流控。',
    };
  }

  const named =
    trimmed.match(/^(?:技能名称|名称|技能名)[：:\s]+(.+)$/m)?.[1]?.trim() ||
    trimmed.match(/^【(.+?)】/)?.[1]?.trim();

  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const firstLine = lines[0] ?? '';
  const rest = lines.slice(1).join('\n').trim();

  let name = named || firstLine;
  // 首行过长时截断作标题，全文作描述
  if (!named && firstLine.length > 28) {
    name = `${firstLine.slice(0, 28)}…`;
  }
  name = name.replace(/[。.!！?？]+$/, '').slice(0, 40) || '自定义技能';

  const description =
    rest ||
    (named ? lines.filter((l) => !/^(?:技能名称|名称|技能名)[：:]/.test(l)).join('\n') : trimmed) ||
    '调用特定服务或工具，赋能数字员工运行更高级流控。';

  return { name, description };
}

export const SkillCreateWorkspace: React.FC<SkillCreateWorkspaceProps> = ({
  agentName,
  onBack,
  onSubmit,
  backLabel = '返回技能列表',
}) => {
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const forAgent = Boolean(agentName?.trim());

  const handleSubmit = () => {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      onSubmit(promptToSkillPayload(prompt));
      setSubmitting(false);
      setPrompt('');
    }, 700);
  };

  const title = forAgent
    ? `描述你想让「${agentName}」具备的能力`
    : '用自然语言创建技能';
  const subtitle = forAgent
    ? '用自然语言说明技能用途与触发场景，发送后将自动创建并配备给这名员工'
    : '说明用途、触发场景与期望结果。系统将解析为技能名称与指令描述，并加入团队技能';
  const seed = forAgent ? `skill-create-${agentName}` : 'skill-create-team';

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="shrink-0 px-5 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer transition"
        >
          <ArrowLeft size={14} />
          {backLabel}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-3">
            <CardIcon seed={seed} size="lg" variant="soft" className="mx-auto">
              <Cpu size={22} className="text-neutral-800/80" />
            </CardIcon>
            <div className="space-y-1.5">
              <h2 className="text-lg font-extrabold text-neutral-800 tracking-tight">{title}</h2>
              <p className="text-xs/relaxed text-neutral-500 max-w-md mx-auto">{subtitle}</p>
            </div>
          </div>

          <PromptComposer
            value={prompt}
            onChange={setPrompt}
            onSubmit={handleSubmit}
            submitting={submitting}
            maxLength={800}
            placeholder={
              forAgent
                ? '例如：客户提交就医票据后，调用理赔测算接口，返回预估赔付金额与所需材料清单…'
                : '例如：名称：保单免赔测算\n客户询问理赔金额时，根据免赔额与票据自动测算预估赔付，并生成报案摘要…'
            }
            footerStart={
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                <Sparkles size={12} />
                {submitting ? '正在解析技能草稿…' : '智能创建'}
              </span>
            }
          />

          <div className="space-y-2">
            <p className="text-[10px] font-medium text-neutral-500 text-center">试试这些示例</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 justify-center">
              {TEAM_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setPrompt(suggestion)}
                  className={cn(
                    PANEL,
                    'h-auto py-2.5 px-3 text-left text-[11px] font-normal text-neutral-500',
                    'hover:text-neutral-800 whitespace-normal max-w-full sm:max-w-[240px]',
                  )}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-neutral-500/80 text-center">
            {forAgent
              ? '内容由 AI 解析生成技能草稿，创建后可在员工技能中心继续完善'
              : '参考 Agent 技能创建：先描述业务能力，再生成可配备的技能草稿'}
          </p>
        </div>
      </div>
    </div>
  );
};
