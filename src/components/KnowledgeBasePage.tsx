/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Trash2, Upload, FileUp, Sparkles, HelpCircle, Check, Circle, Pencil } from '@/lib/icons';
import { SegmentedTabs } from './common/SegmentedTabs';
import { PageHeader } from './common/PageHeader';
import { Modal } from './common/Modal';
import { CardIcon } from './common/CardIcon';
import { ListPagination, LIST_PAGE_SIZE, paginateItems } from './common/ListPagination';
import { PAGE, CARD, CARD_HOVER, PANEL, BTN_INK, BTN_SOFT, FIELD, LABEL, SEARCH_FIELD } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { pickMockLatencyMs } from '@/lib/mockLatency';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';

const TRAINING_TABS = [
  { tab: 'kb', label: '员工知识' },
  { tab: 'skills', label: '员工技能' },
  { tab: 'abTest', label: '员工比拼' },
];

export const KnowledgeBasePage: React.FC = () => {
  const { knowledgeBases, createKnowledgeBase, updateKnowledgeBase, deleteKnowledgeBase, focusKnowledgeBaseId, setFocusKnowledgeBaseId, showToast } = useApp();
  const [search, setSearch] = useState('');
  const listBusy = useMockLatency('kb-cards', 'pageList');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [categoryTags, setCategoryTags] = useState<Array<'professional' | 'basic'>>(['professional']);
  const [chunkMethod, setChunkMethod] = useState('general');
  const [embeddingModel, setEmbeddingModel] = useState('Qwen3-Embedding-8B');
  const [isCreating, setIsCreating] = useState(false);
  const [renamingKbId, setRenamingKbId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [page, setPage] = useState(1);

  // Drag and drop states for file uploading inside selected KB
  const [activeKBId, setActiveKBId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedMsgs, setUploadedMsgs] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusKnowledgeBaseId) {
      setActiveKBId(focusKnowledgeBaseId);
      setUploadedMsgs(null);
      setFocusKnowledgeBaseId(null);
    }
  }, [focusKnowledgeBaseId, setFocusKnowledgeBaseId]);

  const filtered = knowledgeBases.filter(k =>
    k.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  const pagedFiltered = paginateItems(filtered, page, LIST_PAGE_SIZE);

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

  const handleCreate = () => {
    if (!newName.trim()) return;
    createKnowledgeBase(newName.trim().slice(0, 30));
    resetCreateForm();
    setIsCreating(false);
  };

  const closeCreateModal = () => {
    setIsCreating(false);
    resetCreateForm();
  };

  const openRenameModal = (kbId: string, currentName: string) => {
    setRenamingKbId(kbId);
    setRenameName(currentName);
  };

  const closeRenameModal = () => {
    setRenamingKbId(null);
    setRenameName('');
  };

  const handleRename = () => {
    if (!renamingKbId || !renameName.trim()) return;
    updateKnowledgeBase(renamingKbId, { name: renameName.trim().slice(0, 30) });
    showToast('知识库已重命名');
    closeRenameModal();
  };

  // Drag-and-drop logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files[0]);
    }
  };

  const handleFiles = (file: File) => {
    if (!activeKBId) return;
    setUploadedMsgs(`正在解析文件：\n- 文件名: ${file.name}\n- 大小: ${(file.size/1024).toFixed(1)} KB`);

    setTimeout(() => {
      // Simulate success, adding document to the active KB
      knowledgeBases.forEach(kb => {
        if (kb.id === activeKBId) {
          kb.docCount += 1;
          kb.wordCount += Math.floor(2500 + Math.random() * 5000);
          kb.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
        }
      });
      setUploadedMsgs(`解析完成，文件已加入知识库。`);
      setTimeout(() => setUploadedMsgs(null), 3000);
    }, pickMockLatencyMs('upload'));
  };

  return (
    <div className={PAGE}>
      <SegmentedTabs items={TRAINING_TABS} />

      <PageHeader
        title="员工知识"
      >
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="搜索知识库名..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(SEARCH_FIELD, 'pl-9 pr-4')}
          />
        </div>

        <button onClick={() => setIsCreating(true)} className={BTN_INK}>
          <Plus size={14} />
          <span>创建新知识库</span>
        </button>
      </PageHeader>

      {/* Grid List of Knowledge Bases */}
      <ContentBusy busy={listBusy} size="panel" minHeight={240}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {pagedFiltered.map(kb => (
          <div
            key={kb.id}
            className={`${CARD} ${CARD_HOVER} p-4 flex flex-col justify-between group ${
              activeKBId === kb.id ? 'border-neutral-900/30 shadow-[0_2px_10px_rgba(31,35,41,0.06)]' : ''
            }`}
          >
            <div>
              {/* Brand icon and name */}
              <div className="flex items-center justify-between mb-4">
                <CardIcon seed={kb.id} size="md">{kb.firstChar}</CardIcon>

                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openRenameModal(kb.id, kb.name)}
                    className="p-1 text-neutral-400 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
                    title="重命名"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("删除知识库将导致所有绑定它的数字员工丧失对应的检索能力，确定吗？")) {
                        deleteKnowledgeBase(kb.id);
                        if (activeKBId === kb.id) setActiveKBId(null);
                      }
                    }}
                    className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                    title="删除知识库"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight line-clamp-2 min-h-[40px] leading-relaxed">
                {kb.name}
              </h3>

              {/* Counts */}
              <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-100 pt-3">
                <span>包含文档数:</span>
                <span className="font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200 scale-95">
                  {kb.docCount} 个文件
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                <span>总字符数:</span>
                <span className="font-mono font-medium text-neutral-600 text-[11px]">
                  {kb.wordCount.toLocaleString()} 词
                </span>
              </div>
            </div>

            {/* Actions: Direct drop / file loading */}
            <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-2">
              <button
                onClick={() => {
                  setActiveKBId(kb.id);
                  setUploadedMsgs(null);
                }}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 text-[11px] font-bold py-1.5 rounded-[7px] flex items-center justify-center gap-1 cursor-pointer transition active:scale-[0.98]"
              >
                <Upload size={12} />
                <span>上传新文档</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <ListPagination
        total={filtered.length}
        page={page}
        onPageChange={setPage}
        className="mt-4 pt-3 border-t border-neutral-200"
      />
      </ContentBusy>

      {/* DRAG AND DROP FILE UPLOAD AREA (If a KB card upload triggers) */}
      {activeKBId && (
        <div className={`${PANEL} mt-8 p-6`}>
          <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="font-extrabold text-neutral-900 text-sm flex items-center gap-1.5">
                <Sparkles size={16} className="text-neutral-800" />
                <span>上传文件到：{knowledgeBases.find(k => k.id === activeKBId)?.name}</span>
              </h3>
            </div>

            <button
              onClick={() => setActiveKBId(null)}
              className="text-neutral-400 hover:text-neutral-700 text-xs font-bold"
            >
              关闭
            </button>
          </div>

          {/* DRAG BOX AREA (Adhering to Drag-and-upload Guidelines) */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-[13px] p-8 text-center flex flex-col items-center justify-center transition-all ${
              dragActive
                ? 'border-neutral-900 bg-neutral-100/60'
                : 'border-neutral-300 bg-white hover:bg-neutral-100/50 hover:border-neutral-400'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".txt,.pdf,.docx,.doc,.md"
            />

            <FileUp size={36} className={`mb-3 ${dragActive ? 'text-neutral-900 animate-bounce' : 'text-neutral-400'}`} />

            <span className="text-xs font-bold text-neutral-700">
              {dragActive ? "松手开始上传！" : "拖动文件到此区域，或点击此处选择本地文件"}
            </span>
            <span className="text-[10px] text-neutral-400 mt-1">支持最大 50MB 纯文本/PDF</span>
          </div>

          {/* Feedback logs */}
          {uploadedMsgs && (
            <div className="mt-4 p-3 bg-ink font-mono text-[11px] text-emerald-400 rounded-[13px] whitespace-pre-line border border-neutral-800 leading-relaxed">
              {uploadedMsgs}
            </div>
          )}
        </div>
      )}

      {/* CREATE KB MODAL */}
      <Modal
        open={isCreating}
        onClose={closeCreateModal}
        title="创建知识库"
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" onClick={closeCreateModal} className={BTN_SOFT}>取消</button>
            <button type="button" onClick={handleCreate} disabled={!newName.trim()} className={BTN_INK}>确定</button>
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
                    <HelpCircle size={12} className="text-neutral-500 shrink-0" title={tag.desc} />
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

      <Modal
        open={renamingKbId !== null}
        onClose={closeRenameModal}
        title="重命名知识库"
        maxWidth="max-w-sm"
        footer={
          <>
            <button type="button" onClick={closeRenameModal} className={BTN_SOFT}>取消</button>
            <button type="button" onClick={handleRename} disabled={!renameName.trim()} className={BTN_INK}>确定</button>
          </>
        }
      >
        <div>
          <label className={LABEL}>
            知识库名称 <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="请输入知识库名称"
              value={renameName}
              maxLength={30}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameName.trim()) handleRename();
              }}
              className={FIELD}
              autoFocus
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500">
              {renameName.length}/30
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
