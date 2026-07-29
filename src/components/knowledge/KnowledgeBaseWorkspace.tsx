/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 单库工作台 — 文档 / 基础配置 / 解析配置 / 检索配置
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Circle,
  Cpu,
  Download,
  FileText,
  HelpCircle,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
} from '@/lib/icons';
import type { KnowledgeBase } from '../../types';
import { CardIcon } from '../common/CardIcon';
import { ParsingStatusCell } from '../common/LoadingSkeletons';
import { MatrixLoader } from '../common/MatrixLoader';
import { Modal } from '../common/Modal';
import { BTN_INK, BTN_OUTLINE, BTN_SOFT, FIELD, LABEL, PANEL, SEARCH_FIELD, badgeClass } from '@/lib/ui';
import { KB_PAGE_COPY, EMPLOYEE_RESOURCE_TERMS, SEARCH_COPY } from '@/lib/platformTerminology';
import { cn } from '@/lib/utils';
import { pickMockLatencyMs } from '@/lib/mockLatency';
import { Button } from '@/components/ui/button';

type WorkspaceTab = 'docs' | 'basic' | 'parse' | 'recall';
type DocStatus = 'done' | 'parsing' | 'pending';

interface KbDocument {
  id: string;
  name: string;
  sizeLabel: string;
  segments: number;
  parser: string;
  enabled: boolean;
  uploadedAt: string;
  status: DocStatus;
  parseProgress?: number;
}

interface RecallHit {
  title: string;
  snippet: string;
  score: number;
}

const TAB_ITEMS: { id: WorkspaceTab; label: string; icon: typeof FileText; hint: string }[] = [
  { id: 'docs', label: KB_PAGE_COPY.tabDocs, icon: FileText, hint: KB_PAGE_COPY.docsHint },
  { id: 'basic', label: KB_PAGE_COPY.tabBasic, icon: Sliders, hint: '名称、描述与分类标签' },
  { id: 'parse', label: KB_PAGE_COPY.tabParse, icon: Cpu, hint: '解析策略与嵌入模型' },
  { id: 'recall', label: KB_PAGE_COPY.tabRecall, icon: Search, hint: '调参并验证检索效果' },
];

const DOC_NAME_POOL = [
  '产品说明手册摘录.pdf',
  '常见问题 FAQ.xlsx',
  '理赔流程与材料.docx',
  '费率条款说明.pdf',
  '培训话术汇编.md',
  '监管合规摘要.pdf',
];

const PARSER_LABELS: Record<string, string> = {
  general: '通用解析',
  qa: '问答解析',
  table: '表格结构化',
};

function seedDocuments(kb: KnowledgeBase): KbDocument[] {
  if (kb.docCount <= 0) return [];
  return Array.from({ length: kb.docCount }, (_, i) => {
    const name = DOC_NAME_POOL[(kb.id.length + i) % DOC_NAME_POOL.length];
    const unique = i > 0 ? name.replace(/(\.\w+)$/, `_${i + 1}$1`) : name;
    const status: DocStatus =
      i === 0 && kb.docCount > 2 ? 'parsing' : i === 1 && kb.docCount > 3 ? 'pending' : 'done';
    return {
      id: `${kb.id}_doc_${i}`,
      name: unique,
      sizeLabel: i === 1 && kb.docCount > 3 ? '0 B' : `${(0.5 + (i * 1.7) % 8).toFixed(2)} MB`,
      segments:
        status === 'done'
          ? Math.max(1, Math.floor(kb.wordCount / Math.max(kb.docCount, 1) / 800) + (i % 3))
          : 0,
      parser: '问答解析',
      enabled: status !== 'pending',
      uploadedAt: kb.updatedAt.replace(/-/g, '/'),
      status,
      parseProgress: status === 'parsing' ? 42 : undefined,
    };
  });
}

function getFileExt(name: string): string {
  const match = name.match(/\.([^.]+)$/);
  return match ? match[1].toUpperCase() : 'FILE';
}

function fileExtTone(ext: string): string {
  if (['PDF'].includes(ext)) return 'bg-rose-50 text-rose-600';
  if (['XLSX', 'XLS', 'CSV'].includes(ext)) return 'bg-emerald-50 text-emerald-600';
  if (['DOCX', 'DOC'].includes(ext)) return 'bg-sky-50 text-sky-600';
  if (['MD', 'TXT'].includes(ext)) return 'bg-sky-50 text-sky-600';
  return 'bg-neutral-100 text-neutral-500';
}

function mockRecallHits(query: string, kb: KnowledgeBase): RecallHit[] {
  if (!query.trim()) return [];
  return [
    {
      title: `${kb.name} · 相关段落 A`,
      snippet: `与「${query.slice(0, 24)}」相关的保障范围说明：第三者责任、医疗费用补偿及线上报案流程…`,
      score: 0.89,
    },
    {
      title: `${kb.name} · 相关段落 B`,
      snippet: `费率与加保条款摘要，含门店面积分档、续保优惠与免赔额说明…`,
      score: 0.76,
    },
    {
      title: `${kb.name} · FAQ 匹配`,
      snippet: `常见咨询：理赔材料清单、处理时效 3–5 个工作日、加急通道触发条件…`,
      score: 0.71,
    },
  ];
}

function DocEnableSwitch({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer',
        enabled ? 'bg-sky-500' : 'bg-neutral-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export interface KnowledgeBaseWorkspaceProps {
  kb: KnowledgeBase;
  agentName: string;
  onBack: () => void;
  onUpdateKb: (id: string, updates: Partial<KnowledgeBase>) => void;
  showToast: (message: string) => void;
  /** 弹层模式：顶部统一返回/关闭栏，侧栏不重复返回入口 */
  variant?: 'page' | 'modal';
}

export const KnowledgeBaseWorkspace: React.FC<KnowledgeBaseWorkspaceProps> = ({
  kb,
  agentName,
  onBack,
  onUpdateKb,
  showToast,
  variant = 'page',
}) => {
  const [tab, setTab] = useState<WorkspaceTab>('docs');
  const [documents, setDocuments] = useState<KbDocument[]>(() => seedDocuments(kb));
  const [docSearch, setDocSearch] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuDocId, setOpenMenuDocId] = useState<string | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<KbDocument | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parsingTimers = useRef<Map<string, number>>(new Map());

  const [name, setName] = useState(kb.name);
  const [description, setDescription] = useState('');
  const [categoryTags, setCategoryTags] = useState<Array<'professional' | 'basic'>>(['professional']);
  const [chunkMethod, setChunkMethod] = useState('qa');
  const [embeddingModel, setEmbeddingModel] = useState('Qwen3-Embedding-8B');

  const [similarity, setSimilarity] = useState(0.3);
  const [vectorWeight, setVectorWeight] = useState(0.3);
  const [topN, setTopN] = useState(7);
  const [rerank, setRerank] = useState(false);
  const [debugQuery, setDebugQuery] = useState('');
  const [recallHits, setRecallHits] = useState<RecallHit[]>([]);
  const [recallMs, setRecallMs] = useState<number | null>(null);
  const [recallRunning, setRecallRunning] = useState(false);

  useEffect(() => {
    setName(kb.name);
    const seeded = seedDocuments(kb);
    setDocuments(seeded);
    setSelectedIds(new Set());
    setOpenMenuDocId(null);
    seeded.forEach((doc) => {
      if (doc.status === 'parsing') startParsing(doc.id);
    });
  }, [kb.id, kb.name, kb.docCount, kb.wordCount, kb.updatedAt]);

  useEffect(() => {
    return () => {
      parsingTimers.current.forEach((timer) => window.clearInterval(timer));
      parsingTimers.current.clear();
    };
  }, []);

  const filteredDocs = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.name.toLowerCase().includes(q));
  }, [documents, docSearch]);

  const docStats = useMemo(
    () => ({
      total: documents.length,
      done: documents.filter((d) => d.status === 'done').length,
      parsing: documents.filter((d) => d.status === 'parsing').length,
      enabled: documents.filter((d) => d.enabled).length,
    }),
    [documents],
  );

  const selectedCount = filteredDocs.filter((d) => selectedIds.has(d.id)).length;
  const allFilteredSelected =
    filteredDocs.length > 0 && filteredDocs.every((d) => selectedIds.has(d.id));

  useEffect(() => {
    if (!openMenuDocId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuDocId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openMenuDocId]);

  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const toggleCategoryTag = (tag: 'professional' | 'basic') => {
    setCategoryTags((prev) =>
      prev.includes(tag) ? (prev.length > 1 ? prev.filter((t) => t !== tag) : prev) : [...prev, tag],
    );
  };

  const startParsing = (docId: string) => {
    if (parsingTimers.current.has(docId)) return;

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, status: 'parsing', parseProgress: 0, segments: 0 } : d,
      ),
    );

    let progress = 0;
    const timer = window.setInterval(() => {
      progress += 12 + Math.random() * 18;
      if (progress >= 100) {
        window.clearInterval(timer);
        parsingTimers.current.delete(docId);
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  status: 'done',
                  parseProgress: 100,
                  segments: 8 + Math.floor(Math.random() * 20),
                  enabled: true,
                }
              : d,
          ),
        );
        return;
      }
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId ? { ...d, parseProgress: Math.min(99, Math.floor(progress)) } : d,
        ),
      );
    }, 450);
    parsingTimers.current.set(docId, timer);
  };

  const cancelParsing = (docId: string) => {
    const timer = parsingTimers.current.get(docId);
    if (timer) {
      window.clearInterval(timer);
      parsingTimers.current.delete(docId);
    }
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, status: 'pending', parseProgress: undefined, segments: 0 } : d,
      ),
    );
  };

  const handleUpload = (file: File) => {
    const uploadedAt = new Date().toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, '/');
    const newDoc: KbDocument = {
      id: `${kb.id}_doc_${Date.now()}`,
      name: file.name,
      sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      segments: 0,
      parser: PARSER_LABELS[chunkMethod] ?? '问答解析',
      enabled: true,
      uploadedAt,
      status: 'parsing',
      parseProgress: 0,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    onUpdateKb(kb.id, {
      docCount: kb.docCount + 1,
      wordCount: kb.wordCount + Math.floor(2500 + Math.random() * 5000),
      updatedAt: uploadedAt.replace(/\//g, '-').slice(0, 16),
    });
    showToast(`「${file.name}」已加入解析队列`);
    startParsing(newDoc.id);
  };

  const handleSaveBasic = () => {
    if (!name.trim()) return;
    onUpdateKb(kb.id, { name: name.trim().slice(0, 30) });
    showToast('基础配置已保存');
  };

  const handleSaveParse = () => {
    showToast('解析配置已保存');
  };

  const runRecallDebug = () => {
    if (!debugQuery.trim()) return;
    setRecallRunning(true);
    setRecallHits([]);
    setRecallMs(null);
    window.setTimeout(() => {
      setRecallHits(mockRecallHits(debugQuery, { ...kb, name: name.trim() || kb.name }));
      setRecallMs(pickMockLatencyMs('recall'));
      setRecallRunning(false);
    }, pickMockLatencyMs('recall'));
  };

  const removeDoc = (docId: string) => {
    cancelParsing(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(docId);
      return next;
    });
    onUpdateKb(kb.id, {
      docCount: Math.max(0, kb.docCount - 1),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    });
  };

  const toggleSelect = (docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredDocs.forEach((d) => next.delete(d.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredDocs.forEach((d) => next.add(d.id));
        return next;
      });
    }
  };

  const bulkSetEnabled = (enabled: boolean) => {
    setDocuments((prev) =>
      prev.map((d) => (selectedIds.has(d.id) ? { ...d, enabled } : d)),
    );
    showToast(enabled ? '已批量启用所选文档' : '已批量禁用所选文档');
  };

  const bulkReparse = () => {
    selectedIds.forEach((id) => {
      const doc = documents.find((d) => d.id === id);
      if (doc && doc.status !== 'parsing') startParsing(id);
    });
    showToast('已重新解析所选文档');
  };

  const bulkCancelParse = () => {
    selectedIds.forEach((id) => {
      const doc = documents.find((d) => d.id === id);
      if (doc?.status === 'parsing') cancelParsing(id);
    });
    showToast('已取消所选文档的解析任务');
  };

  const bulkDelete = () => {
    if (!confirm(`确定删除已选的 ${selectedCount} 个文档吗？`)) return;
    selectedIds.forEach((id) => removeDoc(id));
    setSelectedIds(new Set());
    showToast('已删除所选文档');
  };

  const openRename = (doc: KbDocument) => {
    setRenamingDoc(doc);
    setRenameValue(doc.name);
    setOpenMenuDocId(null);
  };

  const commitRename = () => {
    if (!renamingDoc || !renameValue.trim()) return;
    setDocuments((prev) =>
      prev.map((d) => (d.id === renamingDoc.id ? { ...d, name: renameValue.trim() } : d)),
    );
    showToast('文档已重命名');
    setRenamingDoc(null);
    setRenameValue('');
  };

  const renderStatus = (doc: KbDocument) => {
    if (doc.status === 'parsing') {
      return <ParsingStatusCell progress={doc.parseProgress} />;
    }
    if (doc.status === 'pending') {
      return (
        <button
          type="button"
          onClick={() => startParsing(doc.id)}
          className="inline-flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
        >
          <Play size={11} />
          未开始
        </button>
      );
    }
    return <span className={badgeClass('success')}>已完成</span>;
  };

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-white">
      {variant === 'modal' && (
        <div className="shrink-0 h-11 px-3 border-b border-neutral-200 flex items-center gap-2.5 bg-white">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer transition shrink-0"
          >
            <ArrowLeft size={14} />
            返回列表
          </button>
          <span className="h-4 w-px bg-border shrink-0" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CardIcon seed={kb.id} size="sm">
              {kb.firstChar}
            </CardIcon>
            <span className="text-xs font-bold text-neutral-800 truncate" title={kb.name}>
              {kb.name}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
      <aside className={cn('shrink-0 border-r border-neutral-200 bg-white flex flex-col', variant === 'modal' ? 'w-[196px]' : 'w-[212px]')}>
        {variant === 'page' && (
        <button
          type="button"
          onClick={onBack}
          className="mx-3 mt-3 mb-2 flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-neutral-800 cursor-pointer transition"
        >
          <ArrowLeft size={14} />
          返回列表
        </button>
        )}

        <div className={cn(PANEL, 'mx-3 mb-3 p-3', variant === 'modal' && 'mt-3 py-2.5')}>
          {variant === 'page' && (
          <div className="flex items-center gap-2.5">
            <CardIcon seed={kb.id} size="sm">
              {kb.firstChar}
            </CardIcon>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-neutral-500">当前知识库</p>
              <p className="text-[11px] font-bold text-neutral-800 truncate" title={kb.name}>
                {kb.name}
              </p>
            </div>
          </div>
          )}
          <div className={cn('grid grid-cols-2 gap-2 text-center', variant === 'page' && 'mt-2.5 pt-2.5 border-t border-neutral-200')}>
            <div>
              <p className="text-sm font-bold text-neutral-800 tabular-nums">{docStats.total}</p>
              <p className="text-[9px] text-neutral-500">文档</p>
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-800 tabular-nums">{docStats.enabled}</p>
              <p className="text-[9px] text-neutral-500">已启用</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-0.5">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'relative w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition cursor-pointer',
                tab === item.id
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-neutral-500 hover:bg-neutral-100/40 hover:text-neutral-800',
              )}
            >
              {tab === item.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-sky-500" />
              )}
              <item.icon size={14} className="shrink-0" />
              <span className="text-[11px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-neutral-200">
          <p className="text-[9px] text-neutral-500 leading-relaxed">
            由以下员工使用
          </p>
          <p className="text-[10px] font-medium text-neutral-800 truncate mt-0.5" title={agentName}>
            {agentName}
          </p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className={cn(
          'shrink-0 border-b border-neutral-200 flex items-center justify-between gap-4 bg-white/50',
          variant === 'modal' ? 'px-4 py-2.5' : 'px-5 py-3.5',
        )}>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-neutral-900">
              {tab === 'docs' ? '文档列表' : TAB_ITEMS.find((t) => t.id === tab)?.label}
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {tab === 'docs' ? (
                <>
                  共 {docStats.total} 个文档 · {docStats.done} 已完成
                  {docStats.parsing > 0 ? ` · ${docStats.parsing} 解析中` : ''}
                </>
              ) : (
                TAB_ITEMS.find((t) => t.id === tab)?.hint
              )}
            </p>
          </div>
          {tab === 'basic' && (
            <button type="button" onClick={handleSaveBasic} className={BTN_INK}>
              保存
            </button>
          )}
          {tab === 'parse' && (
            <button type="button" onClick={handleSaveParse} className={BTN_INK}>
              保存
            </button>
          )}
          {tab === 'docs' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.doc,.docx,.xlsx,.md"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="搜索文档…"
                    className={cn(SEARCH_FIELD, 'pl-9 pr-8 text-[11px]')}
                  />
                  {docSearch && (
                    <button
                      type="button"
                      onClick={() => setDocSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 hover:text-neutral-800 cursor-pointer"
                      aria-label="清除搜索"
                    >
                      清除
                    </button>
                  )}
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className={BTN_INK}>
                  <Upload size={13} />
                  上传文档
                </button>
              </div>
            </>
          )}
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {tab === 'docs' && (
            <div
              className={cn('relative min-h-full space-y-3', variant === 'modal' ? 'p-4' : 'p-5')}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragActive(false);
              }}
              onDrop={handleDocDrop}
            >
              {dragActive && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-sky-50/80 border-2 border-dashed border-sky-300 rounded-[13px] m-3 pointer-events-none">
                  <div className="text-center">
                    <Upload size={28} className="mx-auto text-sky-500 mb-2" />
                    <p className="text-sm font-semibold text-sky-700">松开即可上传文档</p>
                    <p className="text-[11px] text-sky-600/80 mt-1">支持 PDF、Word、Excel、Markdown 等格式</p>
                  </div>
                </div>
              )}

              {selectedCount > 0 && (
                <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-white border border-neutral-200 shadow-sm">
                  <span className="text-[11px] font-medium text-neutral-800 mr-1">
                    已选择 {selectedCount} 个文件
                  </span>
                  <button type="button" onClick={() => setSelectedIds(new Set())} className="text-[10px] text-neutral-500 hover:text-neutral-800 cursor-pointer mr-1">
                    取消选择
                  </button>
                  <span className="w-px h-4 bg-border" />
                  <button type="button" onClick={() => bulkSetEnabled(true)} className={BTN_OUTLINE}>
                    启用
                  </button>
                  <button type="button" onClick={() => bulkSetEnabled(false)} className={BTN_OUTLINE}>
                    禁用
                  </button>
                  <button type="button" onClick={bulkReparse} className={BTN_OUTLINE}>
                    重新解析
                  </button>
                  <button type="button" onClick={bulkCancelParse} className={BTN_OUTLINE}>
                    取消解析
                  </button>
                  <button
                    type="button"
                    onClick={bulkDelete}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-600 cursor-pointer hover:bg-rose-100"
                  >
                    删除
                  </button>
                </div>
              )}

              {documents.length === 0 ? (
                <div
                  className={cn(
                    PANEL,
                    'p-12 text-center border-2 border-dashed border-neutral-200 cursor-pointer hover:border-sky-200 hover:bg-sky-50/30 transition',
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                >
                  <Upload size={32} className="mx-auto text-neutral-500 mb-3" />
                  <p className="text-sm font-semibold text-neutral-800">拖拽文件到此处，或点击上传</p>
                  <p className="text-[11px] text-neutral-500 mt-1.5">支持 PDF、Word、Excel、Markdown 等格式</p>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className={cn(PANEL, 'p-10 text-center')}>
                  <Search size={28} className="mx-auto text-neutral-500/50 mb-3" />
                  <p className="text-sm font-medium text-neutral-800">{SEARCH_COPY.noDoc}</p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    试试其他关键词，或
                    <button
                      type="button"
                      onClick={() => setDocSearch('')}
                      className="text-sky-600 hover:underline cursor-pointer ml-0.5"
                    >
                      清除搜索
                    </button>
                  </p>
                </div>
              ) : (
                <div className={cn(PANEL, 'overflow-x-auto')}>
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead className="sticky top-0 z-[1] bg-white">
                      <tr className="border-b border-neutral-200 text-[10px] text-neutral-500">
                        <th className="px-3 py-2.5 w-10 bg-white">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleSelectAll}
                            className="cursor-pointer"
                            aria-label="全选"
                          />
                        </th>
                        <th className="px-3 py-2.5 font-medium bg-white">文件名</th>
                        <th className="px-3 py-2.5 font-medium w-20 bg-white">大小</th>
                        <th className="px-3 py-2.5 font-medium w-20 bg-white">分段数量</th>
                        <th className="px-3 py-2.5 font-medium w-24 bg-white">解析器</th>
                        <th className="px-3 py-2.5 font-medium w-16 text-center bg-white">启用</th>
                        <th className="px-3 py-2.5 font-medium w-36 bg-white">上传时间</th>
                        <th className="px-3 py-2.5 font-medium w-28 bg-white">状态</th>
                        <th className="px-3 py-2.5 font-medium w-14 text-right bg-white">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredDocs.map((doc) => {
                        const ext = getFileExt(doc.name);
                        const isSelected = selectedIds.has(doc.id);
                        return (
                          <tr
                            key={doc.id}
                            className={cn(
                              'transition',
                              isSelected ? 'bg-sky-50/60' : 'hover:bg-neutral-100/20',
                              !doc.enabled && 'opacity-60',
                            )}
                          >
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(doc.id)}
                                className="cursor-pointer"
                                aria-label={`选择 ${doc.name}`}
                              />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={cn(
                                    'shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums',
                                    fileExtTone(ext),
                                  )}
                                >
                                  {ext}
                                </span>
                                <span
                                  className="text-[11px] font-medium text-neutral-800 truncate max-w-[220px]"
                                  title={doc.name}
                                >
                                  {doc.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-[10px] text-neutral-500 tabular-nums">
                              {doc.sizeLabel}
                            </td>
                            <td className="px-3 py-2.5 text-[10px] text-neutral-500 tabular-nums">
                              {doc.segments}
                            </td>
                            <td className="px-3 py-2.5 text-[10px] text-neutral-500">{doc.parser}</td>
                            <td className="px-3 py-2.5 text-center">
                              <DocEnableSwitch
                                enabled={doc.enabled}
                                label={doc.enabled ? '已启用' : '已停用'}
                                onChange={() =>
                                  setDocuments((prev) =>
                                    prev.map((d) =>
                                      d.id === doc.id ? { ...d, enabled: !d.enabled } : d,
                                    ),
                                  )
                                }
                              />
                            </td>
                            <td className="px-3 py-2.5 text-[10px] text-neutral-500 tabular-nums whitespace-nowrap">
                              {doc.uploadedAt}
                            </td>
                            <td className="px-3 py-2.5">{renderStatus(doc)}</td>
                            <td className="px-3 py-2.5 text-right relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuDocId(openMenuDocId === doc.id ? null : doc.id)
                                }
                                className="px-2 py-1 rounded-md border border-neutral-200 text-[11px] text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                                aria-expanded={openMenuDocId === doc.id}
                              >
                                ···
                              </button>
                              {openMenuDocId === doc.id && (
                                <>
                                  <button
                                    type="button"
                                    className="fixed inset-0 z-20 cursor-default"
                                    aria-label="关闭菜单"
                                    onClick={() => setOpenMenuDocId(null)}
                                  />
                                  <div className="absolute right-0 top-full mt-1 z-30 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 text-left">
                                    <button
                                      type="button"
                                      onClick={() => openRename(doc)}
                                      className="w-full px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-neutral-100 cursor-pointer"
                                    >
                                      <Pencil size={12} />
                                      重命名
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuDocId(null);
                                        if (doc.status !== 'parsing') startParsing(doc.id);
                                      }}
                                      className="w-full px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-neutral-100 cursor-pointer"
                                    >
                                      <RefreshCw size={12} />
                                      重新解析
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuDocId(null);
                                        showToast(`已开始下载「${doc.name}」`);
                                      }}
                                      className="w-full px-3 py-1.5 text-[11px] flex items-center gap-2 hover:bg-neutral-100 cursor-pointer"
                                    >
                                      <Download size={12} />
                                      下载
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuDocId(null);
                                        removeDoc(doc.id);
                                      }}
                                      className="w-full px-3 py-1.5 text-[11px] flex items-center gap-2 text-destructive hover:bg-rose-50 cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                      删除
                                    </button>
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-3 py-2 border-t border-neutral-200 text-[10px] text-neutral-500 flex items-center justify-between">
                    <span>
                      显示 {filteredDocs.length} / {documents.length} 个文档
                    </span>
                    {docSearch && (
                      <button
                        type="button"
                        onClick={() => setDocSearch('')}
                        className="text-sky-600 hover:underline cursor-pointer"
                      >
                        清除筛选
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'basic' && (
            <div className="p-5 max-w-xl space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '文档数', value: `${documents.length}` },
                  { label: '总词数', value: kb.wordCount.toLocaleString() },
                  { label: '更新于', value: kb.updatedAt.slice(0, 10) },
                ].map((s) => (
                  <div key={s.label} className={cn(PANEL, 'p-3 text-center')}>
                    <p className="text-[10px] text-neutral-500">{s.label}</p>
                    <p className="text-sm font-bold text-neutral-800 mt-1 tabular-nums">{s.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <label className={LABEL}>
                  名称 <span className="text-destructive">*</span>
                </label>
                <input
                  value={name}
                  maxLength={30}
                  onChange={(e) => setName(e.target.value)}
                  className={FIELD}
                />
              </div>

              <div>
                <label className={LABEL}>描述</label>
                <textarea
                  value={description}
                  maxLength={200}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简要说明该知识库的业务范围"
                  className={cn(FIELD, 'min-h-[72px] resize-none')}
                />
              </div>

              <div>
                <label className={LABEL}>分类标签</label>
                <div className="space-y-2">
                  {[
                    { id: 'professional' as const, label: '专业知识', desc: '政策条款、产品手册' },
                    { id: 'basic' as const, label: '基础知识', desc: 'FAQ、入门话术' },
                  ].map((tag) => {
                    const selected = categoryTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleCategoryTag(tag.id)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left cursor-pointer transition',
                          selected ? 'border-primary/30 bg-primary/5' : 'border-neutral-200 hover:bg-neutral-100/60',
                        )}
                      >
                        {selected ? (
                          <Check size={14} className="text-primary shrink-0" />
                        ) : (
                          <Circle size={14} className="text-neutral-500 shrink-0" />
                        )}
                        <span className="text-[11px] font-medium">{tag.label}</span>
                        <HelpCircle size={11} className="text-neutral-500 ml-auto" title={tag.desc} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'parse' && (
            <div className="p-5 max-w-xl space-y-5">
              <div>
                <label className={LABEL}>默认解析策略</label>
                <select value={chunkMethod} onChange={(e) => setChunkMethod(e.target.value)} className={FIELD}>
                  <option value="general">通用解析</option>
                  <option value="qa">问答解析</option>
                  <option value="table">表格结构化</option>
                </select>
                <p className="text-[10px] text-neutral-500 mt-1">新上传文档将默认使用此解析器</p>
              </div>

              <div>
                <label className={LABEL}>嵌入模型</label>
                <select
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className={FIELD}
                >
                  <option value="Qwen3-Embedding-8B">Qwen3-Embedding-8B</option>
                  <option value="bge-m3">BGE-M3</option>
                </select>
              </div>
            </div>
          )}

          {tab === 'recall' && (
            <div className="flex min-h-full">
              <div className="w-[min(360px,42%)] shrink-0 border-r border-neutral-200 p-5 space-y-4">
                <p className="text-[11px] font-semibold text-neutral-800">检索参数</p>

                <label className="block space-y-1">
                  <span className="text-[10px] text-neutral-500 flex justify-between">
                    <span>相似度阈值</span>
                    <span className="tabular-nums font-mono">{similarity.toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={similarity}
                    onChange={(e) => setSimilarity(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] text-neutral-500 flex justify-between">
                    <span>向量权重（全文 {((1 - vectorWeight) * 100).toFixed(0)}%）</span>
                    <span className="tabular-nums font-mono">{vectorWeight.toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={vectorWeight}
                    onChange={(e) => setVectorWeight(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] text-neutral-500 flex justify-between">
                    <span>Top N 检索数</span>
                    <span className="tabular-nums font-mono">{topN}</span>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={1}
                    value={topN}
                    onChange={(e) => setTopN(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setRerank((v) => !v)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-[11px] cursor-pointer',
                    rerank ? 'border-primary/30 bg-primary/5' : 'border-neutral-200',
                  )}
                >
                  <span>重排策略</span>
                  <span className={rerank ? 'text-primary font-semibold' : 'text-neutral-500'}>
                    {rerank ? '已开启' : '关闭'}
                  </span>
                </button>

                <div className="pt-2 border-t border-neutral-200 space-y-2">
                  <label className={LABEL}>调试问题</label>
                  <textarea
                    value={debugQuery}
                    onChange={(e) => setDebugQuery(e.target.value)}
                    placeholder="例如：食安险理赔需要哪些材料？"
                    className={cn(FIELD, 'min-h-[80px] resize-none')}
                  />
                  <Button
                    size="sm"
                    disabled={recallRunning || !debugQuery.trim()}
                    onClick={runRecallDebug}
                    className="w-full"
                  >
                    {recallRunning ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MatrixLoader size={14} className="h-3.5 w-3.5" />
                        检索中…
                      </span>
                    ) : (
                      '运行调试'
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-w-0 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-semibold text-neutral-800">效果预览</p>
                  {recallMs !== null && (
                    <span className="text-[10px] text-neutral-500 tabular-nums">耗时 {recallMs} ms</span>
                  )}
                </div>

                {recallRunning ? (
                  <div className={cn(PANEL, 'p-10 flex flex-col items-center justify-center gap-2')}>
                    <MatrixLoader size={40} className="h-10 w-10" title="检索中" />
                    <p className="text-[11px] text-neutral-500">正在检索员工知识…</p>
                  </div>
                ) : recallHits.length === 0 ? (
                  <div className={cn(PANEL, 'p-10 text-center')}>
                    <Sparkles size={32} className="mx-auto text-neutral-500 mb-3 opacity-60" />
                    <p className="text-[11px] font-medium text-neutral-800">等待测试</p>
                    <p className="text-[10px] text-neutral-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      在左侧输入业务问题并运行调试，查看该员工知识的检索片段与相关度
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recallHits.slice(0, topN).map((hit, i) => (
                      <div key={i} className={cn(PANEL, 'p-3')}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-[11px] font-semibold text-neutral-800 truncate">{hit.title}</p>
                          <span className={badgeClass('live')}>{(hit.score * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">{hit.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      <Modal
        open={!!renamingDoc}
        onClose={() => {
          setRenamingDoc(null);
          setRenameValue('');
        }}
        title="重命名文档"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setRenamingDoc(null);
                setRenameValue('');
              }}
              className={BTN_SOFT}
            >
              取消
            </button>
            <button type="button" onClick={commitRename} disabled={!renameValue.trim()} className={BTN_INK}>
              确定
            </button>
          </>
        }
      >
        <div>
          <label className={LABEL}>文件名</label>
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className={FIELD}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};
