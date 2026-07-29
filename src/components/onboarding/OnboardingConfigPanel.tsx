/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 员工培训 — 左侧配置面板（紧凑折叠卡片，参考智能在线客服配置页）
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Cpu,
  BookOpen,
  UploadCloud,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  Headphones,
  UserCheck,
  Pencil,
  HelpCircle,
  Link2,
  MessageSquareCode,
  RefreshCw,
  Loader2,
  Laptop,
  ArrowUpRight,
  Circle,
} from '@/lib/icons';
import { useApp } from '../../context/AppContext';
import type { HiredAgent, KnowledgeBase, Skill, AgentConfigSnapshot } from '../../types';
import { DEFAULT_AGENT_MODEL, FOOD_SAFETY_AGENT_DEFAULTS } from '../../mockData';
import {
  DEFAULT_FALLBACK_SCRIPT,
  DEFAULT_OPENING_LINE_TEMPLATE,
  resolveAgentCopyTemplate,
} from '@/lib/agentDefaultCopy';
import { cn } from '@/lib/utils';
import { pickMockLatencyMs } from '@/lib/mockLatency';
import { BTN_INK, BTN_OUTLINE, BTN_SOFT, FIELD, LABEL } from '@/lib/ui';
import { ListPagination, LIST_PAGE_SIZE, paginateItems } from '../common/ListPagination';
import { Modal } from '../common/Modal';
import { ResourceBindPickerModal } from './ResourceBindPickerModal';
import { KnowledgeBaseWorkspaceModal } from '../knowledge/KnowledgeBaseWorkspaceModal';
import { EMPLOYEE_RESOURCE_TERMS, MASTER_TEMPLATE_TERMS, ORG_COPY, SEARCH_COPY } from '@/lib/platformTerminology';
import { getPendingTemplateUpgrade } from '@/lib/masterTemplateUpgrade';
import { MasterTemplateUpgradeBanner } from './MasterTemplateUpgradeBanner';
import {
  agentAvatarForEditor,
  isAvatarImageUrl,
  RELAY_CARD_AVATARS,
} from '@/lib/agentAvatarDisplay';

/** 培训配置面板表单 — 比全局 FIELD 略大，提升可读性 */
const ONBOARDING_FIELD = cn(FIELD, 'text-sm/relaxed');

/** 暂时隐藏入职标签的「标签选择 / 优化」与 chip 切换 */
const SHOW_PERSONA_TAG_SELECTOR = false;

const AVATAR_PRESETS = ['👩‍💼', '🛡️', '🔮', '💅', '👨‍🔬', '🙋‍♂️', '👩‍🎨', '🕵️‍♂️', '🎧', '🎙️', '🦾', '👨‍💼'];

function AgentAvatarButton({
  agent,
  relayAvatarIndex,
  onChange,
  readOnly = false,
}: {
  agent: HiredAgent;
  relayAvatarIndex: number;
  onChange: (avatar: string) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
        setOpen(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const display = agentAvatarForEditor(agent.avatar, relayAvatarIndex, agent.avatarCustomized);
  const defaultRelayUrl = RELAY_CARD_AVATARS[relayAvatarIndex % RELAY_CARD_AVATARS.length];

  const pickAvatar = (avatar: string) => {
    onChange(avatar);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => !readOnly && setOpen((v) => !v)}
        disabled={readOnly}
        className={cn(
          'group relative',
          readOnly ? 'cursor-default opacity-80' : 'cursor-pointer',
        )}
        title={readOnly ? '预览模式下不可更换头像' : '更换头像'}
      >
        <div className="h-11 w-11 rounded-[13px] border-[1.5px] border-[rgba(198,210,255,0.6)] overflow-hidden bg-[#f8fafc] flex items-center justify-center box-border">
          {display.kind === 'image' ? (
            <img src={display.src} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[22px] leading-none select-none">{display.emoji}</span>
          )}
        </div>
        {!readOnly && (
          <span className="absolute inset-0 rounded-[13px] bg-ink/0 group-hover:bg-ink/5 transition" />
        )}
      </button>

      {open && !readOnly && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="关闭头像选择"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 z-50 w-56 bg-white border border-neutral-200 rounded-[13px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] p-3 animate-in fade-in zoom-in-95 duration-150">
            <p className="text-xs font-semibold text-neutral-500 mb-2">官方头像</p>
            <button
              type="button"
              onClick={() => pickAvatar(defaultRelayUrl)}
              className={cn(
                'mb-3 flex items-center gap-2.5 w-full rounded-lg border p-2 transition cursor-pointer hover:bg-neutral-100 text-left',
                agent.avatar === defaultRelayUrl ||
                  (!agent.avatarCustomized && !isAvatarImageUrl(agent.avatar))
                  ? 'border-neutral-900 ring-1 ring-neutral-900/15 bg-rail/50'
                  : 'border-neutral-200 bg-white',
              )}
            >
              <span className="h-9 w-9 rounded-lg overflow-hidden border border-neutral-200 shrink-0">
                <img src={defaultRelayUrl} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-neutral-800">默认官方头像</span>
                <span className="block text-xs text-neutral-500 mt-0.5 truncate">
                  恢复为系统默认官方形象
                </span>
              </span>
            </button>
            <p className="text-xs font-semibold text-neutral-500 mb-2">表情头像</p>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {AVATAR_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => pickAvatar(emoji)}
                  className={cn(
                    'h-8 w-8 rounded-lg text-base flex items-center justify-center border transition cursor-pointer hover:bg-neutral-100',
                    agent.avatar === emoji && agent.avatarCustomized && !isAvatarImageUrl(agent.avatar)
                      ? 'border-neutral-900 ring-1 ring-neutral-900/15 bg-rail'
                      : 'border-neutral-200 bg-white',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
            >
              <UploadCloud size={14} className="text-neutral-500" />
              上传自定义图片
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={pickFile}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** 员工展示名：食安险商户顾问#2 */
function formatAgentDisplayName(agent: HiredAgent, hiredAgents: HiredAgent[]): string {
  const baseName = agent.name.replace(/\s*#\d+$/, '').trim();
  const siblings = hiredAgents
    .filter((a) => a.marketId === agent.marketId)
    .sort((a, b) => a.hiredAt.localeCompare(b.hiredAt));
  const index = Math.max(0, siblings.findIndex((a) => a.id === agent.id)) + 1;
  return `${baseName}#${index}`;
}

function formatSavedTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function OnboardingAgentTopBar({
  agent,
  hiredAgents,
  relayAvatarIndex,
  isDirty,
  lastSavedAt,
  onSave,
  onRename,
  onAvatarChange,
  readOnly = false,
}: {
  agent: HiredAgent;
  hiredAgents: HiredAgent[];
  relayAvatarIndex: number;
  isDirty: boolean;
  lastSavedAt: Date | null;
  onSave: () => void;
  onRename: (name: string) => void;
  onAvatarChange: (avatar: string) => void;
  readOnly?: boolean;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const displayName = formatAgentDisplayName(agent, hiredAgents);

  const startEdit = () => {
    setNameDraft(agent.name.replace(/\s*#\d+$/, '').trim());
    setEditingName(true);
  };

  const commitEdit = () => {
    const trimmed = nameDraft.trim();
    if (trimmed) {
      const hash = displayName.match(/#(\d+)$/)?.[0] ?? '';
      onRename(`${trimmed}${hash}`);
    }
    setEditingName(false);
  };

  return (
    <div className="shrink-0 px-4 py-3 bg-white border-b border-neutral-200 flex items-center justify-between gap-3">
      <div
        data-tour-id="config-basic"
        className="flex items-center gap-3 min-w-0 rounded-lg"
      >
        <AgentAvatarButton
          agent={agent}
          relayAvatarIndex={relayAvatarIndex}
          onChange={onAvatarChange}
          readOnly={readOnly}
        />
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5 min-w-0">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value.slice(0, 32))}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className={cn(ONBOARDING_FIELD, 'h-8 py-1.5 text-sm max-w-[220px]')}
              />
            ) : (
              <>
                <h2 className="text-sm font-extrabold text-neutral-900 tracking-tight truncate">
                  {displayName}
                </h2>
                <button
                  type="button"
                  onClick={startEdit}
                  className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer shrink-0"
                  title="编辑名称"
                >
                  <Pencil size={13} />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5 truncate">
            {lastSavedAt ? `保存于 ${formatSavedTime(lastSavedAt)}` : '尚未保存'}
            {isDirty ? ' · 存在未提交内容' : ''}
          </p>
        </div>
      </div>
      <button
        type="button"
        data-tour-id="save-btn"
        onClick={onSave}
        disabled={readOnly}
        className={cn(BTN_INK, 'h-8 px-4 shrink-0', readOnly && 'opacity-50 cursor-not-allowed')}
      >
        保存
      </button>
    </div>
  );
}

type PersonaTab = 'name' | 'description' | 'persona' | 'background' | 'workflow' | 'style' | 'constraints';

const PERSONA_TABS: { id: PersonaTab; label: string }[] = [
  { id: 'name', label: '名称' },
  { id: 'description', label: EMPLOYEE_RESOURCE_TERMS.employeeDescription },
  { id: 'persona', label: '职责&服务场景' },
  { id: 'background', label: '背景知识' },
  { id: 'workflow', label: '技能&工作流' },
  { id: 'style', label: '语言风格' },
  { id: 'constraints', label: '约束&限制' },
];

const PERSONA_LIMITS: Record<PersonaTab, number> = {
  name: 32,
  description: 200,
  persona: 1000,
  background: 1000,
  workflow: 1000,
  style: 100,
  constraints: 1000,
};

function personaValueLength(agent: HiredAgent, id: PersonaTab): number {
  switch (id) {
    case 'name':
      return agent.name.replace(/\s*#\d+$/, '').trim().length;
    case 'description':
      return (agent.description ?? '').length;
    case 'persona':
      return (agent.persona ?? '').length;
    case 'background':
      return (agent.backgroundKnowledge ?? '').length;
    case 'workflow':
      return (agent.workflowNotes ?? '').length;
    case 'style':
      return (agent.languageStyle ?? '').length;
    case 'constraints':
      return (agent.constraints ?? '').length;
  }
}

function personaFieldValue(agent: HiredAgent, id: PersonaTab): string {
  switch (id) {
    case 'name':
      return agent.name.replace(/\s*#\d+$/, '').trim();
    case 'description':
      return agent.description ?? '';
    case 'persona':
      return agent.persona ?? '';
    case 'background':
      return agent.backgroundKnowledge ?? '';
    case 'workflow':
      return agent.workflowNotes ?? '';
    case 'style':
      return agent.languageStyle ?? '';
    case 'constraints':
      return agent.constraints ?? '';
  }
}

function optimizePersonaText(text: string, id: PersonaTab): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return trimmed;

  switch (id) {
    case 'style':
      return trimmed
        .replace(/[，,]\s*/g, '、')
        .replace(/、+/g, '、')
        .slice(0, PERSONA_LIMITS.style);
    case 'constraints': {
      const lines = trimmed
        .split(/\n+/)
        .map((line) => line.replace(/^\d+[\.\)、]\s*/, '').trim())
        .filter(Boolean);
      return lines
        .map((line, i) => `${i + 1}. ${line.replace(/[。；;]$/, '')}`)
        .join('\n')
        .slice(0, PERSONA_LIMITS.constraints);
    }
    default: {
      let next = trimmed.replace(/[。．]{2,}/g, '。');
      if (!/[。！？!?]$/.test(next)) next += '。';
      return next.slice(0, PERSONA_LIMITS[id]);
    }
  }
}

function optimizePersonaFields(agent: HiredAgent, modules: PersonaTab[]): Partial<HiredAgent> {
  const updates: Partial<HiredAgent> = {};
  for (const id of modules) {
    const current = personaFieldValue(agent, id);
    if (!current.trim()) continue;
    const optimized = optimizePersonaText(current, id);
    if (id === 'name') {
      const hash = agent.name.match(/#\d+$/)?.[0] ?? '';
      updates.name = `${optimized.slice(0, PERSONA_LIMITS.name)}${hash}`;
    } else if (id === 'description') updates.description = optimized;
    else if (id === 'persona') updates.persona = optimized;
    else if (id === 'background') updates.backgroundKnowledge = optimized;
    else if (id === 'workflow') updates.workflowNotes = optimized;
    else if (id === 'style') updates.languageStyle = optimized;
    else if (id === 'constraints') updates.constraints = optimized;
  }
  return updates;
}

function PersonaField({
  id,
  agent,
  patch,
}: {
  id: PersonaTab;
  agent: HiredAgent;
  patch: (updates: Partial<HiredAgent>) => void;
}) {
  const max = PERSONA_LIMITS[id];
  switch (id) {
    case 'name':
      return (
        <input
          value={agent.name.replace(/\s*#\d+$/, '').trim()}
          onChange={e => {
            const hash = agent.name.match(/#\d+$/)?.[0] ?? '';
            patch({ name: `${e.target.value.slice(0, max)}${hash}` });
          }}
          className={cn(ONBOARDING_FIELD, 'h-8 py-1.5')}
          placeholder="食安险客服专员"
        />
      );
    case 'description':
      return (
        <textarea
          value={agent.description ?? ''}
          onChange={e => patch({ description: e.target.value.slice(0, max) })}
          placeholder="简要描述这位数字员工的岗位定位与服务范围…"
          className={cn(ONBOARDING_FIELD, 'min-h-[72px] resize-y leading-relaxed')}
        />
      );
    case 'persona':
      return (
        <textarea
          value={agent.persona ?? ''}
          onChange={e => patch({ persona: e.target.value.slice(0, max) })}
          placeholder="描述职责与服务场景…"
          className={cn(ONBOARDING_FIELD, 'min-h-[72px] resize-y leading-relaxed')}
        />
      );
    case 'background':
      return (
        <textarea
          value={agent.backgroundKnowledge ?? ''}
          onChange={e => patch({ backgroundKnowledge: e.target.value.slice(0, max) })}
          placeholder="补充业务背景、知识来源与引用规范…"
          className={cn(ONBOARDING_FIELD, 'min-h-[72px] resize-y leading-relaxed')}
        />
      );
    case 'workflow':
      return (
        <textarea
          value={agent.workflowNotes ?? ''}
          onChange={e => patch({ workflowNotes: e.target.value.slice(0, max) })}
          placeholder="描述技能触发条件与工作流编排…"
          className={cn(ONBOARDING_FIELD, 'min-h-[72px] resize-y leading-relaxed')}
        />
      );
    case 'style':
      return (
        <input
          value={agent.languageStyle ?? ''}
          onChange={e => patch({ languageStyle: e.target.value.slice(0, max) })}
          className={cn(ONBOARDING_FIELD, 'h-8 py-1.5')}
          placeholder="例如：专业严谨、温和耐心"
        />
      );
    case 'constraints':
      return (
        <textarea
          value={agent.constraints ?? ''}
          onChange={e => patch({ constraints: e.target.value.slice(0, max) })}
          placeholder={'1. 回答简洁\n2. 超出知识范围时礼貌拒答…'}
          className={cn(ONBOARDING_FIELD, 'min-h-[72px] resize-y leading-relaxed')}
        />
      );
  }
}

function CharCount({ current, max }: { current: number; max: number }) {
  return (
    <span className="text-xs text-neutral-500 tabular-nums">
      {current}/{max}
    </span>
  );
}

const TRANSFER_TARGET_OPTIONS = [
  {
    id: 'workspace' as const,
    label: '转本工作台',
    desc: ORG_COPY.transferChannelDesc,
    icon: Laptop,
  },
  {
    id: 'external' as const,
    label: '转其他工作台',
    desc: '跳转至外部人工接待链接或第三方协同系统',
    icon: ArrowUpRight,
  },
];

function TransferTargetPicker({
  value,
  onChange,
  readOnly,
}: {
  value: 'workspace' | 'external';
  onChange: (next: 'workspace' | 'external') => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="转人工方式">
      {TRANSFER_TARGET_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={readOnly}
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex items-start gap-2.5 p-3 rounded-lg border text-left transition cursor-pointer',
              selected
                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/15'
                : 'border-neutral-200 bg-white hover:bg-neutral-100/60',
              readOnly && 'opacity-60 pointer-events-none',
            )}
          >
            <span
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border',
                selected
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-neutral-100/40 border-neutral-200 text-neutral-500',
              )}
            >
              <Icon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-neutral-800">{opt.label}</span>
                {selected ? <Check size={12} className="text-primary shrink-0" /> : null}
              </span>
              <span className="block text-xs text-neutral-500 leading-snug mt-0.5">
                {opt.desc}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const DEFAULT_RESPONSE_TIMEOUT_SEC = 300;
const FALLBACK_SCRIPT_MAX = 2000;

const FALLBACK_TOOLBAR_ITEMS: { label: string; title: string }[] = [
  { label: 'B', title: '粗体' },
  { label: 'I', title: '斜体' },
  { label: 'H2', title: '标题' },
  { label: 'link', title: '链接', icon: 'link' as const },
  { label: '<>', title: '代码' },
  { label: '•', title: '无序列表' },
  { label: '1.', title: '有序列表' },
  { label: '"', title: '引用' },
];

function ResponseTimeoutInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const clamp = (n: number) => Math.max(1, Math.min(3600, Math.round(n)));

  const apply = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    onChange(clamp(parsed));
  };

  return (
    <div className="relative max-w-[200px]">
      <input
        type="number"
        min={1}
        max={3600}
        value={value}
        onChange={e => apply(e.target.value)}
        disabled={disabled}
        className={cn(ONBOARDING_FIELD, 'h-9 py-1.5 pr-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none')}
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col border-l border-neutral-200 pl-0.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(clamp(value + 1))}
          className="p-0.5 text-neutral-500 hover:text-neutral-800 disabled:opacity-40 cursor-pointer"
          aria-label="增加"
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(clamp(value - 1))}
          className="p-0.5 text-neutral-500 hover:text-neutral-800 disabled:opacity-40 cursor-pointer"
          aria-label="减少"
        >
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
}

function FallbackScriptEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-md border border-neutral-200 overflow-hidden bg-white">
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-neutral-200 bg-neutral-100/30">
        {FALLBACK_TOOLBAR_ITEMS.map(item => (
          <button
            key={item.label}
            type="button"
            disabled={disabled}
            title={item.title}
            className="h-6 min-w-[22px] px-1 rounded text-xs font-medium text-neutral-500 hover:bg-neutral-100/60 hover:text-neutral-800 disabled:opacity-40 cursor-pointer flex items-center justify-center"
          >
            {'icon' in item && item.icon === 'link' ? (
              <Link2 size={12} />
            ) : item.label === '<>' ? (
              <MessageSquareCode size={12} />
            ) : (
              item.label
            )}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value.slice(0, FALLBACK_SCRIPT_MAX))}
        disabled={disabled}
        placeholder={DEFAULT_FALLBACK_SCRIPT}
        className="w-full min-h-[96px] resize-none px-3 py-2 text-sm/relaxed text-neutral-800 placeholder:text-neutral-500 bg-transparent outline-none"
      />
    </div>
  );
}

function getOnboardingRequiredErrors(agent: HiredAgent): string[] {
  const missing: string[] = [];
  if (!(agent.openingLine ?? '').trim()) missing.push('开场白');
  return missing;
}

function ConfigSection({
  title,
  icon,
  open,
  onToggle,
  badge,
  required,
  tourId,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  required?: boolean;
  tourId?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-tour-id={tourId}
      className="bg-white rounded-lg border border-neutral-200 overflow-hidden"
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-neutral-100/40 transition cursor-pointer text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800 min-w-0">
          {icon}
          <span className="truncate">
            {title}
            {required ? <span className="text-destructive ml-0.5">*</span> : null}
          </span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {badge}
          <ChevronDown
            size={14}
            className={cn('text-neutral-500 transition-transform', open && 'rotate-180')}
          />
        </span>
      </button>
      {open && <div className="px-3 pb-3 pt-0 border-t border-neutral-200 space-y-2">{children}</div>}
    </div>
  );
}

export interface OnboardingConfigPanelProps {
  agent: HiredAgent;
  relayAvatarIndex?: number;
  knowledgeBases: KnowledgeBase[];
  skills: Skill[];
  hasKbs: boolean;
  hasSks: boolean;
  updateHiredAgent: (id: string, updates: Partial<HiredAgent>) => void;
  showToast: (message: string) => void;
  onPersonaConfigured?: () => void;
  onKnowledgeBound?: () => void;
  onSkillBound?: () => void;
  onConfigStateChange?: (state: { isDirty: boolean; lastSavedAt: Date | null }) => void;
  onConfigSaved?: () => void;
  previewSnapshot?: AgentConfigSnapshot | null;
  configSyncToken?: number;
  onCancelPreview?: () => void;
  onApplyPreview?: () => void;
  onCreateSkill?: () => void;
  /** 遮罩引导当前步，用于自动展开对应配置区块 */
  buildTourStep?: number | null;
}

export const OnboardingConfigPanel: React.FC<OnboardingConfigPanelProps> = ({
  agent,
  relayAvatarIndex: relayAvatarIndexProp,
  knowledgeBases,
  skills,
  hasKbs,
  hasSks,
  updateHiredAgent,
  showToast,
  onPersonaConfigured,
  onKnowledgeBound,
  onSkillBound,
  onConfigStateChange,
  onConfigSaved,
  previewSnapshot,
  configSyncToken = 0,
  onCancelPreview,
  onApplyPreview,
  onCreateSkill,
  buildTourStep = null,
}) => {
  const { hiredAgents, marketAgents, updateKnowledgeBase, createKnowledgeBase } = useApp();
  const readOnly = !!previewSnapshot;
  const displayAgent = previewSnapshot
    ? { ...agent, ...previewSnapshot.config }
    : agent;
  const marketAgent = marketAgents.find((m) => m.id === agent.marketId);
  const pendingTemplateUpgrade =
    !readOnly ? getPendingTemplateUpgrade(agent, marketAgent) : null;
  const relayAvatarIndex =
    relayAvatarIndexProp ??
    Math.max(0, hiredAgents.findIndex((a) => a.id === agent.id));
  const [activePersonaModules, setActivePersonaModules] = useState<PersonaTab[]>([]);
  const [personaOptimizing, setPersonaOptimizing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [editingKbId, setEditingKbId] = useState<string | null>(null);
  const [kbCreateOpen, setKbCreateOpen] = useState(false);
  const [newKbName, setNewKbName] = useState('');
  const [newKbDesc, setNewKbDesc] = useState('');
  const [kbCategoryTags, setKbCategoryTags] = useState<Array<'professional' | 'basic'>>(['professional']);
  const [kbChunkMethod, setKbChunkMethod] = useState('general');
  const [kbEmbeddingModel, setKbEmbeddingModel] = useState('Qwen3-Embedding-8B');

  const editingKb = editingKbId
    ? knowledgeBases.find((kb) => kb.id === editingKbId) ?? null
    : null;

  const openKnowledgeBaseEditor = (kb: KnowledgeBase) => {
    setEditingKbId(kb.id);
  };

  const resetKbCreateForm = () => {
    setNewKbName('');
    setNewKbDesc('');
    setKbCategoryTags(['professional']);
    setKbChunkMethod('general');
    setKbEmbeddingModel('Qwen3-Embedding-8B');
  };

  const closeKbCreateModal = () => {
    setKbCreateOpen(false);
    resetKbCreateForm();
  };

  const toggleKbCategoryTag = (tag: 'professional' | 'basic') => {
    setKbCategoryTags((prev) =>
      prev.includes(tag) ? (prev.length > 1 ? prev.filter((t) => t !== tag) : prev) : [...prev, tag],
    );
  };

  useEffect(() => {
    setIsDirty(false);
    setLastSavedAt(null);
    onConfigStateChange?.({ isDirty: false, lastSavedAt: null });
  }, [agent.id, onConfigStateChange]);

  useEffect(() => {
    setIsDirty(false);
  }, [configSyncToken]);

  useEffect(() => {
    onConfigStateChange?.({ isDirty, lastSavedAt });
  }, [isDirty, lastSavedAt, onConfigStateChange]);

  useEffect(() => {
    const mods = PERSONA_TABS.filter(t => {
      switch (t.id) {
        case 'name':
          return false;
        case 'description':
          return !!agent.description;
        case 'persona':
          return !!agent.persona;
        case 'background':
          return !!agent.backgroundKnowledge;
        case 'workflow':
          return !!agent.workflowNotes;
        case 'style':
          return !!agent.languageStyle;
        case 'constraints':
          return !!agent.constraints;
      }
    }).map(t => t.id);
    setActivePersonaModules(mods);
  }, [
    agent.id,
    agent.description,
    agent.persona,
    agent.backgroundKnowledge,
    agent.workflowNotes,
    agent.languageStyle,
    agent.constraints,
  ]);
  const [skillBindModalOpen, setSkillBindModalOpen] = useState(false);
  const [kbBindModalOpen, setKbBindModalOpen] = useState(false);
  const [kbBoundPage, setKbBoundPage] = useState(1);
  const [skillBoundPage, setSkillBoundPage] = useState(1);
  const [open, setOpen] = useState({
    persona: true,
    kb: true,
    skills: true,
    transfer: false,
    fallback: false,
    more: false,
  });

  useEffect(() => {
    if (buildTourStep == null) return;
    if (buildTourStep === 0) {
      setOpen((p) => ({ ...p, persona: true }));
    } else if (buildTourStep === 1) {
      setOpen((p) => ({ ...p, kb: true }));
    } else if (buildTourStep === 2) {
      setOpen((p) => ({ ...p, skills: true }));
    }
  }, [buildTourStep]);

  const toggle = (key: keyof typeof open) =>
    setOpen(p => ({ ...p, [key]: !p[key] }));

  const patch = (updates: Partial<HiredAgent>) => {
    if (readOnly) return;
    setIsDirty(true);
    updateHiredAgent(agent.id, updates);
  };

  const handleCreateKnowledgeBase = () => {
    if (readOnly) return;
    const name = newKbName.trim().slice(0, 30);
    if (!name) return;
    const kb = createKnowledgeBase(name);
    patch({ knowledgeBases: [...displayAgent.knowledgeBases, kb.id] });
    onKnowledgeBound?.();
    closeKbCreateModal();
    setEditingKbId(kb.id);
    showToast(`已创建并配备「${kb.name}」`);
  };

  const handleSave = () => {
    if (readOnly) return;
    const missing = getOnboardingRequiredErrors(displayAgent);
    if (missing.length > 0) {
      showToast(`请先填写必填项：${missing.join('、')}`);
      return;
    }
    setLastSavedAt(new Date());
    setIsDirty(false);
    showToast(`「${formatAgentDisplayName(agent, hiredAgents)}」配置已保存`);
    onConfigSaved?.();
  };

  const boundSkills = skills.filter(sk => displayAgent.skills.includes(sk.id));
  const boundKbs = knowledgeBases.filter(kb => displayAgent.knowledgeBases.includes(kb.id));
  const pagedBoundKbs = paginateItems(boundKbs, kbBoundPage, LIST_PAGE_SIZE);
  const pagedBoundSkills = paginateItems(boundSkills, skillBoundPage, LIST_PAGE_SIZE);

  const visiblePersonaTabs = SHOW_PERSONA_TAG_SELECTOR
    ? PERSONA_TABS.filter((t) => activePersonaModules.includes(t.id))
    : PERSONA_TABS.filter((t) => t.id !== 'name');

  useEffect(() => {
    setKbBoundPage(1);
  }, [agent.id, displayAgent.knowledgeBases.length]);

  useEffect(() => {
    setSkillBoundPage(1);
  }, [agent.id, displayAgent.skills.length]);

  const togglePersonaModule = (id: PersonaTab) => {
    setActivePersonaModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const runPersonaOptimize = () => {
    if (readOnly || personaOptimizing) return;
    const targets = activePersonaModules.filter((id) => personaFieldValue(displayAgent, id).trim());
    if (targets.length === 0) {
      showToast('当前模块暂无内容可优化');
      return;
    }
    setPersonaOptimizing(true);
    window.setTimeout(() => {
      const updates = optimizePersonaFields(displayAgent, targets);
      if (Object.keys(updates).length === 0) {
        setPersonaOptimizing(false);
        showToast('暂无可优化的内容');
        return;
      }
      patch(updates);
      setPersonaOptimizing(false);
      showToast('已优化所选模块的表述');
    }, pickMockLatencyMs('save'));
  };

  return (
    <>
    <div className="w-full h-full flex flex-col overflow-hidden bg-white">
      {readOnly && previewSnapshot && (
        <div className="shrink-0 px-4 py-2.5 bg-sky-50 border-b border-sky-200 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-sky-900 font-semibold">
            预览模式 · {previewSnapshot.title}
            <span className="ml-2 font-mono text-xs font-normal text-sky-700/80">
              {previewSnapshot.code}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onApplyPreview}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              {MASTER_TEMPLATE_TERMS.syncUpgrade}
            </button>
            <button
              type="button"
              onClick={onCancelPreview}
              className="text-xs font-semibold text-sky-700 hover:text-sky-900 cursor-pointer"
            >
              取消预览
            </button>
          </div>
        </div>
      )}
      <OnboardingAgentTopBar
        agent={displayAgent}
        hiredAgents={hiredAgents}
        relayAvatarIndex={relayAvatarIndex}
        isDirty={readOnly ? false : isDirty}
        lastSavedAt={lastSavedAt}
        onSave={handleSave}
        onRename={(name) => patch({ name })}
        onAvatarChange={(avatar) => {
          const defaultUrl =
            RELAY_CARD_AVATARS[relayAvatarIndex % RELAY_CARD_AVATARS.length];
          if (avatar === defaultUrl) {
            patch({ avatar: defaultUrl, avatarCustomized: false });
          } else {
            patch({ avatar, avatarCustomized: true });
          }
        }}
        readOnly={readOnly}
      />
      <div className="flex-1 min-h-0 p-4 overflow-y-auto space-y-2 custom-scrollbar">
      {pendingTemplateUpgrade && (
        <MasterTemplateUpgradeBanner
          upgrade={pendingTemplateUpgrade}
          onDismiss={() => {
            updateHiredAgent(agent.id, {
              templateUpgradeDismissedVersion: pendingTemplateUpgrade.version,
            });
            showToast(MASTER_TEMPLATE_TERMS.dismissToast);
          }}
          onSync={() => {
            updateHiredAgent(agent.id, {
              syncedTemplateVersion: pendingTemplateUpgrade.version,
              templateUpgradeDismissedVersion: undefined,
              workflowNotes:
                displayAgent.workflowNotes ||
                FOOD_SAFETY_AGENT_DEFAULTS.workflowNotes,
            });
            showToast(
              `${MASTER_TEMPLATE_TERMS.syncToast}（${pendingTemplateUpgrade.version}）`,
            );
          }}
        />
      )}
      {/* 入职标签 */}
      <ConfigSection
        title="入职标签"
        icon={<UserCheck size={13} className="text-neutral-500 shrink-0" />}
        open={open.persona}
        onToggle={() => toggle('persona')}
        tourId="config-basic-tags"
      >
        {SHOW_PERSONA_TAG_SELECTOR && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-xs text-neutral-500 font-medium">标签选择</p>
            <button
              type="button"
              onClick={runPersonaOptimize}
              disabled={readOnly || personaOptimizing}
              className={cn(
                BTN_OUTLINE,
                'h-7 px-2.5 text-xs gap-1',
                (readOnly || personaOptimizing) && 'opacity-50 pointer-events-none',
              )}
            >
              {personaOptimizing ? <Loader2 size={12} /> : <RefreshCw size={12} />}
              {personaOptimizing ? '优化中…' : '优化'}
            </button>
          </div>
        )}
        {SHOW_PERSONA_TAG_SELECTOR && (
          <div className="flex flex-wrap gap-1">
            {PERSONA_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => togglePersonaModule(tab.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer',
                  activePersonaModules.includes(tab.id)
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-neutral-100/50 text-neutral-500 border-neutral-200 hover:text-neutral-800',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-1">
          {SHOW_PERSONA_TAG_SELECTOR && activePersonaModules.length === 0 && (
            <p className="text-xs text-neutral-500 py-2">
              点击上方模块标签，在下方添加对应配置项
            </p>
          )}
          {visiblePersonaTabs.map(tab => (
            <div key={tab.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-neutral-500">
                  {tab.label}
                </label>
                <CharCount
                  current={personaValueLength(displayAgent, tab.id)}
                  max={PERSONA_LIMITS[tab.id]}
                />
              </div>
              <PersonaField id={tab.id} agent={displayAgent} patch={patch} />
            </div>
          ))}
        </div>
      </ConfigSection>

      {/* 员工知识 */}
      <ConfigSection
        title={EMPLOYEE_RESOURCE_TERMS.configuredKbList}
        icon={<BookOpen size={13} className="text-neutral-500 shrink-0" />}
        open={open.kb}
        onToggle={() => toggle('kb')}
        tourId="config-knowledge"
        badge={
          hasKbs ? (
            <span className="text-xs text-neutral-500 flex items-center gap-0.5">
              <CheckCircle2 size={10} />
              {displayAgent.knowledgeBases.length}
            </span>
          ) : null
        }
      >
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-neutral-500 shrink-0">
              {EMPLOYEE_RESOURCE_TERMS.configured}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => !readOnly && setKbBindModalOpen(true)}
                disabled={readOnly}
                className="text-xs text-primary font-medium cursor-pointer flex items-center gap-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Plus size={11} />
                {EMPLOYEE_RESOURCE_TERMS.assignKb}
              </button>
              <button
                type="button"
                onClick={() => !readOnly && setKbCreateOpen(true)}
                disabled={readOnly}
                className="text-xs text-primary font-medium cursor-pointer flex items-center gap-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Plus size={11} />
                {EMPLOYEE_RESOURCE_TERMS.createKnowledgeBase}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {pagedBoundKbs.map(kb => (
                <div
                  key={kb.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-neutral-200 bg-neutral-100/30 text-sm"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center text-xs font-bold shrink-0">
                      {kb.firstChar}
                    </span>
                    <span className="truncate font-medium">{kb.name}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openKnowledgeBaseEditor(kb)}
                      className="px-2 py-0.5 rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-800 hover:bg-neutral-100/60 cursor-pointer whitespace-nowrap"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patch({ knowledgeBases: displayAgent.knowledgeBases.filter(id => id !== kb.id) })
                      }
                      className="text-neutral-500 hover:text-destructive p-0.5 cursor-pointer"
                      title={EMPLOYEE_RESOURCE_TERMS.removeAssigned}
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                </div>
              ))}
            {!hasKbs && (
              <p className="text-xs text-neutral-500 py-1 leading-relaxed">
                {EMPLOYEE_RESOURCE_TERMS.configKbHint}
              </p>
            )}
            <ListPagination
              total={boundKbs.length}
              page={kbBoundPage}
              onPageChange={setKbBoundPage}
              className="pt-1"
            />
          </div>
        </div>
      </ConfigSection>

      {/* 员工技能 */}
      <ConfigSection
        title={EMPLOYEE_RESOURCE_TERMS.configuredSkillList}
        icon={<Cpu size={13} className="text-neutral-500 shrink-0" />}
        open={open.skills}
        onToggle={() => toggle('skills')}
        tourId="config-skills"
        badge={
          hasSks ? (
            <span className="text-xs text-neutral-500 flex items-center gap-0.5">
              <CheckCircle2 size={10} />
              {displayAgent.skills.length}
            </span>
          ) : null
        }
      >
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-neutral-500 shrink-0">
              {EMPLOYEE_RESOURCE_TERMS.configured}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => !readOnly && setSkillBindModalOpen(true)}
                disabled={readOnly}
                className="text-xs text-primary font-medium cursor-pointer flex items-center gap-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Plus size={11} />
                {EMPLOYEE_RESOURCE_TERMS.assignSkill}
              </button>
              {onCreateSkill && (
                <button
                  type="button"
                  onClick={() => !readOnly && onCreateSkill()}
                  disabled={readOnly}
                  className="text-xs text-primary font-medium cursor-pointer flex items-center gap-0.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ArrowUpRight size={11} />
                  {EMPLOYEE_RESOURCE_TERMS.createSkill}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            {pagedBoundSkills.map(sk => (
              <div
                key={sk.id}
                className="flex items-start justify-between gap-2 px-2 py-1.5 rounded-md border border-neutral-200 bg-neutral-100/30"
              >
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{sk.name}</p>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-snug">{sk.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => patch({ skills: displayAgent.skills.filter(id => id !== sk.id) })}
                  className="text-neutral-500 hover:text-destructive p-0.5 cursor-pointer shrink-0 mt-0.5"
                  title={EMPLOYEE_RESOURCE_TERMS.removeAssigned}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {!hasSks && (
              <p className="text-xs text-neutral-500 py-1 leading-relaxed">
                {EMPLOYEE_RESOURCE_TERMS.configSkillHint}
              </p>
            )}
            <ListPagination
              total={boundSkills.length}
              page={skillBoundPage}
              onPageChange={setSkillBoundPage}
              className="pt-1"
            />
          </div>
        </div>
      </ConfigSection>

      {/* 转人工 */}
      <ConfigSection
        title="转人工"
        icon={<Headphones size={13} className="text-neutral-500 shrink-0" />}
        open={open.transfer}
        onToggle={() => toggle('transfer')}
      >
        <div className="pt-2 space-y-3">
          <p className="text-xs text-neutral-500 leading-relaxed">
            数字员工无法独立处理时，将按以下方式升级至人工接待
          </p>

          <TransferTargetPicker
            value={displayAgent.transferTarget ?? 'workspace'}
            onChange={(id) =>
              patch({
                transferTarget: id,
                ...(id === 'workspace' ? { transferExternalUrl: undefined } : {}),
              })
            }
            readOnly={readOnly}
          />

          {(displayAgent.transferTarget ?? 'workspace') === 'workspace' ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-neutral-100/30 border border-neutral-200">
              <Laptop size={14} className="text-neutral-500 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-500 leading-relaxed">
                {ORG_COPY.transferChannelHint}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-100/20 p-3">
              <label className="text-xs font-medium text-neutral-500">
                人工接待 URL <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Link2
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
                />
                <input
                  type="url"
                  value={displayAgent.transferExternalUrl ?? ''}
                  onChange={(e) => patch({ transferExternalUrl: e.target.value })}
                  disabled={readOnly}
                  placeholder="https://example.com/human-support"
                  className={cn(ONBOARDING_FIELD, 'pl-9 bg-white')}
                />
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                客户触发转人工后将跳转至该链接，请确保可公网访问
              </p>
            </div>
          )}
        </div>
      </ConfigSection>

      {/* 应急话术 */}
      <ConfigSection
        title={EMPLOYEE_RESOURCE_TERMS.fallbackLine}
        icon={<MessageSquareCode size={13} className="text-neutral-500 shrink-0" />}
        open={open.fallback}
        onToggle={() => toggle('fallback')}
      >
        <div className="pt-2 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-500">
              {EMPLOYEE_RESOURCE_TERMS.fallbackLine}
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <FallbackScriptEditor
              value={displayAgent.fallbackScript ?? ''}
              onChange={next => patch({ fallbackScript: next })}
              disabled={readOnly}
            />
            <div className="flex justify-end">
              <CharCount current={(displayAgent.fallbackScript ?? '').length} max={FALLBACK_SCRIPT_MAX} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="text-xs font-medium text-neutral-500">
                {EMPLOYEE_RESOURCE_TERMS.thinkTimeoutSec}
              </label>
              <span title={EMPLOYEE_RESOURCE_TERMS.fallbackLineHint}>
                <HelpCircle size={11} className="text-neutral-500/70" />
              </span>
            </div>
            <ResponseTimeoutInput
              value={displayAgent.responseTimeoutSeconds ?? DEFAULT_RESPONSE_TIMEOUT_SEC}
              onChange={next => patch({ responseTimeoutSeconds: next })}
              disabled={readOnly}
            />
          </div>
        </div>
      </ConfigSection>

      {/* 更多设置 */}
      <ConfigSection
        title="更多设置"
        icon={<Layers size={13} className="text-neutral-500 shrink-0" />}
        open={open.more}
        onToggle={() => toggle('more')}
      >
        <div className="pt-2 space-y-2.5">
          <div className="space-y-1 pb-1 border-b border-neutral-200">
            <label className="text-xs font-medium text-neutral-500">
              {EMPLOYEE_RESOURCE_TERMS.openingLine}
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <textarea
              value={displayAgent.openingLine ?? ''}
              onChange={e => patch({ openingLine: e.target.value.slice(0, 2000) })}
              disabled={readOnly}
              placeholder={resolveAgentCopyTemplate(
                displayAgent.name,
                DEFAULT_OPENING_LINE_TEMPLATE,
              )}
              className={cn(ONBOARDING_FIELD, 'min-h-[72px] resize-none leading-relaxed')}
            />
            <div className="flex justify-end">
              <CharCount current={(displayAgent.openingLine ?? '').length} max={2000} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">
              {EMPLOYEE_RESOURCE_TERMS.modelLabel}
            </label>
            <div
              className={cn(
                ONBOARDING_FIELD,
                'h-8 flex items-center px-3 bg-neutral-100/30 text-neutral-500 cursor-default',
              )}
            >
              {DEFAULT_AGENT_MODEL}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">
              {EMPLOYEE_RESOURCE_TERMS.masterTemplateLabel}
            </label>
            <div
              className={cn(
                ONBOARDING_FIELD,
                'min-h-8 flex items-center px-3 py-1.5 bg-neutral-100/30 text-neutral-500 cursor-default text-xs/relaxed break-all',
              )}
            >
              {marketAgent?.templateVersion
                ? `${marketAgent.name}·${marketAgent.templateVersion}`
                : '—'}
            </div>
          </div>
        </div>
      </ConfigSection>
      </div>

      <ResourceBindPickerModal
        open={kbBindModalOpen}
        onClose={() => setKbBindModalOpen(false)}
        title={EMPLOYEE_RESOURCE_TERMS.pickKbModal}
        icon={<BookOpen size={18} />}
        searchPlaceholder="搜索员工知识名称…"
        confirmLabel={EMPLOYEE_RESOURCE_TERMS.confirmAssign}
        emptyHint={
          knowledgeBases.filter((kb) => !displayAgent.knowledgeBases.includes(kb.id)).length === 0
            ? '团队暂无可指定的知识库，请先在「员工知识」新建'
            : SEARCH_COPY.noKb
        }
        items={knowledgeBases
          .filter((kb) => !displayAgent.knowledgeBases.includes(kb.id))
          .map((kb) => ({
            id: kb.id,
            name: kb.name,
            badge: kb.firstChar,
            meta: `${kb.docCount} 个文件 · ${kb.wordCount.toLocaleString()} 词`,
          }))}
        onConfirm={(ids) => {
          patch({ knowledgeBases: [...displayAgent.knowledgeBases, ...ids] });
          onKnowledgeBound?.();
        }}
      />

      <ResourceBindPickerModal
        open={skillBindModalOpen}
        onClose={() => setSkillBindModalOpen(false)}
        title={EMPLOYEE_RESOURCE_TERMS.pickSkillModal}
        icon={<Cpu size={18} />}
        searchPlaceholder="搜索技能名称…"
        confirmLabel={EMPLOYEE_RESOURCE_TERMS.confirmAssign}
        emptyHint={
          skills.filter((sk) => !displayAgent.skills.includes(sk.id)).length === 0
            ? '团队暂无可指定的技能，请先在「员工技能」新建'
            : SEARCH_COPY.noSkill
        }
        items={skills
          .filter((sk) => !displayAgent.skills.includes(sk.id))
          .map((sk) => ({
            id: sk.id,
            name: sk.name,
            description: sk.description,
            meta: sk.author ? `作者 · ${sk.author}` : undefined,
          }))}
        onConfirm={(ids) => {
          patch({ skills: [...displayAgent.skills, ...ids] });
          onSkillBound?.();
        }}
      />
    </div>

    {editingKb && (
      <KnowledgeBaseWorkspaceModal
        open
        kb={editingKb}
        agentName={displayAgent.name}
        onBack={() => setEditingKbId(null)}
        onUpdateKb={updateKnowledgeBase}
        showToast={showToast}
      />
    )}

    <Modal
      open={kbCreateOpen}
      onClose={closeKbCreateModal}
      title={EMPLOYEE_RESOURCE_TERMS.createKnowledgeBase}
      maxWidth="max-w-md"
      footer={
        <>
          <button type="button" onClick={closeKbCreateModal} className={BTN_SOFT}>
            取消
          </button>
          <button
            type="button"
            onClick={handleCreateKnowledgeBase}
            disabled={!newKbName.trim()}
            className={BTN_INK}
          >
            创建并配备
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>
            知识库名称 <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="请输入知识库名称"
              value={newKbName}
              maxLength={30}
              onChange={(e) => setNewKbName(e.target.value)}
              className={FIELD}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500">
              {newKbName.length}/30
            </span>
          </div>
        </div>

        <div>
          <label className={LABEL}>描述</label>
          <div className="relative">
            <textarea
              placeholder="请输入知识库描述"
              value={newKbDesc}
              maxLength={200}
              onChange={(e) => setNewKbDesc(e.target.value)}
              className={cn(FIELD, 'min-h-[72px] resize-none pr-12')}
            />
            <span className="absolute right-3 bottom-2 text-[10px] text-neutral-500">
              {newKbDesc.length}/200
            </span>
          </div>
        </div>

        <div>
          <label className={LABEL}>分类标签（可多选）</label>
          <div className="space-y-2">
            {[
              { id: 'professional' as const, label: '专业知识', hint: '默认', desc: '面向业务场景的专业文档与政策条款' },
              { id: 'basic' as const, label: '基础知识', hint: '', desc: '通用 FAQ、入门说明与基础话术' },
            ].map((tag) => {
              const selected = kbCategoryTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleKbCategoryTag(tag.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition cursor-pointer',
                    selected
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-neutral-200 bg-white hover:bg-neutral-100/40',
                  )}
                >
                  {selected ? (
                    <Check size={14} className="text-primary shrink-0" />
                  ) : (
                    <Circle size={14} className="text-neutral-500 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-neutral-800">
                    {tag.label}
                    {tag.hint ? `（${tag.hint}）` : ''}
                  </span>
                  <HelpCircle size={12} className="text-neutral-500 shrink-0 ml-auto" title={tag.desc} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={LABEL}>分块方法</label>
          <select
            value={kbChunkMethod}
            onChange={(e) => setKbChunkMethod(e.target.value)}
            className={cn(FIELD, 'cursor-pointer')}
          >
            <option value="general">通用解析</option>
            <option value="qa">问答对切分</option>
            <option value="table">表格结构化</option>
          </select>
          <p className="text-[10px] text-neutral-500 mt-1">选择适合您文档类型的分块方法</p>
        </div>

        <div>
          <label className={LABEL}>
            嵌入模型 <span className="text-rose-500">*</span>
          </label>
          <select
            value={kbEmbeddingModel}
            onChange={(e) => setKbEmbeddingModel(e.target.value)}
            className={cn(FIELD, 'cursor-pointer')}
          >
            <option value="Qwen3-Embedding-8B">Qwen3-Embedding-8B</option>
            <option value="text-embedding-3-small">text-embedding-3-small</option>
            <option value="bge-m3">BGE-M3</option>
          </select>
          <p className="text-[10px] text-neutral-500 mt-1">选择用于生成向量嵌入的模型</p>
        </div>
      </div>
    </Modal>
    </>
  );
};
