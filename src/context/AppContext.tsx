/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  AgentMarketInfo, 
  HiredAgent, 
  KnowledgeBase, 
  Skill, 
  ABTest, 
  Task, 
  HumanStaff, 
  RolePermission, 
  ChatSession,
  ChatMessage,
  ThoughtStep
} from '../types';
import { generateTodosForUnresolved, mergeTodos } from '../lib/sessionTodos';
import { buildAgentReplyPlan, planToThoughtSteps } from '../lib/agentReplyPlan';
import { SESSION_COPY } from '@/lib/platformTerminology';
import { createBaselineSnapshot } from '../lib/agentVersions';
import {
  DEFAULT_ONBOARDING_WORKSPACE_TAB,
  type OnboardingWorkspaceTabId,
} from '@/lib/onboardingWorkspaceTabs';
import { createDefaultQcProfile } from '@/lib/jobFamily';
import type { ToastType } from '@/lib/ui';
import { showAppToast } from '@/lib/appToast';
import { pickMockLatencyMs } from '@/lib/mockLatency';
import {
  INITIAL_MARKET_AGENTS, 
  INITIAL_HIRED_AGENTS, 
  INITIAL_KNOWLEDGE_BASES, 
  KB_SEED_VERSION,
  INITIAL_SKILLS, 
  INITIAL_AB_TESTS, 
  INITIAL_TASKS, 
  INITIAL_HUMAN_STAFF, 
  INITIAL_ROLES, 
  INITIAL_SESSIONS,
  FOOD_SAFETY_AGENT_DEFAULTS,
  QC_AGENT_DEFAULTS,
  TEMPLATE_DEMO_SEED_VERSION,
} from '../mockData';
import {
  defaultFallbackScriptForAgent,
  defaultOpeningLineForAgent,
} from '@/lib/agentDefaultCopy';

function migrateFoodSafetyTheme(agents: HiredAgent[]): HiredAgent[] {
  return agents.map(a => {
    const isLegacyContent =
      a.marketId === 'm_content' ||
      a.name.includes('内容运营') ||
      a.name.includes('JoyServing 产品');
    if (!isLegacyContent) return a;
    const suffix = a.name.match(/#\d+$/)?.[0] ?? '';
    const baseName = a.marketId === 'm_sales' ? '食安险商户顾问' : '食安险客服专员';
    return {
      ...a,
      name: `${baseName}${suffix}`,
      avatar: FOOD_SAFETY_AGENT_DEFAULTS.avatar,
      description: FOOD_SAFETY_AGENT_DEFAULTS.description,
      persona: a.persona || FOOD_SAFETY_AGENT_DEFAULTS.persona,
      languageStyle: a.languageStyle || FOOD_SAFETY_AGENT_DEFAULTS.languageStyle,
      constraints: a.constraints || FOOD_SAFETY_AGENT_DEFAULTS.constraints,
      openingLine: a.openingLine || defaultOpeningLineForAgent(a.name),
      fallbackScript: a.fallbackScript || defaultFallbackScriptForAgent(),
      backgroundKnowledge: a.backgroundKnowledge || FOOD_SAFETY_AGENT_DEFAULTS.backgroundKnowledge,
      workflowNotes: a.workflowNotes || FOOD_SAFETY_AGENT_DEFAULTS.workflowNotes,
      skills: (a.skills ?? []).map(id => (id === 's_refund' ? 's_claim' : id)),
      knowledgeBases: (a.knowledgeBases ?? []).map(id => (id === 'kb_refund' ? 'kb_claim' : id)),
    };
  });
}

/** 确保「食安险客服专员」母版升级演示可重复看到（除非用户已同步或暂不处理） */
function migrateTemplateUpgradeDemo(agents: HiredAgent[]): HiredAgent[] {
  const stored = localStorage.getItem('js_template_demo_seed');
  if (stored === TEMPLATE_DEMO_SEED_VERSION) return agents;

  localStorage.setItem('js_template_demo_seed', TEMPLATE_DEMO_SEED_VERSION);

  const seed = INITIAL_HIRED_AGENTS.find((a) => a.id === 'h_food_safety');
  if (!seed?.syncedTemplateVersion) return agents;

  return agents.map((a) =>
    a.id === 'h_food_safety'
      ? {
          ...a,
          marketId: 'm_content',
          syncedTemplateVersion: seed.syncedTemplateVersion,
          templateUpgradeDismissedVersion: undefined,
        }
      : a,
  );
}

/** 安全读取并解析 localStorage，脏数据/解析失败时回退默认值，避免初始化白屏 */
function safeReadJSON<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function normalizeAgentDefaults(agents: HiredAgent[]): HiredAgent[] {
  return agents.map((a) => ({
    ...a,
    openingLine: a.openingLine?.trim() || defaultOpeningLineForAgent(a.name),
    fallbackScript: a.fallbackScript?.trim() || defaultFallbackScriptForAgent(),
  }));
}

function loadHiredAgents(): HiredAgent[] {
  const list = safeReadJSON<HiredAgent[]>('js_hired_agents', INITIAL_HIRED_AGENTS);
  const normalized = Array.isArray(list) ? list : INITIAL_HIRED_AGENTS;
  return normalizeAgentDefaults(
    migrateTemplateUpgradeDemo(migrateFoodSafetyTheme(normalized)),
  );
}

function mergeSeedKnowledgeBases(parsed: KnowledgeBase[]): KnowledgeBase[] {
  const existingIds = new Set(parsed.map((k) => k.id));
  const missing = INITIAL_KNOWLEDGE_BASES.filter((k) => !existingIds.has(k.id));
  return missing.length > 0 ? [...parsed, ...missing] : parsed;
}

function loadKnowledgeBases(): KnowledgeBase[] {
  const seedVersion = localStorage.getItem('js_kb_seed');
  if (seedVersion !== KB_SEED_VERSION) {
    localStorage.setItem('js_kb_seed', KB_SEED_VERSION);
    localStorage.removeItem('js_kb');
    return INITIAL_KNOWLEDGE_BASES;
  }
  const parsed = safeReadJSON<KnowledgeBase[]>('js_kb', INITIAL_KNOWLEDGE_BASES);
  if (!Array.isArray(parsed)) return INITIAL_KNOWLEDGE_BASES;
  if (parsed.some(k => k.name.includes('JoyServing') || k.name.includes('退换货'))) {
    return INITIAL_KNOWLEDGE_BASES;
  }
  return mergeSeedKnowledgeBases(parsed);
}

function loadSkills(): Skill[] {
  const parsed = safeReadJSON<Skill[]>('js_skills', INITIAL_SKILLS);
  if (!Array.isArray(parsed)) return INITIAL_SKILLS;
  if (parsed.some(s => s.id === 's_refund' || s.name.includes('退换货'))) {
    return INITIAL_SKILLS;
  }
  return parsed;
}

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  // Dynamic data states
  marketAgents: AgentMarketInfo[];
  hiredAgents: HiredAgent[];
  knowledgeBases: KnowledgeBase[];
  skills: Skill[];
  abTests: ABTest[];
  tasks: Task[];
  staff: HumanStaff[];
  roles: RolePermission[];
  sessions: ChatSession[];
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  selectedStaffId: string;
  setSelectedStaffId: (id: string) => void;
  activeRoleId: string;
  setActiveRoleId: (id: string) => void;
  
  // Tutorial walkthrough state
  demoStep: 'A1' | 'A2' | 'A3' | 'A4' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3' | null;
  setDemoStep: (step: 'A1' | 'A2' | 'A3' | 'A4' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3' | null) => void;

  showDemoGuide: boolean;
  setShowDemoGuide: (show: boolean) => void;

  showTaskCenter: boolean;
  setShowTaskCenter: (show: boolean) => void;

  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  activeOnboardingAgentId: string | null;
  setActiveOnboardingAgentId: (id: string | null) => void;

  onboardingWorkspaceTab: OnboardingWorkspaceTabId;
  setOnboardingWorkspaceTab: (tab: OnboardingWorkspaceTabId) => void;

  focusKnowledgeBaseId: string | null;
  setFocusKnowledgeBaseId: (id: string | null) => void;

  workspaceDeskAgentId: string | null;
  setWorkspaceDeskAgentId: (id: string | null) => void;

  experienceAgentId: string | null;
  setExperienceAgentId: (id: string | null) => void;

  showToast: (message: string, type?: ToastType) => void;

  // Actions
  hireAgent: (marketId: string) => void;
  updateHiredAgent: (id: string, updates: Partial<HiredAgent>) => void;
  deleteHiredAgent: (id: string) => void;
  createKnowledgeBase: (name: string) => KnowledgeBase;
  updateKnowledgeBase: (id: string, updates: Partial<KnowledgeBase>) => void;
  deleteKnowledgeBase: (id: string) => void;
  createSkill: (name: string, description: string, type: 'subscribed' | 'mine' | 'market') => Skill;
  deleteSkill: (id: string) => void;
  createABTest: (name: string, agentAId: string, agentBId: string, ratioA: number) => void;
  updateABTest: (id: string, updates: Partial<ABTest>) => void;
  deleteABTest: (id: string) => void;
  createTask: (name: string, type: string, targetAgentId: string, cron: string, command: string, audience?: 'b' | 'c') => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  createStaff: (name: string, account: string, workId: string, email: string, roleId: string, maxSlots: number, boundAgentIds?: string[]) => void;
  updateStaff: (id: string, updates: Partial<HumanStaff>) => void;
  deleteStaff: (id: string) => void;
  updateRolePermissions: (roleId: string, permissionKey: string, val: boolean) => void;
  createRole: (name: string) => void;
  
  // Chat Operations
  addCustomerMessage: (sessionId: string, content: string) => void;
  triggerAIResponse: (sessionId: string) => void;
  transferToHuman: (sessionId: string, staffId: string) => void;
  toggleAutoPilot: (sessionId: string, isAuto: boolean) => void;
  completeSession: (sessionId: string, rating?: 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied') => void;
  generateAICallSummary: (sessionId: string) => void;
  simulateNewIncomingChat: (scenarioType?: 'normal' | 'angry' | 'vip') => void;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation key
  const [activeTab, setActiveTabState] = useState<string>(() => {
    return localStorage.getItem('js_active_tab') || 'employees';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    localStorage.setItem('js_active_tab', tab);
  };

  // Demo state
  const [demoStep, setDemoStep] = useState<'A1' | 'A2' | 'A3' | 'A4' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3' | null>(null);
  const [showDemoGuide, setShowDemoGuide] = useState<boolean>(false); // FALSE by default so it stays clean and simple!
  const [showTaskCenter, setShowTaskCenter] = useState<boolean>(false);

  // Sidebar fold/collapse state
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    if (localStorage.getItem('js_active_onboarding_agent_id')) return true;
    return localStorage.getItem('js_sidebar_collapsed') === 'true';
  });

  const [activeOnboardingAgentId, setActiveOnboardingAgentIdState] = useState<string | null>(() => {
    return localStorage.getItem('js_active_onboarding_agent_id') || null;
  });

  const [onboardingWorkspaceTab, setOnboardingWorkspaceTabState] = useState<OnboardingWorkspaceTabId>(
    DEFAULT_ONBOARDING_WORKSPACE_TAB,
  );

  const setOnboardingWorkspaceTab = (tab: OnboardingWorkspaceTabId) => {
    setOnboardingWorkspaceTabState(tab);
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem('js_sidebar_collapsed', collapsed ? 'true' : 'false');
  };

  const setActiveOnboardingAgentId = (id: string | null) => {
    setActiveOnboardingAgentIdState(id);
    if (id) {
      localStorage.setItem('js_active_onboarding_agent_id', id);
      setSidebarCollapsed(true);
    } else {
      localStorage.removeItem('js_active_onboarding_agent_id');
      setOnboardingWorkspaceTabState(DEFAULT_ONBOARDING_WORKSPACE_TAB);
    }
  };

  const [focusKnowledgeBaseId, setFocusKnowledgeBaseId] = useState<string | null>(null);
  const [workspaceDeskAgentId, setWorkspaceDeskAgentId] = useState<string | null>(null);
  const [experienceAgentId, setExperienceAgentId] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    showAppToast(message, type);
  }, []);

  // Core business lists loading from localStorage or defaults
  const [marketAgents] = useState<AgentMarketInfo[]>(INITIAL_MARKET_AGENTS);
  
  const [hiredAgents, setHiredAgents] = useState<HiredAgent[]>(loadHiredAgents);

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(loadKnowledgeBases);

  const [skills, setSkills] = useState<Skill[]>(loadSkills);

  const [abTests, setABTests] = useState<ABTest[]>(() =>
    safeReadJSON<ABTest[]>('js_ab_tests', INITIAL_AB_TESTS),
  );

  const [tasks, setTasks] = useState<Task[]>(() =>
    safeReadJSON<Task[]>('js_tasks', INITIAL_TASKS),
  );

  const [staff, setStaff] = useState<HumanStaff[]>(() =>
    safeReadJSON<HumanStaff[]>('js_staff', INITIAL_HUMAN_STAFF),
  );

  const [roles, setRoles] = useState<RolePermission[]>(() =>
    safeReadJSON<RolePermission[]>('js_roles', INITIAL_ROLES),
  );

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const parsed = safeReadJSON<ChatSession[]>('js_sessions', INITIAL_SESSIONS);
    const list = Array.isArray(parsed) ? parsed : INITIAL_SESSIONS;
    return list.map((s) => ({ ...s, todos: s.todos ?? [], channel: s.channel ?? 'link' }));
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('js_selected_session');
    return saved || 's_user_001';
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string>('hs_001');
  const [activeRoleId, setActiveRoleId] = useState<string>('r_admin');

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem('js_hired_agents', JSON.stringify(hiredAgents));
  }, [hiredAgents]);

  useEffect(() => {
    localStorage.setItem('js_kb', JSON.stringify(knowledgeBases));
  }, [knowledgeBases]);

  useEffect(() => {
    localStorage.setItem('js_skills', JSON.stringify(skills));
  }, [skills]);

  useEffect(() => {
    localStorage.setItem('js_ab_tests', JSON.stringify(abTests));
  }, [abTests]);

  useEffect(() => {
    localStorage.setItem('js_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('js_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('js_roles', JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem('js_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (selectedSessionId) {
      localStorage.setItem('js_selected_session', selectedSessionId);
    } else {
      localStorage.removeItem('js_selected_session');
    }
  }, [selectedSessionId]);

  // Operations Implementations

  const hireAgent = (marketId: string) => {
    const base = marketAgents.find(m => m.id === marketId);
    if (!base) return;

    const count = hiredAgents.filter(a => a.marketId === marketId).length;
    const nameSuffix = count > 0 ? ` #${count + 1}` : '';

    const agentName = `${base.name}${nameSuffix}`;

    const jobFamily = base.jobFamily ?? 'customer_service';
    const isQc = jobFamily === 'quality_inspection';

    const newAgent: HiredAgent = {
      id: `h_${marketId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: agentName,
      marketId: base.id,
      agentId: `AGENT_${Math.floor(100 + Math.random() * 900)}`,
      avatar: base.avatar,
      description: base.description,
      skills: [],
      knowledgeBases: [],
      status: 'draft',
      hiredAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      jobFamily,
      openingLine: isQc
        ? `您好，我是质检专员「${agentName}」。请提供样例会话，我将按已配置标准给出质检结果。`
        : defaultOpeningLineForAgent(agentName),
      fallbackScript: defaultFallbackScriptForAgent(),
      ...(isQc
        ? {
            ...QC_AGENT_DEFAULTS,
            avatar: base.avatar || QC_AGENT_DEFAULTS.avatar,
            description: base.description || QC_AGENT_DEFAULTS.description,
            qcProfile: createDefaultQcProfile(),
          }
        : marketId === 'm_content'
          ? FOOD_SAFETY_AGENT_DEFAULTS
          : marketId === 'm_sales'
            ? {
                persona: FOOD_SAFETY_AGENT_DEFAULTS.persona,
                languageStyle: FOOD_SAFETY_AGENT_DEFAULTS.languageStyle,
                constraints: FOOD_SAFETY_AGENT_DEFAULTS.constraints,
                backgroundKnowledge: FOOD_SAFETY_AGENT_DEFAULTS.backgroundKnowledge,
                workflowNotes: FOOD_SAFETY_AGENT_DEFAULTS.workflowNotes,
              }
            : {}),
    };

    const agentWithBaseline: HiredAgent = {
      ...newAgent,
      configSnapshots: [createBaselineSnapshot(newAgent)],
    };

    setHiredAgents(prev => [agentWithBaseline, ...prev]);
    setOnboardingWorkspaceTabState(DEFAULT_ONBOARDING_WORKSPACE_TAB);
    setActiveOnboardingAgentId(agentWithBaseline.id);
    setActiveTab('employees');

    // Demo advancement
    if (demoStep === 'A1') {
      setDemoStep('A2'); // Next: Configure or view in Employed section
    }
  };

  const updateHiredAgent = (id: string, updates: Partial<HiredAgent>) => {
    setHiredAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteHiredAgent = (id: string) => {
    setHiredAgents(prev => prev.filter(a => a.id !== id));
  };

  const createKnowledgeBase = (name: string): KnowledgeBase => {
    const item: KnowledgeBase = {
      id: `kb_${Date.now()}`,
      name,
      firstChar: name.charAt(0) || '知',
      docCount: 1,
      wordCount: Math.floor(1200 + Math.random() * 5000),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setKnowledgeBases(prev => [item, ...prev]);
    return item;
  };

  const deleteKnowledgeBase = (id: string) => {
    setKnowledgeBases(prev => prev.filter(k => k.id !== id));
    // Remove references
    setHiredAgents(prev => prev.map(a => ({
      ...a,
      knowledgeBases: a.knowledgeBases.filter(kbId => kbId !== id)
    })));
  };

  const updateKnowledgeBase = (id: string, updates: Partial<KnowledgeBase>) => {
    setKnowledgeBases(prev => prev.map(k => {
      if (k.id !== id) return k;
      const next = { ...k, ...updates };
      if (updates.name !== undefined) {
        next.firstChar = updates.name.charAt(0) || '知';
        next.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
      }
      return next;
    }));
  };

  const createSkill = (name: string, description: string, type: 'subscribed' | 'mine' | 'market'): Skill => {
    const item: Skill = {
      id: `s_${Date.now()}`,
      name,
      author: '开发者自主',
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      usedByAgents: [],
      type,
      description
    };
    setSkills(prev => [item, ...prev]);
    return item;
  };

  const deleteSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
    // Remove references
    setHiredAgents(prev => prev.map(a => ({
      ...a,
      skills: a.skills.filter(sId => sId !== id)
    })));
  };

  const createABTest = (name: string, agentAId: string, agentBId: string, ratioA: number) => {
    const test: ABTest = {
      id: `ab_${Date.now()}`,
      name,
      agentAId,
      agentBId,
      ratioA,
      ratioB: 100 - ratioA,
      status: 'running',
      createdAt: new Date().toISOString().substring(0, 10),
      sessionsCountA: 0,
      sessionsCountB: 0,
      satisfactionA: 0,
      satisfactionB: 0,
      transferRateA: 0,
      transferRateB: 0,
      avgResponseTimeA: 0,
      avgResponseTimeB: 0
    };
    setABTests(prev => [test, ...prev]);
  };

  const updateABTest = (id: string, updates: Partial<ABTest>) => {
    setABTests(prev => prev.map(t => t.id === id ? { ...t, ...updates } as ABTest : t));
  };

  const deleteABTest = (id: string) => {
    setABTests(prev => prev.filter(t => t.id !== id));
  };

  const createTask = (name: string, type: string, targetAgentId: string, cron: string, command: string, audience: 'b' | 'c' = 'b') => {
    const t: Task = {
      id: `t_${Date.now()}`,
      name,
      type,
      targetAgentId,
      cronExpression: cron,
      lastExecutedAt: '从未执行',
      enabled: true,
      actionCommand: command,
      audience,
      durationLabel: '-',
    };
    setTasks(prev => [t, ...prev]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const createStaff = (name: string, account: string, workId: string, email: string, roleId: string, maxSlots: number, boundAgentIds?: string[]) => {
    const s: HumanStaff = {
      id: `hs_${Date.now()}`,
      name,
      account,
      workId,
      email,
      roleId,
      maxSlots,
      boundAgentIds: boundAgentIds?.length ? boundAgentIds : undefined,
    };
    setStaff(prev => [...prev, s]);
  };

  const updateStaff = (id: string, updates: Partial<HumanStaff>) => {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStaff = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const updateRolePermissions = (roleId: string, permissionKey: string, val: boolean) => {
    setRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [permissionKey]: val
          }
        };
      }
      return r;
    }));
  };

  const createRole = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `r_${Date.now()}`;
    const role: RolePermission = {
      id,
      name: trimmed,
      userCount: 0,
      permissions: {
        market: false,
        agents: false,
        kb: false,
        skills: false,
        abTest: false,
        tasks: false,
        staff: false,
        roles: false,
        workspace: true,
        dashboard: false,
        sessions: false,
      },
    };
    setRoles(prev => [...prev, role]);
    setActiveRoleId(id);
  };

  // Chat Actions

  const addCustomerMessage = (sessionId: string, content: string) => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'customer',
      name: '客户',
      content,
      timestamp: new Date().toTimeString().split(' ')[0]
    };

    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          messages: [...s.messages, newMessage]
        };
      }
      return s;
    }));

    // Trigger thinking trace simulation based on whether Auto pilot is enabled
    const targetSession = sessions.find(s => s.id === sessionId);
    if (targetSession && targetSession.status === 'auto') {
      setTimeout(() => triggerAIResponse(sessionId), pickMockLatencyMs('panelSwitch'));
    }
  };

  const triggerAIResponse = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) return;

    const lastCustomer = [...target.messages].reverse().find((m) => m.sender === 'customer');
    if (!lastCustomer?.id) return;

    const triggerMessageId = lastCustomer.id;
    const agent = hiredAgents.find((a) => a.id === target.assignedAgentId);
    if (!agent) return;

    const plan = buildAgentReplyPlan(
      agent,
      lastCustomer.content,
      target.customerName,
      target.scenario,
      knowledgeBases,
      skills,
    );
    const plannedSteps = planToThoughtSteps(plan, triggerMessageId);
    const processSteps = plannedSteps.filter((s) => s.type !== 'output');
    const outputStep = plannedSteps.find((s) => s.type === 'output');

    const appendSteps = (batch: ThoughtStep[]) => {
      if (!batch.length) return;
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, thoughtTrace: [...s.thoughtTrace, ...batch] } : s,
        ),
      );
    };

    const infoSteps = processSteps.filter((s) => s.type === 'info');
    const resourceSteps = processSteps.filter((s) => s.type === 'search' || s.type === 'tool');
    const decisionSteps = processSteps.filter((s) => s.type === 'decision');

    const replyMs = pickMockLatencyMs('aiReply');
    const tResource = Math.floor(replyMs * 0.28);
    const tDecision = Math.floor(replyMs * 0.55);

    appendSteps(infoSteps);
    setTimeout(() => appendSteps(resourceSteps), tResource);
    setTimeout(() => appendSteps(decisionSteps), tDecision);

    setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;

          const text = lastCustomer.content;
          let aiText = '您提问的情况我已经为您记录，请问还有什么我可以帮您的吗？';
          let updatedStatus = s.status;
          const showTransferSysMsg = plan.useTransferTool;

          if (plan.intent === 'claim') {
            const skillName = plan.skills[0]?.name ?? '食安险快速理赔测算器';
            aiText = `收到！已调用【${skillName}】并结合员工知识为您精算。优惠券与折旧规则已核对，实退金额将按保单条款说明，请稍候查看账户。`;
          } else if (plan.intent === 'angry') {
            aiText = `非常抱歉给您带来不好的体验。${agent.name} 已触发情绪监测并为您发起人工通道，值班坐席将尽快接手，请保持在线。`;
            updatedStatus = 'queued';
          } else if (plan.intent === 'vip' || plan.intent === 'product') {
            const kbName = plan.knowledgeBases[0]?.name ?? '员工知识';
            aiText = `根据【${kbName}】为您说明：${agent.name} 已检索相关条款，如需商务定制我将为您转接专人进一步确认。`;
          } else {
            aiText = `您好，我是 ${agent.name}。已参考员工知识理解您的问题，请问还需要哪方面说明？`;
          }

          const aiMsg: ChatMessage = {
            id: `msg_ai_${Date.now()}`,
            sender: 'ai',
            name: agent.name,
            content: aiText,
            timestamp: new Date().toTimeString().split(' ')[0],
          };

          const newMsgs = [...s.messages, aiMsg];
          if (showTransferSysMsg) {
            newMsgs.push({
              id: `msg_system_${Date.now()}`,
              sender: 'system',
              name: '系统分流中心',
              content: SESSION_COPY.angryTransfer,
              timestamp: new Date().toTimeString().split(' ')[0],
            });
          }

          const newTodos = showTransferSysMsg
            ? mergeTodos(s.todos ?? [], generateTodosForUnresolved(text, triggerMessageId))
            : (s.todos ?? []);

          return {
            ...s,
            status: updatedStatus,
            messages: newMsgs,
            thoughtTrace: outputStep ? [...s.thoughtTrace, outputStep] : s.thoughtTrace,
            todos: newTodos,
          };
        }),
      );
    }, replyMs);
  };

  const transferToHuman = (sessionId: string, staffId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const staffObj = staff.find(st => st.id === staffId);
        const name = staffObj ? staffObj.name : 'TAOs';
        
        const sysMsg: ChatMessage = {
          id: `msg_tran_${Date.now()}`,
          sender: 'system',
          name: '系统流转',
          content: SESSION_COPY.transferToStaff(name),
          timestamp: new Date().toTimeString().split(' ')[0]
        };

        const trace: ThoughtStep = {
          id: `step_tr_${Date.now()}`,
          time: new Date().toTimeString().split(' ')[0],
          type: 'info',
          message: SESSION_COPY.transferTrace(staffObj?.workId || 'STAFF_001', name)
        };

        return {
          ...s,
          status: 'manual',
          isTransferred: true,
          assignedStaffId: staffId,
          messages: [...s.messages, sysMsg],
          thoughtTrace: [...s.thoughtTrace, trace]
        };
      }
      return s;
    }));
  };

  const toggleAutoPilot = (sessionId: string, isAuto: boolean) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const trace: ThoughtStep = {
          id: `step_ap_${Date.now()}`,
          time: new Date().toTimeString().split(' ')[0],
          type: 'decision',
          message: isAuto ? SESSION_COPY.autoPilotOn : SESSION_COPY.autoPilotOff
        };

        return {
          ...s,
          status: isAuto ? 'auto' : 'manual',
          thoughtTrace: [...s.thoughtTrace, trace]
        };
      }
      return s;
    }));
  };

  const completeSession = (sessionId: string, rating?: 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied') => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const complMessage: ChatMessage = {
          id: `msg_comp_${Date.now()}`,
          sender: 'system',
          name: '会话结束',
          content: '买家客户对本次人机协同服务给予了积极评价。本次接待圆满关单。',
          timestamp: new Date().toTimeString().split(' ')[0]
        };

        return {
          ...s,
          status: 'completed',
          satisfaction: rating || 'very_satisfied',
          messages: [...s.messages, complMessage]
        };
      }
      return s;
    }));
  };

  const updateSession = (sessionId: string, updates: Partial<ChatSession>) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, ...updates } : s)));
  };

  const generateAICallSummary = (sessionId: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const totalMsgs = s.messages.length;
        const customerTextCount = s.messages.filter(m => m.sender === 'customer').length;
        const triggerReason = s.isTransferred ? '高沸点敏感词触发转人工' : '数字员工全程独立接待解决';
        
        let customSummary = '【大模型全自动小结生成成功】\n';
        if (s.customerName === '何家豪') {
          customSummary += '1. 会话主体: 客户为何家豪先生，咨询刚入手网关即无限闪退无法开机故障。\n' +
            '2. 情绪波动: 伴随极其狂躁的愤怒言辞，指责网关磨损是退货二手货，申明三倍赔付，并威胁工商局举报。\n' +
            '3. 协同事实: 机器人智能情绪捕获，全自动转接至超级主管 TAOs 接单，真人坐席火速承接。拟定免费换新物理大网关，并赠送VIP三年订阅，成功化解客户重大投诉危机。\n' +
            '4. 建议跟进: 安排库管审查此退货物理件批次，客户情绪指数恢复正常，对主管安抚效果高度好评。';
        } else if (s.customerName === '林晓萍') {
          customSummary += '1. 会话主体: 林女士关于 299 元折后退货退款少 20 元账目纠纷。\n' +
            '2. 协同事实: 全程数字员工托管。通过 [多场景退换货极速计算器] 技能给出扣减 20 元折旧费的公式解答，客户理解一致，完成静默关单。\n' +
            '3. 服务评级: 极高响应，无人工介入。推荐列入常规 FAQ 归档。';
        } else {
          customSummary += `1. 问题痛点: 针对用户关于 ${s.scenario} 场景的深度互动说明。\n` +
            `2. 链路特征: ${triggerReason}，累计交互 ${totalMsgs} 轮，买家发言 ${customerTextCount} 次。\n` +
            `3. 核心方案: 结合员工知识与技能，就对应痛点给出清晰解释，并保留人工旁路支撑机制。`;
        }

        const summaryMsg: ChatMessage = {
          id: `msg_sum_${Date.now()}`,
          sender: 'system',
          name: 'AI 生成服务小结',
          content: customSummary,
          timestamp: new Date().toTimeString().split(' ')[0],
          isSummary: true
        };

        return {
          ...s,
          summary: customSummary,
          messages: [...s.messages, summaryMsg]
        };
      }
      return s;
    }));
  };

  const simulateNewIncomingChat = (scenarioType?: 'normal' | 'angry' | 'vip') => {
    const randomId = `sim_${Date.now().toString().slice(-4)}`;
    let customerName = '张小强';
    let phoneOrEmail = '159****4992';
    let scenario = '咨询产品多网口互联功能';
    let content = '请问你们家的 AI 网关同时支持多少个网口，我需要支持企业级千兆交换机中继，可以吗？';
    let status: 'auto' | 'queued' | 'manual' = 'auto';

    if (scenarioType === 'angry') {
      customerName = '赵建国';
      phoneOrEmail = '135****4422';
      scenario = '投诉扣款双重算';
      content = '为什么我微信付过一次，系统又自动续期扣了我一次？你们是土匪吧！把你们总监叫出来，不然我明天把这事发到黑猫投诉上，真是太垃圾了！！😠';
      status = 'queued';
    } else if (scenarioType === 'vip') {
      customerName = '陈董事长-VIP';
      phoneOrEmail = 'ceo.chen@vip-group.com';
      scenario = '年单集团专属采购协议';
      content = '你好，我们是阿里海外云中台。打算统购 400 个大套餐点位作为海外客服，折扣怎么打，需要找负责商务的人详细签线下合同。';
      status = 'auto';
    }

    const simMsgId = `msg_s_${Date.now()}_1`;
    const simNow = new Date().toTimeString().split(' ')[0];

    const newSim: ChatSession = {
      id: randomId,
      customerName,
      phoneOrEmail,
      scenario,
      avatarSeed: Math.floor(Math.random() * 99),
      channel: scenarioType === 'vip' ? 'web' : scenarioType === 'angry' ? 'chat' : 'link',
      status,
      isTransferred: scenarioType === 'angry',
      assignedAgentId: 'h_sales',
      createdAt: new Date().toISOString().substring(0, 16).replace('T', ' '),
      messages: [
        {
          id: simMsgId,
          sender: 'customer',
          name: customerName,
          content,
          timestamp: simNow,
        }
      ],
      thoughtTrace: [
        {
          id: `step_s_${Date.now()}_1`,
          time: simNow,
          type: 'info',
          message: '新客户进线，识别场景类型',
          triggerMessageId: simMsgId,
        }
      ],
      todos: [],
    };

    setSessions(prev => [newSim, ...prev]);
    setSelectedSessionId(randomId);

    // If VIP or normal, trigger thinking immediately
    if (status === 'auto') {
      setTimeout(() => {
        triggerAIResponse(randomId);
      }, 500);
    } else if (scenarioType === 'angry') {
      setTimeout(() => {
        setSessions((prev) =>
          prev.map((s) => {
            if (s.id !== randomId) return s;
            const triggerId = s.messages.find((m) => m.sender === 'customer')?.id;
            const customerContent = s.messages.find((m) => m.sender === 'customer')?.content ?? '';
            const agent = hiredAgents.find((a) => a.id === s.assignedAgentId);
            const plannedTrace =
              agent && triggerId
                ? planToThoughtSteps(
                    buildAgentReplyPlan(
                      agent,
                      customerContent,
                      customerName,
                      scenario,
                      knowledgeBases,
                      skills,
                    ),
                    triggerId,
                  )
                : [];
            const newTodos = mergeTodos(
              s.todos ?? [],
              generateTodosForUnresolved(customerContent, triggerId),
            );
            return {
              ...s,
              thoughtTrace: [...s.thoughtTrace, ...plannedTrace],
              todos: newTodos,
            };
          }),
        );
      }, 500);
    }
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      marketAgents,
      hiredAgents,
      knowledgeBases,
      skills,
      abTests,
      tasks,
      staff,
      roles,
      sessions,
      selectedSessionId,
      setSelectedSessionId,
      selectedStaffId,
      setSelectedStaffId,
      activeRoleId,
      setActiveRoleId,
      
      demoStep,
      setDemoStep,

      showDemoGuide,
      setShowDemoGuide,

      showTaskCenter,
      setShowTaskCenter,

      sidebarCollapsed,
      setSidebarCollapsed,

      activeOnboardingAgentId,
      setActiveOnboardingAgentId,

      onboardingWorkspaceTab,
      setOnboardingWorkspaceTab,

      focusKnowledgeBaseId,
      setFocusKnowledgeBaseId,

      workspaceDeskAgentId,
      setWorkspaceDeskAgentId,

      experienceAgentId,
      setExperienceAgentId,

      showToast,

      hireAgent,
      updateHiredAgent,
      deleteHiredAgent,
      createKnowledgeBase,
      updateKnowledgeBase,
      deleteKnowledgeBase,
      createSkill,
      deleteSkill,
      createABTest,
      updateABTest,
      deleteABTest,
      createTask,
      updateTask,
      deleteTask,
      createStaff,
      updateStaff,
      deleteStaff,
      updateRolePermissions,
      createRole,
      
      addCustomerMessage,
      triggerAIResponse,
      transferToHuman,
      toggleAutoPilot,
      completeSession,
      generateAICallSummary,
      simulateNewIncomingChat,
      updateSession,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
