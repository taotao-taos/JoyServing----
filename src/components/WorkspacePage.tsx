/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Laptop, 
  Send, 
  Cpu, 
  HelpCircle, 
  Clock, 
  User, 
  ChevronRight, 
  CornerDownLeft, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  FileText,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  Search,
  Link2,
  Globe2,
  Power,
  Home,
  Headphones,
} from '@/lib/icons';
import { ChatSession, SessionTodo } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';
import { buildLiveReasoningFeed } from '@/src/lib/liveReasoningFeed';
import { WORKSPACE_COPY, SESSION_COPY } from '@/lib/platformTerminology';
import { RELAY_HOME_ASSETS } from '@/lib/relayHomeAssets';
import { AgentDeskStrip } from '@/src/components/workspace/AgentDeskStrip';
import { LiveReasoningFeed } from '@/src/components/workspace/LiveReasoningFeed';
import {
  buildChatRenderItems,
  countByQueueTab,
  filterSessionsByQueueTab,
  formatDuration,
  serviceElapsedSeconds,
  sessionAvatarUrl,
  sessionAvatarFallbackClass,
  sessionListTimestamp,
} from '@/src/lib/workspaceUi';

function SidebarPanelToggle({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-6 w-6 hover:bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500 transition-all cursor-pointer border border-neutral-200 shrink-0"
      title={expanded ? '折叠决策面板' : '展开决策面板'}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-neutral-500"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
    </button>
  );
}

export const WorkspacePage: React.FC = () => {
  const { 
    sessions, 
    selectedSessionId, 
    setSelectedSessionId, 
    transferToHuman, 
    toggleAutoPilot, 
    addCustomerMessage,
    completeSession,
    generateAICallSummary,
    demoStep,
    setDemoStep,
    simulateNewIncomingChat,
    hiredAgents,
    setActiveTab,
    showToast,
    workspaceDeskAgentId,
    setWorkspaceDeskAgentId,
  } = useApp();

  const queueBusy = useMockLatency('workspace-queue', 'workspaceOpen');

  const [humanInput, setHumanInput] = useState('');
  const [rightActiveTab, setRightActiveTab] = useState<'log' | 'todos'>('log');
  const [deskFilterAgentId, setDeskFilterAgentId] = useState<string | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [queueTab, setQueueTab] = useState<'serving' | 'queued' | 'transferred'>('serving');
  const [queueSearch, setQueueSearch] = useState('');
  const [showQueueSettings, setShowQueueSettings] = useState(false);
  const [serviceSeconds, setServiceSeconds] = useState(0);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const queueSettingsRef = useRef<HTMLDivElement>(null);

  // New Inner Navigation states matching screenshot guidelines
  const [innerTab, setInnerTab] = useState<'realtime' | 'records' | 'reports'>('realtime');
  const [searchId, setSearchId] = useState('');
  const [transFilter, setTransFilter] = useState<'all' | 'true' | 'false'>('all');
  const [satFilter, setSatFilter] = useState<'all' | 'satisfied' | 'neutral' | 'dissatisfied'>('all');
  const [inspectSession, setInspectSession] = useState<ChatSession | null>(null);

  // Filter actions for details list
  const filteredLogs = sessions.filter(s => {
    if (searchId && !s.id.toLowerCase().includes(searchId.toLowerCase()) && !s.customerName.toLowerCase().includes(searchId.toLowerCase())) {
      return false;
    }
    if (transFilter !== 'all') {
      const targetVal = transFilter === 'true';
      if (s.isTransferred !== targetVal) return false;
    }
    if (satFilter !== 'all') {
      if (satFilter === 'satisfied' && s.satisfaction !== 'very_satisfied' && s.satisfaction !== 'satisfied') return false;
      if (satFilter === 'neutral' && s.satisfaction !== 'neutral') return false;
      if (satFilter === 'dissatisfied' && s.satisfaction !== 'dissatisfied') return false;
    }
    return true;
  });

  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];

  useEffect(() => {
    if (!workspaceDeskAgentId) return;
    setDeskFilterAgentId(workspaceDeskAgentId);
    setWorkspaceDeskAgentId(null);
  }, [workspaceDeskAgentId, setWorkspaceDeskAgentId]);

  // Auto-scroll chat window
  useEffect(() => {
    if (highlightMessageId) return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, selectedSessionId, highlightMessageId]);

  useEffect(() => {
    if (!activeSession || activeSession.status === 'completed') {
      setServiceSeconds(0);
      return;
    }
    setServiceSeconds(serviceElapsedSeconds(activeSession));
    const timer = window.setInterval(() => {
      setServiceSeconds(serviceElapsedSeconds(activeSession));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession?.id, activeSession?.status, activeSession?.createdAt]);

  useEffect(() => {
    if (!activeSession) return;
    const tabFor =
      activeSession.status === 'queued'
        ? 'queued'
        : activeSession.isTransferred && activeSession.status !== 'completed'
          ? 'transferred'
          : 'serving';
    setQueueTab(tabFor);
  }, [selectedSessionId]);

  useEffect(() => {
    if (!highlightMessageId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`chat-msg-${highlightMessageId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);
    const clearTimer = window.setTimeout(() => setHighlightMessageId(null), 2600);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightMessageId, selectedSessionId]);

  useEffect(() => {
    if (!showQueueSettings) return;
    const onDocClick = (e: MouseEvent) => {
      if (queueSettingsRef.current && !queueSettingsRef.current.contains(e.target as Node)) {
        setShowQueueSettings(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showQueueSettings]);

  const queueCounts = useMemo(
    () => ({
      serving: countByQueueTab(sessions, 'serving'),
      queued: countByQueueTab(sessions, 'queued'),
      transferred: countByQueueTab(sessions, 'transferred'),
    }),
    [sessions],
  );

  const visibleQueueSessions = useMemo(() => {
    const tabbed = filterSessionsByQueueTab(sessions, queueTab);
    const byAgent = deskFilterAgentId
      ? tabbed.filter((s) => s.assignedAgentId === deskFilterAgentId)
      : tabbed;
    const q = queueSearch.trim().toLowerCase();
    if (!q) return byAgent;
    return byAgent.filter(
      (s) =>
        s.customerName.toLowerCase().includes(q) ||
        s.phoneOrEmail.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q),
    );
  }, [sessions, queueTab, queueSearch, deskFilterAgentId]);

  const chatRenderItems = useMemo(
    () => (activeSession ? buildChatRenderItems(activeSession.messages) : []),
    [activeSession],
  );

  const renderChannelIcon = (session: ChatSession) => {
    const ch = session.channel ?? 'link';
    if (ch === 'web') return <Globe2 size={11} className="text-neutral-500 shrink-0" />;
    if (ch === 'chat') return <MessageSquare size={11} className="text-neutral-500 shrink-0" />;
    return <Link2 size={11} className="text-neutral-500 shrink-0" />;
  };

  const activeAgent = activeSession ? hiredAgents.find(a => a.id === activeSession.assignedAgentId) : null;

  const liveReasoningItems = useMemo(
    () => buildLiveReasoningFeed(sessions, hiredAgents, deskFilterAgentId),
    [sessions, hiredAgents, deskFilterAgentId],
  );

  type TodoListItem = {
    todo: SessionTodo;
    sessionId: string;
    customerName: string;
  };

  const allTodoItems = useMemo(() => {
    const items: TodoListItem[] = [];
    for (const session of sessions) {
      for (const todo of session.todos ?? []) {
        items.push({
          todo,
          sessionId: session.id,
          customerName: session.customerName,
        });
      }
    }
    return items.sort((a, b) => {
      if (a.todo.status !== b.todo.status) {
        return a.todo.status === 'pending' ? -1 : 1;
      }
      if (a.todo.priority !== b.todo.priority) {
        return a.todo.priority === 'high' ? -1 : 1;
      }
      return b.todo.createdAt.localeCompare(a.todo.createdAt);
    });
  }, [sessions]);

  const pendingTodos = useMemo(
    () => allTodoItems.filter((item) => item.todo.status === 'pending'),
    [allTodoItems],
  );

  const handleTodoNavigate = (item: TodoListItem) => {
    setInnerTab('realtime');
    setSelectedSessionId(item.sessionId);
    if (item.todo.triggerMessageId) {
      setHighlightMessageId(item.todo.triggerMessageId);
    }
  };

  // Quick statistics at top (from screenshot specifications)
  const currentTotalActive = sessions.filter(s => s.status !== 'completed').length;
  const avgResponseTime = "1.25s";
  const answerRate30s = "99.8%";

  const handleSendHumanMessage = () => {
    if (!humanInput.trim() || !activeSession) return;
    
    // Add physical human agent's message to the chat
    const customMsg = humanInput;
    setHumanInput('');

    // Inject message manually to our state directly in current session
    const timestamp = new Date().toTimeString().split(' ')[0];
    activeSession.messages.push({
      id: `h_msg_${Date.now()}`,
      sender: 'human',
      name: 'TAOs (超级管理员)',
      content: customMsg,
      timestamp
    });

    // Write a physical sit trace step
    activeSession.thoughtTrace.push({
      id: `tt_h_${Date.now()}`,
      time: timestamp,
      type: 'info',
      message: SESSION_COPY.staffReply('TAOs', customMsg.substring(0, 15))
    });

    // Advance tutorial/walkthrough steps if needed
    if (demoStep === 'B2') {
      setDemoStep('B3');
    }

    // Trigger mock buyer replying after an interval
    setTimeout(() => {
      let replyText = "好的，我知道了，非常谢谢老师的耐心答复。你们服务态度太周到了！👍";
      if (activeSession.customerName === '何家豪') {
        replyText = "那拜托你们立刻帮我登记物理核销换新！我明天寄回红手机，你们顺丰寄出新机后记得通知我。多谢合作！";
      } else if (activeSession.customerName === '陈董事长-VIP') {
        replyText = "没问题，明天下午，我让项目秘书对接你们把服务合同实体章盖了。";
      }
      addCustomerMessage(activeSession.id, replyText);
    }, 2800);
  };

  const handleToggleAuto = (sessionId: string, currentIsAuto: boolean) => {
    toggleAutoPilot(sessionId, !currentIsAuto);
    if (!currentIsAuto && demoStep === 'B1') {
      setDemoStep('B2');
    }
  };

  const handleManualTakeover = (sessionId: string) => {
    transferToHuman(sessionId, 'hs_001');
    if (demoStep === 'B1') {
      setDemoStep('B2');
    }
  };

  const triggerMockTrigger = (type: 'normal' | 'angry' | 'vip') => {
    simulateNewIncomingChat(type);
  };

  const railNavClass = (active: boolean) =>
    cn(
      'group w-full flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-[10px] transition-all duration-200 cursor-pointer',
      active
        ? 'text-neutral-900 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/80'
        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/70',
    );

  return (
    <div className="flex-1 flex bg-white text-neutral-800 h-screen overflow-hidden font-sans">
      {/* 左侧窄轨：形式对齐质检工作台，内容为客服工作台 */}
      <div className="w-16 bg-neutral-50 border-r border-neutral-200/80 flex flex-col items-center justify-between py-4 shrink-0 z-10 select-none">
        <div className="flex flex-col items-center w-full px-1.5 gap-5">
          <button
            type="button"
            onClick={() => setActiveTab('employees')}
            title="返回管理后台"
            className="h-9 w-9 flex items-center justify-center rounded-[10px] overflow-hidden transition duration-200 hover:bg-neutral-100 cursor-pointer"
          >
            <img
              src={RELAY_HOME_ASSETS.logo}
              alt="JoySupport"
              className="h-10 w-10 object-cover object-left select-none pointer-events-none"
              draggable={false}
            />
          </button>

          <div className="flex flex-col items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setInnerTab('realtime')}
              className={railNavClass(innerTab === 'realtime')}
              title="接待"
            >
              <Headphones
                size={20}
                strokeWidth={innerTab === 'realtime' ? 2.25 : 1.75}
                className="shrink-0"
              />
              <span
                className={cn(
                  'text-[11px] leading-none tracking-tight',
                  innerTab === 'realtime' ? 'font-semibold' : 'font-medium',
                )}
              >
                接待
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInnerTab('records')}
              className={railNavClass(innerTab === 'records')}
              title="记录"
            >
              <Clock
                size={20}
                strokeWidth={innerTab === 'records' ? 2.25 : 1.75}
                className="shrink-0"
              />
              <span
                className={cn(
                  'text-[11px] leading-none tracking-tight',
                  innerTab === 'records' ? 'font-semibold' : 'font-medium',
                )}
              >
                记录
              </span>
            </button>
            <button
              type="button"
              onClick={() => setInnerTab('reports')}
              className={railNavClass(innerTab === 'reports')}
              title="报表"
            >
              <BarChart3
                size={20}
                strokeWidth={innerTab === 'reports' ? 2.25 : 1.75}
                className="shrink-0"
              />
              <span
                className={cn(
                  'text-[11px] leading-none tracking-tight',
                  innerTab === 'reports' ? 'font-semibold' : 'font-medium',
                )}
              >
                报表
              </span>
            </button>
          </div>
        </div>

        <div className="w-full flex flex-col items-center gap-3 px-1.5">
          <div className="w-7 h-px bg-neutral-200" />
          <button
            type="button"
            className={railNavClass(false)}
            onClick={() => setActiveTab('employees')}
            title="返回管理后台"
          >
            <Home size={20} strokeWidth={1.75} className="shrink-0" />
            <span className="text-[11px] leading-none tracking-tight font-medium">返回</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {innerTab === 'records' ? (
        <div className="flex-1 overflow-y-auto p-8 text-left bg-paper animate-in fade-in duration-300 relative flex flex-col justify-start">
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-neutral-200/50 gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
                <svg className="w-5 h-5 text-neutral-800" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>坐席会话审计</span>
              </h1>
              <p className="text-xs text-neutral-500 mt-1">追溯与核验客服系统中的真人与数字员工服务全量通话明细、链路与客户情感特征</p>
            </div>
          </div>

          {/* Records Subpage - Search filters */}
          <div className="bg-white border border-neutral-200 rounded-[13px] p-4 flex flex-wrap gap-4 items-center justify-between shadow-xs mb-6">
            <div className="flex flex-wrap gap-3 items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3.5 top-2.5 text-neutral-450">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input 
                  type="text" 
                  placeholder="搜索客户名/会话ID..." 
                  value={searchId}
                  onChange={e => setSearchId(e.target.value)}
                  className="bg-neutral-50/50 border border-neutral-200 hover:border-neutral-400 text-xs rounded-[13px] pl-10 pr-4 py-2 w-full text-neutral-700 focus:outline-none focus:bg-white"
                />
              </div>

              <select 
                value={transFilter} 
                onChange={e => setTransFilter(e.target.value as any)}
                className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-[13px] text-xs px-3 py-2 text-neutral-700 outline-none font-medium cursor-pointer"
              >
                <option value="all">是否转接人工 (全部)</option>
                <option value="true">触发过人工接管</option>
                <option value="false">数字员工独立接待</option>
              </select>

              <select 
                value={satFilter} 
                onChange={e => setSatFilter(e.target.value as any)}
                className="bg-white border border-neutral-200 hover:border-neutral-400 rounded-[13px] text-xs px-3 py-2 text-neutral-700 outline-none font-medium cursor-pointer font-sans"
              >
                <option value="all">大客户满意度评分 (全部)</option>
                <option value="satisfied">好评 (非常满意/满意)</option>
                <option value="neutral">中立评度</option>
                <option value="dissatisfied">差评 (愤怒/纠纷投诉)</option>
              </select>
            </div>

            <Button 
              onClick={() => showToast('📊 导出报表成功！已提取了满足检索范畴的会话清单并生成 Excel，可在您的浏览器下载列表。')}
              className="bg-neutral-800 hover:opacity-90 text-white font-semibold text-xs px-3 h-8 rounded-[7px] flex items-center gap-1.5 max-sm:w-full justify-center cursor-pointer transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>导出筛选会话记录</span>
            </Button>
          </div>

          {/* Table List */}
          <div className="bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs text-neutral-700">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-neutral-200 text-[10px] text-neutral-450 font-extrabold uppercase tracking-wider">
                  <th className="p-4">业务场景 / 会话 ID</th>
                  <th className="p-4">客户买家</th>
                  <th className="p-4">对话轮次</th>
                  <th className="p-4">分流拦截模式</th>
                  <th className="p-4">满意评价</th>
                  <th className="p-4">进单日期</th>
                  <th className="p-4 text-right">动作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLogs.map(s => {
                  const isSatisfied = s.satisfaction === 'very_satisfied' || s.satisfaction === 'satisfied';
                  const isAngry = s.satisfaction === 'dissatisfied';
                  const msgCount = s.messages.length;

                  return (
                    <tr key={s.id} className="hover:bg-neutral-50/40 transition duration-150">
                      <td className="p-4 font-bold text-neutral-900">
                        <div className="font-bold">{s.scenario}</div>
                        <div className="font-mono text-[9px] text-neutral-400 mt-1">{s.id}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold">{s.customerName}</span>
                        <span className="block text-[10px] text-neutral-400 mt-0.5">{s.phoneOrEmail}</span>
                      </td>
                      <td className="p-4 font-mono font-medium text-neutral-500">
                        {msgCount} 轮对话
                      </td>
                      <td className="p-4">
                        {s.isTransferred ? (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">
                            人机接管
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg font-bold">
                            🤖 AI 闭环自结
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {s.satisfaction ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max ${
                            isSatisfied 
                              ? 'text-emerald-600 bg-emerald-50/50' 
                              : isAngry
                              ? 'text-red-650 text-red-600 bg-red-50/50'
                              : 'text-neutral-500 bg-neutral-100'
                          }`}>
                            <span>
                              {s.satisfaction === 'very_satisfied' ? '非常满意' : s.satisfaction === 'satisfied' ? '满意' : s.satisfaction === 'neutral' ? '中立' : '纠纷不满意'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-neutral-400 italic">买家未评价</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-neutral-400">{s.createdAt || '2026-06-13'}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setInspectSession(s)}
                          className="text-live hover:text-sky-700 font-extrabold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>查看记录</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SLIDE OUT DRAWER */}
          {inspectSession && (
            <div className="fixed inset-0 bg-neutral-800/40 z-50 flex justify-end backdrop-blur-xs">
              <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden text-neutral-800 animate-in slide-in-from-right duration-200">
                <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 shrink-0">
                  <div>
                    <span className="text-[9px] bg-neutral-200 border border-neutral-350 text-neutral-600 px-2 py-0.5 rounded font-mono font-bold uppercase">
                      会话明细审计
                    </span>
                    <h3 className="font-extrabold text-neutral-900 text-sm mt-1.5 flex items-center gap-1">
                      <span>大客户: {inspectSession.customerName}</span>
                      <span className="text-xs font-mono text-neutral-400">({inspectSession.id})</span>
                    </h3>
                  </div>
                  <button 
                    onClick={() => setInspectSession(null)}
                    className="text-neutral-500 hover:text-neutral-700 font-bold border border-neutral-200 bg-white shadow-xs p-1.5 rounded-[13px] text-xs cursor-pointer px-3"
                  >
                    关闭窗口
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                  {inspectSession.summary && (
                    <div className="bg-neutral-950 p-4 rounded-[13px] border border-neutral-850 mb-6 space-y-2">
                      <span className="text-[9px] text-emerald-400 border border-emerald-950 bg-emerald-950 px-2 py-0.5 rounded font-mono uppercase font-black">
                        AI 智能服务纪要 (Summary)
                      </span>
                      <p className="text-neutral-200 text-xs font-mono whitespace-pre-line leading-relaxed">
                        {inspectSession.summary}
                      </p>
                    </div>
                  )}

                  <span className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-2 border-b border-neutral-100 pb-1.5 pl-1">
                    全量端到端对答录
                  </span>

                  {inspectSession.messages.map((m, idx) => {
                    if (m.sender === 'system') {
                      return (
                        <div key={idx} className="flex justify-center text-center my-1 select-none">
                          <span className="bg-neutral-100 text-neutral-500 border border-neutral-200 text-[9px] px-2.5 py-0.5 rounded-full font-sans">
                            ⚙️ {m.content}
                          </span>
                        </div>
                      );
                    }

                    const isCust = m.sender === 'customer';
                    return (
                      <div key={idx} className={`p-4 rounded-[13px] text-xs leading-relaxed shadow-xs flex flex-col space-y-1.5 ${
                        isCust 
                          ? 'bg-gradient-to-br from-neutral-50 to-white text-neutral-800 border border-neutral-200/50 rounded-tl-none' 
                          : m.sender === 'ai'
                          ? 'bg-neutral-800 border border-neutral-800 text-white rounded-tr-none'
                          : 'bg-neutral-100 border border-neutral-200 text-neutral-850 rounded-tr-none'
                      }`}>
                        <div className="flex items-center justify-between text-[8px] border-b border-neutral-100/10 pb-1 font-bold">
                          <span className="font-extrabold uppercase">{m.name}</span>
                          <span className="font-mono text-neutral-400">{m.timestamp}</span>
                        </div>
                        <p className="whitespace-pre-line font-medium leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t border-neutral-200 bg-neutral-50 text-[10px] text-neutral-400 leading-relaxed shrink-0 flex items-center justify-between">
                  <span>*本会话明细归档具有物理安全签章，防篡改</span>
                  <span>JoyServing Security Engine</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : innerTab === 'reports' ? (
        <div className="flex-1 overflow-y-auto p-8 text-left bg-paper animate-in fade-in duration-300 flex flex-col justify-start">
          
          {/* Top banner / title header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-neutral-200/60 gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
                <span>人工数据总览</span>
                <HelpCircle size={15} className="text-neutral-400 cursor-pointer hover:text-neutral-600" />
              </h1>
            </div>

            {/* Top Right filters exactly matching screenshot */}
            <div className="flex items-center gap-2">
              {/* Datepicker button box */}
              <div className="bg-white border border-neutral-200 rounded-[7px] px-3 py-1.5 h-8.5 flex items-center gap-2 hover:border-neutral-400 cursor-pointer transition shadow-xs text-xs font-semibold text-neutral-700">
                <span>2026-06-07</span>
                <span className="text-neutral-350">—</span>
                <span>2026-06-13</span>
                <Calendar size={13} className="text-neutral-400" />
              </div>

              {/* Selector 1 */}
              <select className="bg-white border border-neutral-200 rounded-[13px] px-3 py-1 text-xs h-8.5 font-bold text-neutral-700 outline-none hover:border-neutral-400 cursor-pointer shadow-xs">
                <option>所有发起方</option>
                <option>用户进线</option>
                <option>智能推荐</option>
              </select>

              {/* Selector 2 */}
              <select className="bg-white border border-neutral-200 rounded-[13px] px-3.5 py-1 text-xs h-8.5 font-bold text-neutral-700 outline-none hover:border-neutral-400 cursor-pointer shadow-xs">
                <option>8888</option>
                <option>8881</option>
                <option>8882</option>
              </select>
            </div>
          </div>

          {/* 今日实时运营监控指标 */}
          <div className="bg-white border border-neutral-200/50 rounded-[13px] p-5 mb-6 shadow-xs flex flex-wrap items-center justify-between gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <h2 className="text-xs font-bold text-neutral-900 tracking-tight">今日实时运营监控指标</h2>
                <p className="text-[10px] text-neutral-400 mt-0.5">多维度滚动自校准最新坐席大厅实时负荷与效能</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-400 font-bold">当前实时在接待</span>
                <span className="text-neutral-900 text-lg font-black font-mono mt-1">{currentTotalActive} <span className="text-[10px] font-bold text-neutral-400">人</span></span>
              </div>
              
              <div className="h-8 w-[1px] bg-neutral-200/60 hidden sm:block" />

              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-400 font-bold">人工平均极速响应</span>
                <span className="text-emerald-500 text-lg font-black font-mono mt-1">{avgResponseTime}</span>
              </div>

              <div className="h-8 w-[1px] bg-neutral-200/60 hidden sm:block" />

              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-400 font-bold">及时应答保障率</span>
                <span className="text-live text-lg font-black font-mono mt-1">{answerRate30s}</span>
              </div>
            </div>
          </div>

          {/* 8 Metric Boxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            
            {/* Box 1 */}
            <div className="bg-white border border-neutral-200/60 rounded-[13px] p-4 shadow-xs flex flex-col justify-between min-h-[140px] text-left">
              <div>
                <span className="text-[11px] font-extrabold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5 justify-between">
                  <span>总会话量</span>
                  <HelpCircle size={11} className="text-neutral-350" />
                </span>
                <div className="text-3xl font-black text-neutral-900 mt-2">0</div>
              </div>
              <div className="mt-2 space-y-1 text-[11px] border-t border-neutral-100 pt-2 text-neutral-450 font-bold">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-live inline-block" />
                    <span>来访会话量</span>
                  </span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>客服发起会话量</span>
                  </span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
              </div>
            </div>

            {/* Box 2 */}
            <div className="bg-white border border-neutral-200/60 rounded-[13px] p-4 shadow-xs flex flex-col justify-between min-h-[140px] text-left">
              <div>
                <span className="text-[11px] font-extrabold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5 justify-between">
                  <span>转人工接通率</span>
                  <HelpCircle size={11} className="text-neutral-350" />
                </span>
                <div className="text-3xl font-black text-neutral-900 mt-2">0 <span className="text-xs font-bold text-neutral-450">%</span></div>
              </div>
              <div className="mt-2 space-y-1 text-[11px] border-t border-neutral-100 pt-2 text-neutral-450 font-bold">
                <div className="flex justify-between">
                  <span>总人工请求量</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span>总人工接起量</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span>非工作时间人工请求量</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
              </div>
            </div>

            {/* Box 3 */}
            <div className="bg-white border border-neutral-200/60 rounded-[13px] p-4 shadow-xs flex flex-col justify-between min-h-[140px] text-left">
              <div>
                <span className="text-[11px] font-extrabold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5 justify-between">
                  <span>客服响应时长</span>
                  <HelpCircle size={11} className="text-neutral-350" />
                </span>
                <div className="grid grid-cols-2 mt-4 text-center divide-x divide-neutral-100">
                  <div>
                    <span className="block text-[10px] text-neutral-450 font-medium">平均响应</span>
                    <span className="text-xl font-bold text-neutral-900 block mt-1">0 秒</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-neutral-450 font-medium">首次响应</span>
                    <span className="text-xl font-bold text-neutral-900 block mt-1">0 秒</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[9px] text-center text-neutral-400 font-mono">*统计区间秒级计算</div>
            </div>

            {/* Box 4 */}
            <div className="bg-white border border-neutral-200/60 rounded-[13px] p-4 shadow-xs flex flex-col justify-between min-h-[140px] text-left">
              <div>
                <span className="text-[11px] font-extrabold text-neutral-455 uppercase tracking-wider flex items-center gap-1.5 justify-between">
                  <span>人工有效会话量</span>
                  <HelpCircle size={11} className="text-neutral-350" />
                </span>
                <div className="text-3xl font-black text-neutral-900 mt-2">0 <span className="text-xs font-bold text-neutral-455">人</span></div>
              </div>
              <div className="mt-2 space-y-1 text-[11px] border-t border-neutral-100 pt-2 text-neutral-455 font-bold">
                <div className="flex justify-between">
                  <span>参与会话量</span>
                  <span className="font-mono text-neutral-905">0</span>
                </div>
                <div className="flex justify-between">
                  <span>独立会话量</span>
                  <span className="font-mono text-neutral-905">0</span>
                </div>
                <div className="flex justify-between">
                  <span>人工无效会话数</span>
                  <span className="font-mono text-neutral-905">0</span>
                </div>
                <div className="flex justify-between">
                  <span>人工无效比例</span>
                  <span className="font-mono text-neutral-905">0%</span>
                </div>
              </div>
            </div>

            {/* Box 5 */}
            <div className="bg-white border border-neutral-200/60 rounded-[13px] p-4 shadow-xs flex flex-col justify-between min-h-[140px] text-left">
              <div>
                <span className="text-[11px] font-extrabold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5 justify-between">
                  <span>总人工会话量</span>
                  <HelpCircle size={11} className="text-neutral-350" />
                </span>
                <div className="text-3xl font-black text-neutral-900 mt-2">0</div>
              </div>
              <div className="mt-2 space-y-1 text-[11px] border-t border-neutral-100 pt-2 text-neutral-450 font-bold">
                <div className="flex justify-between">
                  <span>总有效会话量</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span>总无效会话量</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span>客服转接量</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span>机器人托管次数</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
              </div>
            </div>

            {/* Box 6 */}
            <div className="bg-white border border-neutral-200/60 rounded-[13px] p-4 shadow-xs flex flex-col justify-between min-h-[140px] text-left">
              <div>
                <span className="text-[11px] font-extrabold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5 justify-between">
                  <span>总干预次数</span>
                  <HelpCircle size={11} className="text-neutral-350" />
                </span>
                <div className="text-3xl font-black text-neutral-900 mt-2">0</div>
              </div>
              <div className="mt-2 space-y-1 text-[11px] border-t border-neutral-100 pt-2 text-neutral-450 font-bold">
                <div className="flex justify-between">
                  <span>总干预对话量</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span>需干预对话量</span>
                  <span className="font-mono text-neutral-900">0</span>
                </div>
              </div>
            </div>

            {/* Box 7 */}
            <div className="bg-white border border-neutral-200/60 rounded-[13px] p-4 shadow-xs flex flex-col justify-between min-h-[140px] text-left">
              <div>
                <span className="text-[11px] font-extrabold text-ink uppercase tracking-wider flex items-center justify-between">
                  <span>30 秒应答率</span>
                  <HelpCircle size={11} className="text-neutral-300 animate-pulse" />
                </span>
                <div className="text-3xl font-black text-neutral-900 mt-2">0 <span className="text-xs font-bold text-neutral-450">%</span></div>
              </div>
              <div className="text-[9px] text-neutral-400 leading-snug border-t border-neutral-100 pt-2.5 font-sans font-medium">
                客服坐席30秒内的成功接入比率，用来判定排队拥堵状况。
              </div>
            </div>

            {/* Box 8 */}
            <div className="bg-white border border-neutral-200/60 rounded-[13px] p-4 shadow-xs flex flex-col justify-between min-h-[140px] text-left">
              <div>
                <span className="text-[11px] font-extrabold text-neutral-450 uppercase tracking-wider flex items-center justify-between">
                  <span>人工会话平均时长</span>
                  <HelpCircle size={11} className="text-neutral-300" />
                </span>
                <div className="text-3xl font-black text-neutral-900 mt-2">0 <span className="text-xs font-bold text-neutral-450">秒</span></div>
              </div>
              <div className="text-[9px] text-neutral-400 leading-snug border-t border-neutral-100 pt-2.5 font-sans font-medium">
                座席接起客服会话后，至会话正式关闭、挂起或移交托管的平均经历用时。
              </div>
            </div>

          </div>

          {/* Bottom Graph: 会话量 */}
          <div className="bg-white border border-neutral-200 rounded-[22px] p-5.5 shadow-sm text-left flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-ink text-xs uppercase tracking-wider mb-2">会话量</h3>
            </div>

            {/* Grid coordinate system placeholder graph exactly mirroring visual rules */}
            <div className="h-64 border-t border-b border-dashed border-neutral-200/75 relative mt-4 select-none bg-neutral-50/20 rounded-[13px] flex flex-col justify-between p-4 font-mono text-[9px] text-neutral-400">
              
              {/* Decorative baseline grid lines */}
              <div className="absolute inset-0 grid grid-rows-4 pointer-events-none p-4 py-8">
                <div className="border-b border-neutral-200/40" />
                <div className="border-b border-neutral-200/40" />
                <div className="border-b border-neutral-200/40" />
              </div>

              {/* Baseline flat zero-state trend wave (since data is 0) */}
              <svg className="absolute inset-x-0 bottom-12 h-10 w-full overflow-visible" preserveAspectRatio="none">
                <g className="opacity-45">
                  <path d="M 0 20 Q 200 20, 400 20 T 800 20" fill="none" stroke="#CBD5E1" strokeWidth="2.5" />
                  <circle cx="20" cy="20" r="3" fill="#94A3B8" />
                  <circle cx="240" cy="20" r="3" fill="#94A3B8" />
                  <circle cx="480" cy="20" r="3" fill="#94A3B8" />
                  <circle cx="680" cy="20" r="3" fill="#94A3B8" />
                </g>
              </svg>

              <div className="text-neutral-400 italic font-sans text-xs text-center my-auto z-10 select-none">
                📊 所选范围内暂无人工数据，数值均为 0
              </div>

              {/* Bottom dates/horizontal axis */}
              <div className="flex justify-between text-neutral-400 pt-1 border-t border-neutral-200 text-[10px] select-none font-bold">
                <span>06-07</span>
                <span>06-08</span>
                <span>06-09</span>
                <span>06-10</span>
                <span>06-11</span>
                <span>06-12</span>
                <span>06-13</span>
              </div>
            </div>

            {/* Legends row matching bottom of reference screenshot exactly */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-y-2 gap-x-5 text-[11px] font-extrabold text-neutral-500 py-3 bg-neutral-50 border border-neutral-200/60 rounded-[13px] select-none">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-live" />
                <span>排队量</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>总会话量</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                <span>已接入会话量</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-450" />
                <span>未接入会话量</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>客服发起会话量</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-400" />
                <span>总访客量</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Guide overlay alert */}
          {demoStep === 'B1' && (
            <div className="mx-3 mt-2 bg-neutral-800 text-white px-3 py-2 rounded-lg flex items-center justify-between text-[11px] animate-in slide-in-from-top-3 duration-300 shrink-0">
              <div className="flex items-center gap-2 font-medium min-w-0">
                <AlertCircle size={14} className="text-neutral-400 animate-bounce shrink-0" />
                <span className="truncate">向导：点击「何家豪」后使用【真人接管】接起会话。</span>
              </div>
              <button onClick={() => setDemoStep('B2')} className="bg-white text-black px-2.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 cursor-pointer">跳过</button>
            </div>
          )}

          {/* THREE COLUMN WORKSPACE — 紧凑屏效 */}
          <div className="flex-1 flex overflow-hidden p-3 gap-3 min-h-0">
            
            {/* Left: 会话列表 */}
            <div className="w-60 bg-white border border-neutral-200 rounded-[13px] flex flex-col shrink-0 overflow-hidden min-h-0">
              <div className="px-2.5 py-2 border-b border-neutral-200 flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 relative min-w-0">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    <input
                      value={queueSearch}
                      onChange={(e) => setQueueSearch(e.target.value)}
                      placeholder="搜索"
                      className="w-full h-7 pl-7 pr-2 text-[11px] rounded-full border border-neutral-200 bg-neutral-100/30 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                  <div className="relative shrink-0" ref={queueSettingsRef}>
                    <button
                      type="button"
                      onClick={() => setShowQueueSettings((v) => !v)}
                      className="h-7 w-7 rounded-full border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-500 transition cursor-pointer"
                      title="设置"
                    >
                      <Settings size={14} />
                    </button>
                    {showQueueSettings && (
                      <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-neutral-200 bg-white shadow-[0_2px_10px_rgba(31,35,41,0.02)] py-1">
                        <button
                          type="button"
                          onClick={() => { triggerMockTrigger('normal'); setShowQueueSettings(false); }}
                          className="w-full px-2.5 py-1.5 text-left text-[10px] hover:bg-neutral-100 cursor-pointer"
                        >
                          模拟进线 · 咨询
                        </button>
                        <button
                          type="button"
                          onClick={() => { triggerMockTrigger('angry'); setShowQueueSettings(false); }}
                          className="w-full px-2.5 py-1.5 text-left text-[10px] hover:bg-neutral-100 cursor-pointer"
                        >
                          模拟进线 · 投诉
                        </button>
                        <button
                          type="button"
                          onClick={() => { triggerMockTrigger('vip'); setShowQueueSettings(false); }}
                          className="w-full px-2.5 py-1.5 text-left text-[10px] hover:bg-neutral-100 cursor-pointer"
                        >
                          模拟进线 · 总裁
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex bg-neutral-100/60 p-0.5 rounded-md border border-neutral-200">
                  {([
                    ['serving', '服务中', queueCounts.serving],
                    ['queued', '队列中', queueCounts.queued],
                    ['transferred', '转人工', queueCounts.transferred],
                  ] as const).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setQueueTab(key)}
                      className={cn(
                        'flex-1 py-0.5 px-1 text-[10px] font-medium rounded-sm text-center transition-all cursor-pointer whitespace-nowrap',
                        queueTab === key
                          ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                          : 'text-neutral-500 hover:text-neutral-800',
                      )}
                    >
                      {label}·{count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar min-h-0">
                <ContentBusy busy={queueBusy} size="slot" minHeight={200}>
                {visibleQueueSessions.length > 0 ? (
                  visibleQueueSessions.map((s) => {
                    const isSelected = s.id === selectedSessionId;
                    const avatarSrc = sessionAvatarUrl(s.avatarSeed);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedSessionId(s.id);
                          if (s.customerName === '何家豪' && demoStep === 'B1') {
                            setDemoStep('B2');
                          }
                        }}
                        className={cn(
                          'w-full px-2.5 py-2 text-left transition-colors flex gap-2 cursor-pointer items-start',
                          isSelected ? 'bg-neutral-100/80' : 'hover:bg-neutral-100/40',
                        )}
                      >
                        <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border">
                          {avatarSrc ? (
                            <AvatarImage src={avatarSrc} alt={s.customerName} referrerPolicy="no-referrer" />
                          ) : null}
                          <AvatarFallback className={cn(sessionAvatarFallbackClass(s.avatarSeed), 'text-[12px] font-semibold text-white')}>
                            {s.customerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-semibold text-[12px] text-neutral-800 truncate">{s.customerName}</span>
                            {renderChannelIcon(s)}
                            {s.status === 'auto' && (
                              <Sparkles size={11} className="text-sky-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-mono mt-0.5 truncate">
                            {sessionListTimestamp(s)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-neutral-500 text-[10px] px-3">
                    暂无会话
                  </div>
                )}
                </ContentBusy>
              </div>
            </div>

        {/* Middle: 对话区 */}
        <div className="flex-1 min-w-0 bg-white border border-neutral-200 rounded-[13px] flex flex-col overflow-hidden min-h-0">
          {activeSession ? (
            <>
              <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-between shrink-0 bg-white gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-neutral-500">
                    <Clock size={14} className="shrink-0 text-neutral-500" />
                    <span>
                      已为客户服务{' '}
                      <span className="font-mono text-neutral-800 tabular-nums">
                        {formatDuration(serviceSeconds)}
                      </span>
                    </span>
                  </div>

                  {activeAgent && (
                    <>
                      <span className="text-border shrink-0">·</span>
                      <div
                        className="inline-flex items-center gap-1 min-w-0 max-w-[220px] px-2 py-0.5 rounded-full border border-sky-200/80 bg-sky-50/80 text-[10px] font-semibold text-sky-900"
                        title={`数字员工 ${activeAgent.name} 负责本次接待`}
                      >
                        <span className="shrink-0 select-none">{activeAgent.avatar}</span>
                        <span className="truncate">{activeAgent.name}</span>
                        <span className="shrink-0 text-[9px] font-medium text-sky-600">
                          {activeSession.status === 'auto' ? 'AI 接待' : '协同中'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeSession.status === 'queued' && (
                    <button
                      type="button"
                      onClick={() => handleManualTakeover(activeSession.id)}
                      className="bg-primary text-primary-foreground font-medium text-[10px] h-7 px-2.5 rounded-md transition cursor-pointer"
                    >
                      真人接管
                    </button>
                  )}

                  {!showRightSidebar && (
                    <SidebarPanelToggle expanded={false} onClick={() => setShowRightSidebar(true)} />
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar bg-white min-h-0">
                {chatRenderItems.map((item) => {
                  if (item.kind === 'date') {
                    return (
                      <div key={item.key} className="flex justify-center py-1">
                        <span className="text-[10px] text-neutral-500 font-mono">{item.label}</span>
                      </div>
                    );
                  }

                  const m = item.message;

                  if (m.sender === 'system') {
                    return (
                      <div key={item.key} className="flex justify-center my-1 text-center select-none">
                        <span className="bg-neutral-100 text-neutral-500 text-[9px] px-2.5 py-1 rounded-full border border-neutral-200 font-mono">
                          {m.content}
                        </span>
                      </div>
                    );
                  }

                  const isCust = m.sender === 'customer';
                  const custAvatarSrc = sessionAvatarUrl(activeSession.avatarSeed);

                  return (
                    <div key={item.key} className={cn('flex gap-2 items-start', isCust ? 'justify-start' : 'justify-end')}>
                      {isCust && (
                        <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border">
                          {custAvatarSrc ? (
                            <AvatarImage src={custAvatarSrc} alt={activeSession.customerName} referrerPolicy="no-referrer" />
                          ) : null}
                          <AvatarFallback className={cn(sessionAvatarFallbackClass(activeSession.avatarSeed), 'text-[11px] font-bold text-white')}>
                            {activeSession.customerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={cn('max-w-[75%]', isCust ? '' : 'flex flex-col items-end')}>
                        <div
                          id={m.id ? `chat-msg-${m.id}` : undefined}
                          className={cn(
                            'px-3 py-2 text-[12px] leading-relaxed rounded-[7px] transition-shadow',
                            isCust
                              ? 'bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm shadow-xs'
                              : 'bg-sky-100 text-neutral-800 rounded-tr-sm',
                            highlightMessageId === m.id && 'ring-2 ring-amber-400 shadow-[0_2px_10px_rgba(31,35,41,0.02)]',
                          )}
                        >
                          {m.isSummary ? (
                            <pre className="font-mono text-[10px] text-emerald-700 rounded-md p-2 bg-white/60 leading-relaxed whitespace-pre-wrap">
                              {m.content}
                            </pre>
                          ) : (
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {activeSession.status !== 'completed' ? (
                <div className="shrink-0 border-t border-neutral-200 bg-white">
                  <div className="px-3 pt-2 pb-1">
                    <div className="group relative flex gap-2 items-end bg-neutral-100/30 p-2 rounded-lg border border-neutral-200 focus-within:ring-2 focus-within:ring-ring/20">
                      <textarea
                        value={humanInput}
                        onChange={(e) => setHumanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && activeSession.status !== 'auto' && humanInput.trim()) {
                            e.preventDefault();
                            handleSendHumanMessage();
                          }
                        }}
                        disabled={activeSession.status === 'auto'}
                        rows={2}
                        placeholder={
                          activeSession.status === 'auto'
                            ? `${WORKSPACE_COPY.autoServing} 悬停可取消托管`
                            : '输入回复 (Shift+Enter 换行)'
                        }
                        className="flex-1 w-full bg-transparent text-neutral-800 placeholder:text-neutral-500 text-xs px-1 focus:outline-none resize-none leading-relaxed min-h-[32px] outline-none disabled:cursor-default"
                      />

                      {activeSession.status === 'auto' ? (
                        <button
                          type="button"
                          onClick={() => handleToggleAuto(activeSession.id, true)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-md border border-neutral-200 bg-white text-[11px] font-semibold text-neutral-700 shadow-sm opacity-0 pointer-events-none transition group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto hover:bg-neutral-50 cursor-pointer"
                        >
                          取消托管
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleAuto(activeSession.id, false)}
                            className="h-8 px-2.5 rounded-md border border-sky-200 bg-sky-50 text-[11px] font-semibold text-sky-800 hover:bg-sky-100 transition cursor-pointer shrink-0"
                            title="交回数字员工独立接待"
                          >
                            AI接管
                          </button>
                          <Button
                            size="sm"
                            disabled={!humanInput.trim()}
                            onClick={handleSendHumanMessage}
                            className="h-8 px-3 rounded-md shrink-0"
                          >
                            <Send size={12} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('确定结束当前会话？')) {
                          completeSession(activeSession.id, 'neutral');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] border border-destructive/60 text-destructive text-[11px] font-medium bg-white hover:bg-destructive/5 transition cursor-pointer"
                    >
                      <Power size={14} />
                      结束
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast('已向客户发送满意度调研')}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[7px] border border-neutral-200 text-neutral-500 text-[11px] font-semibold bg-white hover:bg-neutral-50 transition cursor-pointer"
                    >
                      <Send size={14} />
                      满意度
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-neutral-100/30 border-t border-neutral-200 text-center space-y-2 shrink-0">
                  <CheckCircle2 size={18} className="mx-auto text-neutral-800" />
                  <h3 className="text-xs font-semibold text-neutral-800">会话已关闭</h3>

                  <div className="flex justify-center pt-1.5">
                    {activeSession.summary ? (
                      <span className="text-[10.5px] bg-ink text-white px-4.5 py-1.5 rounded-[13px] font-bold">
                        AI 账单总结已就绪
                      </span>
                    ) : (
                      <Button 
                        onClick={() => {
                          generateAICallSummary(activeSession.id);
                          if (demoStep === 'B3') {
                            setDemoStep(null);
                          }
                        }}
                        className="bg-neutral-800 hover:opacity-90 text-white font-semibold text-xs h-8 px-3 rounded-[7px] flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={13} />
                        <span>自动生成 AI 归纳总结</span>
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {!showRightSidebar && (
                <div className="px-3 py-2 border-b border-neutral-200 flex items-center justify-end shrink-0 bg-white">
                  <SidebarPanelToggle expanded={false} onClick={() => setShowRightSidebar(true)} />
                </div>
              )}
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-neutral-500 bg-neutral-100/20">
              <Laptop size={32} className="text-neutral-500/60 mb-2" />
              <p className="font-semibold text-neutral-800 text-xs">暂无活跃会话</p>
              <p className="text-[10px] mt-1 text-neutral-500">从左侧队列选择一位用户查看对话</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: 决策面板 */}
        <div className={cn(
          "bg-white border border-neutral-200 flex flex-col shrink-0 rounded-[13px] overflow-hidden min-h-0 transition-all duration-300",
          showRightSidebar ? "w-[260px] opacity-100" : "w-0 opacity-0 border-transparent pointer-events-none ring-0"
        )}>
          
          <div className="px-2 py-1.5 border-b border-neutral-200 bg-white shrink-0 flex items-center justify-between gap-1.5">
            <SidebarPanelToggle expanded onClick={() => setShowRightSidebar(false)} />
            <div className="flex-1 flex bg-neutral-100/60 p-0.5 rounded-md border border-neutral-200">
              <button 
                onClick={() => setRightActiveTab('log')}
                className={cn(
                  "flex-1 py-0.5 px-1.5 text-[10px] font-medium rounded-sm text-center transition-all cursor-pointer",
                  rightActiveTab === 'log' 
                    ? "bg-white text-neutral-900 shadow-xs font-black"
                    : "text-neutral-500 hover:text-neutral-800"
                )}
              >
                {WORKSPACE_COPY.sidebarWorkLog}
              </button>
              <button 
                onClick={() => setRightActiveTab('todos')}
                className={cn(
                  "flex-1 py-0.5 px-1.5 text-[10px] font-medium rounded-sm text-center transition-all cursor-pointer relative",
                  rightActiveTab === 'todos' 
                    ? "bg-white text-neutral-900 shadow-xs font-black"
                    : "text-neutral-500 hover:text-neutral-800"
                )}
              >
                待办
                {pendingTodos.length > 0 && (
                  <span className="absolute -top-1 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                    {pendingTodos.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden custom-scrollbar min-h-0 bg-paper flex flex-col">
            {rightActiveTab === 'log' ? (
              <>
                <AgentDeskStrip
                  agents={hiredAgents}
                  sessions={sessions}
                  selectedAgentId={deskFilterAgentId}
                  onSelectAgent={setDeskFilterAgentId}
                />
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <LiveReasoningFeed
                    items={liveReasoningItems}
                    activeSessionId={activeSession?.id}
                    onSelectSession={(sessionId) => {
                      setSelectedSessionId(sessionId);
                      setInnerTab('realtime');
                    }}
                    onOpenTodos={() => setRightActiveTab('todos')}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 min-h-0 custom-scrollbar">
                {allTodoItems.length > 0 ? (
                  allTodoItems.map((item) => (
                    <button
                      key={`${item.sessionId}_${item.todo.id}`}
                      type="button"
                      onClick={() => handleTodoNavigate(item)}
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer',
                        item.todo.status === 'pending'
                          ? 'border-neutral-200 bg-white hover:bg-neutral-100/40 hover:border-foreground/20'
                          : 'border-neutral-200/60 bg-neutral-100/30 opacity-60 hover:opacity-80',
                      )}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-0.5">
                        <span className="text-[10px] font-medium text-neutral-800 leading-snug">{item.todo.title}</span>
                        {item.todo.priority === 'high' && (
                          <span className="shrink-0 text-[8px] font-medium px-1 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">
                            紧急
                          </span>
                        )}
                      </div>
                      {item.todo.detail && (
                        <p className="text-[9px] text-neutral-500 leading-snug">{item.todo.detail}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-neutral-200/60">
                        <span className="text-[8px] text-neutral-500 truncate max-w-[58%]">
                          {item.customerName}
                        </span>
                        <span className="text-[8px] text-neutral-500 font-mono shrink-0">{item.todo.createdAt}</span>
                      </div>
                      <div className="flex items-center justify-end mt-1">
                        <span className="text-[8px] text-neutral-500">
                          {item.todo.status === 'pending' ? '待处理 · 点击查看会话' : '已完成'}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-6 text-center text-neutral-500 text-[10px] leading-relaxed">
                    <p>暂无待办</p>
                    <p className="text-[9px] mt-1">AI 无法自行闭环时会在此生成待办</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
   )}
  </div>
  );
};
