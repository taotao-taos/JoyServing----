import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, User, Terminal, HelpCircle,
  Lightbulb, Database, Settings,
  Sparkles, CheckCircle2, AlertCircle, FileText, Clock, Code
} from '@/lib/icons';

/* ── 内联 Trace 数据类型（复刻自「会话链路轨迹分析器」） ── */
export interface HistoryMessage {
  role: 'customer' | 'agent' | 'system' | 'tool' | 'function';
  name?: string;
  text: string;
  avatar?: string;
  audioDuration?: string;
}

export interface TraceMetrics {
  messageid: string;
  status: 'success' | 'failed';
  totalCostMs: number;
  firstPacketMs: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

export type NodeType =
  | 'input'
  | 'rewrite-rag-query'
  | 'thinking'
  | 'rag'
  | 'lifecycle-start'
  | 'lifecycle-end'
  | 'model-call'
  | 'tool'
  | 'reply-sanitizer'
  | 'output'
  | 'generic';

export interface RagChunk {
  document_keyword: string;
  content: string;
  similarity: number;
}

export interface ToolCallInfo {
  name: string;
  id: string;
 arguments: string;
}

export interface TraceNode {
  id: string;
  name: string;
  type: NodeType;
  costMs?: number;
  phase?: 'start' | 'end' | 'message_start' | 'message_end' | 'result';
  isError?: boolean;
  exitCode?: number;
  message?: string;
  history?: HistoryMessage[];
  prependContent?: string;
  question?: string;
  rewrittenQuestion?: string;
  systemPrompt?: string;
  model?: string;
  usage?: { input?: number; output?: number; totalTokens: number };
  text?: string;
  ragChunks?: RagChunk[];
  ts?: string;
  endedAt?: string;
  toolInfo?: ToolCallInfo;
  messages?: HistoryMessage[];
  content?: string;
  rawContent?: { type: string; value: string }[];
  toolName?: string;
  command?: string;
  resultContentTable?: { key: string; value: string }[];
  input?: string;
  removed?: number;
  finalReply?: string;
  stopReason?: string;
  rawJson?: any;
}

export interface TraceScenario {
  id: string;
  title: string;
  description: string;
  metrics: TraceMetrics;
  nodes: TraceNode[];
}

interface TraceNodeCardProps {
  node: TraceNode;
  orderIndex: number;
}

export const TraceNodeCard: React.FC<TraceNodeCardProps> = ({ node, orderIndex }) => {
  const [isNodeExpanded, setIsNodeExpanded] = useState(true);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isRawExpanded, setIsRawExpanded] = useState(false);
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  const [isPrependExpanded, setIsPrependExpanded] = useState(false);
  const [isResultExpanded, setIsResultExpanded] = useState(false);
  const [isModelThinkingExpanded, setIsModelThinkingExpanded] = useState(true);
  const [isHistoryExpandedLocal, setIsHistoryExpandedLocal] = useState(false);

  const getNodeStyles = () => {
    switch (node.type) {
      case 'input':
        return {
          icon: <User className="w-4 h-4 text-amber-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-amber-300',
          dotColor: 'bg-amber-500',
          badgeBg: 'bg-amber-100/80 text-amber-900',
        };
      case 'rewrite-rag-query':
        return {
          icon: <HelpCircle className="w-4 h-4 text-neutral-800" />,
          bgColor: 'bg-white border-neutral-200 hover:border-sky-300',
          dotColor: 'bg-sky-500',
          badgeBg: 'bg-sky-100/80 text-neutral-900',
        };
      case 'thinking':
        return {
          icon: <Lightbulb className="w-4 h-4 text-sky-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-sky-300',
          dotColor: 'bg-sky-500',
          badgeBg: 'bg-sky-100/80 text-sky-900',
        };
      case 'rag':
        return {
          icon: <Database className="w-4 h-4 text-emerald-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-emerald-300',
          dotColor: 'bg-emerald-500',
          badgeBg: 'bg-emerald-100/80 text-emerald-900',
        };
      case 'lifecycle-start':
        return {
          icon: <Clock className="w-4 h-4 text-sky-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-sky-300',
          dotColor: 'bg-sky-500',
          badgeBg: 'bg-sky-100/80 text-sky-900',
        };
      case 'lifecycle-end':
        return {
          icon: <Clock className="w-4 h-4 text-rose-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-rose-300',
          dotColor: 'bg-rose-500',
          badgeBg: 'bg-rose-100/80 text-rose-900',
        };
      case 'model-call':
        return {
          icon: <Settings className="w-4 h-4 text-sky-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-sky-300',
          dotColor: 'bg-sky-500',
          badgeBg: 'bg-sky-100/80 text-sky-900',
        };
      case 'tool': {
        const isError = node.isError || (node.exitCode !== undefined && node.exitCode !== 0);
        return {
          icon: isError ? <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse" /> : <Terminal className="w-4 h-4 text-teal-600" />,
          bgColor: isError ? 'bg-white border-rose-400 hover:border-rose-500 shadow-rose-50/50' : 'bg-white border-neutral-200 hover:border-teal-300',
          dotColor: isError ? 'bg-rose-500 ring-4 ring-rose-100' : 'bg-teal-500',
          badgeBg: isError ? 'bg-rose-100 text-rose-900 font-bold animate-pulse' : 'bg-teal-100/80 text-teal-900',
        };
      }
      case 'reply-sanitizer':
        return {
          icon: <Sparkles className="w-4 h-4 text-pink-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-pink-300',
          dotColor: 'bg-pink-500',
          badgeBg: 'bg-pink-100/80 text-pink-900',
        };
      case 'output':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-green-300',
          dotColor: 'bg-green-600',
          badgeBg: 'bg-green-100/80 text-green-900',
        };
      default:
        return {
          icon: <FileText className="w-4 h-4 text-neutral-600" />,
          bgColor: 'bg-white border-neutral-200 hover:border-neutral-400',
          dotColor: 'bg-neutral-400',
          badgeBg: 'bg-neutral-100 text-neutral-800',
        };
    }
  };

  const style = getNodeStyles();
  const isErrState = node.type === 'tool' && (node.isError || (node.exitCode !== undefined && node.exitCode !== 0));

  return (
    <div className="relative pl-6 pb-6 last:pb-2 font-sans" id={`node-container-${node.id}`}>
      <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-neutral-200 last:hidden" />
      <span className={`absolute left-0 top-2.5 w-5 h-5 rounded-full flex items-center justify-center ${style.dotColor} text-white font-mono text-[9px] font-bold z-10 shadow-sm`}>
        {orderIndex}
      </span>

      <div className={`rounded-[13px] border ${style.bgColor} shadow-sm overflow-hidden transition-all duration-200`}>
        <button
          onClick={() => setIsNodeExpanded(!isNodeExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left focus:outline-none hover:bg-neutral-50/50 transition-colors cursor-pointer select-none font-sans border-none"
        >
          <div className="flex items-center space-x-2">
            {isNodeExpanded ? <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />}
            <div className="flex items-center space-x-2">
              {style.icon}
              <span className="font-bold text-neutral-800 text-[13.5px] tracking-tight">
                {node.name}
                {node.costMs !== undefined &&
                 node.type !== 'input' &&
                 node.type !== 'output' &&
                 node.type !== 'lifecycle-start' &&
                 node.type !== 'lifecycle-end' && (
                  <span className="ml-2 text-xs font-mono font-medium text-neutral-400">
                    {node.costMs}ms
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isErrState && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white animate-pulse font-sans">
                失败
              </span>
            )}
          </div>
        </button>

        {isNodeExpanded && (
          <div className="p-4 pt-1 pb-4 bg-white border-t border-neutral-100 space-y-3.5 text-xs md:text-sm text-neutral-700 font-sans">
            {/* 1. INPUT */}
            {node.type === 'input' && (
              <div className="space-y-3.5 pt-1.5">
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">用户输入：</div>
                  <div className="bg-amber-50/15 p-3 rounded-lg border border-amber-100 text-neutral-700 font-medium font-sans text-xs leading-relaxed">
                    {node.message}
                  </div>
                </div>
                {node.prependContent && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">其他输入：</div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs">
                      <button
                        onClick={() => setIsPrependExpanded(!isPrependExpanded)}
                        className="w-full bg-neutral-50/40 px-3 py-1.5 flex items-center justify-between text-[11px] text-neutral-500 font-bold select-none cursor-pointer border-none"
                      >
                        <span>{isPrependExpanded ? '▲ 收起 (查看 JSON 格式)' : '▼ 展开 (查看 JSON 格式)'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isPrependExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isPrependExpanded && (
                        <div className="p-3 bg-neutral-50/60 text-neutral-600 font-medium font-mono text-xs overflow-auto max-h-96 whitespace-pre-wrap select-all leading-relaxed border-t border-neutral-100">
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(node.prependContent), null, 2);
                            } catch (e) {
                              return node.prependContent;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. REWRITE RAG QUERY */}
            {node.type === 'rewrite-rag-query' && (
              <div className="space-y-4 pt-1.5 font-sans">
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">原始问题：</div>
                  <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-xs leading-relaxed">
                    {node.question}
                  </div>
                </div>
                {node.input && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">改写输入：</div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs">
                     <button
                        onClick={() => setIsRawExpanded(!isRawExpanded)}
                        className="w-full bg-neutral-50/40 px-3 py-2 flex items-center justify-between text-[11px] text-neutral-400 font-bold select-none cursor-pointer border-none"
                      >
                        <span>{isRawExpanded ? '▼ 收起' : '▼ 展开'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isRawExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isRawExpanded && (
                        <div className="p-3 bg-neutral-50/10 border-t border-neutral-200 text-neutral-700 font-medium font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                          {node.input}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">改写后：</div>
                  <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-xs leading-relaxed select-all">
                    {node.rewrittenQuestion}
                  </div>
                </div>
                {node.systemPrompt && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">改写提示词：</div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden shadow-xs bg-white">
                      <button
                        onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                        className="w-full bg-neutral-50/40 px-3 py-2 flex items-center justify-between text-[11px] text-neutral-400 font-bold select-none cursor-pointer border-none"
                      >
                        <span>{isPromptExpanded ? '▼ 收起' : '▼ 展开'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isPromptExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isPromptExpanded && (
                      <pre className="p-3 bg-neutral-50/60 text-neutral-700 font-medium font-mono text-xs overflow-auto max-h-56 whitespace-pre-wrap select-all leading-relaxed border-t border-neutral-200">
                          {node.systemPrompt}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 border-t border-neutral-200/60 pt-3.5">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">使用模型</span>
                    <span className="font-semibold text-neutral-700 text-xs font-mono">{node.model || 'Qwen3.6-35B-A3B'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">Token 消耗</span>
                    <span className="font-semibold text-neutral-700 text-xs font-mono">{node.usage?.totalTokens || 80}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. THINKING */}
            {node.type === 'thinking' && (
              <div className="pt-1.5 space-y-3 font-sans">
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">思考过程：</div>
                  <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs">
                    <button
                      onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                      className="w-full bg-neutral-50/40 px-3 py-2 flex items-center justify-between text-[11px] text-neutral-500 font-bold select-none border-none cursor-pointer hover:bg-neutral-50/60"
                    >
                      <span>{isPromptExpanded ? '▼ 收起' : '▼ 展开'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isPromptExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isPromptExpanded && (
                      <div className="p-3 bg-neutral-50/10 border-t border-neutral-200 font-mono text-xs text-neutral-700 font-medium whitespace-pre-wrap leading-relaxed select-all">
                        {node.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. RAG */}
            {node.type === 'rag' && (
              <div className="space-y-4 pt-1.5 font-sans">
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">知识库匹配结果：</div>
                 <div className="space-y-3">
                    {node.ragChunks && node.ragChunks.length > 0 ? (
                      node.ragChunks.map((chunk, idx) => (
                        <div key={idx} className="bg-neutral-50/20 rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
                          <div className="bg-neutral-50/50 px-3 py-1.5 flex items-center justify-between text-[11px] text-neutral-500 font-semibold border-b border-neutral-200">
                            <span className="truncate max-w-[70%] text-neutral-600" title={chunk.document_keyword}>
                              {chunk.document_keyword}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-neutral-100/80 text-neutral-600 font-semibold whitespace-nowrap font-mono text-[10px] border border-neutral-200">
                              相似度: {chunk.similarity.toFixed(8)}
                            </span>
                          </div>
                          <div className="p-3 text-xs text-neutral-700 font-medium leading-relaxed max-h-36 overflow-y-auto bg-white/70 whitespace-pre-wrap select-all font-mono">
                            {chunk.content}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-neutral-400 text-xs text-center py-2 font-medium">未召回任何知识片段</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. LIFECYCLE */}
            {(node.type === 'lifecycle-start' || node.type === 'lifecycle-end') && (
              <div className="pt-1.5 font-sans">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-neutral-400 font-bold uppercase tracking-wider text-[11px]">
                    {node.type === 'lifecycle-start' ? '开始时间：' : '结束时间：'}
                  </span>
                  <span className="font-mono text-neutral-700 font-semibold text-xs bg-neutral-50 border border-neutral-200 px-2.5 py-1 rounded">
                    {node.type === 'lifecycle-start' ? node.ts : (node.endedAt || node.ts)}
                  </span>
                </div>
              </div>
            )}

            {/* 6. MODEL CALL */}
            {node.type === 'model-call' && (
              <div className="space-y-4 pt-1.5 font-sans">
                {node.messages && node.messages.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">上下文消息：</div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs">
                      <button
                        onClick={() => setIsHistoryExpandedLocal(!isHistoryExpandedLocal)}
                        className="w-full bg-neutral-50/40 px-3 py-2 flex items-center justify-between text-[11px] text-neutral-500 font-bold select-none cursor-pointer border-none hover:bg-neutral-50/60"
                      >
                        <span>{isHistoryExpandedLocal ? '▼ 收起' : `▼ 展开 (${node.messages.length} 条)`}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isHistoryExpandedLocal ? 'rotate-180' : ''}`} />
                      </button>
                      {isHistoryExpandedLocal && (
                        <div className="p-3 bg-neutral-50/10 border-t border-neutral-200 space-y-2 max-h-72 overflow-y-auto">
                          {node.messages.map((m, i) => (
                            <div key={i} className="text-xs leading-relaxed">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 font-mono ${
                                m.role === 'customer' ? 'bg-amber-100 text-amber-800' :
                                m.role === 'agent' ? 'bg-sky-100 text-sky-800' :
                                m.role === 'system' ? 'bg-neutral-200 text-neutral-700' :
                                'bg-teal-100 text-teal-800'
                              }`}>{m.name || m.role}</span>
                              <span className="text-neutral-700 font-medium whitespace-pre-wrap">{m.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {node.systemPrompt && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">系统提示词：</div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden shadow-xs bg-white">
                      <button
                        onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                        className="w-full bg-neutral-50/40 px-3 py-2 flex items-center justify-between text-[11px] text-neutral-400 font-bold select-none cursor-pointer border-none"
                      >
                        <span>{isPromptExpanded ? '▼ 收起' : '▼ 展开'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isPromptExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isPromptExpanded && (
                        <pre className="p-3 bg-neutral-50/60 text-neutral-700 font-medium font-mono text-xs overflow-auto max-h-56 whitespace-pre-wrap select-all leading-relaxed border-t border-neutral-200">
                          {node.systemPrompt}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
                {node.text && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">大模型思考：</div>
                    <div className="border border-sky-200 rounded-lg overflow-hidden shadow-xs bg-white">
                      <button
                        onClick={() => setIsModelThinkingExpanded(!isModelThinkingExpanded)}
                        className="w-full bg-sky-50/40 px-3py-2 flex items-center justify-between text-[11px] text-sky-500 font-bold select-none cursor-pointer border-none"
                      >
                        <span>{isModelThinkingExpanded ? '▼ 收起' : '▼ 展开'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-sky-400 transition-transform ${isModelThinkingExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isModelThinkingExpanded && (
                        <div className="p-3 bg-sky-50/10 border-t border-sky-200 font-mono text-xs text-neutral-700 font-medium whitespace-pre-wrap leading-relaxed select-all">
                          {node.text}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {node.toolInfo && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">工具调用信息：</div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs">
                      <table className="w-full text-xs">
                        <tbody>
                          <tr className="border-b border-neutral-100">
                            <td className="px-3 py-2 text-neutral-400 font-bold w-24 bg-neutral-50/40">工具名</td>
                            <td className="px-3 py-2 text-neutral-700 font-mono font-medium">{node.toolInfo.name}</td>
                          </tr>
                          <tr className="border-b border-neutral-100">
                            <td className="px-3 py-2 text-neutral-400 font-bold bg-neutral-50/40">ID</td>
                            <td className="px-3 py-2 text-neutral-700 font-mono font-medium">{node.toolInfo.id}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2 text-neutral-400 font-bold bg-neutral-50/40 align-top">参数</td>
                            <td className="px-3 py-2 text-neutral-700 font-mono font-medium whitespace-pre-wrap">{node.toolInfo.arguments}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {node.content && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">返回内容：</div>
                    <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-xs leading-relaxed whitespace-pre-wrap select-all">
                      {node.content}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 border-t border-neutral-200/60 pt-3.5">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">模型</span>
                    <span className="font-semibold text-neutral-700 text-xs font-mono">{node.model || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">输入/输出</span>
                    <span className="font-semibold text-neutral-700 text-xs font-mono">{node.usage?.input ?? 0}/{node.usage?.output ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">Tokens</span>
                    <span className="font-semibold text-neutral-700 text-xs font-mono">{node.usage?.totalTokens ?? 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 7. TOOL */}
            {node.type === 'tool' && (
              <div className="space-y-4 pt-1.5 font-sans">
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">工具信息：</div>
                  <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-200 text-neutral-700 font-mono font-medium text-xs leading-relaxed">
                    {node.toolName || node.name}
                  </div>
                </div>
                {node.command && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">执行命令：</div>
                    <div className="bg-neutral-800 p-3 rounded-lg text-neutral-100 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">
                      <span className="text-emerald-400 select-none">$ </span>{node.command}
                    </div>
                  </div>
                )}
                {node.resultContentTable && node.resultContentTable.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">返回内容：</div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs">
                      <button
                        onClick={() => setIsResultExpanded(!isResultExpanded)}
                        className="w-full bg-neutral-50/40 px-3 py-2 flex items-center justify-between text-[11px] text-neutral-400 font-bold select-none cursor-pointer border-none"
                      >
                        <span>{isResultExpanded ? '▼ 收起' : '▼ 展开'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isResultExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isResultExpanded && (
                        <table className="w-full text-xs border-t border-neutral-200">
                          <tbody>
                            {node.resultContentTable.map((row, i) => (
                              <tr key={i} className="border-b border-neutral-100 last:border-b-0">
                                <td className="px-3 py-2 text-neutral-400 font-bold w-32 bg-neutral-50/40 align-top">{row.key}</td>
                                <td className="px-3 py-2 text-neutral-700 font-mono font-medium whitespace-pre-wrap">{row.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
                {node.content && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">返回内容：</div>
                    <div className={`p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-wrap select-all font-mono font-medium ${isErrState ? 'bg-rose-50/40 border-rose-200 text-rose-700' : 'bg-neutral-50/50 border-neutral-200 text-neutral-700'}`}>
                      {node.content}
                    </div>
                  </div>
                )}
                {node.exitCode !== undefined && (
                  <div className="flex items-center space-x-2 text-xs pt-1">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider text-[11px]">退出码：</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${isErrState ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {node.exitCode}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 8. REPLY SANITIZER */}
            {node.type === 'reply-sanitizer' && (
              <div className="space-y-4 pt-1.5 font-sans">
                {node.input && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">润色前文本：</div>
                    <div className="bg-neutral-50/50 p-3 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-xs leading-relaxed whitespace-pre-wrap">
                      {node.input}
                    </div>
                  </div>
                )}
                {node.systemPrompt && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">净化提示词：</div>
                    <div className="border border-neutral-200 rounded-lg overflow-hidden shadow-xs bg-white">
                      <button
                   onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                        className="w-full bg-neutral-50/40 px-3 py-2 flex items-center justify-between text-[11px] text-neutral-400 font-bold select-none cursor-pointer border-none"
                      >
                        <span>{isPromptExpanded ? '▼ 收起' : '▼ 展开'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isPromptExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      {isPromptExpanded && (
                        <pre className="p-3 bg-neutral-50/60 text-neutral-700 font-medium font-mono text-xs overflow-auto max-h-56 whitespace-pre-wrap select-all leading-relaxed border-t border-neutral-200">
                      {node.systemPrompt}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              {node.finalReply && (
                  <div>
                    <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">润色后文本：</div>
                    <div className="bg-pink-50/30 p-3 rounded-lg border border-pink-100 text-neutral-700 font-medium text-xs leading-relaxed whitespace-pre-wrap select-all">
                      {node.finalReply}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 border-t border-neutral-200/60 pt-3.5">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">移除字符</span>
                    <span className="font-semibold text-neutral-700 text-xs font-mono">{node.removed ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">模型</span>
                    <span className="font-semibold text-neutral-700 text-xs font-mono">{node.model || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1">Tokens</span>
                    <span className="font-semibold text-neutral-700 text-xs font-mono">{node.usage?.totalTokens ?? 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 9. OUTPUT */}
            {node.type === 'output' && (
              <div className="space-y-3.5 pt-1.5 font-sans">
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 block">最终回复：</div>
                  <div className="bg-green-50/30 p-3 rounded-lg border border-green-100 text-neutral-700 font-medium text-xs leading-relaxed whitespace-pre-wrap select-all">
                    {node.finalReply || node.message}
                  </div>
                </div>
                {node.stopReason && (
                  <div className="flex items-center space-x-2 text-xs pt-1">
                    <span className="text-neutral-400 font-bold uppercase tracking-wider text-[11px]">停止原因：</span>
                    <span className="font-mono text-neutral-700 font-semibold bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
                      {node.stopReason}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 10. GENERIC / RAW JSON 兜底 */}
            {node.type === 'generic' && (
             <div className="pt-1.5 font-sans">
                <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <button
                    onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                    className="w-full bg-neutral-50/40 px-3 py-2 flex items-center justify-between text-[11px] text-neutral-500 font-bold select-none cursor-pointer border-none"
                  >
                    <span className="flex items-center gap-1.5"><Code className="w-3.5 h-3.5" />{isJsonExpanded ? '▼ 收起 JSON' : '▼ 展开原始 JSON'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isJsonExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isJsonExpanded && (
                    <pre className="p-3 bg-neutral-800 text-neutral-100 font-mono text-xs overflow-auto max-h-96 whitespace-pre-wrap select-all leading-relaxed border-t border-neutral-200">
                      {JSON.stringify(node.rawJson ?? node, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TraceNodeCard;