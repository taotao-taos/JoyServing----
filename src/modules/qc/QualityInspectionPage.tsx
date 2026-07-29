import React, { useState, useMemo, useEffect } from "react";
import { 
  Database, FileText, Bot, Bell, BarChart3, Settings2, ChevronDown, Clock, User, ShieldAlert, ArrowRight, Sparkles, Scale, CheckCircle2, AlertCircle, HelpCircle, TrendingUp, Sliders, Check, X, MessageSquare, AlertTriangle, RefreshCw, Search, CheckCircle, Filter, Layers, Zap, CheckSquare, Activity, Send, UserCheck, Calendar, Plus, Play, Pause, Cpu, ShieldCheck, Award, LogOut, Lock, Eye, EyeOff, Shield
} from '@/lib/icons';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';

import { 
  Role, ROLE_LABELS, DataSource, QualityTemplate, QualityCampaign, AuditTask, CoachingTask 
} from "./quality/types";

import { 
  initialDataSources, initialTemplates, initialCampaigns, initialAuditTasks, initialCoachingTasks 
} from "./quality/mockData";


import { DataSourcesView } from "./quality/DataSourcesView";
import { RulesEngineView } from "./quality/RulesEngineView";
import { CampaignsView } from "./quality/CampaignsView";
import { WorklistInspectDesk } from "./quality/WorklistInspectDesk";
import { ReinspectionDesk } from "./quality/ReinspectionDesk";
import { CsrDashboard } from "./quality/CsrDashboard";
import { WorkflowEditor } from "./quality/WorkflowEditor";
import { OpsConsole } from "./quality/OpsConsole";
import { qcNotify } from './qcNotify';

export const QualityInspectionPage: React.FC = () => {
  
  const [role, setRole] = useState<Role>('manager');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  
  
  const [activeSidebarTab, setActiveSidebarTab] = useState<'agent_cockpit' | 'pipelines' | 'rules' | 'campaigns' | 'workflow' | 'taskdesk' | 'ops' | 'analytics'>('agent_cockpit');

  
  const [dataSources, setDataSources] = useState<DataSource[]>(initialDataSources);
  const [templates, setTemplates] = useState<QualityTemplate[]>(initialTemplates);
  const [campaigns, setCampaigns] = useState<QualityCampaign[]>(initialCampaigns);
  const [auditTasks, setAuditTasks] = useState<AuditTask[]>(initialAuditTasks);
  const [coachingTasks, setCoachingTasks] = useState<CoachingTask[]>(initialCoachingTasks);

  
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    type: "manual_voice" as DataSource['type'],
    syncFrequency: "实时同步",
    apiUrl: "",
    authType: "OAuth2 / SecToken",
    rateLimit: "1000/min",
    accessMethod: "internal",
    agentName: "agent_starbucks"
  });

  
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    dataSourceId: "src-1",
    templateId: "tmpl-1",
    scope: "100%全量初筛",
    totalVolume: 500
  });

  
  const [selectedTask, setSelectedTask] = useState<AuditTask | null>(null);
  const [auditChecklist, setAuditChecklist] = useState({
    greetingOk: true,
    complianceOk: true,
    accuracyOk: true,
    noBannedWords: true,
    responseTimeOk: true
  });
  const [manualScores, setManualScores] = useState({
    greeting: 10,
    compliance: 40,
    accuracy: 50
  });
  const [inspectorComment, setInspectorComment] = useState("");

  
  const [isAiAgentRunning, setIsAiAgentRunning] = useState(true);
  const [liveStreamEvents, setLiveStreamEvents] = useState<Array<{
    id: string;
    time: string;
    session: string;
    agent: string;
    template: string;
    score: number;
    status: 'passed' | 'warning';
    reason?: string;
  }>>([
    { id: "evt-1", time: "14:40:22", session: "#REQ-9524", agent: "薛程月", template: "高端理财与基金投资合规模板", score: 100, status: 'passed' },
    { id: "evt-2", time: "14:39:15", session: "#REQ-3420", agent: "赵晓亮", template: "高端理财与基金投资合规模板", score: 58, status: 'warning', reason: "违背适当性评估：触发红线词【绝对稳赚不赔】" },
    { id: "evt-3", time: "14:38:02", session: "#REQ-1249", agent: "钱雨桐", template: "健康险售前咨询红线检测规范", score: 95, status: 'passed' },
    { id: "evt-4", time: "14:36:50", session: "#REQ-7721", agent: "孙博超", template: "信用卡及分期业务规范模板", score: 72, status: 'warning', reason: "静音时长达150s且解答含糊，触发【回复态度冷漠】警告" },
    { id: "evt-5", time: "14:35:10", session: "#REQ-6091", agent: "薛程月", template: "标准客户服务话术规范", score: 98, status: 'passed' }
  ]);

  
  useEffect(() => {
    if (!isAiAgentRunning) return;

    const interval = setInterval(() => {
      const agents = ["薛程月", "赵晓亮", "钱雨桐", "孙博超", "周杰伦"];
      const tmpls = ["高端理财与基金投资合规模板", "健康险售前咨询红线检测规范", "信用卡及分期业务规范模板"];
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const randomTmpl = tmpls[Math.floor(Math.random() * tmpls.length)];
      const scores = [100, 95, 92, 88, 76, 52, 65];
      const randomScore = scores[Math.floor(Math.random() * scores.length)];
      
      const isWarning = randomScore < 80;
      const reasons = [
        "触发绝对承诺用语【保证保本】",
        "客户咨询账单利息时坐席搪塞【不知道、系统就这样】",
        "坐席回复间隔长达180秒，判定【严重超时】",
        "未遵循如实告知提醒，存在非理财强制捆绑嫌疑"
      ];
      
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const newEvt = {
        id: `evt-${Date.now()}`,
        time: timeStr,
        session: `#REQ-${Math.floor(10000 + Math.random() * 90000)}`,
        agent: randomAgent,
        template: randomTmpl,
        score: randomScore,
        status: (isWarning ? 'warning' : 'passed') as 'passed' | 'warning',
        reason: isWarning ? reasons[Math.floor(Math.random() * reasons.length)] : undefined
      };

      setLiveStreamEvents(prev => [newEvt, ...prev.slice(0, 7)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [isAiAgentRunning]);

  
  const ROLE_PERMISSIONS = useMemo(() => {
    return {
      manager: {
        accessibleTabs: ['agent_cockpit', 'pipelines', 'rules', 'campaigns', 'workflow', 'taskdesk', 'ops', 'analytics'],
        dataScope: "万安理财质检中心 - 全局租户主视角（可读、可配置算子、可流式调控数据源、全员申诉终局仲裁）",
        badgeColor: "bg-neutral-100 border-sky-200 text-neutral-700"
      },
      operator: {
        accessibleTabs: ['agent_cockpit', 'pipelines', 'rules', 'campaigns', 'workflow', 'taskdesk', 'ops', 'analytics'],
        dataScope: "系统集成运维视角（可同步多级管道、调测模型网关时延、部署全渠道流式接口）",
        badgeColor: "bg-sky-50 border-sky-200 text-sky-700"
      },
      first_inspector: {
        accessibleTabs: ['taskdesk', 'analytics'],
        dataScope: "人工初检一审队列（仅被分配AI预警及可疑件、无权修改底层算法算子及数据同步）",
        badgeColor: "bg-amber-50 border-amber-200 text-amber-700"
      },
      re_inspector: {
        accessibleTabs: ['taskdesk', 'analytics'],
        dataScope: "高级争议复核裁判庭（仅被授予申诉驳回/通过仲裁权，其余核心配置安全隔离）",
        badgeColor: "bg-rose-50 border-rose-200 text-rose-700"
      },
      csr: {
        accessibleTabs: ['taskdesk'],
        dataScope: "坐席个人效能工作台（严格数据隔离保护：仅能浏览薛程月本人会话与辅导，他人隐私绝对不可见）",
        badgeColor: "bg-emerald-50 border-emerald-200 text-emerald-700"
      }
    };
  }, []);

  
  const isTabAuthorized = (tab: typeof activeSidebarTab) => {
    return ROLE_PERMISSIONS[role].accessibleTabs.includes(tab);
  };

  
  const handleRoleSwap = (newRole: Role) => {
    setRole(newRole);
    setShowRoleSelector(false);
    setSelectedTask(null);

    
    if (newRole === 'csr') {
      setActiveSidebarTab('taskdesk');
    } else if (newRole === 'first_inspector' || newRole === 're_inspector') {
      setActiveSidebarTab('taskdesk');
    } else {
      setActiveSidebarTab('agent_cockpit');
    }
  };

  
  const handleAddDataSource = () => {
    if (!newSource.name || !newSource.name.trim()) {
      newSource.name = "新数据接入管道";
    }
    const added: DataSource = {
      id: `src-${Date.now()}`,
      name: newSource.name,
      type: newSource.type,
      status: "active",
      syncFrequency: newSource.syncFrequency || "实时同步",
      totalRecords: Math.floor(Math.random() * 500 + 100),
      lastSyncTime: "刚刚已握手",
      agentName: newSource.agentName,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      modifier: '当前用户',
      modifiedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
      config: {
        apiUrl: newSource.apiUrl || "https://api.yourcompany.com/v1/sync",
        authType: newSource.authType,
        rateLimit: newSource.rateLimit
      }
    };
    setDataSources([...dataSources, added]);
    setShowAddSourceModal(false);
    setNewSource({
      name: "",
      type: "manual_voice",
      syncFrequency: "实时同步",
      apiUrl: "",
      authType: "OAuth2 / SecToken",
      rateLimit: "1000/min",
      accessMethod: "internal",
      agentName: "agent_starbucks"
    });
    qcNotify("数据同步管道测试连接握手成功，数据适配就绪！");
  };

  
  const toggleSourceStatus = (id: string) => {
    setDataSources(dataSources.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status: s.status === 'active' ? 'inactive' : 'active'
        };
      }
      return s;
    }));
  };

  
  const handleAddCampaign = () => {
    if (!newCampaign.name.trim()) {
      qcNotify("请输入抽检计划名称！");
      return;
    }
    const added: QualityCampaign = {
      id: `cmp-${Date.now()}`,
      name: newCampaign.name,
      status: "running",
      dataSourceId: newCampaign.dataSourceId,
      templateId: newCampaign.templateId,
      scope: newCampaign.scope,
      progress: 0,
      totalVolume: Number(newCampaign.totalVolume),
      inspectedVolume: 0,
      warningCount: 0,
      averageScore: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    
    const mockCreatedTask: AuditTask = {
      id: `gen-task-${Date.now()}`,
      campaignId: added.id,
      sessionID: `#REQ-${Math.floor(90000 + Math.random() * 9999)}`,
      agentName: "薛程月",
      agentId: "agent-001",
      group: "零售理财组",
      time: "刚刚介入",
      sentiment: "neutral",
      status: "pending",
      aiScore: 88,
      transcript: [
        { role: "user", text: "你们定期理财提前撤出违约金怎么这么高？", time: "11:20:00" },
        { role: "agent", text: "您好！由于理财属于封闭管理，退保或提前赎回会产生对应的非标资产折价损失，具体请查阅产品适当性评估和交易细则说明。", time: "11:21:05" },
        { role: "user", text: "买的时候你们可没说会有这么多麻烦！", time: "11:21:40" },
        { role: "agent", text: "非常抱歉给您带来不便，我们绝对遵循监管分级提示，保证按照理财指引提供后续咨询，请您留意产品年限限制。", time: "11:22:15" }
      ],
      scoreBreakdown: {
        greeting: 10,
        compliance: 32,
        accuracy: 46,
        timeoutPenalty: 0,
        bannedPenalty: 0
      }
    };

    setCampaigns([added, ...campaigns]);
    setAuditTasks([mockCreatedTask, ...auditTasks]);
    setShowAddCampaignModal(false);
    setNewCampaign({
      name: "",
      dataSourceId: "src-1",
      templateId: "tmpl-1",
      scope: "100%全量初筛",
      totalVolume: 500
    });
    qcNotify(`质检任务批次创建成功！已流式拉取会话件归入初检队列。`);
  };

  
  const toggleCampaignStatus = (id: string) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: c.status === 'running' ? 'paused' : c.status === 'paused' ? 'running' : c.status
        };
      }
      return c;
    }));
  };

  
  const handleFirstAuditSubmit = () => {
    if (!selectedTask) return;

    const penaltyTotal = 
      (!auditChecklist.noBannedWords ? -20 : 0) + 
      (!auditChecklist.responseTimeOk ? -10 : 0);

    const calculatedScore = Math.max(0, Math.min(100, 
      Number(manualScores.greeting) + 
      Number(manualScores.compliance) + 
      Number(manualScores.accuracy) + 
      penaltyTotal
    ));

    const finalVerdictStatus = calculatedScore < 80 ? 'warning' : 'resolved';

    
    setAuditTasks(auditTasks.map(t => {
      if (t.id === selectedTask.id) {
        return {
          ...t,
          status: finalVerdictStatus,
          aiScore: calculatedScore,
          reviewComment: inspectorComment || "会话合规解答，同意初检归档意见。",
          scoreBreakdown: {
            greeting: Number(manualScores.greeting),
            compliance: Number(manualScores.compliance),
            accuracy: Number(manualScores.accuracy),
            timeoutPenalty: !auditChecklist.responseTimeOk ? -10 : 0,
            bannedPenalty: !auditChecklist.noBannedWords ? -20 : 0
          }
        };
      }
      return t;
    }));

    
    if (calculatedScore < 80) {
      const coachingDraft: CoachingTask = {
        id: `coach-${Date.now()}`,
        agentName: selectedTask.agentName,
        agentId: selectedTask.agentId,
        group: selectedTask.group,
        coachName: "系统智能辅导专员",
        relatedSessionID: selectedTask.sessionID,
        scoreBefore: calculatedScore,
        issueType: !auditChecklist.noBannedWords ? "禁语违规" : !auditChecklist.responseTimeOk ? "严重超时" : "业务解答错误",
        status: "to_be_coached",
        assignedTime: new Date().toLocaleDateString('zh-CN'),
        coachingPlan: `会话评分低于80分（实际得分:${calculatedScore}分），已触发自动辅导工单。\n违规痛点：${!auditChecklist.noBannedWords ? '触发限制级保本语' : '回复严重超时'}\n指导方案：复习合规规范话术，3日内导师核验后销单。`
      };
      setCoachingTasks([coachingDraft, ...coachingTasks]);
    }

    setSelectedTask(null);
    setInspectorComment("");
    qcNotify(`裁决判定成功！该任务打分：${calculatedScore}分 (${calculatedScore >= 80 ? '完成归档' : '触发警告辅导工单'})`);
  };

  return (
    <div className="flex flex-col h-full w-full bg-neutral-150 overflow-hidden font-sans">
      
      {}
      <header className="h-16 px-6 bg-white border-b border-neutral-200/80 shrink-0 flex items-center justify-between z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[13px] bg-neutral-800 flex items-center justify-center text-white shadow-[0_2px_10px_rgba(31,35,41,0.02)] shadow-neutral-800/20">
            <Database size={20} className="text-sky-100 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-neutral-900 tracking-tight flex items-center gap-1.5">
                数据源接入工作台
              </h1>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] font-bold text-neutral-500 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 animate-pulse"></span>
          <span>托管租户: 万安客服中心</span>
        </div>
      </header>

      {}
      <div className="flex-1 flex overflow-hidden">
        {}
        <main className="flex-1 overflow-hidden p-6 flex flex-col bg-neutral-50">
          <div className="flex-1 overflow-hidden flex flex-col h-full">
            <div className="flex-1 overflow-hidden flex flex-col h-full">
              <DataSourcesView
                role={role}
                dataSources={dataSources}
                setDataSources={setDataSources}
                showAddSourceModal={showAddSourceModal}
                setShowAddSourceModal={setShowAddSourceModal}
                newSource={newSource}
                setNewSource={setNewSource}
                handleAddDataSource={handleAddDataSource}
                toggleSourceStatus={toggleSourceStatus}
              />
            </div>
          </div>
        </main>
      </div>

    </div>
  );
};
