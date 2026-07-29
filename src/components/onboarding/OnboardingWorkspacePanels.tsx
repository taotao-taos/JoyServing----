/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 岗前工作台 — 员工知识（列表 + 内嵌单库工作台）
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  BarChart3,
  Globe2,
  Link2,
  MessageSquare,
  Check,
  ChevronRight,
  ChevronDown,
  Plus,
  Upload,
  FileUp,
  Sparkles,
  Circle,
  HelpCircle,
  Cpu,
  Trash2,
} from '@/lib/icons';
import type { HiredAgent, KnowledgeBase, ChatSession, Skill } from '../../types';
import { PANEL, BTN_INK, BTN_OUTLINE, BTN_SOFT, FIELD, LABEL } from '@/lib/ui';
import { CardIcon } from '../common/CardIcon';
import { Modal } from '../common/Modal';
import { ListPagination, LIST_PAGE_SIZE, paginateItems } from '../common/ListPagination';
import { KnowledgeBaseWorkspaceModal } from '../knowledge/KnowledgeBaseWorkspaceModal';
import { ResourceBindPickerModal } from './ResourceBindPickerModal';
import { HoverActionMenu } from '../common/HoverActionMenu';
import { UploadLoadingPanel } from '../common/LoadingSkeletons';
import { SkillCreateWorkspace } from '../skills/SkillCreateWorkspace';
import { EMPLOYEE_RESOURCE_TERMS, KB_PAGE_COPY, SEARCH_COPY } from '@/lib/platformTerminology';
import { cn } from '@/lib/utils';
import { pickMockLatencyMs } from '@/lib/mockLatency';

export const OnboardingKnowledgePanel: React.FC<{
  agent: HiredAgent;
  knowledgeBases: KnowledgeBase[];
  createKnowledgeBase: (name: string) => KnowledgeBase;
  updateHiredAgent: (id: string, updates: Partial<HiredAgent>) => void;
  updateKnowledgeBase: (id: string, updates: Partial<KnowledgeBase>) => void;
  showToast: (message: string) => void;
  initialSelectedKbId?: string | null;
  onClearInitialSelect?: () => void;
  initialOpenCreate?: boolean;
  onClearInitialCreate?: () => void;
}> = ({
  agent,
  knowledgeBases,
  createKnowledgeBase,
  updateHiredAgent,
  updateKnowledgeBase,
  showToast,
  initialSelectedKbId,
  onClearInitialSelect,
  initialOpenCreate,
  onClearInitialCreate,
}) => {
  const bound = knowledgeBases.filter((kb) => agent.knowledgeBases.includes(kb.id));
  const [page, setPage] = useState(1);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [categoryTags, setCategoryTags] = useState<Array<'professional' | 'basic'>>(['professional']);
  const [chunkMethod, setChunkMethod] = useState('general');
  const [embeddingModel, setEmbeddingModel] = useState('Qwen3-Embedding-8B');
  const [dragActive, setDragActive] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bindableKbs = useMemo(
    () => knowledgeBases.filter((kb) => !agent.knowledgeBases.includes(kb.id)),
    [knowledgeBases, agent.knowledgeBases],
  );

  const resetCreateForm = () => {
    setNewName('');
    setNewDesc('');
    setCategoryTags(['professional']);
    setChunkMethod('general');
    setEmbeddingModel('Qwen3-Embedding-8B');
  };

  const toggleCategoryTag = (tag: 'professional' | 'basic') => {
    setCategoryTags((prev) =>
      prev.includes(tag) ? (prev.length > 1 ? prev.filter((t) => t !== tag) : prev) : [...prev, tag],
    );
  };

  const closeCreateModal = () => {
    setIsCreating(false);
    resetCreateForm();
  };

  const handleCreate = () => {
    const name = newName.trim().slice(0, 30);
    if (!name) return;
    const kb = createKnowledgeBase(name);
    updateHiredAgent(agent.id, {
      knowledgeBases: [...(agent.knowledgeBases || []), kb.id],
    });
    closeCreateModal();
    setSelectedKbId(kb.id);
    showToast(`已创建员工知识「${kb.name}」`);
  };

  const handleQuickUpload = (file: File) => {
    const baseName = (file.name.replace(/\.[^.]+$/, '') || file.name).slice(0, 30);
    setUploadingName(file.name);
    window.setTimeout(() => {
      const kb = createKnowledgeBase(baseName);
      updateHiredAgent(agent.id, {
        knowledgeBases: [...(agent.knowledgeBases || []), kb.id],
      });
      updateKnowledgeBase(kb.id, {
        docCount: 1,
        wordCount: Math.floor(2500 + Math.random() * 5000),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });
      setUploadingName(null);
      setSelectedKbId(kb.id);
      showToast(`已根据「${file.name}」快捷创建「${kb.name}」`);
    }, pickMockLatencyMs('upload'));
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleQuickUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleQuickUpload(file);
  };

  useEffect(() => {
    setPage(1);
    setSelectedKbId(null);
  }, [agent.id]);

  useEffect(() => {
    if (initialSelectedKbId && agent.knowledgeBases.includes(initialSelectedKbId)) {
      setSelectedKbId(initialSelectedKbId);
      onClearInitialSelect?.();
    }
  }, [initialSelectedKbId, agent.id, agent.knowledgeBases, onClearInitialSelect]);

  useEffect(() => {
    if (initialOpenCreate) {
      setIsCreating(true);
      onClearInitialCreate?.();
    }
  }, [initialOpenCreate, onClearInitialCreate]);

  const selectedKb = selectedKbId ? knowledgeBases.find((k) => k.id === selectedKbId) : null;

  const handleBindConfirm = (ids: string[]) => {
    if (ids.length === 0) return;
    updateHiredAgent(agent.id, {
      knowledgeBases: [...(agent.knowledgeBases || []), ...ids],
    });
    showToast(`已配备 ${ids.length} 份知识库`);
  };

  const pagedBound = paginateItems(bound, page, LIST_PAGE_SIZE);

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-neutral-900">员工知识</h2>
            <p className="text-[11px] text-neutral-500 mt-1">
              {bound.length === 0
                ? `为「${agent.name}」创建知识库并上传文档，即可用于回答检索`
                : `「${agent.name}」已配备 ${bound.length} 份员工知识，可继续上传或进入管理`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {bindableKbs.length > 0 && (
              <button type="button" onClick={() => setBindModalOpen(true)} className={BTN_OUTLINE}>
                <Link2 size={14} />
                <span>{EMPLOYEE_RESOURCE_TERMS.pickKb}</span>
              </button>
            )}
            <button type="button" onClick={() => setIsCreating(true)} className={BTN_INK}>
              <Plus size={14} />
              <span>{EMPLOYEE_RESOURCE_TERMS.createKnowledgeBase}</span>
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.txt,.doc,.docx,.xlsx,.md"
          onChange={handleFilePick}
        />

        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragActive(false);
          }}
          onDrop={handleDrop}
          onClick={() => !uploadingName && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !uploadingName && fileInputRef.current?.click()}
          className={cn(
            PANEL,
            'p-8 text-center cursor-pointer border-2 border-dashed transition',
            dragActive
              ? 'border-sky-300 bg-sky-50/50'
              : 'border-neutral-200 hover:border-sky-200 hover:bg-sky-50/20',
            uploadingName && 'pointer-events-none opacity-80',
          )}
        >
          {uploadingName ? (
            <UploadLoadingPanel title="正在上传并创建知识库…" fileName={uploadingName} />
          ) : (
            <>
              <Upload size={32} className={cn('mx-auto mb-3', dragActive ? 'text-sky-500' : 'text-neutral-500')} />
              <p className="text-sm font-semibold text-neutral-800">
                {dragActive ? '松开即可上传' : '拖拽文件到此处，或点击上传'}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1.5">
                上传后自动以文件名快捷创建知识库并配备给该员工
              </p>
              <p className="text-[10px] text-neutral-500/80 mt-1">支持 PDF、Word、Excel、Markdown 等格式</p>
            </>
          )}
        </div>

        {bound.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-neutral-700 px-0.5">
              {EMPLOYEE_RESOURCE_TERMS.configuredKbList} ({bound.length})
            </p>
            {pagedBound.map((kb) => (
              <button
                key={kb.id}
                type="button"
                onClick={() => setSelectedKbId(kb.id)}
                className={cn(
                  PANEL,
                  'w-full p-4 flex items-center gap-3 text-left hover:ring-foreground/15 transition cursor-pointer group',
                )}
              >
                <CardIcon seed={kb.id} size="sm">
                  {kb.firstChar}
                </CardIcon>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-900 truncate">{kb.name}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {kb.docCount} 个文件 · {kb.wordCount.toLocaleString()} 词
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-neutral-500 group-hover:text-neutral-800 shrink-0 transition"
                />
              </button>
            ))}
            <ListPagination total={bound.length} page={page} onPageChange={setPage} />
          </div>
        )}

        {bound.length === 0 && (
          <div className={cn(PANEL, 'p-4 flex items-start gap-3')}>
            <BookOpen size={18} className="text-neutral-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-neutral-800">{KB_PAGE_COPY.emptyList}</p>
              <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                可直接上传文件快捷创建，或点击「新建知识库」填写名称与解析配置；也可「{EMPLOYEE_RESOURCE_TERMS.pickKb}」。
              </p>
            </div>
          </div>
        )}

        <Modal
          open={isCreating}
          onClose={closeCreateModal}
          title="创建知识库"
          maxWidth="max-w-md"
          footer={
            <>
              <button type="button" onClick={closeCreateModal} className={BTN_SOFT}>
                取消
              </button>
              <button type="button" onClick={handleCreate} disabled={!newName.trim()} className={BTN_INK}>
                确定
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
                  value={newName}
                  maxLength={30}
                  onChange={(e) => setNewName(e.target.value)}
                  className={FIELD}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500">
                  {newName.length}/30
                </span>
              </div>
            </div>

            <div>
              <label className={LABEL}>描述</label>
              <div className="relative">
                <textarea
                  placeholder="请输入知识库描述"
                  value={newDesc}
                  maxLength={200}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className={cn(FIELD, 'min-h-[72px] resize-none pr-12')}
                />
                <span className="absolute right-3 bottom-2 text-[10px] text-neutral-500">
                  {newDesc.length}/200
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
                  const selected = categoryTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleCategoryTag(tag.id)}
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
                value={chunkMethod}
                onChange={(e) => setChunkMethod(e.target.value)}
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
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
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

      </div>
      </div>

      <ResourceBindPickerModal
        open={bindModalOpen}
        onClose={() => setBindModalOpen(false)}
        title={EMPLOYEE_RESOURCE_TERMS.pickKbModal}
        icon={<BookOpen size={18} />}
        searchPlaceholder="搜索知识库名称…"
        confirmLabel={EMPLOYEE_RESOURCE_TERMS.confirmAssign}
        emptyHint={
          bindableKbs.length === 0
            ? '团队暂无可指定的知识库，请先在「员工知识」新建'
            : SEARCH_COPY.noKb
        }
        items={bindableKbs.map((kb) => ({
          id: kb.id,
          name: kb.name,
          badge: kb.firstChar,
          meta: `${kb.docCount} 个文件 · ${kb.wordCount.toLocaleString()} 词`,
        }))}
        onConfirm={handleBindConfirm}
      />

      {selectedKb && (
        <KnowledgeBaseWorkspaceModal
          open
          kb={selectedKb}
          agentName={agent.name}
          onBack={() => setSelectedKbId(null)}
          onUpdateKb={updateKnowledgeBase}
          showToast={showToast}
        />
      )}
    </>
  );
};

export const OnboardingSkillsPanel: React.FC<{
  agent: HiredAgent;
  skills: Skill[];
  createSkill: (name: string, description: string, type: 'subscribed' | 'mine' | 'market') => Skill;
  updateHiredAgent: (id: string, updates: Partial<HiredAgent>) => void;
  showToast: (message: string) => void;
  onSkillBound?: () => void;
  initialOpenCreate?: boolean;
  onClearInitialCreate?: () => void;
}> = ({ agent, skills, createSkill, updateHiredAgent, showToast, onSkillBound, initialOpenCreate, onClearInitialCreate }) => {
  const bound = skills.filter((sk) => agent.skills.includes(sk.id));
  const [page, setPage] = useState(1);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<null | 'smart'>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bindableSkills = useMemo(
    () => skills.filter((sk) => !agent.skills.includes(sk.id)),
    [skills, agent.skills],
  );

  const handleCreateSkill = ({ name, description }: { name: string; description: string }) => {
    const skill = createSkill(name, description, 'mine');
    updateHiredAgent(agent.id, {
      skills: [...(agent.skills || []), skill.id],
    });
    setCreateMode(null);
    onSkillBound?.();
    showToast(`已创建并配备技能「${skill.name}」`);
  };

  useEffect(() => {
    setPage(1);
  }, [agent.id]);

  useEffect(() => {
    if (initialOpenCreate) {
      setCreateMode('smart');
      onClearInitialCreate?.();
    }
  }, [initialOpenCreate, onClearInitialCreate]);

  const handleBindConfirm = (ids: string[]) => {
    if (ids.length === 0) return;
    updateHiredAgent(agent.id, {
      skills: [...(agent.skills || []), ...ids],
    });
    onSkillBound?.();
    showToast(`已配备 ${ids.length} 项技能`);
  };

  const handleQuickUpload = (file: File) => {
    const skillName = (file.name.replace(/\.[^.]+$/, '') || file.name).slice(0, 30);
    window.setTimeout(() => {
      const skill = createSkill(skillName, `从「${file.name}」导入的工作流技能包。`, 'mine');
      updateHiredAgent(agent.id, {
        skills: [...(agent.skills || []), skill.id],
      });
      setCreateMode(null);
      onSkillBound?.();
      showToast(`已根据「${file.name}」创建技能「${skill.name}」`);
    }, 3500);
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleQuickUpload(file);
    e.target.value = '';
  };

  const pagedBound = paginateItems(bound, page, LIST_PAGE_SIZE);

  if (createMode === 'smart') {
    return (
      <>
        <SkillCreateWorkspace
          agentName={agent.name}
          onBack={() => setCreateMode(null)}
          onSubmit={handleCreateSkill}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".json,.yaml,.yml,.zip,.txt"
          onChange={handleFilePick}
        />
        <ResourceBindPickerModal
          open={bindModalOpen}
          onClose={() => setBindModalOpen(false)}
          title={EMPLOYEE_RESOURCE_TERMS.pickSkillModal}
          icon={<Cpu size={18} />}
          searchPlaceholder="搜索技能名称…"
          confirmLabel={EMPLOYEE_RESOURCE_TERMS.confirmAssign}
          emptyHint={
            bindableSkills.length === 0
              ? '团队暂无可指定的技能，请先在「员工技能」新建'
              : SEARCH_COPY.noSkill
          }
          items={bindableSkills.map((sk) => ({
            id: sk.id,
            name: sk.name,
            description: sk.description,
            meta: sk.author ? `作者 · ${sk.author}` : undefined,
          }))}
          onConfirm={handleBindConfirm}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-neutral-900">员工技能</h2>
              <p className="text-[11px] text-neutral-500 mt-1">
                {bound.length === 0
                  ? `为「${agent.name}」新建或选用技能，赋能流程与工具调用`
                  : `「${agent.name}」已配备 ${bound.length} 项员工技能，可继续新建或选用技能`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {bindableSkills.length > 0 && (
                <button type="button" onClick={() => setBindModalOpen(true)} className={BTN_OUTLINE}>
                  <Link2 size={14} />
                  <span>{EMPLOYEE_RESOURCE_TERMS.pickSkill}</span>
                </button>
              )}
              <HoverActionMenu
                align="right"
                trigger={
                  <button type="button" className={cn(BTN_INK, 'gap-0.5')}>
                    <Plus size={14} />
                    <span>{EMPLOYEE_RESOURCE_TERMS.createSkill}</span>
                    <ChevronDown size={12} className="opacity-80" />
                  </button>
                }
                items={[
                  {
                    id: 'upload',
                    label: '本地上传',
                    description: '上传 JSON、YAML、ZIP 技能包',
                    icon: <FileUp size={14} />,
                    onSelect: () => {
                      setCreateMode(null);
                      fileInputRef.current?.click();
                    },
                  },
                  {
                    id: 'smart',
                    label: '智能创建',
                    description: '用自然语言描述技能能力',
                    icon: <Sparkles size={14} />,
                    onSelect: () => setCreateMode('smart'),
                  },
                ]}
              />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".json,.yaml,.yml,.zip,.txt"
            onChange={handleFilePick}
          />

          {bound.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-neutral-700 px-0.5">
                {EMPLOYEE_RESOURCE_TERMS.configuredSkillList} ({bound.length})
              </p>
              {pagedBound.map((sk) => (
                <div
                  key={sk.id}
                  className={cn(PANEL, 'p-4 flex items-start gap-3')}
                >
                  <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    <Cpu size={16} className="text-neutral-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-neutral-900 truncate">{sk.name}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2 leading-snug">
                      {sk.description}
                    </p>
                    {sk.author ? (
                      <p className="text-[9px] text-neutral-500/80 mt-1">作者 · {sk.author}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateHiredAgent(agent.id, {
                        skills: agent.skills.filter((id) => id !== sk.id),
                      });
                      showToast(`已移除「${sk.name}」`);
                    }}
                    className="text-neutral-500 hover:text-destructive p-1 cursor-pointer shrink-0"
                    title={EMPLOYEE_RESOURCE_TERMS.removeAssigned}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <ListPagination total={bound.length} page={page} onPageChange={setPage} />
            </div>
          )}

          {bound.length === 0 && (
            <div className={cn(PANEL, 'p-4 flex items-start gap-3')}>
              <Cpu size={18} className="text-neutral-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-neutral-800">还没有员工技能？</p>
                <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                  点击「{EMPLOYEE_RESOURCE_TERMS.createSkill}」本地上传或智能创建，也可「{EMPLOYEE_RESOURCE_TERMS.pickSkill}」。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ResourceBindPickerModal
        open={bindModalOpen}
        onClose={() => setBindModalOpen(false)}
        title={EMPLOYEE_RESOURCE_TERMS.pickSkillModal}
        icon={<Cpu size={18} />}
        searchPlaceholder="搜索技能名称…"
        confirmLabel={EMPLOYEE_RESOURCE_TERMS.confirmAssign}
        emptyHint={
          bindableSkills.length === 0
            ? '团队暂无可指定的技能，请先在「员工技能」新建'
            : SEARCH_COPY.noSkill
        }
        items={bindableSkills.map((sk) => ({
          id: sk.id,
          name: sk.name,
          description: sk.description,
          meta: sk.author ? `作者 · ${sk.author}` : undefined,
        }))}
        onConfirm={handleBindConfirm}
      />
    </>
  );
};

export const OnboardingDashboardPanel: React.FC<{
  agent: HiredAgent;
  sessions: ChatSession[];
}> = ({ agent, sessions }) => {
  const agentSessions = sessions.filter((s) => s.assignedAgentId === agent.id);
  const active = agentSessions.filter((s) => s.status !== 'completed').length;
  const completed = agentSessions.filter((s) => s.status === 'completed').length;
  const transferred = agentSessions.filter((s) => s.isTransferred).length;
  const auto = agentSessions.filter((s) => s.status === 'auto').length;

  const metrics = [
    { label: '累计接待', value: agentSessions.length, hint: '全部会话' },
    { label: '进行中', value: active, hint: '当前在服' },
    { label: 'AI 托管', value: auto, hint: '自动接待' },
    { label: '已转人工', value: transferred, hint: '升级协同' },
    { label: '已完结', value: completed, hint: '服务完成' },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-neutral-900">员工业绩</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            「{agent.name}」接待表现概览（演示数据，随真实进线更新）
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className={cn(PANEL, 'p-4')}>
              <p className="text-[10px] text-neutral-500 font-medium">{m.label}</p>
              <p className="text-2xl font-extrabold text-neutral-900 mt-1 tabular-nums">{m.value}</p>
              <p className="text-[9px] text-neutral-400 mt-0.5">{m.hint}</p>
            </div>
          ))}
        </div>

        <div className={cn(PANEL, 'p-4')}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-neutral-600" />
            <h3 className="text-xs font-bold text-neutral-800">近期待办</h3>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            上岗后可在「员工业绩看板」查看全站对比；此处仅展示该员工维度的快速摘要。
          </p>
        </div>
      </div>
    </div>
  );
};

const CHANNELS = [
  {
    id: 'web',
    icon: Globe2,
    title: '网页挂件',
    desc: '嵌入官网或 H5 页面，客户点击即可对话',
    status: '可派出',
  },
  {
    id: 'link',
    icon: Link2,
    title: '专属接待链接',
    desc: '生成独立 URL，分享给客户或投放广告',
    status: '可派出',
  },
  {
    id: 'wecom',
    icon: MessageSquare,
    title: '企业微信',
    desc: '接入企微客服号，统一接待外部客户',
    status: '待配置',
  },
] as const;

export const OnboardingChannelsPanel: React.FC<{
  agent: HiredAgent;
  showToast: (msg: string) => void;
}> = ({ agent, showToast }) => {
  const [copied, setCopied] = React.useState(false);
  const demoLink = `https://joysupport.example/chat/${agent.agentId.toLowerCase()}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(demoLink);
      setCopied(true);
      showToast('接待链接已复制');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('复制失败，请手动选择链接');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h2 className="text-sm font-extrabold text-neutral-900">派出渠道</h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            为「{agent.name}」配置客户触达渠道，上岗后即可对外接待
          </p>
        </div>

        <div className={cn(PANEL, 'p-4 space-y-3')}>
          <label className="text-[10px] font-medium text-neutral-500">专属接待链接</label>
          <div className="flex gap-2">
            <input readOnly value={demoLink} className={cn(FIELD, 'flex-1 min-w-0 font-mono text-[11px]')} />
            <button
              type="button"
              onClick={handleCopy}
              className={cn(BTN_OUTLINE, 'shrink-0 whitespace-nowrap px-3 min-w-[52px]')}
            >
              {copied ? (
                <>
                  <Check size={13} className="shrink-0" />
                  <span>已复制</span>
                </>
              ) : (
                '复制'
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {CHANNELS.map((ch) => (
            <div key={ch.id} className={cn(PANEL, 'p-4 flex items-start gap-3')}>
              <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                <ch.icon size={16} className="text-neutral-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-neutral-900">{ch.title}</h3>
                  <span
                    className={cn(
                      'text-[9px] font-semibold px-1.5 py-0.5 rounded-full border',
                      ch.status === '可派出'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100',
                    )}
                  >
                    {ch.status}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">{ch.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => showToast(`「${ch.title}」配置向导即将开放（演示）`)}
                className={BTN_OUTLINE}
              >
                配置
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
