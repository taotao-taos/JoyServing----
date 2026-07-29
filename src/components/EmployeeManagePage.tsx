/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  MessageSquareCode, 
  Link2, 
  Trash2, 
  Check, 
  X, 
  Cpu, 
  UserCheck,
  Send,
  HelpCircle,
  UploadCloud,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Layers,
  FileText,
  ChevronDown,
  MessageSquare,
  Headphones,
  Settings2,
  Copy,
} from '@/lib/icons';
import { HiredAgent } from '../types';
import { defaultOpeningLineForAgent } from '@/lib/agentDefaultCopy';
import { PROFILE_USER } from '@/lib/profileUser';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EmployeeCardRelay } from './employees/relay/EmployeeCardRelay';
import { hasEmployeeTrainNotice } from '@/lib/masterTemplateUpgrade';
import { EmployeeHomeRelay } from './employees/relay/EmployeeHomeRelay';
import homeStyles from './employees/relay/EmployeeHomeRelay.module.scss';
import { RELAY_HOME_ASSETS } from '@/lib/relayHomeAssets';
import { agentAvatarForCard, agentAvatarForEditor } from '@/lib/agentAvatarDisplay';
import { ONBOARDING_TOAST_STEP1, ONBOARDING_TOAST_STEP2 } from '@/lib/onboardingCopy';
import { EMPLOYEE_RESOURCE_TERMS, LIFECYCLE_TERMS, DISMISS_EMPLOYEE_COPY, EMPLOYEE_PAGE_COPY, ORG_COPY, SEARCH_COPY, MASTER_TEMPLATE_TERMS, QC_TERMS } from '@/lib/platformTerminology';
import { OnboardingConfigPanel } from './onboarding/OnboardingConfigPanel';
import {
  OnboardingQcConfigPanel,
} from './onboarding/OnboardingQcConfigPanel';
import { OnboardingQcTestPanel } from './onboarding/OnboardingQcTestPanel';
import { OnboardingBuildTour } from './onboarding/OnboardingBuildTour';
import { AgentVersionPanel } from './onboarding/AgentVersionPanel';
import { OnboardingWorkspaceHeader } from './onboarding/OnboardingWorkspaceHeader';
import { isQcAgent, isQcTrainingComplete } from '@/lib/jobFamily';
import {
  loadBuildTourSeen,
  saveBuildTourSeen,
} from '@/lib/onboardingBuildTour';
import {
  OnboardingKnowledgePanel,
  OnboardingSkillsPanel,
  OnboardingChannelsPanel,
} from './onboarding/OnboardingWorkspacePanels';
import {
  DEFAULT_ONBOARDING_WORKSPACE_TAB,
  ONBOARDING_WORKSPACE_TABS,
  isOnboardingWorkspaceTab,
  type OnboardingWorkspaceTabId,
} from '@/lib/onboardingWorkspaceTabs';
import { SegmentedTabBar } from './common/SegmentedTabs';

const QC_ONBOARDING_TABS = [{ id: 'build' as const, label: '入职培训' }] as const;
import { ResizableSplitPane } from './common/ResizableSplitPane';
import { Modal } from './common/Modal';
import { BTN_INK, BTN_MD, BTN_SOFT } from '@/lib/ui';
import { ChatReplySkeleton, WorkLogSkeleton } from './common/LoadingSkeletons';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';
import { pickMockLatencyMs } from '@/lib/mockLatency';
import { buildAgentReplyPlan, planToThoughtSteps } from '../lib/agentReplyPlan';
import { mockAgentChatReply } from '../lib/mockAgentChatReply';
import type { ThoughtStep } from '../types';
import { ExecutionProcessFold } from './common/ExecutionProcessFold';
import {
  createSavedSnapshot,
  ensureAgentSnapshots,
  savedSnapshotTitle,
  snapshotToAgentUpdates,
} from '../lib/agentVersions';

function OnboardChatAgentAvatar({
  agent,
  relayAvatarIndex,
  className,
}: {
  agent: HiredAgent;
  relayAvatarIndex: number;
  className?: string;
}) {
  const display = agentAvatarForEditor(agent.avatar, relayAvatarIndex, agent.avatarCustomized);

  return (
    <Avatar className={cn('h-8 w-8 shrink-0 overflow-hidden', className)}>
      {display.kind === 'image' ? (
        <>
          <AvatarImage src={display.src} alt="" />
          <AvatarFallback className="bg-neutral-100" />
        </>
      ) : (
        <AvatarFallback className="bg-neutral-800 text-white text-sm select-none">
          {display.emoji}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

const ONBOARD_CHAT_BUBBLE =
  'px-3 py-2 rounded-lg bg-white border border-neutral-200 text-xs leading-relaxed text-neutral-800';

function createHexId(length = 32): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export const EmployeeManagePage: React.FC = () => {
  const { 
    hiredAgents, 
    updateHiredAgent, 
    deleteHiredAgent, 
    knowledgeBases, 
    skills,
    staff,
    demoStep,
    setDemoStep,
    activeTab,
    setActiveTab,
    activeOnboardingAgentId,
    setActiveOnboardingAgentId,
    onboardingWorkspaceTab,
    setOnboardingWorkspaceTab,
    createKnowledgeBase,
    updateKnowledgeBase,
    createSkill,
    showDemoGuide,
    setShowDemoGuide,
    showToast,
    setExperienceAgentId,
    setFocusKnowledgeBaseId,
    marketAgents,
  } = useApp();

  const onboardPanelBusy = useMockLatency(
    activeOnboardingAgentId ? `${activeOnboardingAgentId}:${onboardingWorkspaceTab}` : null,
    'panelSwitch',
  );
  const employeeListBusy = useMockLatency(
    activeOnboardingAgentId ? null : 'employees-cards',
    'pageList',
  );

  // Onboarding Workplace States
  const [onboardingRelayAvatarIndex, setOnboardingRelayAvatarIndex] = useState(0);
  const [openMenuAgentId, setOpenMenuAgentId] = useState<string | null>(null);
  const [dismissConfirmAgentId, setDismissConfirmAgentId] = useState<string | null>(null);

  type OnboardChatMsg = {
    id?: string;
    /** 员工回复关联的用户消息 id，用于挂载处理过程 */
    triggerMsgId?: string;
    sender: 'user' | 'agent' | 'system';
    text: string;
    time: string;
  };
  type OnboardExecution = {
    runId: string;
    steps: ThoughtStep[];
    status: 'running' | 'done';
  };

  const [onboardChatMsgs, setOnboardChatMsgs] = useState<OnboardChatMsg[]>([]);
  /** key = 触发本轮的用户消息 id */
  const [onboardExecutions, setOnboardExecutions] = useState<Record<string, OnboardExecution>>({});
  const [onboardChatInput, setOnboardChatInput] = useState('');
  const [onboardChatSpinning, setOnboardChatSpinning] = useState(false);
  const [hasSentOnboardMessage, setHasSentOnboardMessage] = useState(false);
  const [onboardSessionId, setOnboardSessionId] = useState(() => createHexId());
  const [onboardRightTab, setOnboardRightTab] = useState<'chat' | 'versions'>('chat');
  const [onboardConfigDirty, setOnboardConfigDirty] = useState(false);
  const [onboardConfigSavedAt, setOnboardConfigSavedAt] = useState<Date | null>(null);
  const [previewSnapshotId, setPreviewSnapshotId] = useState<string | null>(null);
  const [configSyncToken, setConfigSyncToken] = useState(0);
  const [kbPanelFocusId, setKbPanelFocusId] = useState<string | null>(null);
  const [kbPanelAutoCreate, setKbPanelAutoCreate] = useState(false);
  const [skillsPanelAutoCreate, setSkillsPanelAutoCreate] = useState(false);
  const [buildTourOpen, setBuildTourOpen] = useState(false);
  const [buildTourStep, setBuildTourStep] = useState(0);

  const closeBuildTour = useCallback((markSeen = true) => {
    if (markSeen) saveBuildTourSeen(true);
    setBuildTourOpen(false);
  }, []);

  const maybeStartBuildTour = useCallback(() => {
    if (!showDemoGuide) return;
    if (loadBuildTourSeen()) return;
    setOnboardingWorkspaceTab('build');
    setOnboardRightTab('chat');
    setBuildTourStep(0);
    setBuildTourOpen(true);
  }, [showDemoGuide, setOnboardingWorkspaceTab]);

  const handleOnboardConfigStateChange = useCallback(
    (state: { isDirty: boolean; lastSavedAt: Date | null }) => {
      setOnboardConfigDirty(state.isDirty);
      setOnboardConfigSavedAt(state.lastSavedAt);
    },
    [],
  );

  const advanceOnboardingDemo = (from: 'A2' | 'A3', to: 'A3' | 'A4' | null) => {
    if (demoStep === from) setDemoStep(to);
  };

  /** 第 2 步：需先保存再做能力测试 */
  const onboardingSaveRequired = demoStep === 'A2';
  const onboardingChatLocked = onboardingSaveRequired || !!previewSnapshotId;

  const handleSendOnboardTest = (onboardAgent: HiredAgent, textToSend?: string) => {
    if (onboardingChatLocked) {
      showToast(
        previewSnapshotId
          ? `请先取消预览或应用其他${LIFECYCLE_TERMS.examVersion}，再进行${LIFECYCLE_TERMS.onboardTest}。`
          : `请先点击左上角「保存」完成培训存档，再进行${LIFECYCLE_TERMS.onboardTest}。`,
      );
      return;
    }
    const rawText = textToSend || onboardChatInput;
    if (!rawText.trim()) return;

    const msgId = `msg_${Date.now()}`;
    const replyId = `${msgId}_reply`;
    // 32 位 hex runId，便于排查与复制
    const runId = createHexId();
    const time = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setOnboardChatMsgs((prev) => [
      ...prev,
      { id: msgId, sender: 'user', text: rawText, time },
      // 同一轮员工回复占位：处理过程挂在这条上，不另起对话轮次
      { id: replyId, triggerMsgId: msgId, sender: 'agent', text: '', time },
    ]);

    if (!textToSend) {
      setOnboardChatInput('');
    }

    setHasSentOnboardMessage(true);
    setOnboardChatSpinning(true);
    setOnboardExecutions((prev) => ({
      ...prev,
      [msgId]: { runId, steps: [], status: 'running' },
    }));

    const replyMs = pickMockLatencyMs('aiReply');
    const plan = buildAgentReplyPlan(
      onboardAgent,
      rawText,
      '测试访客',
      LIFECYCLE_TERMS.onboardTest,
      knowledgeBases,
      skills,
    );
    const allSteps = planToThoughtSteps(plan, msgId, time);
    const processSteps = allSteps.filter((s) => s.type !== 'output');
    const agentText = mockAgentChatReply(rawText, onboardAgent);

    const stepInterval = Math.max(280, Math.floor(replyMs / Math.max(processSteps.length + 1, 2)));
    let accumulated = 0;

    processSteps.forEach((step) => {
      accumulated += stepInterval;
      window.setTimeout(() => {
        setOnboardExecutions((prev) => {
          const current = prev[msgId];
          if (!current || current.status === 'done') return prev;
          return {
            ...prev,
            [msgId]: { ...current, steps: [...current.steps, step] },
          };
        });
      }, accumulated);
    });

    window.setTimeout(() => {
      const agentTime = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setOnboardExecutions((prev) => ({
        ...prev,
        [msgId]: { runId, steps: allSteps, status: 'done' },
      }));
      setOnboardChatMsgs((prev) =>
        prev.map((m) =>
          m.id === replyId ? { ...m, text: agentText, time: agentTime } : m,
        ),
      );
      setOnboardChatSpinning(false);
    }, replyMs);
  };

  // Dialog test state
  const [testAgent, setTestAgent] = useState<HiredAgent | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testMsgs, setTestMsgs] = useState<{sender: 'user'|'agent'|'system', text: string, time: string}[]>([
    { sender: 'system', text: `进入${LIFECYCLE_TERMS.onboardTest}。可在下方输入测试话术，验证员工知识与技能执行情况。`, time: '现在' }
  ]);
  const [testThinking, setTestThinking] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  // Link staff state
  const [bindAgent, setBindAgent] = useState<HiredAgent | null>(null);

  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'draft'>('all');

  // Create new Custom Agent states
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newKbId, setNewKbId] = useState('');
  const [newSkillId, setNewSkillId] = useState('');

  const filtered = hiredAgents.filter(a => {
    const sMatch = a.name.toLowerCase().includes(search.toLowerCase()) || a.agentId.toLowerCase().includes(search.toLowerCase());
    if (!sMatch) return false;
    
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const toggleStatus = (id: string, s: 'online' | 'draft') => {
    updateHiredAgent(id, { status: s === 'online' ? 'draft' : 'online' });
  };

  // Run mock dialog testing inside the modal
  const handleSendTest = () => {
    if (!testInput.trim() || !testAgent) return;
    
    const userMsg = testInput;
    setTestMsgs(prev => [...prev, { sender: 'user', text: userMsg, time: new Date().toTimeString().split(' ')[0] }]);
    setTestInput('');
    setIsSpinning(true);

    // Step 1 thinking trace
    setTestThinking(['1. 校验输入，激活数字员工大语言模型。', '2. 解析意图：分析文本是否带有售后、支持或优惠券逻辑。']);

    const replyMs = pickMockLatencyMs('aiReply');
    const t1 = Math.min(850, Math.floor(replyMs * 0.28));
    const t2 = Math.min(1500, Math.floor(replyMs * 0.48));

    setTimeout(() => {
      setTestThinking(prev => [...prev, `3. 检索员工知识。已配备 ${testAgent.knowledgeBases.length} 份。`]);
    }, t1);

    setTimeout(() => {
      setTestThinking(prev => [...prev, `4. 调用员工技能。[${testAgent.skills.map(sid => skills.find(sk => sk.id === sid)?.name || sid).join(', ') || '暂未配置'}]`]);
    }, t2);

    setTimeout(() => {
      let aiResponse = '您好！系统已经捕获了您的提问。针对这一情况，我们会安排专业客服极速核实！请问您需要帮您拉起人工顾问吗？';
      
      const t = userMsg.toLowerCase();
      if (t.includes('理赔') || t.includes('赔') || t.includes('吃坏') || t.includes('中毒') || t.includes('医疗') || t.includes('退款') || t.includes('钱')) {
        aiResponse = '已调用【食安险快速理赔测算器】。免赔额 500 元后，本次预估赔付约 2,700 元。请上传病历、发票与现场照片完成线上报案。';
      } else if (t.includes('拖') || t.includes('投诉') || t.includes('愤怒') || t.includes('糟糕') || t.includes('不管')) {
        aiResponse = '食安投诉情绪监测已触发，正在转接理赔专员人工坐席，工单已标记加急。';
      } else if (t.includes('保') || t.includes('范围') || t.includes('保费') || t.includes('价格') || t.includes('多少钱') || t.includes('保障')) {
        aiResponse = '根据《食安责任险产品说明手册 2026》，基础版约 1,280 元/店/年，含 100 万第三者责任限额。具体以门店档位为准。';
      }

      setTestMsgs(prev => [...prev, { 
        sender: 'agent', 
        text: aiResponse, 
        time: new Date().toTimeString().split(' ')[0] 
      }]);
      setTestThinking(prev => [...prev, '5. 生成结构化应答完毕。发射对话。']);
      setIsSpinning(false);
    }, replyMs);
  };

  const executeCreate = () => {
    if (!newName.trim()) return;
    
    // Create Agent manual
    const newAg: HiredAgent = {
      id: `h_custom_${Date.now()}`,
      name: newName,
      marketId: 'm_custom_gen',
      agentId: `AGENT_${Math.floor(200 + Math.random() * 700)}`,
      avatar: '🦾',
      description: newDesc || '自定义定制的强认知人工智能专家座席助理。',
      skills: newSkillId ? [newSkillId] : [],
      knowledgeBases: newKbId ? [newKbId] : [],
      status: 'draft',
      hiredAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    hiredAgents.unshift(newAg);
    setIsCreating(false);
    setNewName('');
    setNewDesc('');
    setNewKbId('');
    setNewSkillId('');
  };

  const onboardingAgent = activeOnboardingAgentId 
    ? hiredAgents.find(a => a.id === activeOnboardingAgentId) 
    : null;

  const previewSnapshot = useMemo(() => {
    if (!onboardingAgent || !previewSnapshotId) return null;
    return ensureAgentSnapshots(onboardingAgent).find((s) => s.id === previewSnapshotId) ?? null;
  }, [onboardingAgent, previewSnapshotId]);

  const dismissConfirmAgent = useMemo(
    () => hiredAgents.find((a) => a.id === dismissConfirmAgentId) ?? null,
    [hiredAgents, dismissConfirmAgentId],
  );

  const handleConfirmDismissAgent = () => {
    if (!dismissConfirmAgent) return;
    const { id, name } = dismissConfirmAgent;
    deleteHiredAgent(id);
    if (activeOnboardingAgentId === id) {
      setActiveOnboardingAgentId(null);
    }
    setDismissConfirmAgentId(null);
    showToast(DISMISS_EMPLOYEE_COPY.successToast, 'success');
  };

  useEffect(() => {
    if (demoStep === 'A2' && activeOnboardingAgentId) {
      setOnboardRightTab('versions');
    }
  }, [demoStep, activeOnboardingAgentId]);

  useEffect(() => {
    setPreviewSnapshotId(null);
    setOnboardSessionId(createHexId());
    setOnboardChatMsgs([]);
    setOnboardExecutions({});
    setHasSentOnboardMessage(false);
  }, [activeOnboardingAgentId]);

  useEffect(() => {
    if (!onboardingAgent?.configSnapshots?.some((s) => s.kind === 'baseline')) {
      if (!onboardingAgent) return;
      updateHiredAgent(onboardingAgent.id, {
        configSnapshots: ensureAgentSnapshots(onboardingAgent),
      });
    }
  }, [onboardingAgent?.id]);

  const openAgentWorkspace = (
    agentId: string,
    tab: OnboardingWorkspaceTabId = DEFAULT_ONBOARDING_WORKSPACE_TAB,
    relayAvatarIndex?: number,
    opts?: { startBuildTour?: boolean },
  ) => {
    setOnboardingWorkspaceTab(tab);
    setOnboardingRelayAvatarIndex(
      relayAvatarIndex ?? Math.max(0, hiredAgents.findIndex((a) => a.id === agentId)),
    );
    setActiveOnboardingAgentId(agentId);
    const target = hiredAgents.find((a) => a.id === agentId);
    if (opts?.startBuildTour !== false && !isQcAgent(target)) {
      // 下一帧再开，确保培训页 DOM 已挂载
      window.setTimeout(() => maybeStartBuildTour(), 80);
    }
  };

  // 雇佣后自动进入培训页时，同步触发遮罩引导（质检岗跳过客服遮罩）
  useEffect(() => {
    if (!activeOnboardingAgentId || !showDemoGuide) return;
    const agent = hiredAgents.find((a) => a.id === activeOnboardingAgentId);
    if (isQcAgent(agent)) return;
    if (loadBuildTourSeen()) return;
    if (onboardingWorkspaceTab !== 'build') return;
    if (buildTourOpen) return;
    const timer = window.setTimeout(() => maybeStartBuildTour(), 120);
    return () => window.clearTimeout(timer);
  }, [
    activeOnboardingAgentId,
    hiredAgents,
    showDemoGuide,
    onboardingWorkspaceTab,
    buildTourOpen,
    maybeStartBuildTour,
  ]);

  if (onboardingAgent) {
    const hasKbs = onboardingAgent.knowledgeBases && onboardingAgent.knowledgeBases.length > 0;
    const hasSks = onboardingAgent.skills && onboardingAgent.skills.length > 0;

    const handlePreviewSnapshot = (snapshotId: string) => {
      setPreviewSnapshotId(snapshotId);
      setOnboardRightTab('versions');
    };

    const handleCancelPreview = () => {
      setPreviewSnapshotId(null);
    };

    const handleApplySnapshot = (snapshotId: string) => {
      const snapshots = ensureAgentSnapshots(onboardingAgent);
      const snap = snapshots.find((s) => s.id === snapshotId);
      if (!snap) return;
      updateHiredAgent(onboardingAgent.id, {
        ...snapshotToAgentUpdates(snap),
        publishedSnapshotId: snapshotId,
      });
      setPreviewSnapshotId(null);
      setConfigSyncToken((t) => t + 1);
      setOnboardConfigDirty(false);
      showToast(`已切换至「${snap.title}」`);
    };

    const handleDeleteSnapshot = (snapshotId: string) => {
      const snapshots = ensureAgentSnapshots(onboardingAgent);
      const snap = snapshots.find((s) => s.id === snapshotId);
      if (!snap || snap.kind === 'baseline') return;
      if (onboardingAgent.publishedSnapshotId === snapshotId) {
        showToast('无法删除当前运行中的版本，请先应用其他版本。');
        return;
      }
      updateHiredAgent(onboardingAgent.id, {
        configSnapshots: snapshots.filter((s) => s.id !== snapshotId),
      });
      if (previewSnapshotId === snapshotId) setPreviewSnapshotId(null);
      showToast(`已删除「${snap.title}」`);
    };

    const handleDiscardDraft = () => {
      const snapshots = ensureAgentSnapshots(onboardingAgent);
      const published =
        snapshots.find((s) => s.id === onboardingAgent.publishedSnapshotId) ??
        snapshots.find((s) => s.kind === 'baseline');
      if (!published) return;
      updateHiredAgent(onboardingAgent.id, snapshotToAgentUpdates(published));
      setPreviewSnapshotId(null);
      setConfigSyncToken((t) => t + 1);
      setOnboardConfigDirty(false);
      showToast('已放弃未保存更改，恢复为当前运行版本。');
    };

    const handleOnboardConfigSaved = () => {
      const agent = hiredAgents.find((a) => a.id === onboardingAgent.id) ?? onboardingAgent;
      const snapshots = ensureAgentSnapshots(agent);
      const title = savedSnapshotTitle(agent, skills);
      const snapshot = createSavedSnapshot(agent, snapshots, title);
      updateHiredAgent(agent.id, {
        configSnapshots: [...snapshots, snapshot],
        publishedSnapshotId: snapshot.id,
      });
      setOnboardConfigSavedAt(new Date());
      setOnboardConfigDirty(false);
      if (demoStep === 'A2') {
        advanceOnboardingDemo('A2', 'A3');
        showToast(`培训存档已完成，可在右侧进行${LIFECYCLE_TERMS.onboardTest}。`);
      }
    };

    const isQcOnboarding = isQcAgent(onboardingAgent);

    const approveButton = (
      <button
        type="button"
        onClick={() => {
          if (isQcOnboarding) {
            if (!isQcTrainingComplete(onboardingAgent.qcProfile)) {
              showToast(QC_TERMS.completeBlocked);
              return;
            }
            setActiveOnboardingAgentId(null);
            showToast(QC_TERMS.completeSuccess);
            return;
          }
          if (onboardingSaveRequired) {
            showToast(`请先保存配置并完成培训存档，再进行${LIFECYCLE_TERMS.onboardTest}。`);
            return;
          }
          if (previewSnapshotId) {
            showToast(`请先取消预览或应用其他${LIFECYCLE_TERMS.examVersion}，再完成培训。`);
            return;
          }
          setActiveOnboardingAgentId(null);
          if (demoStep === 'A3') {
            setDemoStep('A4');
            showToast(
              `「${onboardingAgent.name}」培训已完成。可在员工卡片上「上岗」，或到「组织管理 → 坐席管理」配备协同数字员工。`,
            );
          } else {
            showToast(`「${onboardingAgent.name}」培训已完成。需要接待时，请在员工卡片上点击「上岗」。`);
          }
        }}
        disabled={!isQcOnboarding && onboardingChatLocked}
        className={cn(
          BTN_MD,
          'gap-1.5',
          !isQcOnboarding && onboardingChatLocked && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Zap size={13} className="fill-current" />
        <span>{LIFECYCLE_TERMS.completeTraining}</span>
      </button>
    );

    return (
      <div className="h-screen w-screen flex flex-col bg-paper overflow-hidden text-neutral-800 font-sans">
        <OnboardingWorkspaceHeader
          tabs={isQcOnboarding ? QC_ONBOARDING_TABS : ONBOARDING_WORKSPACE_TABS}
          activeTabId={onboardingWorkspaceTab}
          onTabChange={(id) => {
            if (isOnboardingWorkspaceTab(id)) setOnboardingWorkspaceTab(id);
          }}
          onBack={() => setActiveOnboardingAgentId(null)}
          actions={approveButton}
        />

        <ContentBusy
          busy={onboardPanelBusy}
          size="panel"
          minHeight="min(60vh, 520px)"
          className="flex-1 min-h-0"
        >
        {onboardingWorkspaceTab === 'build' && isQcOnboarding && (
          <ResizableSplitPane
            storageKey="js_qc_onboarding_split"
            defaultRatio={0.55}
            className="bg-paper"
            left={
              <OnboardingQcConfigPanel
                agent={onboardingAgent}
                updateHiredAgent={updateHiredAgent}
                showToast={showToast}
                onSaved={handleOnboardConfigSaved}
                lastSavedAt={onboardConfigSavedAt}
                relayAvatarIndex={onboardingRelayAvatarIndex}
                onConfigStateChange={handleOnboardConfigStateChange}
              />
            }
            right={
              <OnboardingQcTestPanel
                agent={onboardingAgent}
                updateHiredAgent={updateHiredAgent}
                showToast={showToast}
              />
            }
          />
        )}

        {onboardingWorkspaceTab === 'build' && !isQcOnboarding && (
        <ResizableSplitPane
          storageKey="js_onboarding_split"
          defaultRatio={7 / 12}
          className="bg-paper"
          left={
            <OnboardingConfigPanel
              agent={onboardingAgent}
              relayAvatarIndex={onboardingRelayAvatarIndex}
              knowledgeBases={knowledgeBases}
              skills={skills}
              hasKbs={hasKbs}
              hasSks={hasSks}
              updateHiredAgent={updateHiredAgent}
              showToast={showToast}
              onPersonaConfigured={() => {}}
              onKnowledgeBound={() => {}}
              onSkillBound={() => {}}
              onConfigStateChange={handleOnboardConfigStateChange}
              onConfigSaved={handleOnboardConfigSaved}
              previewSnapshot={previewSnapshot}
              configSyncToken={configSyncToken}
              onCancelPreview={handleCancelPreview}
              onApplyPreview={() => previewSnapshot && handleApplySnapshot(previewSnapshot.id)}
              buildTourStep={buildTourOpen ? buildTourStep : null}
              onCreateSkill={() => {
                setSkillsPanelAutoCreate(true);
                setOnboardingWorkspaceTab('skills');
              }}
            />
          }
          right={
          <div
            data-tour-id="test-panel"
            className="flex flex-col h-full bg-paper overflow-hidden text-neutral-800 text-left"
          >
            <div className="flex-1 flex flex-col h-full overflow-hidden text-neutral-800 bg-paper min-h-0">
                <div className="px-4 py-2.5 bg-white border-b border-neutral-200 flex items-center justify-between shrink-0 gap-2 min-h-[54px]">
                  <SegmentedTabBar
                    ariaLabel="预览面板"
                    value={onboardRightTab}
                    onChange={(id) => setOnboardRightTab(id as 'chat' | 'versions')}
                    items={[
                      { id: 'chat', label: LIFECYCLE_TERMS.onboardTest },
                      { id: 'versions', label: LIFECYCLE_TERMS.examVersion },
                    ]}
                  />
                  {onboardRightTab === 'chat' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(onboardSessionId).then(
                            () => showToast('会话 ID 已复制'),
                            () => showToast('复制失败'),
                          );
                        }}
                        className="text-neutral-500 hover:text-neutral-800 h-7 px-2 text-xs gap-1 cursor-pointer shrink-0"
                        title={onboardSessionId}
                      >
                        <Copy size={12} />
                        会话ID复制
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setOnboardChatMsgs([{ sender: 'system', text: `已重置${LIFECYCLE_TERMS.onboardTest}，清空对话记录。`, time: '现在' }]);
                          setOnboardExecutions({});
                          setHasSentOnboardMessage(false);
                          setOnboardSessionId(createHexId());
                        }}
                        className="text-neutral-500 hover:text-neutral-800 h-7 px-2 text-xs gap-1 cursor-pointer shrink-0"
                        title="重置对话"
                      >
                        <Trash2 size={12} />
                        重置对话
                      </Button>
                    </div>
                  )}
                </div>

                {onboardRightTab === 'chat' ? (
                  <>
                {onboardingSaveRequired && !previewSnapshotId && (
                  <div className="mx-4 mt-3 mb-0 rounded-[13px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 leading-relaxed shrink-0">
                    引导提示：请先在左侧点击「保存」完成培训存档，保存成功后再进行{LIFECYCLE_TERMS.onboardTest}。
                  </div>
                )}
                {/* Message window */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0 bg-paper">
                  <div className="flex gap-2.5 items-start">
                    <OnboardChatAgentAvatar
                      agent={onboardingAgent}
                      relayAvatarIndex={onboardingRelayAvatarIndex}
                    />
                    <div className="space-y-2 max-w-[85%]">
                      <div className={cn(ONBOARD_CHAT_BUBBLE, 'rounded-tl-sm')}>
                        {onboardingAgent.openingLine ||
                          defaultOpeningLineForAgent(onboardingAgent.name)}
                      </div>
                    </div>
                  </div>
                  {onboardChatMsgs.map((m, idx) => {
                    if (m.sender === 'system') {
                      return (
                        <div key={m.id ?? idx} className="flex justify-center my-2 select-none">
                          <span className="bg-white text-neutral-500 text-[10.5px] px-3.5 py-1.5 rounded-full text-center border border-neutral-200 max-w-sm leading-relaxed block shadow-xs font-mono font-medium">
                            {m.text}
                          </span>
                        </div>
                      );
                    }

                    const isUser = m.sender === 'user';
                    const execution =
                      !isUser && m.triggerMsgId
                        ? onboardExecutions[m.triggerMsgId]
                        : undefined;
                    const userQuery = m.triggerMsgId
                      ? onboardChatMsgs.find((msg) => msg.id === m.triggerMsgId)?.text
                      : undefined;
                    const hasReplyText = Boolean(m.text.trim());

                    return (
                      <div
                        key={m.id ?? idx}
                        className={cn(
                          'flex gap-2.5 items-start py-0.5',
                          isUser ? 'justify-end' : 'justify-start',
                        )}
                      >
                        {!isUser && (
                          <OnboardChatAgentAvatar
                            agent={onboardingAgent}
                            relayAvatarIndex={onboardingRelayAvatarIndex}
                          />
                        )}

                        <div
                          className={cn(
                            'flex flex-col max-w-[85%] gap-1',
                            isUser ? 'items-end' : 'items-start',
                          )}
                        >
                          {/* 处理过程：挂在员工回复内，不单独占一轮对话 */}
                          {execution && (
                            <ExecutionProcessFold
                              steps={execution.steps}
                              status={execution.status}
                              userQuery={userQuery}
                              runId={execution.runId}
                              onCopyRunId={(id) => {
                                void navigator.clipboard.writeText(id).then(
                                  () => showToast('runId 已复制'),
                                  () => showToast('复制失败'),
                                );
                              }}
                            />
                          )}

                          {hasReplyText && (
                            <div
                              className={cn(
                                ONBOARD_CHAT_BUBBLE,
                                isUser ? 'rounded-tr-sm' : 'rounded-tl-sm',
                              )}
                            >
                              {m.text}
                            </div>
                          )}

                          {(hasReplyText || isUser) && (
                            <span className="text-[9px] text-neutral-400 font-mono tracking-wider px-1 font-bold">
                              {m.time}
                            </span>
                          )}
                        </div>

                        {isUser && (
                          <Avatar className="h-8 w-8 rounded-full overflow-hidden after:hidden shrink-0 ring-2 ring-white shadow-sm">
                            <AvatarFallback className={cn(PROFILE_USER.fallbackClass, 'select-none text-[12px]')}>
                              {PROFILE_USER.initial}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Input area */}
                <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
                  <div className="flex gap-2 items-center">
                    <Input
                      value={onboardChatInput}
                      onChange={(e) => setOnboardChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !onboardChatSpinning && onboardChatInput.trim()) {
                          handleSendOnboardTest(onboardingAgent);
                        }
                      }}
                      disabled={onboardChatSpinning || onboardingChatLocked}
                      placeholder={
                        onboardingChatLocked
                          ? previewSnapshotId
                            ? '预览模式中无法测试'
                            : '请先保存配置后再测试'
                          : EMPLOYEE_PAGE_COPY.testPlaceholder
                      }
                      className="flex-1 bg-paper border-neutral-200 text-neutral-900 placeholder:text-neutral-400 text-xs h-10 rounded-[7px] focus-visible:ring-neutral-400 focus-visible:border-neutral-500"
                    />
                    <Button
                      size="sm"
                      disabled={onboardChatSpinning || onboardingChatLocked || !onboardChatInput.trim()}
                      onClick={() => handleSendOnboardTest(onboardingAgent)}
                      className="bg-neutral-800 hover:opacity-90 text-white font-bold h-10 px-3 rounded-[7px] flex items-center justify-center transition cursor-pointer shrink-0 active:scale-95 shadow-sm"
                    >
                      <Send size={13} className="text-white" />
                    </Button>
                  </div>
                </div>
                  </>
                ) : (
                  <AgentVersionPanel
                    agent={onboardingAgent}
                    knowledgeBases={knowledgeBases}
                    skills={skills}
                    isDirty={onboardConfigDirty}
                    lastSavedAt={onboardConfigSavedAt}
                    previewSnapshotId={previewSnapshotId}
                    onPreview={handlePreviewSnapshot}
                    onApplySnapshot={handleApplySnapshot}
                    onDeleteSnapshot={handleDeleteSnapshot}
                    onDiscardDraft={handleDiscardDraft}
                  />
                )}
              </div>
          </div>
          }
        />
        )}

        {!isQcOnboarding && onboardingWorkspaceTab === 'kb' && (
          <OnboardingKnowledgePanel
            agent={onboardingAgent}
            knowledgeBases={knowledgeBases}
            createKnowledgeBase={createKnowledgeBase}
            updateHiredAgent={updateHiredAgent}
            updateKnowledgeBase={updateKnowledgeBase}
            showToast={showToast}
            initialSelectedKbId={kbPanelFocusId}
            onClearInitialSelect={() => setKbPanelFocusId(null)}
            initialOpenCreate={kbPanelAutoCreate}
            onClearInitialCreate={() => setKbPanelAutoCreate(false)}
          />
        )}

        {!isQcOnboarding && onboardingWorkspaceTab === 'skills' && (
          <OnboardingSkillsPanel
            agent={onboardingAgent}
            skills={skills}
            createSkill={createSkill}
            updateHiredAgent={updateHiredAgent}
            showToast={showToast}
            onSkillBound={() => {}}
            initialOpenCreate={skillsPanelAutoCreate}
            onClearInitialCreate={() => setSkillsPanelAutoCreate(false)}
          />
        )}

        {!isQcOnboarding && onboardingWorkspaceTab === 'channels' && (
          <OnboardingChannelsPanel agent={onboardingAgent} showToast={showToast} />
        )}
        </ContentBusy>

        {!isQcOnboarding && (
        <OnboardingBuildTour
          open={buildTourOpen && onboardingWorkspaceTab === 'build'}
          currentStep={buildTourStep}
          onStepChange={setBuildTourStep}
          onClose={() => closeBuildTour(true)}
          onComplete={() => {
            closeBuildTour(true);
            if (demoStep === 'A2') {
              // 遮罩引导完成，仍停留在第 2 步，引导用户保存
            }
            showToast(ONBOARDING_TOAST_STEP2);
          }}
        />
        )}
      </div>
    );
  }

  return (
    <>
    <EmployeeHomeRelay
      activeSubTab="employees"
      onSubTabChange={(tab) => setActiveTab(tab)}
      onStartHire={() => {
        setShowDemoGuide(true);
        setDemoStep('A1');
        setActiveTab('market');
        showToast(`第一步：${ONBOARDING_TOAST_STEP1}`);
      }}
      onCreateFromScratch={() => setIsCreating(true)}
      search={search}
      onSearchChange={setSearch}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      listBusy={employeeListBusy}
    >
      {filtered.length === 0 ? (
        <div className={homeStyles.emptyState}>
          {hiredAgents.length === 0 ? (
            <>
              <img
                className={homeStyles.emptyImage}
                src={RELAY_HOME_ASSETS.employeesEmpty}
                alt=""
              />
              <div className={homeStyles.emptyTextGroup}>
                <div className={homeStyles.emptyTitle}>{EMPLOYEE_PAGE_COPY.emptyList}</div>
                <div className={homeStyles.emptySubtitle}>{EMPLOYEE_PAGE_COPY.emptyHint}</div>
              </div>
            </>
          ) : (
            <div className={homeStyles.emptySubtitle}>{EMPLOYEE_PAGE_COPY.noMatch}</div>
          )}
        </div>
      ) : (
      filtered.map((agent, index) => {
        const isOnline = agent.status === 'online';
        const cardAvatar = agentAvatarForCard(agent.avatar, index, agent.avatarCustomized);
        const marketAgent = marketAgents.find((m) => m.id === agent.marketId);
        const hasTrainNotice = hasEmployeeTrainNotice(agent, marketAgent);
        return (
          <EmployeeCardRelay
            key={agent.id}
            name={agent.name}
            desc={agent.description}
            avatar={cardAvatar.kind === 'image' ? cardAvatar.src : cardAvatar.emoji}
            avatarFallback={cardAvatar.kind === 'emoji' ? cardAvatar.emoji : undefined}
            isOnline={isOnline}
            hasTrainNotice={hasTrainNotice}
            onTrain={() => openAgentWorkspace(agent.id, 'build', index)}
            onToggleStatus={() => toggleStatus(agent.id, agent.status)}
            onMoreClick={(e) => {
              e.stopPropagation();
              setOpenMenuAgentId(openMenuAgentId === agent.id ? null : agent.id);
            }}
            moreOpen={openMenuAgentId === agent.id}
            moreMenu={
              openMenuAgentId === agent.id ? (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setOpenMenuAgentId(null)} />
                  <div className="absolute right-0 bottom-12 z-30 bg-white border border-neutral-200 shadow-[0_12px_30px_rgba(0,0,0,0.12)] rounded-[13px] py-2 w-[148px] text-left animate-in fade-in slide-in-from-bottom-2 duration-150">
                    {isQcAgent(agent) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuAgentId(null);
                          if (!isOnline) {
                            showToast('请先上岗后再进入质检工作台');
                            return;
                          }
                          setActiveTab('qcWorkspace');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-[11px] font-extrabold text-neutral-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        进入质检工作台
                      </button>
                    ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isOnline) {
                          showToast(`未上线员工不可预览，请先${LIFECYCLE_TERMS.approveOnline}`);
                          return;
                        }
                        setOpenMenuAgentId(null);
                        setExperienceAgentId(agent.id);
                        setActiveTab('customerExperience');
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-[11px] font-extrabold flex items-center gap-1.5',
                        isOnline
                          ? 'hover:bg-neutral-50 text-neutral-700 cursor-pointer'
                          : 'text-neutral-400 cursor-not-allowed opacity-50',
                      )}
                    >
                      💬 客户体验预览
                    </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuAgentId(null);
                        openAgentWorkspace(agent.id, 'channels', undefined, { startBuildTour: false });
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-[11px] font-extrabold text-neutral-700 flex items-center gap-1.5 cursor-pointer border-t border-neutral-100"
                    >
                      🚀 派出数字员工
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuAgentId(null);
                        void navigator.clipboard.writeText(agent.id).then(
                          () => showToast('数字员工 ID 已复制'),
                          () => showToast('复制失败，请手动选择 ID'),
                        );
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-[11px] font-extrabold text-neutral-700 flex items-center gap-1.5 cursor-pointer border-t border-neutral-100"
                    >
                      📋 复制数字员工ID
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuAgentId(null);
                        const nameVal = prompt('请输入数字员工的新名字（限8字）：', agent.name);
                        if (nameVal?.trim()) {
                          updateHiredAgent(agent.id, { name: nameVal.trim().slice(0, 8) });
                          showToast('更新成功');
                        }
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-50 text-[11px] font-extrabold text-neutral-700 flex items-center gap-1.5 cursor-pointer border-t border-neutral-100"
                    >
                      ✏️ 重命名
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuAgentId(null);
                        setDismissConfirmAgentId(agent.id);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-rose-50 text-[11px] font-extrabold text-rose-500 border-t border-neutral-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      🚪 辞退员工
                    </button>
                  </div>
                </>
              ) : null
            }
          />
        );
      }))
      }
    </EmployeeHomeRelay>

      {/* CREATE NEW CUSTOM AGENT MODAL */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[13px] w-full max-w-md shadow-2xl p-6 text-neutral-800 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-black text-neutral-950 mb-3 tracking-tight">自建数字员工</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">员工名称 * (限8字)</label>
                <input 
                  type="text" 
                  maxLength={8}
                  placeholder="不超过8个字" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 focus:outline-none focus:border-neutral-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 mb-1">能力描述与岗位职责</label>
                <textarea 
                  placeholder="主要负责回答高层企业级客户的计费、账目扣抵等。语气需要专业严谨..." 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-lg p-2.5 h-20 focus:outline-none focus:border-neutral-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">{EMPLOYEE_RESOURCE_TERMS.employeeKnowledge}</label>
                  <select 
                    value={newKbId}
                    onChange={e => setNewKbId(e.target.value)}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-lg p-2.5"
                  >
                    <option value="">{EMPLOYEE_RESOURCE_TERMS.assignNone}</option>
                    {knowledgeBases.map(k => (
                      <option key={k.id} value={k.id}>{k.name.substring(0, 15)}...</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 mb-1">{EMPLOYEE_RESOURCE_TERMS.employeeSkill}</label>
                  <select 
                    value={newSkillId}
                    onChange={e => setNewSkillId(e.target.value)}
                    className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-lg p-2.5"
                  >
                    <option value="">{EMPLOYEE_RESOURCE_TERMS.assignNone}</option>
                    {skills.map(s => (
                      <option key={s.id} value={s.id}>{s.name.substring(0, 15)}...</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-neutral-100">
              <button 
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg"
              >
                取消
              </button>
              <button 
                onClick={executeCreate}
                className="px-4 py-2 text-xs font-bold bg-ink hover:bg-ink-hover text-white rounded-lg shadow-sm"
              >
                开始招聘
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOGUE SANDBOX TESTING MODAL */}
      {testAgent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[13px] w-full max-w-4xl shadow-2xl h-[560px] flex overflow-hidden text-neutral-800 animate-in fade-in duration-200">
            {/* Left columns: Chat flow */}
            <div className="flex-1 flex flex-col bg-neutral-50 border-r border-neutral-100">
              {/* Header */}
              <div className="p-4 bg-white border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{testAgent.avatar}</div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-sm">{testAgent.name.slice(0, 8)}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setTestAgent(null)}
                  className="text-neutral-400 hover:text-neutral-600 p-1 hover:bg-neutral-100 rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Message scroll list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
                {testMsgs.map((m, idx) => {
                  if (m.sender === 'system') {
                    return (
                      <div key={idx} className="flex justify-center">
                        <span className="bg-neutral-200/80 text-neutral-600 text-[10px] px-3 py-1 rounded-full text-center border border-neutral-300/30 max-w-md leading-relaxed">
                          {m.text}
                        </span>
                      </div>
                    );
                  }

                  const isUser = m.sender === 'user';
                  return (
                    <div key={idx} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center select-none shrink-0 ${
                        isUser ? 'bg-neutral-800 text-white font-semibold text-[12px]' : 'bg-neutral-100 text-lg border border-neutral-200'
                      }`}>
                        {isUser ? PROFILE_USER.initial : testAgent.avatar}
                      </div>

                      <div className="max-w-[70%]">
                        <div className={`p-3 rounded-[13px] text-xs leading-relaxed text-neutral-800 ${
                          isUser ? 'bg-ink text-white rounded-tr-none' : 'bg-white rounded-tl-none border border-neutral-200 shadow-sm'
                        }`}>
                          {m.text}
                        </div>
                        <span className="block text-[9px] text-neutral-400 mt-1 ${isUser ? 'text-right' : ''}">
                          {m.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {isSpinning && <ChatReplySkeleton />}
              </div>

              {/* Dialogue input box */}
              <div className="p-3 bg-white border-t border-neutral-200">
                <div className="flex gap-2 bg-neutral-50 border border-neutral-200 rounded-[13px] p-1.5 focus-within:border-neutral-500">
                  <input 
                    type="text" 
                    placeholder="输入测试话术（例如：闪退退货/多少钱）验证回答策略…" 
                    value={testInput}
                    onChange={e => setTestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendTest()}
                    disabled={isSpinning}
                    className="flex-1 bg-transparent px-2.5 border-none outline-none text-xs text-neutral-700 placeholder-neutral-400"
                  />
                  <button 
                    onClick={handleSendTest}
                    disabled={isSpinning || !testInput.trim()}
                    className="h-8 w-8 bg-ink hover:bg-ink-hover disabled:bg-neutral-200 text-white font-bold rounded-lg flex items-center justify-center transition cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right column: Trace visualizer of steps */}
            <div className="w-80 bg-neutral-800 text-neutral-300 flex flex-col p-5 overflow-y-auto">
              <h4 className="text-xs uppercase text-neutral-500 font-bold tracking-wider mb-4 border-b border-neutral-800 pb-2 flex items-center gap-1.5">
                <Cpu size={14} className="text-live" />
                <span>工作日志</span>
              </h4>

              <div className="space-y-4 text-xs">
                {testThinking.length === 0 && !isSpinning ? (
                  <div className="p-6 text-center text-neutral-600 italic">
                    <p>等待键盘录入...</p>
                    <p className="text-[10px] mt-2">发送消息即可在此查阅 AI 在后台的多级关联、调用以及决策推导过程。</p>
                  </div>
                ) : (
                  <>
                    {testThinking.map((step, idx) => (
                      <div key={idx} className="bg-neutral-950/60 p-2.5 rounded border border-neutral-800/80 font-mono text-[11px] leading-relaxed relative animate-in slide-in-from-top-2 duration-150">
                        {step}
                      </div>
                    ))}
                    {isSpinning ? <WorkLogSkeleton rows={2} className="py-4 opacity-90" /> : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LINK SITTING REAL HUMAN STAFF MODAL */}
      {bindAgent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[13px] w-full max-w-md shadow-2xl p-6 text-neutral-800">
            <h3 className="font-extrabold text-neutral-900 text-base mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-neutral-700" />
              <span>指定兜底坐席</span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {staff.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition text-xs">
                  <div>
                    <span className="font-bold text-neutral-800">{s.name}</span>
                    <span className="text-[10px] text-neutral-400 ml-2">工号: {s.workId}</span>
                  </div>
                  <button 
                    onClick={() => {
                      showToast(ORG_COPY.bindStaffSuccess(s.name));
                      setBindAgent(null);
                    }}
                    className="bg-ink hover:bg-ink-hover text-white px-3 py-1 rounded text-[10px] font-bold cursor-pointer"
                  >
                    确认绑定
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-neutral-100 mt-5">
              <button 
                onClick={() => setBindAgent(null)}
                className="px-4 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-bold"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={!!dismissConfirmAgent}
        onClose={() => setDismissConfirmAgentId(null)}
        title={DISMISS_EMPLOYEE_COPY.modalTitle}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDismissConfirmAgentId(null)}
              className={BTN_SOFT}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmDismissAgent}
              className={cn(
                BTN_INK,
                'bg-destructive hover:bg-destructive/90 text-white border-transparent',
              )}
            >
              {DISMISS_EMPLOYEE_COPY.confirmButton}
            </button>
          </>
        }
      >
        <p className="text-neutral-500 leading-relaxed">
          {dismissConfirmAgent
            ? DISMISS_EMPLOYEE_COPY.body(dismissConfirmAgent.name)
            : null}
        </p>
      </Modal>
    </>
  );
};
