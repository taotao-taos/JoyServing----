/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 技能工作室 — 对齐瓴羊 AgentOne createSkill：
 * 自然语言生成 → 代码模式（定义 / 目录 / 编辑）→ 预览调试 → 发布
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from '@/lib/icons';
import { pickMockLatencyMs } from '@/lib/mockLatency';
import { BTN_INK, BTN_SOFT, PANEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import {
  buildFileTree,
  generateSkillDraftFromPrompt,
  newEmptyDraftMeta,
  type SkillFileTreeNode,
  type SkillStudioDraft,
} from '@/lib/skillStudioMock';

export type SkillStudioPublishPayload = {
  name: string;
  description: string;
  skillCode: string;
  draftId: string;
};

export interface SkillStudioWorkspaceProps {
  onBack: () => void;
  onPublish: (payload: SkillStudioPublishPayload) => void;
  showToast?: (message: string) => void;
}

type StudioMode = 'code' | 'preview';

type LeftMsg =
  | { id: string; role: 'tip' }
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'result'; draft: SkillStudioDraft; ok: boolean };

type PreviewMsg =
  | { id: string; role: 'system'; text: string }
  | {
      id: string;
      role: 'assistant';
      /** 顶部状态条，如「无合规风险」 */
      banner?: string;
      title?: string;
      paragraphs?: string[];
      bullets?: string[];
      code?: string;
      text?: string;
    }
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'form';
      title: string;
      hint: string;
      placeholder: string;
      step: string;
    };

const SAMPLE_DIALOGUE = `客服: 您好，请问有什么可以帮您？
客户: 我想咨询一下保养套餐价格。
客服: 好的，请问您的车型是？
客户: 是去年买的那款紧凑型SUV。
客服: 已为您查到标准保养套餐 1280 元，需要帮您预约吗？`;

function PreviewAssistantBubble({
  msg,
}: {
  msg: Extract<PreviewMsg, { role: 'assistant' }>;
}) {
  return (
    <div className="flex items-start gap-2.5 max-w-[92%]">
      <div className="h-7 w-7 rounded-full bg-neutral-800 text-white flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={13} />
      </div>
      <div className={cn(PANEL, 'flex-1 p-3.5 space-y-2.5 shadow-none')}>
        {msg.banner ? (
          <div className="rounded-md bg-neutral-100/60 border border-neutral-200 px-2.5 py-1.5 text-[11px] text-neutral-500">
            {msg.banner}
          </div>
        ) : null}
        {msg.title ? (
          <p className="text-[12px] font-bold text-neutral-800">{msg.title}</p>
        ) : null}
        {msg.text ? (
          <p className="text-[12px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
            {msg.text}
          </p>
        ) : null}
        {msg.paragraphs?.map((p) => (
          <p key={p.slice(0, 24)} className="text-[12px] leading-relaxed text-neutral-800">
            {p}
          </p>
        ))}
        {msg.bullets && msg.bullets.length > 0 ? (
          <ul className="list-disc pl-4 space-y-1 text-[12px] text-neutral-800 leading-relaxed">
            {msg.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
        {msg.code ? (
          <pre className="rounded-md bg-neutral-800 text-neutral-100 text-[11px] p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {msg.code}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: SkillFileTreeNode;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (node.kind === 'file') {
    const active = activePath === node.path;
    return (
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={cn(
          'w-full flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] cursor-pointer',
          active ? 'bg-neutral-800 text-white' : 'text-neutral-700 hover:bg-neutral-100',
        )}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        <FileText size={12} className="shrink-0 opacity-70" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-100 cursor-pointer"
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="truncate">{node.name}/</span>
      </button>
      {open
        ? node.children.map((c) => (
            <TreeNode
              key={c.kind === 'file' ? c.path : `dir-${node.name}-${c.name}`}
              node={c}
              depth={depth + 1}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

export const SkillStudioWorkspace: React.FC<SkillStudioWorkspaceProps> = ({
  onBack,
  onPublish,
  showToast,
}) => {
  const metaRef = useRef(newEmptyDraftMeta());
  const [mode, setMode] = useState<StudioMode>('code');
  const [draft, setDraft] = useState<SkillStudioDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [leftMsgs, setLeftMsgs] = useState<LeftMsg[]>([{ id: 'tip', role: 'tip' }]);
  const [prompt, setPrompt] = useState('');
  const [activePath, setActivePath] = useState<string | null>(null);
  const [fileEdits, setFileEdits] = useState<Record<string, string>>({});
  const [previewMsgs, setPreviewMsgs] = useState<PreviewMsg[]>([]);
  const [previewInput, setPreviewInput] = useState('');
  const [deepThink, setDeepThink] = useState(true);
  const [formValue, setFormValue] = useState('');
  const [previewBooted, setPreviewBooted] = useState(false);
  const [previewThinking, setPreviewThinking] = useState(false);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const tree = useMemo(() => (draft ? buildFileTree(draft.files) : []), [draft]);

  const activeContent = useMemo(() => {
    if (!draft || !activePath) return '';
    return fileEdits[activePath] ?? draft.files.find((f) => f.path === activePath)?.content ?? '';
  }, [draft, activePath, fileEdits]);

  useEffect(() => {
    const el = previewScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [previewMsgs, previewThinking, formValue, mode]);

  useEffect(() => {
    if (mode !== 'preview' || !draft || previewBooted) return;
    setPreviewBooted(true);
    const qcLike =
      /质检|合规|稽核/.test(`${draft.purpose}${draft.listDescription}`) ||
      draft.files.some((f) => f.path.includes('compliance'));
    setPreviewMsgs([
      { id: 'p1', role: 'system', text: '技能已激活' },
      { id: 'p2', role: 'system', text: '所有参考文件已读取完毕' },
      {
        id: 'p-hi',
        role: 'assistant',
        text: qcLike
          ? '我是本技能的调试助手。请用自然语言提供一段客服对话，或直接在下方卡片中粘贴，我会按清单试跑质检。'
          : `我是「${draft.displayName}」的调试助手。请用自然语言描述测试输入，我会按技能剧本试跑。`,
      },
      qcLike
        ? {
            id: 'p3',
            role: 'form',
            step: '1/2',
            title: '请提供待质检的客服对话内容',
            hint: '请粘贴客服与客户的完整对话，并标注角色（客服 / 客户）。也可在底部对话框直接用自然语言说明。',
            placeholder: SAMPLE_DIALOGUE,
          }
        : {
            id: 'p3',
            role: 'form',
            step: '1/2',
            title: '请提供一段测试输入',
            hint: '描述场景与必要字段，或粘贴样例数据。也可在底部自然语言对话框继续追问。',
            placeholder: '例如：客户询问理赔金额，保单免赔 1000，票据合计 5200…',
          },
    ]);
  }, [mode, draft, previewBooted]);

  const runGenerate = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || generating) return;
    setGenerating(true);
    setLeftMsgs((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: trimmed }]);
    setPrompt('');
    window.setTimeout(() => {
      const next = generateSkillDraftFromPrompt(trimmed, draft);
      // 保持同一草稿 id
      next.draftId = metaRef.current.draftId;
      setDraft(next);
      setFileEdits({});
      const prefer =
        next.files.find((f) => f.path.includes('inspection_report'))?.path ||
        next.files.find((f) => f.path === 'SKILL.md')?.path ||
        next.files[0]?.path ||
        null;
      setActivePath(prefer);
      setLeftMsgs((prev) => [
        ...prev,
        { id: `r-${Date.now()}`, role: 'result', draft: next, ok: true },
      ]);
      setGenerating(false);
      setPreviewBooted(false);
      setPreviewMsgs([]);
      setFormValue('');
    }, pickMockLatencyMs('aiReply'));
  };

  const handlePublish = () => {
    if (!draft) {
      showToast?.('请先用自然语言描述需求并生成技能');
      return;
    }
    onPublish({
      name: draft.displayName,
      description: draft.listDescription || draft.purpose,
      skillCode: draft.skillCode,
      draftId: draft.draftId,
    });
  };

  const replyToPreview = (userText: string) => {
    setPreviewThinking(true);
    window.setTimeout(() => {
      const looksLikeDialogue =
        /客服|客户|顾问|用户\s*[:：]/.test(userText) && userText.length > 24;
      if (!looksLikeDialogue) {
        setPreviewMsgs((prev) => [
          ...prev,
          {
            id: `pa-${Date.now()}`,
            role: 'assistant',
            banner: '无合规风险 · 未能识别有效对话',
            title: '重要说明',
            paragraphs: [
              '上一条更像随机占位或简短描述，还不能按质检清单试跑。请用自然语言提供：',
            ],
            bullets: [
              '完整对话（标注「客服 / 客户」角色）',
              '场景类型（咨询、投诉、理赔等）',
              '可选：会话 ID、渠道',
            ],
            code: SAMPLE_DIALOGUE,
          },
        ]);
        setPreviewThinking(false);
        return;
      }
      setPreviewMsgs((prev) => [
        ...prev,
        {
          id: `pa-${Date.now()}`,
          role: 'assistant',
          banner: deepThink ? '深度思考已完成' : '快速初检完成',
          title: '质检试跑结果',
          bullets: deepThink
            ? [
                'C01 身份核实：未命中',
                'C02 禁语承诺：未命中',
                'C03 升级路径：未触发',
                '综合：暂无高风险，建议补充结束确认话术',
              ]
            : ['未发现高风险合规项', '可继续追问或点右上角「发布」'],
        },
      ]);
      setPreviewThinking(false);
    }, deepThink ? pickMockLatencyMs('aiReply') : pickMockLatencyMs('panelSwitch'));
  };

  const handlePreviewSend = () => {
    const t = previewInput.trim();
    if (!t || previewThinking) return;
    setPreviewMsgs((prev) => [
      ...prev.filter((m) => m.role !== 'form'),
      { id: `pu-${Date.now()}`, role: 'user', text: t },
    ]);
    setPreviewInput('');
    setFormValue('');
    replyToPreview(t);
  };

  const submitFormStep = () => {
    const t = formValue.trim();
    if (!t || previewThinking) return;
    setPreviewMsgs((prev) => [
      ...prev.filter((m) => m.role !== 'form'),
      { id: `pu-form-${Date.now()}`, role: 'user', text: t },
    ]);
    setFormValue('');
    replyToPreview(t);
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden bg-[#F5F5F5] text-neutral-800">
      {/* Header */}
      <header className="shrink-0 h-12 px-3 border-b border-neutral-200 bg-white flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
        >
          <ArrowLeft size={14} />
          返回
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-extrabold text-neutral-800 truncate">
            新建技能{metaRef.current.draftId}
          </span>
          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">
            草稿待发布
          </span>
        </div>

        <div className="flex-1 flex justify-center">
          <div className="inline-flex rounded-md border border-neutral-200 bg-neutral-100/40 p-0.5">
            <button
              type="button"
              onClick={() => setMode('code')}
              className={cn(
                'h-7 px-3 rounded text-[11px] font-semibold cursor-pointer',
                mode === 'code' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500',
              )}
            >
              代码模式
            </button>
            <button
              type="button"
              onClick={() => {
                if (!draft) {
                  showToast?.('请先生成技能后再预览调试');
                  return;
                }
                setMode('preview');
              }}
              className={cn(
                'h-7 px-3 rounded text-[11px] font-semibold cursor-pointer',
                mode === 'preview' ? 'bg-white text-neutral-800 shadow-sm' : 'text-neutral-500',
              )}
            >
              预览调试
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" className={cn(BTN_SOFT, 'h-7')} onClick={() => showToast?.('原型：导入替换')}>
            <Upload size={12} />
            导入替换
          </button>
          <button type="button" className={cn(BTN_SOFT, 'h-7')} onClick={() => showToast?.('原型：历史记录')}>
            <Clock size={12} />
            历史记录
          </button>
          <button type="button" className={cn(BTN_INK, 'h-7 px-3')} onClick={handlePublish}>
            发布
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        {/* Left: NL + summary */}
        <aside className="w-[320px] shrink-0 border-r border-neutral-200 bg-white flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3">
            {leftMsgs.map((m) => {
              if (m.role === 'tip') {
                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-neutral-200 bg-neutral-100/30 px-3 py-2.5 text-[11px] text-neutral-500 leading-relaxed"
                  >
                    推荐基于接口文档、代码包、GitHub 仓库或 MCP 插件生成 Skill；也可直接用自然语言描述业务能力。
                  </div>
                );
              }
              if (m.role === 'user') {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[92%] rounded-lg bg-neutral-800 text-white px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap">
                      {m.text}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className={cn(PANEL, 'p-3 space-y-2 shadow-none')}>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 size={13} />
                    运行成功
                  </div>
                  <div className="space-y-2 text-[11px] leading-relaxed">
                    <p>
                      <span className="text-neutral-500">技能名称</span>
                      <br />
                      <span className="font-mono font-semibold text-neutral-800">{m.draft.skillCode}</span>
                    </p>
                    <p>
                      <span className="text-neutral-500">用途概述</span>
                      <br />
                      <span className="text-neutral-800">{m.draft.purpose}</span>
                    </p>
                    <div>
                      <span className="text-neutral-500">核心能力</span>
                      <ul className="mt-1 list-disc pl-4 space-y-0.5 text-neutral-800">
                        {m.draft.capabilities.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-neutral-500">生成的文件</span>
                      <ul className="mt-1 space-y-1 text-neutral-800">
                        {m.draft.files.map((f) => (
                          <li key={f.path}>
                            <code className="text-[10px] bg-neutral-100 px-1 py-0.5 rounded">{f.path}</code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
            {generating ? (
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 px-1">
                <Loader2 size={13} />
                正在解析需求并生成技能包…
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-neutral-200 p-3 space-y-2 bg-white">
            <div className="flex gap-1.5">
              <button
                type="button"
                className={cn(BTN_SOFT, 'h-6 text-[10px]')}
                onClick={() => showToast?.('原型：可粘贴接口文档生成')}
              >
                接口文档
              </button>
              <button
                type="button"
                className={cn(BTN_SOFT, 'h-6 text-[10px]')}
                onClick={() => showToast?.('原型：可接入 MCP 插件')}
              >
                MCP插件
              </button>
            </div>
            <div className={cn(PANEL, 'flex items-end gap-2 p-2 shadow-none')}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    runGenerate(prompt);
                  }
                }}
                rows={2}
                placeholder="请输入你的需求"
                className="flex-1 resize-none bg-transparent text-[11px] outline-none leading-relaxed placeholder:text-neutral-500 min-h-[44px]"
              />
              <button
                type="button"
                disabled={!prompt.trim() || generating}
                onClick={() => runGenerate(prompt)}
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
                  prompt.trim() && !generating
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-neutral-100 text-neutral-500',
                )}
                title="生成"
              >
                <Sparkles size={13} />
              </button>
            </div>
          </div>
        </aside>

        {mode === 'code' ? (
          <>
            {/* File tree */}
            <aside className="w-[200px] shrink-0 border-r border-neutral-200 bg-white flex flex-col min-h-0">
              <div className="px-3 py-2 border-b border-neutral-200 text-[11px] font-bold text-neutral-800">
                文件目录
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
                {!draft ? (
                  <p className="text-[11px] text-neutral-500 px-1 py-2">
                    生成技能后将在此展示文件树
                  </p>
                ) : (
                  tree.map((n) => (
                    <TreeNode
                      key={n.kind === 'file' ? n.path : `root-${n.name}`}
                      node={n}
                      depth={0}
                      activePath={activePath}
                      onSelect={setActivePath}
                    />
                  ))
                )}
              </div>
            </aside>

            {/* Editor */}
            <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-white">
              <div className="shrink-0 h-9 px-3 border-b border-neutral-200 flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-500 truncate">
                  {activePath || '未选择文件'}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                {!draft || !activePath ? (
                  <div className="h-full flex items-center justify-center text-[12px] text-neutral-500 px-6 text-center">
                    在左侧描述需求并生成技能，即可在此编辑 SKILL.md 与参考文件
                  </div>
                ) : (
                  <textarea
                    value={activeContent}
                    onChange={(e) =>
                      setFileEdits((prev) => ({ ...prev, [activePath]: e.target.value }))
                    }
                    className="w-full h-full resize-none p-4 font-mono text-[11px] leading-relaxed outline-none bg-white text-neutral-800"
                    spellCheck={false}
                  />
                )}
              </div>
            </section>
          </>
        ) : (
          /* 预览调试 = 自然语言对话框 */
          <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#F7F7F8]">
            <div className="shrink-0 h-9 px-4 border-b border-neutral-200 bg-white/80 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-800">自然语言对话调试</span>
              <span className="text-[10px] text-neutral-500">
                用对话试跑技能 · 可随时追问
              </span>
            </div>

            <div
              ref={previewScrollRef}
              className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3"
            >
              {previewMsgs.map((m) => {
                if (m.role === 'system') {
                  return (
                    <p key={m.id} className="text-[11px] text-neutral-500 text-center py-0.5">
                      {m.text}
                    </p>
                  );
                }
                if (m.role === 'user') {
                  return (
                    <div key={m.id} className="flex justify-end gap-2.5">
                      <div className="max-w-[78%] rounded-[13px] rounded-br-md bg-neutral-800 text-white px-3.5 py-2.5 text-[12px] whitespace-pre-wrap leading-relaxed">
                        {m.text}
                      </div>
                      <div className="h-7 w-7 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-neutral-500 mt-0.5">
                        你
                      </div>
                    </div>
                  );
                }
                if (m.role === 'form') {
                  return (
                    <div key={m.id} className="flex items-start gap-2.5 max-w-[92%]">
                      <div className="h-7 w-7 rounded-full bg-neutral-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles size={13} />
                      </div>
                      <div className={cn(PANEL, 'flex-1 p-4 space-y-3 shadow-none')}>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-[13px] font-bold text-neutral-800">{m.title}</h3>
                          <span className="text-[10px] text-neutral-500 tabular-nums">
                            {m.step}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">{m.hint}</p>
                        <textarea
                          value={formValue}
                          onChange={(e) => setFormValue(e.target.value)}
                          rows={6}
                          placeholder={m.placeholder}
                          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-[12px] outline-none focus:ring-2 focus:ring-ring/30 leading-relaxed"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="text-[11px] text-neutral-500 hover:text-neutral-800 underline-offset-2 hover:underline cursor-pointer"
                            onClick={() => setFormValue(SAMPLE_DIALOGUE)}
                          >
                            填入示例对话
                          </button>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={BTN_SOFT}
                              onClick={() =>
                                setPreviewMsgs((prev) => prev.filter((x) => x.id !== m.id))
                              }
                            >
                              跳过
                            </button>
                            <button
                              type="button"
                              className={cn(BTN_INK, !formValue.trim() && 'opacity-50')}
                              disabled={!formValue.trim() || previewThinking}
                              onClick={submitFormStep}
                            >
                              下一步
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return <PreviewAssistantBubble key={m.id} msg={m} />;
              })}

              {previewThinking ? (
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 px-1">
                  <Loader2 size={13} />
                  {deepThink ? '深度思考中…' : '正在回复…'}
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-neutral-200 bg-white p-3 space-y-2">
              <p className="text-[10px] text-neutral-500 px-0.5">
                自然语言对话框 — 直接描述测试内容或追问技能表现
              </p>
              <div
                className={cn(
                  PANEL,
                  'flex flex-col gap-2 p-2.5 shadow-none focus-within:ring-2 focus-within:ring-ring/30',
                )}
              >
                <textarea
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handlePreviewSend();
                    }
                  }}
                  rows={3}
                  placeholder="请输入你的需求，例如：帮我质检下面这段客服对话…"
                  className="w-full resize-none bg-transparent text-[12px] outline-none leading-relaxed placeholder:text-neutral-500 min-h-[64px] px-1 pt-1"
                />
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <button
                    type="button"
                    onClick={() => setDeepThink((v) => !v)}
                    className={cn(
                      'h-7 px-2.5 rounded-md text-[10px] font-semibold border cursor-pointer inline-flex items-center gap-1',
                      deepThink
                        ? 'border-neutral-800 bg-neutral-800 text-white'
                        : 'border-neutral-200 text-neutral-500 hover:text-neutral-800',
                    )}
                  >
                    <ChevronDown size={11} />
                    深度思考
                  </button>
                  <button
                    type="button"
                    onClick={handlePreviewSend}
                    disabled={!previewInput.trim() || previewThinking}
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer',
                      previewInput.trim() && !previewThinking
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-neutral-100 text-neutral-500',
                    )}
                    title="发送"
                  >
                    <Sparkles size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
