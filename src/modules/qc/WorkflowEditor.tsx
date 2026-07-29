import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Database, 
  FileText, 
  Bot, 
  Bell, 
  BarChart3, 
  X, 
  Save, 
  Check, 
  Play, 
  Plus, 
  Settings2,
  Loader2,
  Trash2,
  AlertCircle,
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Eye,
  Settings,
  Sliders,
  Sparkles,
  RefreshCw,
  Clock,
  ThumbsUp,
  MessageSquare,
  HelpCircle,
  User,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  LayoutGrid,
  Send,
  Users,
  MoreHorizontal,
  CornerDownRight,
  Code2,
  FolderTree,
  Terminal,
  FileCode,
  Paperclip,
  Share2,
  Workflow,
  Search,
  UserCheck,
  BrainCircuit,
  ListTree,
  PlayCircle,
  ArrowUp,
  Wand2,
  Edit3,
  Info,
  Cpu,
  Star
} from '@/lib/icons';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Role, ROLE_LABELS } from './types';
import { TraceNodeCard } from './TraceNodeCard';
import { FOOD_INSURANCE_TRACE } from './traceData';
import { qcNotify } from './qcNotify';

export const RECOMMENDED_NAMES: Record<string, string[]> = {
  data_access: [
    '数据接入',
    '客服全渠道会话接入',
    '实时电话录音网关导入',
    '人工在线客服会话同步',
    '数字员工在线会话接入'
  ],
  template: [
    '质检标准模板',
    '金融理财质检合规模板',
    '基础消保态度服务规范',
    '证券投顾红线词拦截规范',
    '违规套路销售拦截模板'
  ],
  ai_task: [
    'AI智能质检',
    'AI智能质检任务',
    'NLP关键词深度扫描',
    '情绪识别与语音转写分析',
    '保本口头承诺AI核准'
  ],
  alarm_task: [
    '告警任务',
    '消保红线一票拦截警告',
    '敏感话术坐席弹窗干预',
    '质检违规实时飞书推送',
    '短信警告网关自动下发'
  ],
  dashboard_sync: [
    '实时数据看板',
    '质检违规统计大屏同步',
    '坐席合规绩效看板写入',
    '银行分行消保评级大盘',
    '质检结果离线数仓同步'
  ]
};


interface NodeConfig {
  
  label: string;
  desc: string;
  
  
  sourceType?: string;
  apiUrl?: string;
  syncInterval?: string;
  
  
  templateName?: string;
  scorePoints?: string;
  prohibitedWords?: string;
  scoringRules?: string;
  
  
  llmModel?: string;
  promptTemplate?: string;
  autoTrigger?: boolean;
  
  
  alertCondition?: string;
  notifyChannels?: string[];
  webhookUrl?: string;
  
  
  metricsToShow?: string[];
  refreshRate?: string;

  
  authorizedRoles?: Role[];
  authorizedAccounts?: string;
  authorizedOrgs?: string[];
  configPermissions?: 'all' | 'manager_only' | 'operator_only';
  dataScope?: string;
}


interface MockSession {
  id: string;
  customerName: string;
  agentName: string;
  startTime: string;
  duration: string;
  satisfaction: string;
  intent: string;
  npsClass: 'promoter' | 'passive' | 'detractor';
  npsScore: number;
  aiScore: number;
  transcript: { role: 'agent' | 'user' | 'system'; text: string; time: string }[];
  initiator?: 'user' | 'agent';
  agentId?: string;
  customerPhone?: string;
  skillGroup?: string;
}

const initialSessions: MockSession[] = [
  {
    id: "SESS-09512",
    customerName: "李理财",
    agentName: "薛程月",
    startTime: "14:40:22",
    duration: "180 秒",
    satisfaction: "非常满意",
    intent: "稳健理财收益结转计算纠纷",
    npsClass: "promoter",
    npsScore: 9,
    aiScore: 95,
    transcript: [
      { role: "user", text: "你们这个稳健性理财产品，说是年化4%，怎么我买了一个月才收益这么点？", time: "14:40:22" },
      { role: "agent", text: "您好！非常抱歉给您带来疑惑。年化收益率4%是指持有满一年期的预期收益水平。由于理财产品刚买入1个月，收益尚未到期完全释放，且受近期固收净值小幅波动影响，实际日结转会有波动，需要以最终结转到期为准。", time: "14:40:55" },
      { role: "user", text: "那中途我要是用钱能提前赎回退出来吗？", time: "14:41:12" },
      { role: "agent", text: "本产品为封闭式稳健理财，合同细则约定中途是不支持提前赎回的。建议您后续根据自身的资金使用流转规划选择更合适期限的产品，我们会竭诚为您关注后续净值表现。", time: "14:41:40" }
    ]
  },
  {
    id: "SESS-09513",
    customerName: "周客户",
    agentName: "薛程月",
    startTime: "15:01:10",
    duration: "320 秒",
    satisfaction: "不满意",
    intent: "违规承诺保本退保申诉",
    npsClass: "detractor",
    npsScore: 3,
    aiScore: 55,
    transcript: [
      { role: "user", text: "我想买那个高息理财，这个产品稳赚不赔吧？", time: "15:01:10" },
      { role: "agent", text: "您好，我们理财都是根据适当性评测推荐的，理论上无法做口头保本承诺的。", time: "15:01:30" },
      { role: "user", text: "那你们之前宣传说有存款一样的安全度？", time: "15:01:50" },
      { role: "agent", text: "哎呀，跟您说实话吧，这个是咱们行里的明星主打产品，绝对稳赚不赔的，保本保收益，我们自己全家都买了这个，您放心买就是了！出了问题我给您垫付违约金！", time: "15:02:15" },
      { role: "user", text: "那行，那我就全投进去了。", time: "15:02:40" }
    ]
  },
  {
    id: "SESS-09514",
    customerName: "赵基金",
    agentName: "刘晓雅",
    startTime: "16:11:45",
    duration: "115 秒",
    satisfaction: "一般",
    intent: "固收理财净值大跌争议",
    npsClass: "passive",
    npsScore: 7,
    aiScore: 82,
    transcript: [
      { role: "user", text: "你好，我的固收理财今天怎么亏损了？之前买的时候没告诉我会有本金损失啊！", time: "16:11:45" },
      { role: "agent", text: "您好！由于近期债市出现一定幅度调整，固收+等理财产品的底层债券资产估值产生了一些净值波动，属于正常的市场变化。", time: "16:12:10" },
      { role: "user", text: "那我还要继续持有吗？还是赶紧割肉？", time: "16:12:30" },
      { role: "agent", text: "从历史数据看，债市短期调整后往往会逐步修复，建议您根据个人的风险承受偏好与长短投资周期，保持理性关注，不建议盲目在低点赎回割肉。", time: "16:12:55" }
    ]
  }
];

const initialNodes: Node[] = [
  { 
    id: '1', 
    position: { x: 30, y: 160 }, 
    data: { 
      label: '数据接入', 
      type: 'data_access',
      desc: '全渠道会话数据实时同步 API',
      config: {
        label: '数据接入',
        desc: '全渠道会话数据实时同步 API',
        sourceType: 'WeChat Business API',
        apiUrl: 'https://api.yourcompany.com/v1/sync',
        syncInterval: '5 minutes',
        authorizedRoles: ['manager', 'operator', 'first_inspector'],
        authorizedAccounts: 'admin@yourcompany.com, operator@yourcompany.com',
        authorizedOrgs: ['理财客服组', '全员'],
        configPermissions: 'manager_only'
      }
    }, 
    type: 'custom',
    deletable: false,
  },
  { 
    id: '2', 
    position: { x: 270, y: 160 }, 
    data: { 
      label: '质检模板配置', 
      type: 'template',
      desc: '按技能组与渠道分配模板',
      config: {
        label: '质检模板配置',
        desc: '按技能组与渠道分配模板',
        templateName: '标准服务规范计分模板',
        scorePoints: '100',
        prohibitedWords: '稳赚不赔, 绝对保本, 一定稳赚, 垫付, 存款安全',
        scoringRules: '响应超时扣5分; 服务禁语扣20分; 礼貌用语加5分',
        authorizedRoles: ['manager', 'first_inspector', 're_inspector'],
        authorizedAccounts: 'inspector_01@yourcompany.com',
        authorizedOrgs: ['全员'],
        configPermissions: 'manager_only'
      }
    },
    type: 'custom'
  },
  { 
    id: '3', 
    position: { x: 510, y: 160 }, 
    data: { 
      label: 'AI智能质检任务', 
      type: 'ai_task',
      desc: '全量 AI 智能质检评分',
      config: {
        label: '默认质检任务',
        targetAgent: '全部客服',
        frequency: 'realtime',
        autoTrigger: true,
      }
    },
    type: 'custom'
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } },
];

export interface WorkflowEditorProps {
  role?: Role;
  onSaveNodeConfig?: (type: string, config: any) => void;
  onDryRunCompleted?: (logs: string[]) => void;
  onViewSessionDetail?: (session: any) => void;
}

export interface WorkflowEditorHandle {
  openSessionDetail: (session: any, fromType?: string) => void;
}


const getIconForType = (type: string) => {
  switch (type) {
    case 'data_access': return <Database size={16} className="text-sky-600" />;
    case 'template': return <FileText size={16} className="text-sky-600" />;
    case 'ai_task': return <Bot size={16} className="text-emerald-600" />;
    case 'alarm_task': return <Bell size={16} className="text-rose-600" />;
    case 'dashboard_sync': return <BarChart3 size={16} className="text-neutral-800" />;
    default: return <Database size={16} className="text-neutral-600" />;
  }
};

const WorkflowContext = React.createContext<any>(null);

const CustomNode = ({ id, data, isConnectable }: { id: string, data: any, isConnectable: boolean }) => {
  const context = React.useContext(WorkflowContext);
  if (!context) return null;
  const { hasNodeAccess, hasConfigPermission, edges, setNodes, handleNodeDrillDown, handleAddCustomNode, onNodeClick, nodeMenuOpenId, setNodeMenuOpenId } = context;
  const type = data.type;
  const isUnlocked = hasNodeAccess(data);
  const canConfigure = hasConfigPermission(data);
  const isAiTask = type === 'ai_task' || type === 'alarm_task';
  const isRunning = data.status === 'running';

  const allowedConnections: Record<string, string[]> = {
    'data_access': ['template'],
    'template': ['ai_task'],
    'ai_task': [],
    'alarm_task': [],
    'dashboard_sync': []
  };

  const typeLabels: Record<string, string> = {
    'template': '质检模板配置',
    'ai_task': 'AI智能质检任务'
  };

  const allowedTargets = allowedConnections[type] || [];
  const isMenuOpen = nodeMenuOpenId === id;

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodeMenuOpenId(isMenuOpen ? null : id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const hasEdges = edges.some((edge: any) => edge.source === id || edge.target === id);
    if (hasEdges) {
      qcNotify('该节点已连线，不支持删除。请先删除连线！');
      return;
    }
    if (confirm(`确认删除此质检算子节点【${data.label}】吗？`)) {
      setNodes((nds: any[]) => nds.filter((n: any) => n.id !== id));
    }
  };

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds: any[]) => nds.map((n: any) => n.id === id ? { ...n, data: { ...n.data, status: isRunning ? 'paused' : 'running' } } : n));
  };

  return (
    <div 
      className={`bg-white border-2 rounded-[13px] shadow-sm overflow-visible w-52 transition-all hover:border-neutral-500 hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] cursor-pointer relative group ${
        !isUnlocked ? 'opacity-60 border-neutral-300' : 'border-neutral-200'
      }`}
    >
      {data.type !== 'data_access' && (
        <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="w-2.5 h-5 bg-sky-500 border border-white rounded -ml-1 hover:bg-neutral-800 transition-colors" />
      )}
      
      {}
      <div className="absolute top-2 right-2 z-10 flex gap-1 items-center">
        {!isUnlocked ? (
          <span className="p-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded" title="当前角色未授权查看本节点数据">
            <Lock size={10} />
          </span>
        ) : (
          <span className="p-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded" title="当前角色已授权数据访问">
            <Unlock size={10} />
          </span>
        )}
        <button 
          onClick={handleDelete} 
          className="p-1 hover:bg-rose-100 hover:text-rose-600 text-neutral-400 rounded-md transition-colors opacity-0 group-hover:opacity-100 bg-white shadow-xxs border border-neutral-100 cursor-pointer" 
          title="删除节点"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {}
      <div className="bg-neutral-50/80 px-3 py-2 border-b border-neutral-100 flex items-center justify-between pr-14">
        <div className="flex items-center gap-1.5 min-w-0">
          {getIconForType(type)}
          <span className="text-[11px] font-black text-neutral-800 truncate" title={data.label}>{data.label}</span>
        </div>
      </div>

      {}
      <div className="p-3 bg-white space-y-2">
        <p className="text-[9.5px] text-neutral-400 font-medium leading-relaxed truncate">{data.desc}</p>
        
        {isAiTask && (
          <div className="flex items-center justify-between bg-neutral-50 px-2 py-1.5 rounded-lg border border-neutral-200">
            <span className={`text-[9px] font-black flex items-center gap-1.5 ${isRunning ? 'text-emerald-600' : 'text-neutral-500'}`}>
              {isRunning ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-neutral-300"></span>
              )}
              {isRunning ? '任务运行中' : '任务已暂停'}
            </span>
            <button 
              onClick={handleToggleStatus} 
              className={`text-[8.5px] px-2 py-0.5 rounded shadow-xxs font-black transition-colors cursor-pointer ${
                isRunning ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'bg-neutral-800 text-white hover:opacity-90'
              }`}
            >
              {isRunning ? '暂停' : '启动'}
            </button>
          </div>
        )}
        <div className="pt-2 border-t border-neutral-200 flex items-center justify-between gap-1">
          <span 
            onClick={(e) => { e.stopPropagation(); onNodeClick(e, { id, data }); }}
            className="text-[8.5px] text-neutral-800 font-extrabold flex items-center gap-0.5 hover:underline cursor-pointer" title={canConfigure ? "配置节点运行参数" : "查看只读参数"}
          >
            <Settings2 size={10} /> 
            {canConfigure ? '参数配置' : '只读查看'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNodeDrillDown({ id, data } as Node);
            }}
            className="text-[8.5px] text-emerald-600 bg-emerald-50/80 hover:bg-emerald-100 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 shrink-0 transition-colors cursor-pointer"
          >
            <Eye size={10} />
            <span>数据下钻 ➔</span>
          </button>
        </div>
      </div>

      {allowedTargets.length > 0 && (
        <>
          <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="w-2.5 h-5 bg-sky-500 border border-white rounded -mr-1 hover:bg-neutral-800 transition-colors" />
          <div className="absolute top-1/2 -right-10 -translate-y-1/2 flex items-center z-20">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setNodeMenuOpenId(isMenuOpen ? null : id);
              }}
              className="w-7 h-7 bg-neutral-800 border border-sky-400 rounded-full flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
            >
              <Plus size={14} className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-45' : ''}`} />
            </button>
            
            {isMenuOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute top-1/2 -translate-y-1/2 left-full ml-3 w-44 bg-white border border-neutral-200 rounded-[13px] shadow-2xl flex flex-col p-1.5 z-[30000] animate-in fade-in slide-in-from-left-2 duration-200"
              >
                <div className="px-2 py-1.5 mb-1 border-b border-neutral-100 text-[10px] font-black text-neutral-400 uppercase tracking-widest">追加后续节点</div>
                {Array.from(new Set(allowedTargets)).map(t => (
                  <button 
                    key={t} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleAddCustomNode(t, id); 
                      setNodeMenuOpenId(null);
                    }} 
                    className="text-left px-3 py-2.5 hover:bg-neutral-100 hover:text-neutral-700 text-xs font-bold text-neutral-700 rounded-lg transition-colors flex items-center gap-2 group/item cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded bg-neutral-50 flex items-center justify-center group-hover/item:bg-white shadow-xs">
                      <Plus size={10} className="text-sky-500" />
                    </div>
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export const WorkflowEditor = forwardRef<WorkflowEditorHandle, WorkflowEditorProps>(({
  role = 'manager',
  onSaveNodeConfig,
  onDryRunCompleted,
  onViewSessionDetail
}, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activeNode, setActiveNode] = useState<Node | null>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [dryRunLogs, setDryRunLogs] = useState<string[]>([]);
  
  
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<'content' | 'permissions'>('content');
  const [formData, setFormData] = useState<NodeConfig>({ label: '', desc: '' });

  //   (下钻查看具体内容)
  const [showDrillDown, setShowDrillDown] = useState(false);
  const [drillDownType, setDrillDownType] = useState<string | null>(null);
  const [drillDownLabel, setDrillDownLabel] = useState<string>("");
  const [drillDownConfig, setDrillDownConfig] = useState<any>(null);

  
  const [sessions, setSessions] = useState<MockSession[]>(initialSessions);
  const [filterResultType, setFilterResultType] = useState<string>('all');
  const [filterSubType, setFilterSubType] = useState<string>('all');
  // 三级联动筛选：质检项多选 / 评分维度子级或分值 / 分类值输入
  const [filterComplianceItems, setFilterComplianceItems] = useState<string[]>([]);
  const [filterScoringSubDim, setFilterScoringSubDim] = useState<string>('all');
  const [filterScoringScore, setFilterScoringScore] = useState<string>('');
  const [filterLabelValue, setFilterLabelValue] = useState<string>('');
  // 关键词/正则搜索
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [filterUseRegex, setFilterUseRegex] = useState<boolean>(false);
  const [filterMsgRole, setFilterMsgRole] = useState<string>('all');
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [isQualityCollapsed, setIsQualityCollapsed] = useState(false);
  const [isLabelCollapsed, setIsLabelCollapsed] = useState(false);
  const [isMultiDimCollapsed, setIsMultiDimCollapsed] = useState(false);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  // 各质检/评分项人工备注输入框的展开态（默认隐藏不占高度，点击"操作备注"展开）
  const [noteExpanded, setNoteExpanded] = useState<Record<string, boolean>>({});
  const toggleNote = (key: string) => setNoteExpanded(p => ({ ...p, [key]: !p[key] }));
  const [selectedSession, setSelectedSession] = useState<MockSession | null>(null);
  // 会话详情弹窗当前记录序号（用于上一条/下一条切换，演示态）
  const [recordIndex, setRecordIndex] = useState(6);
  const TOTAL_RECORDS = 21991;
  const [activeRightTab, setActiveRightTab] = useState<'details' | 'evaluation' | 'logs' | 'ai_analysis' | 'history'>('details');

  
  const [editIntent, setEditIntent] = useState<string>("");
  const [editNpsClass, setEditNpsClass] = useState<'promoter' | 'passive' | 'detractor'>("promoter");
  const [editEmotionLabel, setEditEmotionLabel] = useState<string>("愤怒");
  // 多维度评分（图5）：评分与雷达图联动的数据源
  const [radarScores, setRadarScores] = useState<Record<string, number>>({
    '服务态度': 90, '专业知识': 85, '沟通技巧': 80, '问题解决': 95, '响应速度': 90,
  });
  const [editNpsScore, setEditNpsScore] = useState<number>(10);
  // [目标锁定]: 在状态初始化区域添加关系画布折叠状态 。
  // [影响评估]: 此项修改仅增加局部私有状态变量，绝不影响周围组件渲染或页面布局。
  // [修改边界]: 仅涉及第580~586行，其余业务代码及节点保持完全冻结。
  const [editAiScore, setEditAiScore] = useState<number>(95);

  useImperativeHandle(ref, () => ({
    openSessionDetail: (session: any, fromType?: string) => {
      // 来源区分：AI智能质检任务下钻(ai_task)展示 AI结果/历史记录 tab 与纠错入口；
      // 原始数据明细(data_access)仅展示 会话详情/评价信息，不显示 AI结果与历史记录
      setDrillDownType(fromType || 'ai_task');
      setSelectedSession(session);
      setEditIntent(session.intent);
      setEditNpsClass(session.npsClass);
      setEditNpsScore(session.npsScore);
      setEditAiScore(session.aiScore);
      setActiveRightTab('details');
      setShowTranscriptModal(true);
      setRecordIndex(6);
      // 有纠错权限的账号进入即为可编辑态，可直接修改结果后点「纠错保存」（编辑态由 hasCorrectPermission 派生，无需再置位）
      setCorrectNote('');
      setCorrectSaved(false);
      setItemNotes({});
    }
  }));

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>('1');
  const [activeIndicatorType, setActiveIndicatorType] = useState<'质检类' | '多维度评分类' | '分类标签'>('质检类');
  const [activeAnalysisFormat, setActiveAnalysisFormat] = useState<'multi-class' | 'score' | 'radar'>('multi-class');
  const [selectedOperatorAddType, setSelectedOperatorAddType] = useState('预置规则算子');
  const [isRelationCanvasExpanded, setIsRelationCanvasExpanded] = useState<boolean>(true);
  const [canvasMode, setCanvasMode] = useState<'custom' | 'workflow-platform'>('custom');

  const [mockHit1, setMockHit1] = useState('未命中');
  const [mockHit2, setMockHit2] = useState('命中');
  const [mockHit3, setMockHit3] = useState('命中');
  const [mockHit4, setMockHit4] = useState('未命中');
  // 当前登录账号是否具备"纠错"权限（由权限配置授予）。有权限时 AI 结果页直接可修改结果。
  const [hasCorrectPermission] = useState(true);
  // 编辑态直接由「纠错」权限驱动：有权限 = 进入即可直接修改结果（无需先点纠错按钮），改完点底部「纠错保存」提交。
  const isCorrectionMode = hasCorrectPermission;
  // 人工纠错备注（有权限账号可填写，随「纠错保存」一并提交）
  const [correctNote, setCorrectNote] = useState('');
  // 纠错保存反馈态
  const [correctSaved, setCorrectSaved] = useState(false);
  // 各质检项/评分项的人工修改备注（key=项名称）。仅当前编辑会话内暂存，点「纠错」提交入历史后清空，再次进入不回显。
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  // 已提交入历史的人工纠错备注记录（点击「纠错」后追加，展示于「历史记录」的人工纠错记录表）
  const [submittedNotes, setSubmittedNotes] = useState<{ user: string; time: string; type: string; field: string; from: string; to: string; note: string }[]>([]);
  // 项名称 → { 修改类型, 全链路修改项名称（有一级项则「一级/二级」，无二级则仅一级） } 的映射，用于人工纠错记录展示
  const itemFieldMeta: Record<string, { type: string; fullField: string }> = {
    '服务禁语核查': { type: '质检类', fullField: '合规标准 / 服务禁语核查' },
    '过度承诺判定': { type: '质检类', fullField: '合规标准 / 过度承诺判定' },
    '身份核验': { type: '质检类', fullField: '流程规范 / 身份核验' },
    '结束语规范': { type: '质检类', fullField: '流程规范 / 结束语规范' },
    'NPS推荐值': { type: '多维度评分', fullField: 'NPS推荐值' },
    '服务态度': { type: '多维度评分', fullField: '服务质量 / 服务态度' },
    '专业知识': { type: '多维度评分', fullField: '服务质量 / 专业知识' },
    '沟通技巧': { type: '多维度评分', fullField: '服务质量 / 沟通技巧' },
    '问题解决': { type: '多维度评分', fullField: '服务质量 / 问题解决' },
    '响应速度': { type: '多维度评分', fullField: '服务质量 / 响应速度' },
    '情绪标签': { type: '分类标签', fullField: '情绪标签' },
    '服务意图': { type: '分类标签', fullField: '服务意图' },
  };
  // 点击底部「纠错」：将各项人工修改备注 + 整体纠错说明汇总写入历史记录，并清空当前页备注（不回显）
  const submitCorrection = () => {
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
    const rows: { user: string; time: string; type: string; field: string; from: string; to: string; note: string }[] = [];
    Object.keys(itemNotes).forEach((field) => {
      const note = itemNotes[field];
      const meta = itemFieldMeta[field];
      if (note && note.trim()) rows.push({ user: '当前质检员', time: now, type: meta?.type || '—', field: meta?.fullField || field, from: '—', to: '—', note: note.trim() });
    });
    if (correctNote && correctNote.trim()) rows.push({ user: '当前质检员', time: now, type: '整体', field: '整体纠错说明', from: '—', to: '—', note: correctNote.trim() });
    if (rows.length > 0) setSubmittedNotes(prev => [...prev, ...rows]);
    setItemNotes({});
    setCorrectNote('');
    setCorrectSaved(true);
  };
  // 质检类结果修改分数同步：最终质检得分 = 100 - 各命中项扣分之和（服务禁语-10 / 过度承诺-15 / 身份核验-5 / 结束语-5）
  useEffect(() => {
    const deduct =
      (mockHit1 === '命中' ? 10 : 0) +
      (mockHit2 === '命中' ? 15 : 0) +
      (mockHit3 === '命中' ? 5 : 0) +
      (mockHit4 === '命中' ? 5 : 0);
    setEditAiScore(Math.max(0, 100 - deduct));
  }, [mockHit1, mockHit2, mockHit3, mockHit4]);
  // 上一条/下一条数据切换（演示态）：按记录序号奇偶切换两套质检结果，模拟不同会话的质检数据
  const applyRecord = (idx: number) => {
    const bounded = Math.min(TOTAL_RECORDS, Math.max(1, idx));
    setRecordIndex(bounded);
    setCorrectSaved(false);
    setCorrectNote('');
    setItemNotes({});
    if (bounded % 2 === 0) {
      setMockHit1('未命中'); setMockHit2('命中'); setMockHit3('命中'); setMockHit4('未命中');
    } else {
      setMockHit1('命中'); setMockHit2('未命中'); setMockHit3('未命中'); setMockHit4('命中');
    }
  };
  // 消息维度命中打标（演示态）：key=消息在 transcript 中的索引，value=命中的质检项列表。
  // 质检项名称展示规则：一级项直接展示一级名称；二级项按「一级名称 | 二级名称」展示。scope 标识作用范围。
  const msgLevelHits: Record<number, { name: string; scope: string }[]> = {
    2: [{ name: '合规标准 | 过度承诺判定', scope: '消息维度（含上文）' }],
    1: [{ name: '流程规范 | 身份核验', scope: '消息维度' }],
  };
  const [dataAccessChatState, setDataAccessChatState] = useState<'idle' | 'loading' | 'success'>('idle');
  // 对话框内选中的数字员工，默认选中「质检类数字员工」
  const [selectedDigitalStaff, setSelectedDigitalStaff] = useState('质检类数字员工');

  
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [editingOperator, setEditingOperator] = useState<any | null>(null);
  const [chartPreviewType, setChartPreviewType] = useState<'radar' | 'bar'>('radar');
  const [isEditingNameOnPanel, setIsEditingNameOnPanel] = useState<boolean>(false);
  const [showAuthAddModal, setShowAuthAddModal] = useState<boolean>(false);
  const [authAddType, setAuthAddType] = useState<'role' | 'account'>('role');
  const [authSearchQuery, setAuthSearchQuery] = useState<string>('');
  const [authSelectedRolePath, setAuthSelectedRolePath] = useState<string[]>([]);
  const [authSelectedAccountPath, setAuthSelectedAccountPath] = useState<string[]>([]);
  
  const [mockRadarScores, setMockRadarScores] = useState<Record<string, number>>({
    '服务态度': 85,
    '专业度': 90,
    '响应时间': 70,
    '问题解决': 95,
    '沟通礼仪': 80
  });

  useEffect(() => {
    setIsEditingNameOnPanel(false);
  }, [selectedIndicatorId]);

  const updateOperatorDetail = (operatorId: string, updatedFields: Partial<any>) => {
    const currentOpts = getIndicatorField(selectedIndicatorId, 'operators', []);
    const nextOpts = currentOpts.map((o: any) => o.id === operatorId ? { ...o, ...updatedFields } : o);
    updateSelectedIndicatorField('operators', nextOpts);
    if (editingOperator && editingOperator.id === operatorId) {
      setEditingOperator({ ...editingOperator, ...updatedFields });
    }
  };

  // [目标锁定]: 优化  状态初始化，增加本地存储 () 自动读取以实现真实的数据持久化。
  // [影响评估]: 使用  样式初始化 ，完全不改变任何已有业务逻辑、类型安全及结构兼容，零负面排他性。
  // [修改边界]: 仅涉及第 590-671 行的  声明代码，其它代码完好冻结。
  const [drilldownIndicators, setDrilldownIndicators] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('quality_drilldown_indicators') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse quality_drilldown_indicators from localStorage:', e);
      }
    }
    return [
      { 
        id: '1', 
        title: '证券投顾合规类', 
        weight: '', 
        type: 'category',
        indicatorType: '质检类',
        prompt: "1. 检查客服是否在理财推荐时做了保本保收益口头承诺。\n2. 校验是否有夸大历史业绩的虚假宣传。",
        relationType: 'AND',
        operators: [],
        mappings: [],
        children: [
          { 
            id: '1-1', 
            name: '承诺保本口径核准', 
            type: 'operator',
            indicatorType: '质检类',
            relationType: 'AND',
            operators: [
              { id: 'opt-1-1-1', type: 'rule', name: '条件：文本消息关键字命中 (小模型)', words: '保本, 绝对收益, 稳赚不赔', roles: ['客服'] }
            ],
            mapping: { score: '-10', code: 'VIOLATION_BAOBEN', isExpanded: true }
          },
          { 
            id: '1-2', 
            name: '违规收益承诺检测', 
            type: 'operator',
            indicatorType: '质检类',
            relationType: 'AND',
            operators: [
              { id: 'opt-1-2-1', type: 'workflow', name: '条件：关联理财合规核验工作流', workflowId: 'Profit_Check_Flow_V3' }
            ],
            mapping: { score: '-10', code: 'VIOLATION_PROFIT', isExpanded: false }
          },
          { 
            id: '1-3', 
            name: '代客理财违规排查', 
            type: 'operator',
            indicatorType: '质检类',
            relationType: 'AND',
            operators: [
              { id: 'opt-1-3-1', type: 'script', name: '条件：JS脚本检查代客理财委托', script: "function evaluate(context) {\n  const messages = context.messages;\n  return messages.some(m => m.content.includes('代您操作') || m.content.includes('帮您买'));\n}" }
            ],
            mapping: { score: '-20', code: 'VIOLATION_AGENT', isExpanded: false }
          }
        ]
      },
      { 
        id: '2', 
        title: '服务规范与礼仪类', 
        weight: '', 
        type: 'category',
        indicatorType: '质检类',
        prompt: "1. 检查客服是否态度恶劣，包含侮辱、挑衅、推诿等敏感词。",
        relationType: 'OR',
        operators: [
          { id: 'opt-2-1', type: 'rule', name: '条件 A：客服不礼貌用语拦截', words: '随便, 恶心, 关我屁事', roles: ['客服'] }
        ],
        mapping: { score: '-2', code: 'VIOLATION_ETIQUETTE', isExpanded: true },
        children: []
      },
      {
        id: '3',
        title: '服务规范与多维分类分析',
        weight: '',
        type: 'category',
        indicatorType: '多维度评分类',
        prompt: "1. 从多个评估维度分析客户与客服的会话表现，包括：服务态度、专业知识、响应速度、沟通技巧。\n2. 每一个评估维度需要输出具体的百分制得分、对应的评测原因。",
        activeAnalysisFormat: 'multi-class',
        scoreLower: 0,
        scoreUpper: 100,
        interactionType: '滑动条 (Slider) - 支持人工微调',
        radarDimensions: ['服务态度', '专业知识', '响应速度', '沟通技巧'],
        mappings: [
          { primaryClass: '服务态度', score: '85', code: 'SERVICE_ATTITUDE', reasonCode: 'SERVICE_ATTITUDE_REASON' },
          { primaryClass: '专业知识', score: '90', code: 'PROFESSIONAL_SKILL', reasonCode: 'PROFESSIONAL_SKILL_REASON' },
          { primaryClass: '响应速度', score: '75', code: 'RESPONSE_EFFICIENCY', reasonCode: 'RESPONSE_EFFICIENCY_REASON' },
          { primaryClass: '沟通技巧', score: '80', code: 'COMMUNICATION_TACTICS', reasonCode: 'COMMUNICATION_TACTICS_REASON' }
        ],
        children: [] // 分析类根据需求不配置二级项
      }
    ];
  });

  // [目标锁定]: 修复  声明后加载的生命周期监听函数。
  // [影响评估]: 解决 -     错误，确保完美的类型检查。
  // [修改边界]: 仅在状态初始化完成后注入  ，不干扰周围逻辑。
  React.useEffect(() => {
    localStorage.setItem('quality_drilldown_indicators', JSON.stringify(drilldownIndicators));
  }, [drilldownIndicators]);

  const findIndicatorById = useCallback((id) => {
    for (let catIdx = 0; catIdx < drilldownIndicators.length; catIdx++) {
      const cat = drilldownIndicators[catIdx];
      if (cat.id === id) {
        return { item: cat, isCategory: true, catId: cat.id, catIdx, childIdx: -1, level3Idx: -1 };
      }
      for (let childIdx = 0; childIdx < (cat.children || []).length; childIdx++) {
        const child = cat.children[childIdx];
        if (child.id === id) {
          return { item: child, isCategory: false, catId: cat.id, catIdx, childIdx, level3Idx: -1 };
        }
        for (let level3Idx = 0; level3Idx < (child.children || []).length; level3Idx++) {
          const l3 = child.children[level3Idx];
          if (l3.id === id) {
            return { item: l3, isCategory: false, catId: cat.id, catIdx, childIdx, level3Idx };
          }
        }
      }
    }
    return null;
  }, [drilldownIndicators]);

  const getIndicatorField = useCallback((id, field, defaultValue) => {
    const target = findIndicatorById(id);
    if (target) {
      return target.item[field] !== undefined ? target.item[field] : defaultValue;
    }
    return defaultValue;
  }, [findIndicatorById]);

  const updateSelectedIndicatorField = useCallback((field, value) => {
    if (!selectedIndicatorId) return;
    const newIndicators = JSON.parse(JSON.stringify(drilldownIndicators));
    const target = findIndicatorById(selectedIndicatorId);
    if (target) {
      if (target.isCategory) {
        newIndicators[target.catIdx][field] = value;
      } else if (target.level3Idx !== -1) {
        newIndicators[target.catIdx].children[target.childIdx].children[target.level3Idx][field] = value;
      } else {
        newIndicators[target.catIdx].children[target.childIdx][field] = value;
      }
      setDrilldownIndicators(newIndicators);
    }
  }, [selectedIndicatorId, drilldownIndicators, findIndicatorById]);

  const [isBotOpen, setIsBotOpen] = useState(false);
  const [nodeMenuOpenIdState, setNodeMenuOpenIdState] = useState<string | null>(null);
  const setNodeMenuOpenId = useCallback((id: string | null) => {
    setNodeMenuOpenIdState(id);
    setNodes((nds: any[]) => nds.map((n: any) => ({
      ...n,
      zIndex: n.id === id ? 9999 : 0
    })));
  }, [setNodes]);
  const nodeMenuOpenId = nodeMenuOpenIdState;
  
  
  const [authorizedEntities, setAuthorizedEntities] = useState([
    { id: '1', type: 'role', value: '质检经理 (Manager)', icon: <Users size={10} /> },
    { id: '2', type: 'account', value: '薛程月 (xue.cy)', icon: <Users size={10} /> }
  ]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      const sourceType = sourceNode.data?.type;
      const targetType = targetNode.data?.type;

      
      const allowedConnections: Record<string, string[]> = {
        'data_access': ['template'],
        'template': ['ai_task'],
        'ai_task': [],
        'alarm_task': [],
        'dashboard_sync': []
      };

      const typeLabels: Record<string, string> = {
        'data_access': '数据接入',
        'template': '质检标准模板',
        'ai_task': 'AI智能质检'
      };

      if (!allowedConnections[sourceType as string]?.includes(targetType as string)) {
        const allowedTargets = allowedConnections[sourceType as string] || [];
        const allowedLabels = allowedTargets.map(t => typeLabels[t]).join('、');
        qcNotify(`❌ 节点关联错误：\n【${typeLabels[sourceType as string] || sourceType}】只能连接到：\n${allowedLabels ? `👉 ${allowedLabels}` : '不可连接任何后续节点'}。`);
        return;
      }

      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } } as any, eds));
    },
    [nodes, setEdges]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      if (confirm('确认删除此连线吗？')) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
    },
    [setEdges]
  );

  
  const hasNodeAccess = useCallback((nodeData: any) => {
    const config = nodeData.config as NodeConfig;
    if (!config || !config.authorizedRoles) return true;
    return (config.authorizedRoles as string[]).includes(role as string);
  }, [role]);

  
  const hasConfigPermission = useCallback((nodeData: any) => {
    const config = nodeData.config as NodeConfig;
    if (!config) return true;
    if (role === 'manager') return true; 
    if (config.configPermissions === 'manager_only') return false;
    if (config.configPermissions === 'operator_only' && role !== 'operator') return false;
    return true;
  }, [role]);

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'data_access': return 'bg-sky-50 text-sky-700 border-blue-200';
      case 'template': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'ai_task': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'alarm_task': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'dashboard_sync': return 'bg-neutral-100 text-neutral-700 border-sky-200';
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setActiveNode(node);
    setFormData(node.data.config as NodeConfig || { label: node.data.label, desc: node.data.desc });
    setActiveConfigTab('content');
    setShowConfigModal(true);
  };

  const handleSaveConfig = () => {
    if (!activeNode) return;
    
    
    if (!hasConfigPermission(activeNode.data)) {
      qcNotify(`🔒 操作受限：当前登录角色【${ROLE_LABELS[role]}】无权修改本节点配置！请联系主管开通权限。`);
      return;
    }

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === activeNode.id) {
          return {
            ...n,
            data: {
              ...n.data,
              label: formData.label,
              desc: formData.desc,
              config: { ...formData }
            }
          };
        }
        return n;
      })
    );
    setShowConfigModal(false);
    
    setDryRunLogs(prev => [`[配置保存] 成功更新节点 [${formData.label}] 的参数`, ...prev]);
    if (onSaveNodeConfig) {
      onSaveNodeConfig(activeNode.data.type, formData);
    }
  };

  //      (下钻)
  const handleNodeDrillDown = (node: Node) => {
    
    if (!hasNodeAccess(node.data)) {
      qcNotify(`🔒 数据隔离警报：您所绑定的客服部门及组织架构无权访问【${node.data.label}】底层数据明细！\n当前访问角色：${ROLE_LABELS[role]}\n本节点安全级别：高危受控`);
      return;
    }
    
    setDrillDownType(node.data.type);
    setDrillDownLabel(node.data.label);
    setDrillDownConfig(node.data.config || {});
    setShowDrillDown(true);
  };

  const handleAddCustomNode = (type: string, sourceId?: string) => {
    if (role !== 'manager' && role !== 'operator') {
      qcNotify(`⚠️ 权限不足：仅有【质检中心主管】和【系统集成运营】能在物理画布中追加算子！`);
      return;
    }

    const id = `node-${Date.now()}`;
    const newLabel = 
      type === 'data_access' ? '数据接入' :
      type === 'template' ? '质检模板配置' :
      type === 'ai_task' ? 'AI智能质检任务' :
      type === 'alarm_task' ? '告警任务' : '实时数据看板';

    const newDesc = 
      type === 'data_access' ? '配置全渠道会话实时同步 API' :
      type === 'template' ? '按技能组与渠道分配质检模板' :
      type === 'ai_task' ? 'Gemini 100%全量 AI 智能质检评分' :
      type === 'alarm_task' ? '服务禁语/极度负面实时派单告警' : '全业务指标实时大屏监控';

    const newConfig: NodeConfig = 
      type === 'data_access' ? { label: newLabel, desc: newDesc, sourceType: 'WeChat Business API', apiUrl: 'https://api.yourcompany.com/v1/sync', syncInterval: '10 分钟', authorizedRoles: ['manager', 'operator'], authorizedAccounts: 'all', authorizedOrgs: ['全员'], configPermissions: 'manager_only' } :
      type === 'template' ? { label: newLabel, desc: newDesc, templateName: '标准多项分数计分模板', scorePoints: '100', prohibitedWords: '保证保本, 稳赚不赔, 随便投诉', scoringRules: '超时罚10分, 禁语罚20分', authorizedRoles: ['manager', 'first_inspector'], authorizedAccounts: 'all', authorizedOrgs: ['全员'], configPermissions: 'manager_only' } :
      type === 'ai_task' ? { label: newLabel, desc: newDesc, llmModel: 'Gemini 2.5 Flash', promptTemplate: '分析对话是否有违规行为...', autoTrigger: true, authorizedRoles: ['manager', 'operator'], authorizedAccounts: 'all', authorizedOrgs: ['全员'], configPermissions: 'manager_only' } :
      type === 'alarm_task' ? { label: newLabel, desc: newDesc, alertCondition: '评分低于 80分 或 触发服务禁语', notifyChannels: ['feishu'], webhookUrl: 'https://api.feishu.cn/webhook/123', authorizedRoles: ['manager', 'first_inspector'], authorizedAccounts: 'all', authorizedOrgs: ['全员'], configPermissions: 'manager_only' } :
      { label: newLabel, desc: newDesc, metricsToShow: ['合格率', '抽检量', '预警数'], refreshRate: 'Real-time', authorizedRoles: ['manager', 'operator', 'first_inspector', 're_inspector', 'csr'], authorizedAccounts: 'all', authorizedOrgs: ['全员'], configPermissions: 'all' };

    
    let position = { x: 200 + Math.random() * 120, y: 150 + Math.random() * 120 };
    if (sourceId) {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (sourceNode) {
        position = {
          x: sourceNode.position.x + 250,
          y: sourceNode.position.y + (Math.random() - 0.5) * 100
        };
      }
    }

    const newNode: Node = {
      id,
      position,
      data: {
        label: newLabel,
        type,
        desc: newDesc,
        config: newConfig, status: 'draft'
      },
      type: 'custom'
    };

    setNodes(nds => [...nds, newNode]);
    
    if (sourceId) {
      const newEdge: Edge = {
        id: `e-${sourceId}-${id}`,
        source: sourceId,
        target: id,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 }
      };
      setEdges(eds => [...eds, newEdge]);
    }

    setDryRunLogs(prev => [`[一键新增节点] 成功向画布追加了 【${newLabel}】 节点并自动建立业务关联。您可以点击它配置执行参数。`, ...prev]);
  };

  const startWorkflowDryRun = () => {
    if (isDryRunning) return;
    setIsDryRunning(true);
    setDryRunLogs([]);
    
    const logs = [
      "⚡ 启动质检流程引擎测试运行...",
      "📥 [数据接入]: 开始拉取并解构 3 条高优先级实时会话包...",
      "📂 [质检模板配置]: 加载 [标准服务规范计分模板] 规则。一票否决红线词同步热部署...",
      "🤖 [AI 智能质检任务]: 异步调用 Gemini 2.5 Flash 针对 3 条对话进行高维语义初检...",
      "🔍 [AI 智能质检任务]: SESS-09513 检测到坐席口头保本承诺违规：命中了 ['稳赚不赔', '绝对保本'] 等禁用词，初检评分 55 分！",
      "🚨 [实时告警任务]: 命中红线词，触发严重违规拦截，秒级封包向企业微信、飞书推送告警...",
      "📊 [实时数据看板]: 实时数据完成多级聚合，大屏指标今日合格率更新为 66.7%...",
      "✅ 质检大模型主工作流测试运行完成！数据包已正常分发到各人工复核及一线坐席工作台。"
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setDryRunLogs(prev => [logs[currentLogIndex], ...prev]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setIsDryRunning(false);
        if (onDryRunCompleted) {
          onDryRunCompleted(logs);
        }
      }
    }, 800);
  };


  
  const handleSaveScoreAdjustments = () => {
    if (!selectedSession) return;
    
    const updated = sessions.map(s => {
      if (s.id === selectedSession.id) {
        return {
          ...s,
          intent: editIntent,
          npsClass: editNpsClass,
          npsScore: editNpsScore,
          aiScore: editAiScore
        };
      }
      return s;
    });

    setSessions(updated);
    setSelectedSession({
      ...selectedSession,
      intent: editIntent,
      npsClass: editNpsClass,
      npsScore: editNpsScore,
      aiScore: editAiScore
    });

    qcNotify(`✅ 会话评分与智能分析结果调整保存成功！\n- 意图分类修正为：${editIntent}\n- NPS 分类修正为：${editNpsClass === 'promoter' ? '净推荐者' : editNpsClass === 'passive' ? '被动者' : '贬损者'} (${editNpsScore} 分)\n- 质检最终得分修正为：${editAiScore} 分`);
    setShowTranscriptModal(false);
  };

  

  const handleSaveWorkflow = () => {
    
    
    const invalidNodes = nodes.filter(node => {
      if (node.data.type === 'data_access') return false;
      const hasIncomingEdge = edges.some(edge => edge.target === node.id);
      return !hasIncomingEdge;
    });

    if (invalidNodes.length > 0) {
      const labels = invalidNodes.map(n => (n.data as any).label).join('、');
      qcNotify(`保存失败！存在未连接的节点：\n【${labels}】\n每个新增节点都需要与其前置节点建立关联（连线）。`);
      return;
    }

    
    const incompleteNodes = nodes.filter(node => {
      const c = (node.data as any).config;
      if (!c) return true;
      if (!c.label) return true;
      return false;
    });

    if (incompleteNodes.length > 0) {
      const labels = incompleteNodes.map(n => (n.data as any).label).join('、');
      qcNotify(`保存失败！存在参数未配置的节点：\n【${labels}】\n双击节点或点击“参数配置”完善节点配置信息。`);
      return;
    }

    qcNotify('✅ 质检流程图与节点关联配置已成功保存！');
  };

  return (
    <WorkflowContext.Provider value={{ 
      hasNodeAccess, 
      hasConfigPermission, 
      edges, 
      setNodes, 
      setEdges,
      handleNodeDrillDown, 
      handleAddCustomNode, 
      onNodeClick: handleNodeClick, 
      nodeMenuOpenId, 
      setNodeMenuOpenId 
    }}>
      <ReactFlowProvider>
        <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-0 overflow-hidden relative">
      
      {!showDrillDown ? (
        <div className="flex-1 flex flex-col h-[480px] md:h-full border border-neutral-200 rounded-[13px] overflow-hidden bg-white shadow-xs relative">
          <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-[13px] border border-neutral-200 shadow-sm max-w-sm">
            <div className="flex items-center justify-between gap-4 mb-1">
              <h3 className="text-xs font-black text-neutral-900 flex items-center gap-2">
                <Loader2 size={14} className="text-neutral-800" />
                专属分布式质检流程画布
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:opacity-90 text-white rounded-lg text-xs font-black shadow-xs transition-all">
                    <Plus size={12} />
                    新加节点
                  </button>
                  <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-neutral-200 rounded-[13px] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col p-1">
                    <button onClick={() => handleAddCustomNode('template')} className="text-left px-3 py-2 hover:bg-neutral-100 text-xs font-bold text-neutral-700 rounded-lg cursor-pointer">1. 质检标准模板</button>
                    <button onClick={() => handleAddCustomNode('ai_task')} className="text-left px-3 py-2 hover:bg-neutral-100 text-xs font-bold text-neutral-700 rounded-lg cursor-pointer">2. AI智能质检</button>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[9.5px] text-neutral-400 leading-relaxed">
              不同的渠道通道支持各自<strong>配置独立的质检链路，互不影响</strong>。双击节点或点击“参数配置”即可设置运行逻辑。
            </p>
          </div>

          <div className="absolute top-4 right-4 z-10">
            <button onClick={handleSaveWorkflow} className="flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-neutral-800 text-neutral-800 hover:bg-neutral-100 rounded-[7px] text-xs font-black shadow-[0_2px_10px_rgba(31,35,41,0.02)] transition-all cursor-pointer">
              <Save size={14} />
              保存流程
            </button>
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.25, minZoom: 0.5, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            className="bg-neutral-50/40"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
      ) : (
        <div className="absolute inset-0 z-40 bg-neutral-50 flex flex-col">
          {}
          <div className="px-5 py-4 border-b border-neutral-200 bg-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowDrillDown(false)}
                className="text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-bold text-xs bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <ArrowLeft size={14} /> 返回流程配置
              </button>
              <div className="flex items-center gap-3 border-l border-neutral-200 pl-4">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
                  {getIconForType(drillDownType || "")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-sky-100 text-neutral-700 px-1.5 py-0.5 rounded font-black font-mono">数据下钻配置</span>
                    <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
                      <span>节点数据下钻分析：{drillDownLabel}</span>
                      <span className="text-[10px] text-neutral-400 font-normal border-l border-neutral-200 pl-2">
                        {drillDownType === 'template' ? '配置层级指标、权重分配及结果从属判定' : '正在穿透并审计该节点当前承载的物理会话包及配置详情'}
                      </span>
                    </h3>
                  </div>
                </div>
              </div>
            </div>
            {drillDownType === 'template' && (
              <button 
                onClick={() => {
                  // [目标锁定]: 连接 保存模板 按钮，使其将状态保存到  中。
                  // [影响评估]: 此项修改仅影响  事件，不会干扰页面布局与周围组件结构。
                  // [修改边界]: 仅针对第 1127 行进行升级，其它区域保持冻结。
                  localStorage.setItem('quality_drilldown_indicators', JSON.stringify(drilldownIndicators));
                  qcNotify('✅ 质检模板配置已保存成功！\n- 所有指标层级树、算子编排与映射设置均已持久化至本地存储。');
                }}
                className="px-4 py-2 bg-neutral-800 text-white rounded-[7px] text-[11px] font-black hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save size={14} /> 保存模板
              </button>
            )}
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left bg-neutral-50">

            {}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left bg-neutral-50/30">
              
              {/*  1:   &      (数据接入 / 质检任务) */}
              {(drillDownType === 'data_access' || drillDownType === 'ai_task') && (
                <div className="space-y-4 max-w-6xl mx-auto w-full">
                  {drillDownType === 'data_access' && (
                    <div className="p-4 bg-white rounded-[13px] border border-neutral-200 flex items-start gap-3 shadow-sm">
                      <Database size={16} className="text-neutral-800 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-black text-neutral-800">
                          全渠道实时接入的同步会话流列表
                        </h4>
                        <p className="text-[10px] text-neutral-400 mt-1 leading-normal">
                          以下是该数据源实时解构并映射入库的数据明细。在随录字段清单下您可以查看该每条数据的完整属性。点击【查看会话】可下钻检查对话转写、AI智能分类以及好服务NPS判定：
                        </p>
                      </div>
                    </div>
                  )}

                  {}
                  <div className="bg-neutral-50 p-4 rounded-[13px] border border-neutral-200 space-y-4 text-left shadow-xxs">
                    <div className="flex items-center gap-2 mb-2 text-neutral-800 font-black text-[12px]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                      筛选条件
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-[10.5px]">
                      
                      {}
                      <div className="flex flex-col gap-1 lg:col-span-2">
                        <label className="font-extrabold text-neutral-600">时间范围 <span className="text-rose-500">*</span></label>
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <div className="flex items-center bg-white border border-neutral-200 rounded-lg overflow-hidden shrink-0 h-8">
                            <button className="px-3 h-full text-neutral-600 hover:bg-neutral-50 border-r border-neutral-200 cursor-pointer font-bold">今天</button>
                            <button className="px-3 h-full text-neutral-600 hover:bg-neutral-50 border-r border-neutral-200 cursor-pointer font-bold">最近一周</button>
                            <button className="px-3 h-full bg-sky-50 text-sky-600 font-bold border-r border-neutral-200 cursor-pointer">最近一月</button>
                          </div>
                          <div className="flex flex-1 items-center gap-2 bg-white border border-neutral-200 rounded-lg px-2.5 h-8">
                            <input type="text" value="2026/06/14 00:00:00" disabled className="w-full text-neutral-700 bg-transparent text-[10.5px] outline-none font-bold" />
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span className="text-neutral-400 text-[10px] shrink-0 font-bold">~</span>
                            <input type="text" value="2026/07/13 23:59:59" disabled className="w-full text-neutral-700 bg-transparent text-[10.5px] outline-none font-bold text-right" />
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-extrabold text-neutral-600">会话ID</label>
                        <div className="relative h-8">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                          <input type="text" placeholder="请输入会话ID" className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-7 pr-2.5 outline-none font-bold text-neutral-700 text-[10.5px]" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-extrabold text-neutral-600">是否转人工</label>
                        <div className="relative h-8">
                          <select className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none">
                            <option value="all">全部</option>
                            <option value="yes">是</option>
                            <option value="no">否</option>
                          </select>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>

                      {}
                      <div className="flex flex-col gap-1">
                        <label className="font-extrabold text-neutral-600">转人工是否成功</label>
                        <div className="relative h-8">
                          <select className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none">
                            <option value="all">全部</option>
                            <option value="yes">成功</option>
                            <option value="no">失败</option>
                          </select>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-extrabold text-neutral-600">满意度评分</label>
                        <div className="relative h-8">
                          <select className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none">
                            <option value="all">全部</option>
                            <option value="5">非常满意</option>
                            <option value="4">满意</option>
                            <option value="3">一般</option>
                            <option value="2">不满意</option>
                            <option value="1">非常不满意</option>
                            <option value="0">未评价</option>
                          </select>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-extrabold text-neutral-600">数字员工</label>
                        <div className="relative h-8">
                          <select className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none">
                            <option value="all">全部</option>
                            <option value="starbucks">星巴克活动预约</option>
                            <option value="insurance">保险员工0629-llm分流</option>
                          </select>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="font-extrabold text-neutral-600">业务场景</label>
                        <div className="relative h-8">
                          <select className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none">
                            <option value="all">全部</option>
                            <option value="appointment">活动预约</option>
                            <option value="consultation">业务咨询</option>
                          </select>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-extrabold text-neutral-600">结果类型</label>
                        <div className="relative h-8">
                          <select 
                            value={filterResultType}
                            onChange={(e) => { setFilterResultType(e.target.value); setFilterSubType('all'); setFilterComplianceItems([]); setFilterScoringSubDim('all'); setFilterScoringScore(''); setFilterLabelValue(''); }}
                            className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none"
                          >
                            <option value="all">全部</option>
                            <option value="compliance">质检类</option>
                            <option value="scoring">多维度评分</option>
                            <option value="label">分类标签</option>
                          </select>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>

                      {/* 质检类：二级质检项多选 */}
                     {filterResultType === 'compliance' && (
                        <div className="flex flex-col gap-1 animate-in fade-in duration-200">
                          <label className="font-extrabold text-neutral-600">质检项（多选）</label>
                          <div className="min-h-8 bg-white border border-neutral-200 rounded-lg px-2 py-1.5 flex flex-wrap gap-1 items-center">
                            {['承诺保本口径核准', '违规收益承诺检出', '代客理财违规排查', '客服辱骂检测', '抢话质问反问'].map(item => {
                              const checked = filterComplianceItems.includes(item);
                              return (
                                <button
                                  key={item}
                                  onClick={() => setFilterComplianceItems(prev => checked ? prev.filter(x => x !== item) : [...prev, item])}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${checked ? 'bg-sky-500 text-white border-sky-500' : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'}`}
                                >
                                  {item}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 多维度评分：一级维度 + 子维度/分值搜索 */}
                      {filterResultType === 'scoring' && (
                        <>
                          <div className="flex flex-col gap-1 animate-in fade-in duration-200">
                            <label className="font-extrabold text-neutral-600">一级维度</label>
                            <div className="relative h-8">
                              <select 
                                value={filterSubType}
                                onChange={(e) => { setFilterSubType(e.target.value); setFilterScoringSubDim('all'); setFilterScoringScore(''); }}
                                className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none"
                              >
                                <option value="all">全部</option>
                                <option value="attitude">服务态度</option>
                                <option value="professional">专业知识</option>
                                <option value="communication">沟通技巧</option>
                                <option value="resolution">问题解决</option>
                                <option value="response">响应速度</option>
                              </select>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                          </div>
                          {filterSubType !== 'all' && (
                            <div className="flex flex-col gap-1 animate-in fade-in duration-200">
                              <label className="font-extrabold text-neutral-600">子维度 / 分值搜索</label>
                              <div className="flex gap-2">
                                <div className="relative h-8 flex-1">
                                  <select 
                                    value={filterScoringSubDim}
                                    onChange={(e) => setFilterScoringSubDim(e.target.value)}
                                    className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none"
                                  >
                                    <option value="all">子维度(全部)</option>
                                    <option value="sub1">主动询问</option>
                                    <option value="sub2">情绪安抚</option>
                                    <option value="sub3">方案清晰度</option>
                                  </select>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                                <input
                                  type="text"
                           value={filterScoringScore}
                                  onChange={(e) => setFilterScoringScore(e.target.value)}
                                  placeholder="分值,如 >80"
                                  className="h-8 w-28 bg-white border border-neutral-200 rounded-lg px-3 outline-none font-bold text-neutral-700 text-[10.5px] focus:ring-1 focus:ring-sky-500"
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* 分类标签：分类名称 + 分类值输入框 */}
                      {filterResultType === 'label' && (
                        <>
                          <div className="flex flex-col gap-1 animate-in fade-in duration-200">
                            <label className="font-extrabold text-neutral-600">分类名称</label>
                            <div className="relative h-8">
                              <select 
                                value={filterSubType}
                                onChange={(e) => { setFilterSubType(e.target.value); setFilterLabelValue(''); }}
                                className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none"
                              >
                                <option value="all">全部</option>
                                <option value="emotion">情绪标签</option>
                                <option value="intent">服务意图</option>
                              </select>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </div>
                          </div>
                          {filterSubType !== 'all' && (
                            <div className="flex flex-col gap-1 animate-in fade-in duration-200">
                              <label className="font-extrabold text-neutral-600">分类值</label>
                              <input
                                type="text"
                                value={filterLabelValue}
                                onChange={(e) => setFilterLabelValue(e.target.value)}
                                placeholder="输入分类值,如 愤怒/退保申诉"
                                className="h-8 bg-white border border-neutral-200 rounded-lg px-3 outline-none font-bold text-neutral-700 text-[10.5px] focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* 关键词 / 正则搜索 + 消息角色 */}
                      <div className="flex flex-col gap-1">
                        <label className="font-extrabold text-neutral-600 flex items-center gap-2">
                          关键词搜索
                          <button
                            onClick={() => setFilterUseRegex(!filterUseRegex)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black border transition-colors cursor-pointer ${filterUseRegex ? 'bg-sky-500 text-white border-neutral-500' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'}`}
                          >
                            .* 正则
                          </button>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={filterKeyword}
                            onChange={(e) => setFilterKeyword(e.target.value)}
                            placeholder={filterUseRegex ? '正则,如 退.*款' : '输入关键词'}
                            className="h-8 flex-1 bg-white border border-neutral-200 rounded-lg px-3 outline-none font-bold text-neutral-700 text-[10.5px] focus:ring-1 focus:ring-sky-500"
                          />
                          <div className="relative h-8 w-28">
                            <select
                              value={filterMsgRole}
                              onChange={(e) => setFilterMsgRole(e.target.value)}
                              className="w-full h-full bg-white border border-neutral-200 rounded-lg pl-3 pr-8 outline-none font-black text-neutral-700 text-[10.5px] cursor-pointer appearance-none"
                            >
                              <option value="all">全部角色</option>
                              <option value="customer">客户</option>
                              <option value="agent">客服</option>
                              <option value="ai">数字员工</option>
                            </select>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 mt-2">
                      <button 
                        onClick={() => { setFilterResultType('all'); setFilterSubType('all'); setFilterComplianceItems([]); setFilterScoringSubDim('all'); setFilterScoringScore(''); setFilterLabelValue(''); setFilterKeyword(''); setFilterUseRegex(false); setFilterMsgRole('all'); }}
                        className="px-5 h-8 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 rounded-lg font-bold text-[11px] shadow-xxs transition-colors cursor-pointer"
                      >
                        重置
                      </button>
                      <button className="px-6 h-8 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-black text-[11px] shadow-xs transition-colors cursor-pointer">
                        查询
                      </button>
                    </div>
                  </div>

                  <div className="border border-neutral-200 bg-white rounded-[13px] shadow-xs mt-4">
                    <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center bg-white rounded-t-2xl">
                      <div className="text-[12px] font-bold text-neutral-800">
                        会话列表 <span className="text-neutral-500 font-medium ml-2 text-[11px]">共 21991 条记录</span>
                      </div>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> 导出
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1200px] text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-bold tracking-wider">
                            <th className="p-4 w-40 font-bold text-[10.5px] sticky left-0 z-10 bg-neutral-50/90 shadow-[1px_0_0_#f5f5f5]">会话ID</th>
                            <th className="p-4 font-bold text-[10.5px]">会话开始时间</th>
                            <th className="p-4 font-bold text-[10.5px]">用户PIN</th>
                            <th className="p-4 font-bold text-[10.5px]">分析状态</th>
                            <th className="p-4 font-bold text-[10.5px]">数字员工</th>
                            <th className="p-4 font-bold text-[10.5px]">渠道</th>
                            <th className="p-4 font-bold text-[10.5px]">在线状态</th>
                            <th className="p-4 text-center font-bold text-[10.5px]">是否转人工</th>
                            <th className="p-4 text-center font-bold text-[10.5px]">转人工是否成功</th>
                            <th className="p-4 font-bold text-[10.5px]">满意度</th>
                            <th className="p-4 font-bold text-[10.5px]">业务场景</th>
                            <th className="p-4 text-right font-bold text-[10.5px] sticky right-0 z-10 bg-neutral-50/90 shadow-[-1px_0_0_#f5f5f5]">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-700 text-left">
                          {/* [目标锁定]: 修复  1 (数据接入/质检列表) 与  2 (质检模板配置) 的层级断裂问题，恢复   渲染并正确闭合表格及  1 包装。
                              // [影响评估]: 还原之前不小心被覆盖的   及闭合标签，将  2 模板下移与  1 并列。完全解决  嵌套导致的全局编译错误。
                              // [修改边界]: 仅对第 1288-1290 行的  、 承接进行修复，绝不干涉其它核心下钻区域的代码逻辑。 */}
                          {sessions.filter(sess => {
                            if (filterResultType === 'all') return true;
                            if (filterResultType === 'compliance') {
                              return sess.id === 'SESS-09513' || sess.id === 'SESS-09514';
                            }
                            if (filterResultType === 'scoring') {
                              return sess.id === 'SESS-09512';
                            }
                            if (filterResultType === 'label') {
                              return sess.id === 'SESS-09512' || sess.id === 'SESS-09514';
                            }
                            return true;
                          }).map((sess) => (
                            <tr key={sess.id} className="hover:bg-neutral-50 transition-colors group">
                              <td className="p-4 font-mono font-bold text-[10.5px] text-neutral-800 sticky left-0 z-10 bg-white group-hover:bg-neutral-50 shadow-[1px_0_0_#f5f5f5]">{sess.id}</td>
                              <td className="p-4 text-neutral-500">{sess.startTime}</td>
                              <td className="p-4 text-neutral-600 font-medium">{sess.customerName}</td>
                              <td className="p-4">
                                {(sess.id === 'SESS-09512' || sess.id === 'SESS-09513') ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">已完成</span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-200">待开始</span>
                                )}
                              </td>
                              <td className="p-4 text-neutral-800 font-bold">{sess.agentName}</td>
                              <td className="p-4 text-neutral-500 font-medium">在线Web</td>
                              <td className="p-4">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  已连接
                                </span>
                              </td>
                              <td className="p-4 text-center text-neutral-500">否</td>
                              <td className="p-4 text-center text-neutral-400">-</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-black ${
                                  sess.satisfaction === '不满意' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                  sess.satisfaction === '一般' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  {sess.satisfaction}
                                </span>
                              </td>
                              <td className="p-4 text-neutral-600 max-w-xs truncate" title={sess.intent}>{sess.intent}</td>
                              <td className="p-4 text-right sticky right-0 z-10 bg-white group-hover:bg-neutral-50 shadow-[-1px_0_0_#f5f5f5]">
                                <button 
                                  onClick={() => {
                                    setSelectedSession(sess);
                                    setEditIntent(sess.intent);
                                    setEditNpsClass(sess.npsClass);
                                    setEditNpsScore(sess.npsScore);
                                    setEditAiScore(sess.aiScore);
                                    setShowTranscriptModal(true);
                                  }}
                                  className="text-[10px] text-neutral-800 font-black hover:underline cursor-pointer"
                                >
                                  查看会话 ➔
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/*  2:      (质检模板配置) */}
              {drillDownType === 'template' && (
                <div className="flex flex-col h-full space-y-4 text-left">
                  <div className="flex flex-1 gap-4 min-h-0 overflow-hidden text-left">
                    {}
                    <div className="w-[310px] bg-white rounded-[13px] border border-neutral-200 shadow-sm flex flex-col overflow-hidden shrink-0 text-left">
                      <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
                          <FolderTree size={12} className="text-sky-400" /> 识别内容
                        </span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar text-left">
                        
                        {/* 📋 质检类 */}
                        <div className="space-y-2 text-left">
                          <div className="flex items-center justify-between px-2 py-1 bg-neutral-100/50 rounded-lg border border-neutral-200">
                            <span className="text-[10px] font-black text-neutral-700 uppercase tracking-widest flex items-center gap-1">
                              📋 质检类
                            </span>
                            <button 
                              onClick={() => {
                                const newId = 'cat-' + Date.now();
                                const newCategory = {
                                  id: newId,
                                  title: '', // 空值触发占位符
                                  weight: '',
                                  type: 'category',
                                  indicatorType: '质检类',
                                  prompt: '1. 检查客服是否按标准回答。',
                                  relationType: 'AND',
                                  operators: [
                                    { id: 'opt-' + Date.now(), type: 'rule', name: '条件 A：文本消息关键字命中算子', words: '保本, 收益', roles: ['客服'] }
                                  ],
                                  mapping: { score: '-10', code: 'VIOLATION_NEW', isExpanded: true },
                                  children: []
                                };
                                setDrilldownIndicators([...drilldownIndicators, newCategory]);
                                setSelectedIndicatorId(newId);
                                setEditingIndicatorId(newId);
                                setIsEditingNameOnPanel(true);
                              }}
                              className="text-neutral-700 hover:bg-sky-100 p-1 rounded transition-all flex items-center gap-0.5 text-[9px] font-bold cursor-pointer"
                            >
                              <Plus size={10} /> 新增
                            </button>
                          </div>
                          <div className="space-y-1 text-left">
                            {drilldownIndicators.filter(cat => (cat as any).indicatorType !== '多维度评分类' && (cat as any).indicatorType !== '分类标签').map((cat) => {
                              const catIdx = drilldownIndicators.findIndex(c => c.id === cat.id);
                              const isEditingName = editingIndicatorId === cat.id;
                              return (
                                <div key={cat.id} className="space-y-1 border border-neutral-100 rounded-[13px] p-1 bg-neutral-50/30 text-left">
                                  {}
                                  <div 
                                    onClick={() => {
                                      setSelectedIndicatorId(cat.id);
                                    }}
                                    className={`group flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                                      selectedIndicatorId === cat.id 
                                        ? 'bg-neutral-800 text-white shadow-[0_2px_10px_rgba(31,35,41,0.02)]' 
                                        : 'hover:bg-neutral-100 text-neutral-600'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                                      {cat.children && cat.children.length > 0 ? (
                                        <ChevronDown size={12} className={selectedIndicatorId === cat.id ? 'text-white' : 'text-neutral-400'} />
                                      ) : (
                                        <div className="w-3" />
                                      )}
                                      {isEditingName ? (
                                        <input 
                                          type="text" 
                                          autoFocus
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="请输入一级项名称..."
                                          className={`flex-1 bg-white text-neutral-800 rounded px-1.5 py-0.5 text-[10.5px] font-black focus:outline-none focus:border-neutral-400`}
                                          value={cat.title}
                                          onChange={(e) => {
                                            const newIndicators = [...drilldownIndicators];
                                            newIndicators[catIdx].title = e.target.value;
                                            setDrilldownIndicators(newIndicators);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') setEditingIndicatorId(null);
                                          }}
                                          onBlur={() => setEditingIndicatorId(null)}
                                        />
                                      ) : (
                                        <span className="text-[10.5px] font-black truncate max-w-[120px]">
                                          {cat.title || '未命名一级项'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedIndicatorId(cat.id);
                                          setEditingIndicatorId(cat.id);
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${selectedIndicatorId === cat.id ? 'text-sky-200 hover:text-white hover:opacity-90' : 'text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200'}`}
                                        title="编辑名称"
                                      >
                                        <Edit3 size={10} />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDrilldownIndicators(drilldownIndicators.filter(c => c.id !== cat.id));
                                          if (selectedIndicatorId === cat.id) setSelectedIndicatorId(null);
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${selectedIndicatorId === cat.id ? 'text-sky-200 hover:text-white hover:opacity-90' : 'text-neutral-400 hover:text-rose-500 hover:bg-neutral-200'}`}
                                        title="删除"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {}
                                  <div className="pl-3 space-y-0.5 border-l border-neutral-100 ml-3.5 pt-1 pb-1">
                                    {cat.children.map((child, childIdx) => {
                                      const isChildEditing = editingIndicatorId === child.id;
                                      return (
                                        <div key={child.id} className="space-y-0.5">
                                          <div 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedIndicatorId(child.id);
                                            }}
                                            className={`group flex items-center justify-between p-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                              selectedIndicatorId === child.id 
                                                ? 'bg-neutral-100 text-neutral-700 border-l-2 border-neutral-800' 
                                                : 'hover:bg-neutral-100 text-neutral-500 border-l-2 border-transparent'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                                              <div className={`w-1 shrink-0 h-1 rounded-full ${selectedIndicatorId === child.id ? 'bg-sky-500' : 'bg-neutral-300'}`}></div>
                                              {isChildEditing ? (
                                                <input 
                                                  type="text" 
                                                  autoFocus
                                                  onClick={(e) => e.stopPropagation()}
                                                  placeholder="请输入二级项名称..."
                                                  className={`flex-1 bg-white text-neutral-800 rounded px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-neutral-400`}
                                                  value={child.name}
                                                  onChange={(e) => {
                                                    const newIndicators = [...drilldownIndicators];
                                                    newIndicators[catIdx].children[childIdx].name = e.target.value;
                                                    setDrilldownIndicators(newIndicators);
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') setEditingIndicatorId(null);
                                                  }}
                                                  onBlur={() => setEditingIndicatorId(null)}
                                                />
                                              ) : (
                                                <span className="text-[10px] font-bold truncate max-w-[90px]">
                                                  {child.name || '未命名二级项'}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-0.5 shrink-0">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newIndicators = [...drilldownIndicators];
                                                  const newId = 'l3-' + Date.now();
                                                  const newL3 = { id: newId, name: '' };
                                                  if (!newIndicators[catIdx].children[childIdx].children) {
                                                    newIndicators[catIdx].children[childIdx].children = [];
                                                  }
                                                  newIndicators[catIdx].children[childIdx].children.push(newL3);
                                                  setDrilldownIndicators(newIndicators);
                                                  setSelectedIndicatorId(newId);
                                                  setEditingIndicatorId(newId);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-800"
                                                title="新增三级项"
                                              >
                                                <Plus size={9} />
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedIndicatorId(child.id);
                                                  setEditingIndicatorId(child.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-800"
                                                title="编辑名称"
                                              >
                                                <Edit3 size={9} />
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newIndicators = [...drilldownIndicators];
                                                  newIndicators[catIdx].children = newIndicators[catIdx].children.filter(c => c.id !== child.id);
                                                  setDrilldownIndicators(newIndicators);
                                                  if (selectedIndicatorId === child.id) setSelectedIndicatorId(null);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-rose-500 p-0.5 rounded hover:bg-neutral-200"
                                                title="删除"
                                              >
                                                <Trash2 size={9} />
                                              </button>
                                            </div>
                                          </div>
                                          {}
                                          {child.children && child.children.length > 0 && (
                                            <div className="pl-3 space-y-0.5 border-l border-neutral-100 ml-1.5 pt-0.5 pb-0.5">
                                              {child.children.map((l3, l3Idx) => {
                                                const isL3Editing = editingIndicatorId === l3.id;
                                                return (
                                                  <div 
                                                    key={l3.id}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedIndicatorId(l3.id);
                                                    }}
                                                    className={`group flex items-center justify-between p-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                                                      selectedIndicatorId === l3.id 
                                                        ? 'bg-neutral-100 text-neutral-700 border-l-2 border-neutral-800' 
                                                        : 'hover:bg-neutral-100 text-neutral-500 border-l-2 border-transparent'
                                                    }`}
                                                  >
                                                    <div className="flex items-center gap-1.5 overflow-hidden flex-1 pl-1">
                                                      <div className={`w-0.5 shrink-0 h-0.5 rounded-full ${selectedIndicatorId === l3.id ? 'bg-sky-500' : 'bg-neutral-300'}`}></div>
                                                      {isL3Editing ? (
                                                        <input 
                                                          type="text" 
                                                          autoFocus
                                                          onClick={(e) => e.stopPropagation()}
                                                          placeholder="请输入三级项..."
                                                          className={`flex-1 bg-white text-neutral-800 rounded px-1 py-0.5 text-[9px] font-bold focus:outline-none focus:border-neutral-400`}
                                                          value={l3.name}
                                                          onChange={(e) => {
                                                            const newIndicators = [...drilldownIndicators];
                                                            newIndicators[catIdx].children[childIdx].children[l3Idx].name = e.target.value;
                                                            setDrilldownIndicators(newIndicators);
                                                          }}
                                                          onKeyDown={(e) => {
                                                            if (e.key === 'Enter') setEditingIndicatorId(null);
                                                          }}
                                                          onBlur={() => setEditingIndicatorId(null)}
                                                        />
                                                      ) : (
                                                        <span className="text-[9px] font-bold truncate max-w-[80px]">
                                                          {l3.name || '未命名三级项'}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setSelectedIndicatorId(l3.id);
                                                          setEditingIndicatorId(l3.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-200 text-neutral-400 hover:text-neutral-800"
                                                        title="编辑名称"
                                                      >
                                                        <Edit3 size={8} />
                                                      </button>
                                                      <button 
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const newIndicators = [...drilldownIndicators];
                                                          newIndicators[catIdx].children[childIdx].children = newIndicators[catIdx].children[childIdx].children.filter(c => c.id !== l3.id);
                                                          setDrilldownIndicators(newIndicators);
                                                          if (selectedIndicatorId === l3.id) setSelectedIndicatorId(null);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-rose-500 p-0.5 rounded hover:bg-neutral-200"
                                                        title="删除"
                                                      >
                                                        <Trash2 size={8} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newIndicators = [...drilldownIndicators];
                                        const newId = 'child-' + Date.now();
                                        const newChild = {
                                          id: newId,
                                          name: '', // 空值触发占位符
                                          weight: '',
                                          type: 'operator',
                                          indicatorType: '质检类',
                                          prompt: '1. 执行二级质检条件。',
                                          relationType: 'AND',
                                          operators: [
                                            { id: 'opt-' + Date.now(), type: 'rule', name: '条件 A：文本消息关键字命中算子', words: '保本, 收益', roles: ['客服'] }
                                          ],
                                          mapping: { score: '-10', code: 'VIOLATION_SUB', isExpanded: true }
                                        };
                                        newIndicators[catIdx].children.push(newChild);
                                        setDrilldownIndicators(newIndicators);
                                        setSelectedIndicatorId(newChild.id); setIsEditingNameOnPanel(true);
                                        setEditingIndicatorId(newId);
                                      }}
                                      className="w-full flex items-center gap-1 p-1 text-[8.5px] font-black text-sky-500 hover:bg-neutral-100 rounded-md transition-all cursor-pointer"
                                    >
                                      <Plus size={8} /> 追加二级项
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 🏷️ 分类标签 */}
                        <div className="space-y-2 text-left">
                          <div className="flex items-center justify-between px-2 py-1 bg-emerald-50/50 rounded-lg border border-emerald-100">
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                              🏷️ 分类标签
                            </span>
                            <button 
                              onClick={() => {
                                const newId = 'cat-' + Date.now();
                                const newCategory = {
                                  id: newId,
                                  title: '',
                                  weight: '',
                                  type: 'category',
                                  indicatorType: '分类标签',
                                  analysisDimension: 'session',
                                  analysisRole: '客服',
                                  llmModel: 'Gemini 2.5 Flash',
                                  customInput: '',
                                  promptTemplate: '分析客户情绪...',
                                  mappings: [
                                    { primaryClass: '愤怒', reasonField: 'EXPRESSES_ANGER' }
                                  ],
                                  children: []
                                };
                                setDrilldownIndicators([...drilldownIndicators, newCategory]);
                                setSelectedIndicatorId(newCategory.id); setIsEditingNameOnPanel(true);
                                setEditingIndicatorId(newId);
                              }}
                              className="text-emerald-700 hover:bg-emerald-100 p-1 rounded transition-all flex items-center gap-0.5 text-[9px] font-bold cursor-pointer"
                            >
                              <Plus size={10} /> 新增
                            </button>
                          </div>
                          <div className="space-y-1 text-left">
                            {drilldownIndicators.filter(cat => (cat as any).indicatorType === '分类标签').map((cat) => {
                              const catIdx = drilldownIndicators.findIndex(c => c.id === cat.id);
                              const isEditingName = editingIndicatorId === cat.id;
                              return (
                                <div key={cat.id} className="space-y-1 border border-neutral-100 rounded-[13px] p-1 bg-neutral-50/30 text-left">
                                  <div 
                                    onClick={() => setSelectedIndicatorId(cat.id)}
                                    className={`group flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                                      selectedIndicatorId === cat.id 
                                        ? 'bg-emerald-600 text-white shadow-[0_2px_10px_rgba(31,35,41,0.02)]' 
                                        : 'hover:bg-neutral-100 text-neutral-600'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                                      {cat.children && cat.children.length > 0 ? (
                                        <ChevronDown size={12} className={selectedIndicatorId === cat.id ? 'text-white' : 'text-neutral-400'} />
                                      ) : (
                                        <div className="w-3" />
                                      )}
                                      {isEditingName ? (
                                        <input 
                                          autoFocus
                                          className="text-[11px] font-bold text-neutral-800 bg-white border border-neutral-200 rounded px-1 w-24 outline-none"
                                          value={cat.title}
                                          onChange={(e) => {
                                                    const newIndicators = [...drilldownIndicators];
                                                    newIndicators[catIdx].title = e.target.value;
                                                    setDrilldownIndicators(newIndicators);
                                                  }}
                                          onBlur={() => setEditingIndicatorId(null)}
                                          onKeyDown={(e) => { if (e.key === 'Enter') setEditingIndicatorId(null); }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        <span 
                                          onDoubleClick={(e) => { e.stopPropagation(); setEditingIndicatorId(cat.id); }}
                                          className={`text-[11px] font-bold truncate flex-1 ${!cat.title && 'text-emerald-200'} ${selectedIndicatorId === cat.id ? 'text-white' : 'text-neutral-700'}`}
                                        >
                                          {cat.title || '请输入...'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* 📊 多维度评分类 */}
                        <div className="space-y-2 text-left">
                          <div className="flex items-center justify-between px-2 py-1 bg-amber-50/50 rounded-lg border border-amber-100">
                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                              📊 多维度评分类
                            </span>
                            <button 
                              onClick={() => {
                                const newId = 'cat-' + Date.now();
                                const newCategory = {
                                  id: newId,
                                  title: '', // 空值显示“请输入...”占位
                                  weight: '',
                                  type: 'category',
                                  indicatorType: '多维度评分类',
                                  prompt: '1. 分析会话意图。',
                                  activeAnalysisFormat: 'multi-class',
                                  scoreLower: 0,
                                  scoreUpper: 100,
                                  interactionType: '滑动条 (Slider) - 支持人工微调',
                                  radarDimensions: ['服务态度', '专业度'],
                                  mappings: [
                                    { type: '意图 A', score: '10', code: 'INTENT_A' }
                                  ],
                                  children: [] // 严格空，不支持二级
                                };
                                setDrilldownIndicators([...drilldownIndicators, newCategory]);
                                setSelectedIndicatorId(newCategory.id); setIsEditingNameOnPanel(true);
                                setEditingIndicatorId(newId);
                              }}
                              className="text-amber-700 hover:bg-amber-100 p-1 rounded transition-all flex items-center gap-0.5 text-[9px] font-bold cursor-pointer"
                            >
                              <Plus size={10} /> 新增
                            </button>
                          </div>
                          <div className="space-y-1 text-left">
                            {drilldownIndicators.filter(cat => (cat as any).indicatorType === '多维度评分类').map((cat) => {
                              const catIdx = drilldownIndicators.findIndex(c => c.id === cat.id);
                              const isEditingName = editingIndicatorId === cat.id;
                              return (
                                <div key={cat.id} className="space-y-1 border border-neutral-100 rounded-[13px] p-1 bg-neutral-50/30 text-left">
                                  {}
                                  <div 
                                    onClick={() => {
                                      setSelectedIndicatorId(cat.id);
                                    }}
                                    className={`group flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                                      selectedIndicatorId === cat.id 
                                        ? 'bg-amber-600 text-white shadow-[0_2px_10px_rgba(31,35,41,0.02)]' 
                                        : 'hover:bg-neutral-100 text-neutral-600'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                                      {cat.children && cat.children.length > 0 ? (
                                        <ChevronDown size={12} className={selectedIndicatorId === cat.id ? 'text-white' : 'text-neutral-400'} />
                                      ) : (
                                        <div className="w-3" />
                                      )}
                                      {isEditingName ? (
                                        <input 
                                          type="text" 
                                          autoFocus
                                          onClick={(e) => e.stopPropagation()}
                                          placeholder="请输入分析一级项名称..."
                                          className={`flex-1 bg-white text-neutral-800 rounded px-1.5 py-0.5 text-[10.5px] font-black focus:outline-none focus:border-neutral-400`}
                                          value={cat.title}
                                          onChange={(e) => {
                                            const newIndicators = [...drilldownIndicators];
                                            newIndicators[catIdx].title = e.target.value;
                                            setDrilldownIndicators(newIndicators);
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') setEditingIndicatorId(null);
                                          }}
                                          onBlur={() => setEditingIndicatorId(null)}
                                        />
                                      ) : (
                                        <span className="text-[10.5px] font-black truncate max-w-[120px]">
                                          {cat.title || '未命名分析一级项'}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedIndicatorId(cat.id);
                                          setEditingIndicatorId(cat.id);
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${selectedIndicatorId === cat.id ? 'text-amber-200 hover:text-white hover:bg-amber-700' : 'text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200'}`}
                                        title="编辑名称"
                                      >
                                        <Edit3 size={10} />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDrilldownIndicators(drilldownIndicators.filter(c => c.id !== cat.id));
                                          if (selectedIndicatorId === cat.id) setSelectedIndicatorId(null);
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity ${selectedIndicatorId === cat.id ? 'text-amber-200 hover:text-white hover:bg-amber-700' : 'text-neutral-400 hover:text-rose-500 hover:bg-neutral-200'}`}
                                        title="删除"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>

                    {}
                    <div className="flex-1 bg-white rounded-[13px] border border-neutral-200 shadow-sm flex overflow-hidden text-left">
                      {selectedIndicatorId ? (
                        <>
                          {}
                          <div className="flex-1 flex flex-col border-r border-neutral-100 min-w-0 text-left">
                            {}
                            <div className="p-6 border-b border-neutral-100 shrink-0 text-left">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="w-10 h-10 rounded-[7px] bg-neutral-100 flex items-center justify-center text-neutral-600 shadow-inner shrink-0">
                                    {selectedIndicatorId.includes('-') || selectedIndicatorId.startsWith('child-') ? <Terminal size={18} /> : <LayoutGrid size={18} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    {isEditingNameOnPanel ? (
                                      <div className="flex items-center gap-2">
                                        <input 
                                          autoFocus
                                          className="text-sm font-black text-neutral-800 bg-white border border-neutral-200 rounded px-2 py-0.5 focus:outline-none focus:border-neutral-400 w-full"
                                          value={
                                            (() => {
                                              const t = findIndicatorById(selectedIndicatorId);
                                              return t ? (t.isCategory ? t.item.title : t.item.name) : '';
                                            })()
                                          }
                                          onChange={(e) => {
                                            const t = findIndicatorById(selectedIndicatorId);
                                            if (t) {
                                              updateSelectedIndicatorField(t.isCategory ? 'title' : 'name', e.target.value);
                                            }
                                          }}
                                          placeholder="请输入名称..."
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') setIsEditingNameOnPanel(false);
                                          }}
                                        />
                                        <button 
                                          onClick={() => setIsEditingNameOnPanel(false)}
                                          className="px-2 py-1 bg-sky-600 text-white rounded text-[10px] font-black hover:bg-sky-700 shrink-0"
                                        >
                                          保存
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-neutral-800 truncate">
                                          {(() => {
                                            const t = findIndicatorById(selectedIndicatorId);
                                            return t ? (t.isCategory ? t.item.title : t.item.name) : '未命名层级项';
                                          })()}
                                        </span>
                                        <button 
                                          onClick={() => setIsEditingNameOnPanel(true)}
                                          className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-800 transition-colors flex items-center gap-0.5"
                                          title="点击编辑名称"
                                        >
                                          <Edit3 size={11} />
                                          <span className="text-[10px] font-bold">编辑</span>
                                        </button>
                                      </div>
                                    )}
                                    <p className="text-[10px] text-neutral-400 mt-0.5">配置该层级项的触发算子、条件逻辑及分析结果映射</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button 
                                    onClick={() => {
                                      const t = findIndicatorById(selectedIndicatorId);
                                      if (t) {
                                        updateSelectedIndicatorField('prompt', t.isCategory ? '1. 重置标准。' : '1. 子模块重新设定。');
                                        qcNotify('🔄 已重置为默认配置。');
                                      }
                                    }}
                                    className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-all cursor-pointer"
                                    title="重置配置"
                                  >
                                    <RefreshCw size={14} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const target = findIndicatorById(selectedIndicatorId);
                                      if (target) {
                                        const newIndicators = [...drilldownIndicators];
                                        if (target.isCategory) {
                                          newIndicators.splice(target.catIdx, 1);
                                        } else {
                                          newIndicators[target.catIdx].children.splice(target.childIdx, 1);
                                        }
                                        setDrilldownIndicators(newIndicators);
                                        setSelectedIndicatorId(null);
                                        qcNotify('🗑️ 该层级项已成功删除！');
                                      }
                                    }}
                                    className="p-2 hover:bg-neutral-100 rounded-lg text-rose-400 transition-all cursor-pointer"
                                    title="删除此项"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              {getIndicatorField(selectedIndicatorId, 'indicatorType', '质检类') !== '多维度评分类' && getIndicatorField(selectedIndicatorId, 'indicatorType', '质检类') !== '分类标签' && (
                                <div className="grid grid-cols-2 gap-6">
                                  {}
                                </div>
                              )}
                            </div>

                            {}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-neutral-50/20 text-left">
                              {(() => {
                                const t = findIndicatorById(selectedIndicatorId);
                                if (!t) return null;
                                const indicatorType = getIndicatorField(selectedIndicatorId, 'indicatorType', '质检类');
                                
                                if (t.isCategory && (indicatorType === '多维度评分类' || indicatorType === '分类标签')) {
                                  return null; // 去除质检大类名称字段配置
                                }

                                if (t.isCategory) {
                                  return (
                                    <div className="space-y-4 bg-white p-4 rounded-[13px] border border-neutral-200">
                                      <h6 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest">基础字段配置 (1级)</h6>
                                      <div>
                                        <label className="block text-[10px] font-bold text-neutral-500 mb-1">质检大类名称</label>
                                        <input 
                                          type="text" 
                                          className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-neutral-400"
                                          value={t.item.title || ''}
                                          onChange={(e) => updateSelectedIndicatorField('title', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  );
                                }

                                if (indicatorType === '质检类') {
                                  return (
                                    <div className="space-y-4 bg-white p-4 rounded-[13px] border border-neutral-200">
                                      <h6 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest">基础字段配置 (2级)</h6>
                                      <div>
                                        <label className="block text-[10px] font-bold text-neutral-500 mb-1">分数配置</label>
                                        <input 
                                          type="number" 
                                          placeholder="命中该项的扣分/加分"
                                          className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-neutral-400"
                                          value={t.item.score || ''}
                                          onChange={(e) => updateSelectedIndicatorField('score', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                  );
                                }

                                return null;
                              })()}

                              
                              {['多维度评分类', '分类标签'].includes(getIndicatorField(selectedIndicatorId, 'indicatorType', '质检类')) ? (
                                (() => {
                                  const currentMaps = getIndicatorField(selectedIndicatorId, 'mappings', []);
                                  const indicatorType = getIndicatorField(selectedIndicatorId, 'indicatorType', '质检类');
                                  const isLabel = indicatorType === '分类标签';

                                  const dims = currentMaps.map((m: any) => m.primaryClass || '').filter(Boolean);
                                  const finalRadarDimensions = dims.length > 0 ? dims : ['服务态度', '专业知识', '响应速度', '沟通技巧'];
                                  const getScoreForDim = (dim: string) => {
                                    const mapRow = currentMaps.find((m: any) => m.primaryClass === dim);
                                    if (mapRow && mapRow.score !== undefined && mapRow.score !== '') {
                                      const parsed = parseInt(mapRow.score);
                                      return isNaN(parsed) ? 80 : parsed;
                                    }
                                    return 80;
                                  };

                                  return (
                                    <>
                                      {/* 1. 大模型分析 */}
                                      <section className="space-y-3 text-left">
                                        <div className="flex items-center justify-between">
                                          <h6 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                                            <BrainCircuit size={14} className="text-sky-500" /> 1. 大模型分析
                                          </h6>
                                          <button className="text-[9px] text-neutral-800 font-bold hover:underline">
                                            导入外部知识库
                                          </button>
                                        </div>
                                        
                                        <div className="bg-neutral-50 p-3 rounded-[13px] border border-neutral-100 space-y-3">
                                          <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-bold text-neutral-600">分析维度：</span>
                                            <select 
                                              value={getIndicatorField(selectedIndicatorId, 'analysisDimension', 'session') === 'message' ? 'message_single' : getIndicatorField(selectedIndicatorId, 'analysisDimension', 'session')}
                                              onChange={(e) => updateSelectedIndicatorField('analysisDimension', e.target.value)}
                                              className="bg-white border border-neutral-200 rounded px-2 py-1 text-[10px] font-bold outline-none text-neutral-700"
                                            >
                                              <option value="session">会话维度</option>
                                              <option value="message_single">消息维度（单消息）</option>
                                              <option value="message_context">消息维度（包含上文）</option>
                                            </select>
                                          </div>

                                          <div className="flex items-center gap-4 border-t border-neutral-200/60 pt-3">
                                            <span className="text-[10px] font-bold text-neutral-600">选择模型：</span>
                                            <select 
                                              value={getIndicatorField(selectedIndicatorId, 'llmModel', 'Gemini 2.5 Pro')}
                                              onChange={(e) => updateSelectedIndicatorField('llmModel', e.target.value)}
                                              className="bg-white border border-neutral-200 rounded px-2 py-1 text-[10px] font-bold outline-none text-neutral-700"
                                            >
                                              <option value="Gemini 2.5 Pro">Gemini 2.5 Pro</option>
                                              <option value="Gemini 2.5 Flash">Gemini 2.5 Flash</option>
                                              <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                                            </select>
                                          </div>
                                          
                                          {['message', 'message_single', 'message_context'].includes(getIndicatorField(selectedIndicatorId, 'analysisDimension', 'session')) && (
                                            <div className="flex items-center gap-4 border-t border-neutral-200/60 pt-3 animate-in fade-in duration-200">
                                              <span className="text-[10px] font-bold text-neutral-600">消息角色：</span>
                                              {['客户', '客服', '数字员工'].map(role => {
                                                const roles = getIndicatorField(selectedIndicatorId, 'analysisRoles', []) as string[];
                                                const isChecked = roles.includes(role);
                                                return (
                                                  <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                                                    <input 
                                                      type="checkbox" 
                                                      checked={isChecked} 
                                                      onChange={(e) => {
                                                        const newRoles = e.target.checked ? [...roles, role] : roles.filter(r => r !== role);
                                                        updateSelectedIndicatorField('analysisRoles', newRoles);
                                                      }} 
                                                      className="accent-neutral-800" 
                                                    />
                                                    <span className="text-[10px] font-medium text-neutral-700">{role}</span>
                                                  </label>
                                                )
                                              })}
                                            </div>
                                          )}
                                        </div>

                                        <div>
                                          <span className="block text-[10px] font-bold text-neutral-600 mb-1">大模型分析提示词</span>
                                          <textarea 
                                            className="w-full h-48 px-4 py-3 bg-white border border-neutral-200 rounded-[13px] text-[11px] leading-relaxed text-neutral-700 focus:outline-none focus:border-neutral-500 focus:border-neutral-400 resize-none shadow-xxs font-mono text-left"
                                            placeholder="请输入分析提示词..."
                                            value={getIndicatorField(selectedIndicatorId, 'prompt', '')}
                                            onChange={(e) => updateSelectedIndicatorField('prompt', e.target.value)}
                                          />
                                          
                                          {/* 预置指令模板快捷选项 */}
                                          <div className="mt-2 text-left">
                                            <span className="text-[10px] font-bold text-neutral-400 block mb-1">预置指令模板：</span>
                                            <div className="flex flex-wrap gap-1.5">
                                              {(isLabel
                                                ? [
                                                    { label: '通用分类标签模板', prompt: '# 一、角色\n你是一个专业的会话分类标签分析专家，需要根据用户与客服的完整对话内容，为本次会话打上相应的分类标签。\n\n# 二、任务\n请从下列标签体系中，判断本次会话命中的所有标签，并给出判定依据。\n\n# 三、标签体系（可按业务自定义）\n1. 咨询类型：售前咨询 / 售后咨询 / 投诉建议 / 物流查询 / 退换货\n2. 情绪倾向：正向 / 中性 / 负向\n3. 紧急程度：高 / 中 / 低\n4. 是否需人工介入：是 / 否\n\n# 四、判定规则\n规则1：一个会话可命中多个标签，但同一标签维度下只能选一个取值。\n规则2：若某维度无法判定，输出该维度为“未知”。\n规则3：判定依据须引用对话中的原话片段，不得臆测。\n\n# 五、输出格式\n请按【标签维度】=>【取值】=>【依据】的格式逐行输出。' },
                                                    { label: '意图识别模板', prompt: '# 一、角色\n你是一个专业的客服会话意图识别专家，需要根据用户与客服的对话内容，精准识别用户的核心意图。\n\n# 二、任务\n请识别用户在本次会话中表达的【主意图】及可能存在的【次意图】，并给出置信度与判定依据。\n\n# 三、意图体系（京东物流客服场景示例，可自定义）\n- 催派送：用户催促快递尽快派送\n- 催揽收：用户催促快递尽快揽收\n- 查询进度：用户查询快递当前状态/位置\n- 修改订单：修改地址、时间、联系方式等\n- 投诉：对物流人员或服务表达不满并要求处理\n- 理赔咨询：破损、丢失、延误等索赔相关\n- 退换货：申请退货或换货\n- 其他咨询：不属于以上分类的一般性咨询\n\n# 四、判定规则\n规则1：主意图为用户最核心、最优先希望解决的诉求，有且仅有一个。\n规则2：若用户诉求在会话中发生变更（如先催派后改地址），以最终诉求为主意图。\n规则3：次意图为用户附带提及但非核心的诉求，可为空。\n规则4：判定依据须引用对话原话片段。\n\n# 五、输出格式\n主意图：xxx（置信度：高/中/低）\n次意图：xxx / 无\n判定依据：引用原话' },
                                                  ]
                                                : [
                                                    { label: '通用多维评分模板', prompt: '# 一、角色\n你是一个专业的客服服务质量评分专家。用户的一次进线咨询称为会话，多次进线咨询按时间先后串联为一个事件。\n\n# 二、任务\n下面将给你一段完整的会话（或事件）明细，你需要立足客户体验视角，对客服本次服务从多个维度进行量化评分，并给出打分结论与打分证据。\n\n# 三、评分维度（每维满分 10 分，可按业务自定义增减）\n维度1 理解需求：是否耐心倾听、精准捕捉核心诉求、准确解答疑问。\n维度2 安抚情绪：是否感知并安抚用户情绪、真诚共情、如实告知、不套话敷衍。\n维度3 解决方案专业：是否快速定位卡点、方案切实可行、主动沟通达成共识。\n维度4 主动跟进：是否主动同步进展、全程跟进、对问题闭环负责。\n\n# 四、评分要求\n1. 每个维度独立打分（0-10 的整数），并给出打分结论 + 打分证据（引用对话原话片段）。\n2. 依据须客观，不得臆测；无相关信息的维度按中性给分并说明。\n\n# 五、输出格式（JSON）\n{\n  "dim_1": { "score": 0, "reason": "" },\n  "dim_2": { "score": 0, "reason": "" },\n  "dim_3": { "score": 0, "reason": "" },\n  "dim_4": { "score": 0, "reason": "" }\n}\n输出必须以 { 开头，以 } 结尾。' },
                                                    { label: '服务到我为止模板', prompt: '# 一、角色\n你是一个专业的京东物流客服质检专家。用户的一次进线咨询称为会话，多次进线咨询会按时间先后串联为一个事件。\n\n# 二、任务\n下面将给你一段完整的事件明细，你需要立足客户体验视角，分析事件的全历程，并按下列 7 个维度对客服服务进行量化评分（每维满分 10 分），给出与打分相符的打分结论与打分证据。\n\n# 三、评分维度（每维满分 10 分）\n维度1 理解需求：耐心倾听、精准捕捉核心诉求、准确解答疑问。\n维度2 安抚情绪：感知并安抚用户情绪、真诚共情、如实告知、不套话敷衍。\n维度3 自我管理：不受用户负面情绪影响，全程保持稳定专业的服务态度。\n维度4 解决方案专业：快速定位卡点、方案切实可行、主动沟通达成共识。\n维度5 灵活应变：结合实际、多方核实、提供备选方案、灵活调整策略。\n维度6 主动跟进：主动同步进展、全程跟进、对问题闭环有责任心。\n维度7 问题终结：及时彻底解决问题、无遗留、避免用户反复进线。\n\n# 四、评分要求（关键约束）\n1. 每个维度独立打分（0-10 的整数），reason 须包含【打分结论 + 打分证据】，证据引用事件明细中的原话片段。\n2. 承诺后续跟进并解决 → 维度7 高分；同一问题反复进线未解决 → 维度7 扣分。\n3. 无效进线（无人接听/乱码等）不影响问题解决的判定。\n4. reason 中禁止暴露任何内部评分规则编号（如“符合评分逻辑-00015”属错误示例）。\n\n# 五、输出格式（JSON）\n{\n  "dim_1": { "score": 0, "reason": "" },\n  "dim_2": { "score": 0, "reason": "" },\n  "dim_3": { "score": 0, "reason": "" },\n  "dim_4": { "score": 0, "reason": "" },\n  "dim_5": { "score": 0, "reason": "" },\n  "dim_6": { "score": 0, "reason": "" },\n  "dim_7": { "score": 0, "reason": "" }\n}\n输出必须以 { 开头，以 } 结尾。' },
                                                  ]
                                              ).map((preset) => (
                                                <button
                                                  type="button"
                                                  key={preset.label}
                                                  onClick={() => updateSelectedIndicatorField('prompt', preset.prompt)}
                                                  className="px-2 py-1 bg-neutral-100 hover:bg-neutral-100 hover:text-neutral-800 rounded text-[9.5px] font-bold text-neutral-600 transition-colors border border-neutral-200 cursor-pointer"
                                                  title={preset.prompt}
                                                >
                                                  {preset.label}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </section>
                                      
                                      {/* 总映射配置（仅多维度评分类展示，分类标签场景隐藏） */}
                                      {!isLabel && (
                                      <section className="space-y-3 text-left">
                                        <div className="flex items-center justify-between">
                                          <h6 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                            总映射配置
                                          </h6>
                                        </div>
                                    <div className="bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs text-left">
                                          <table className="w-full text-left border-collapse">
                                            <thead>
                                              <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100">
                                                <th className="px-4 py-3 min-w-[100px]">输出字段</th>
                                                <th className="px-4 py-3 min-w-[100px]">分类展示名称</th>
                                                <th className="px-4 py-3 min-w-[80px]">满分分值</th>
                                                <th className="px-4 py-3 min-w-[120px]">输出分值字段</th>
                                                <th className="px-4 py-3 min-w-[120px]">输出原因字段</th>
                                              </tr>
                                            </thead>
                                        <tbody>
                                              <tr className="hover:bg-neutral-50 transition-colors">
                                                <td className="px-4 py-2">
                                                  <input
                                                    type="text"
                                                    className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[11px] font-bold text-neutral-800 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                    placeholder="例: TOTAL_RESULT"
                                                    value={getIndicatorField(selectedIndicatorId, 'totalOutputField', 'TOTAL_RESULT')}
                                                    onChange={(e) => updateSelectedIndicatorField('totalOutputField', e.target.value)}
                                                  />
                                                </td>
                                                <td className="px-4 py-2">
                                                  <input
                                                    type="text"
                                                    className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[11px] font-bold text-neutral-800 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                    placeholder="例: 服务质量评估"
                                                    value={getIndicatorField(selectedIndicatorId, 'totalDisplayLabel', '服务质量评估')}
                                                    onChange={(e) => updateSelectedIndicatorField('totalDisplayLabel', e.target.value)}
                                                  />
                                                </td>
                                                <td className="px-4 py-2">
                                                  <input
                                                    type="text"
                                                    className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-600 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                    placeholder="例: 100"
                                                    value={getIndicatorField(selectedIndicatorId, 'totalMaxScore', '100')}
                                                    onChange={(e) => updateSelectedIndicatorField('totalMaxScore', e.target.value)}
                                                  />
                                                </td>
                                                <td className="px-4 py-2">
                                                  <input
                                                    type="text"
                                                    className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-600 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                    placeholder="例: OVERALL_SCORE"
                                                    value={getIndicatorField(selectedIndicatorId, 'totalScoreField', 'OVERALL_SCORE')}
                                                    onChange={(e) => updateSelectedIndicatorField('totalScoreField', e.target.value)}
                                                  />
                                                </td>
                                                <td className="px-4 py-2">
                                                  <input
                                                    type="text"
                                                    className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-600 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                    placeholder="例: OVERALL_REASON"
                                                    value={getIndicatorField(selectedIndicatorId, 'totalReasonField', 'OVERALL_REASON')}
                                                    onChange={(e) => updateSelectedIndicatorField('totalReasonField', e.target.value)}
                                                  />
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </section>
                                      )}
                                      
                                      {/* 2. 分类映射 */}
                                      <section className="space-y-4 text-left">
                                        <div className="flex items-center justify-between">
                                          <h6 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                                            <ListTree size={14} className="text-sky-500" /> 2. {isLabel ? '分析映射' : '类映射配置'}
                                          </h6>
                                        </div>
                                        <div className="bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs text-left">
                                          <table className="w-full text-left border-collapse">
                                            <thead>
                                              <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100">
                                                <th className="px-4 py-3 min-w-[100px]">输出字段</th>
                                                <th className="px-4 py-3 min-w-[100px]">分类展示名称</th>
                                                {!isLabel && <th className="px-4 py-3 min-w-[80px]">满分分值</th>}
                                                {!isLabel && <th className="px-4 py-3 min-w-[120px]">输出分值字段</th>}
                                                <th className="px-4 py-3 min-w-[120px]">输出原因字段</th>
                                                <th className="px-4 py-3 w-10"></th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100">
                                              {currentMaps.map((row: any, i: number) => (
                                                <tr key={i} className="hover:bg-neutral-50 transition-colors">
                                                  <td className="px-4 py-2">
                                                    <input
                                                      type="text"
                                                      className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[11px] font-bold text-neutral-800 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                      value={row.code || ''}
                                                      onChange={(e) => {
                                                        const nextMaps = currentMaps.map((m: any, idx: number) => idx === i ? { ...m, code: e.target.value } : m);
                                                        updateSelectedIndicatorField('mappings', nextMaps);
                                                      }}
                                                      placeholder="例: INTENT_A"
                                                    />
                                                  </td>
                                                  <td className="px-4 py-2">
                                                    <input
                                                      type="text"
                                                      className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[11px] font-bold text-neutral-800 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                      value={row.primaryClass || ''}
                                                      onChange={(e) => {
                                                        const nextMaps = currentMaps.map((m: any, idx: number) => idx === i ? { ...m, primaryClass: e.target.value } : m);
                                                        updateSelectedIndicatorField('mappings', nextMaps);
                                                      }}
                                                      placeholder="例: 服务态度"
                                                    />
                                                  </td>
                                                  {!isLabel && (
                                                    <td className="px-4 py-2">
                                                      <input
                                                        type="text"
                                                        className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-600 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                        value={row.score || ''}
                                                        onChange={(e) => {
                                                          const nextMaps = currentMaps.map((m: any, idx: number) => idx === i ? { ...m, score: e.target.value } : m);
                                                          updateSelectedIndicatorField('mappings', nextMaps);
                                                        }}
                                                        placeholder="例: 100"
                                                      />
                                                    </td>
                                                  )}
                                                  {!isLabel && (
                                                    <td className="px-4 py-2">
                                                      <input
                                                        type="text"
                                                        className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-600 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                        value={row.scoreField || ''}
                                                        onChange={(e) => {
                                                          const nextMaps = currentMaps.map((m: any, idx: number) => idx === i ? { ...m, scoreField: e.target.value } : m);
                                                          updateSelectedIndicatorField('mappings', nextMaps);
                                                        }}
                                                        placeholder="例: SCORE_A"
                                                      />
                                                    </td>
                                                  )}
                                                  <td className="px-4 py-2">
                                                    <input
                                                      type="text"
                                                      className="w-full bg-transparent border border-transparent hover:border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-600 focus:outline-none focus:border-neutral-400 focus:bg-white text-left"
                                                      value={row.reasonCode || ''}
                                                      onChange={(e) => {
                                                        const nextMaps = currentMaps.map((m: any, idx: number) => idx === i ? { ...m, reasonCode: e.target.value } : m);
                                                        updateSelectedIndicatorField('mappings', nextMaps);
                                                      }}
                                                      placeholder="例: REASON_A"
                                                    />
                                                  </td>
                                                  <td className="px-4 py-2">
                                                    <button 
                                                      onClick={() => updateSelectedIndicatorField('mappings', currentMaps.filter((_: any, idx: number) => idx !== i))}
                                                      className="text-neutral-300 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded transition-colors"
                                                    >
                                                      <Trash2 size={12} />
                                                    </button>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                             </table>
                                          {!isLabel && (
                                          <div className="p-2 border-t border-neutral-100 bg-neutral-50/50">
                                            <button 
                                              onClick={() => updateSelectedIndicatorField('mappings', [...currentMaps, { primaryClass: '', score: '', code: '', scoreField: '', reasonCode: '' }])}
                                              className="w-full py-1.5 border border-dashed border-neutral-300 rounded-lg text-[10px] font-bold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 hover:border-sky-200 transition-all flex items-center justify-center gap-1"
                                            >
                                              <Plus size={12} /> 添加一行映射配置
                                            </button>
                                   </div>
                                          )}
                                        </div>

                                        {/* 图表展示配置(类映射子功能，分类标签场景隐藏) */}
                                        {!isLabel && (
                                        <div className="space-y-3 pt-2 text-left border-t border-neutral-100">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-neutral-600 flex items-center gap-1.5">
                                              启用图表展示：
                                            </span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={getIndicatorField(selectedIndicatorId, 'enableChart', true)}
                                                onChange={(e) => updateSelectedIndicatorField('enableChart', e.target.checked)}
                                                className="sr-only peer"
                                              />
                                              <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-800"></div>
                                              <span className="ml-2 text-[10px] font-bold text-neutral-600">{getIndicatorField(selectedIndicatorId, 'enableChart', true) ? '已开启' : '已关闭'}</span>
                                            </label>
                                          </div>
                                          {getIndicatorField(selectedIndicatorId, 'enableChart', true) && (
                                            <div className="bg-neutral-50 p-2.5 rounded-[13px] border border-neutral-200/60 space-y-2 animate-in fade-in duration-200">
                                              <span className="text-[10px] font-bold text-neutral-500 block">选择展示图表类型：</span>
                                              <div className="flex gap-2">
                                                {[
                                                  { label: '雷达图', value: 'radar' },
                                                  { label: '柱状图', value: 'bar' },
                                                  { label: '饼状图', value: 'pie' }
                                                ].map((opt) => (
                                                  <button
                                                    type="button"
                                                    key={opt.value}
                                                    onClick={() => updateSelectedIndicatorField('chartType', opt.value)}
                                                    className={`px-3 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                                      getIndicatorField(selectedIndicatorId, 'chartType', 'radar') === opt.value
                                                       ? 'bg-neutral-800 border-neutral-800 text-white'
                                                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                                                    }`}
                                                  >
                                                    {opt.label}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                   )}
                                        </div>
                                         )}
                                      </section>
                                    </>
                                  );
                                })()
                              ) : (
                                <>
                                  {/* [目标锁定]: 算子编排与逻辑执行区域，合并大模型配置，支持四种算子类型（预置算子、大模型、工作流、自定义脚本），新增关系画布配置。
                                      // [影响评估]: 替换质检类右侧配置面板。不修改分析类逻辑及其他流程下钻界面，外层布局完全不受任何负面影响。
                                      // [修改边界]: 仅作用于 (..., '', '质检类') !== '多维度评分类' && getIndicatorField(selectedIndicatorId, 'indicatorType', '质检类') !== '分类标签' 的  渲染分支，保证代码隔离。 */}
                                  {/* [_4_]: 算子编排支持4大算子，内置指令编写指南，新增脚本业务总结，全新交互式画布支持交、并、补及折叠/展开。 */}
                                  
                                  
                                  { (findIndicatorById(selectedIndicatorId)?.isCategory && findIndicatorById(selectedIndicatorId)?.item?.children?.length > 0) ? (
                                      <div className="flex-1 flex flex-col items-center justify-center text-neutral-300 space-y-4 py-32">
                                        <FolderTree size={60} className="opacity-10" />
                                        <div className="text-center">
                                          <p className="text-sm font-black text-neutral-400">当前选择的为包含子项的一级项</p>
                                          <p className="text-[10px] text-neutral-300 mt-1">请在左侧选择具体的二级项进行算子编排与结果判定配置</p>
                                        </div>
                                      </div>
                                  ) : (
                                    <>
                                  {/* 1. 算子编排与逻辑执行 ( &  ) */}
                                  <section className="space-y-4 text-left">
                                    <div className="flex items-center justify-between">
                                      <h6 className="text-[11px] font-black text-neutral-800 uppercase tracking-widest flex items-center gap-2">
                                        <Workflow size={14} className="text-sky-500" /> 1. 算子编排与逻辑执行
                                      </h6>
                                      <div className="flex items-center gap-2">
                                        <select 
                                          className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none text-neutral-600 cursor-pointer"
                                          value={getIndicatorField(selectedIndicatorId, 'operatorType', '大模型质检')}
                                          onChange={(e) => updateSelectedIndicatorField('operatorType', e.target.value)}
                                        >
                                          <option value="工作流质检" disabled>工作流质检（暂未开放）</option>
                                          <option value="大模型质检">大模型质检</option>
                                        </select>
                                      </div>
                                    </div>
                                    <div className="bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs p-4 space-y-3">
                                      {getIndicatorField(selectedIndicatorId, 'operatorType', '大模型质检') === '工作流质检' ? (
                                        <div className="space-y-2">
                                          <label className="block text-[10px] font-bold text-neutral-500 uppercase">选择工作流</label>
                                          <select 
                                            className="w-full bg-neutral-50 border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-800 focus:outline-none focus:border-neutral-400 focus:bg-white"
                                            value={getIndicatorField(selectedIndicatorId, 'selectedWorkflow', '')}
                                            onChange={(e) => updateSelectedIndicatorField('selectedWorkflow', e.target.value)}
                                          >
                                            <option value="">请选择具体的工作流...</option>
                                            <option value="wf-1">通用违规意图识别工作流</option>
                                            <option value="wf-2">复杂多轮语义核验工作流</option>
                                          </select>
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                              <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">执行模型</label>
                                              <select 
                                                className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none text-neutral-700"
                                                value={getIndicatorField(selectedIndicatorId, 'selectedModel', '')}
                                                onChange={(e) => updateSelectedIndicatorField('selectedModel', e.target.value)}
                                              >
                                                <option value="">请选择执行模型...</option>
                                                <option value="qwen-max">Qwen-Max (阿里云)</option>
                                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                                <option value="gpt-4o">GPT-4o</option>
                                              </select>
                                            </div>
                                            <div className="flex-1">
                                              <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">质检维度</label>
                                              <select 
                                                className="w-full bg-white border border-neutral-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none text-neutral-700"
                                                value={getIndicatorField(selectedIndicatorId, 'llmAnalysisLevel', 'session') === 'message' ? 'message_single' : getIndicatorField(selectedIndicatorId, 'llmAnalysisLevel', 'session')}
                                                onChange={(e) => updateSelectedIndicatorField('llmAnalysisLevel', e.target.value)}
                                              >
                                                <option value="session">会话维度</option>
                                                <option value="message_single">消息维度（单消息）</option>
                                                <option value="message_context">消息维度（包含上文）</option>
                                              </select>
                                            </div>
                                            </div>
                                          {['message', 'message_single', 'message_context'].includes(getIndicatorField(selectedIndicatorId, 'llmAnalysisLevel', 'session')) && (
                                            <div className="flex items-center gap-4 border-t border-neutral-200/60 pt-3 animate-in fade-in slide-in-from-left-2 duration-200">
                                              <span className="text-[10px] font-bold text-neutral-600">质检角色：</span>
                                                  {['客户', '客服', '数字员工'].map(role => {
                                                    const roles = getIndicatorField(selectedIndicatorId, 'llmMessageRoles', ['客户']) as string[];
                                                    const isChecked = roles.includes(role);
                                                    return (
                                                      <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                                                        <input 
                                                          type="checkbox" 
                                                          checked={isChecked} 
                                                          onChange={(e) => {
                                                            const newRoles = e.target.checked ? [...roles, role] : roles.filter(r => r !== role);
                                                            updateSelectedIndicatorField('llmMessageRoles', newRoles);
                                                          }} 
                                                          className="accent-neutral-800" 
                                                        />
                                                        <span className="text-[10px] font-medium text-neutral-700">{role}</span>
                                                      </label>
                                                    );
                                                  })}
                                            </div>
                                          )}

                                          <div className="space-y-1">
                                            <label className="block text-[10px] font-bold text-neutral-500 uppercase">大模型质检</label>
                                            <textarea 
                                              className="w-full h-28 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-[7px] text-[11px] leading-relaxed text-neutral-700 focus:outline-none focus:border-neutral-500 focus:border-neutral-400 resize-none font-mono"
                                              placeholder="请输入大模型质检提示词..."
                                              value={getIndicatorField(selectedIndicatorId, 'prompt', '')}
                                              onChange={(e) => updateSelectedIndicatorField('prompt', e.target.value)}
                                            />
                                          </div>
                                          
                                          {/* 判定说明：常驻可折叠，默认展开 */}
                                          <details open className="group bg-neutral-100/60 border border-neutral-200 rounded-[13px] overflow-hidden">
                                            <summary className="flex items-center gap-1.5 px-3 py-2 cursor-pointer select-none list-none text-[10px] font-black text-neutral-700">
                                              <Info size={12} className="text-sky-500 shrink-0" />
                                              判定说明
                                              <ChevronDown size={13} className="text-sky-400 ml-auto transition-transform group-open:rotate-180" />
                                            </summary>
                                            <p className="px-3 pb-2.5 text-[10px] leading-relaxed text-neutral-700/90">
                                              大模型按上方提示词分析后输出结论。系统仅识别其中判定为<strong className="text-neutral-800">“违规 / 命中”</strong>的结果，命中即将该质检项记为<strong className="text-neutral-800">“命中”</strong>；其余结果一律不解析，均视为<strong className="text-neutral-800">“未命中”</strong>。
                                            </p>
                                          </details>

                                          {/* 参考模板：通用模板 + 基于物流质检真实场景沉淀的典型模板 */}
                                          <div className="pt-2 border-t border-neutral-100 space-y-2">
                                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest block">参考模板</span>
                                            <div className="flex flex-wrap gap-2">
                                            {[
                                              { label: '通用质检模板', prompt: '你是一个专业的客服合规质检员，下面将会给你用户与客服的沟通内容，你需要判断客服本次服务【是否合规】。\n\n判定规则如下：\n规则1：客服按标准业务流程解答用户问题，且无违规行为时，输出\'是\'。\n规则2：客服存在推诿、敷衍、答非所问、未按流程处理等问题时，输出\'否\'。\n规则3：无法明确判定时，默认输出\'是\'。\n\n请输出判定结果（是/否）及具体判定依据（引用对话中的原话片段）。' },
                                              { label: '客服辱骂检测', prompt: '你是一个辱骂内容质检员，你需要根据用户和客服的对话内容，判断客服消息【是否涉及辱骂】。由于对话记录由 ASR 语音转译而来，可能存在转译不准确的问题。\n\n判定规则如下：\n规则1：当客服消息无任何辱骂词汇时，输出\'否\'。\n规则2：当客服消息包含疑似辱骂词汇，但从上下文判定可能为 ASR 转译出错时，输出\'否\'。\n规则3：当客服消息包含辱骂词汇，且从上下文判定确为辱骂用户时，输出\'是\'。\n\n请输出判定结果（是/否）及命中的原话片段。' },
                                              { label: '抢话质问反问', prompt: '你是一个专业的京东物流客服合规质检员，你需要根据用户与客服的对话内容，判断客服回复【是否涉及抢话质问反问】。\n\n判定规则如下：\n规则1：当会话中用户明确表达客服打断了自己（如\'别打断我\'）时，输出\'是\'。\n规则2：当客服不正面回答用户问题，而是带有明显质疑、批评色彩地向用户提出质问/反问，导致用户产生明显负面情绪（投诉、不满、辱骂）时，输出\'是\'，否则输出\'否\'。\n\n请输出判定结果（是/否）及原话片段。' },
                                              { label: '合规承诺核验', prompt: '你是一个专业的客服合规质检员，你需要根据对话内容判断客服【是否存在违规承诺】。\n\n判定规则如下：\n规则1：当客服对赔付、时效、结果等做出\'保证\'、\'绝对\'、\'一定\'等超出权限的绝对化承诺时，输出\'是\'（违规）。\n规则2：当客服使用\'我们会尽快\'、\'预计\'、\'为您申请\'等规范表述时，输出\'否\'。\n\n请输出判定结果（是/否）并提取违规承诺的原话片段。' },
                                              { label: '理赔方式合规', prompt: '你是一个专业的客服合规质检员，下面将会给你一段关于物流理赔打款方式协商的对话。你的任务是判断客服是否按流程【优先推荐非现金赔付方式】。\n\n业务背景：处理散单（个人件）理赔时，客服必须优先推荐用户使用\'京东钱包\'等非现金方式收款；若首次即提出现金赔付或组合赔付，视为违规。\n\n判定规则如下：\n规则1：客服优先推荐非现金赔付方式，输出\'合规\'。\n规则2：客服首次即提出现金赔付/组合赔付，输出\'违规\'。\n\n请输出判定结果及原话依据。' },
                                              { label: '问题是否解决', prompt: '你是一个专业的客服合规质检员，下面将会给你用户与客服的沟通内容，你需要识别【问题是否已解决】。\n\n判定规则如下：\n规则1：用户当前问题已解决（如催派快递已签收、订单已退款、丢失快递已找到、咨询问题客服已解答等），输出\'是\'。\n规则2：用户表示无需跟进/反馈/处理/联系等，输出\'是\'。\n规则3：客服未实际解决用户核心诉求，或用户明确表示问题仍未解决，输出\'否\'。\n\n请输出判定结果（是/否）及依据。' },
                                              { label: '工单内容清晰', prompt: '你是一个专业的京东物流客服合规质检员，你需要根据客服向物流专员发起的工单内容，判断【工单内容是否清晰】。\n\n判定规则如下：\n规则1：工单中没有下达任何需专员跟进的明确指令，输出\'否\'。\n规则2：工单中有清晰、明确、可执行的跟进确认指令，输出\'是\'。\n规则3：无法明确判定时，默认输出\'是\'。\n\n请输出判定结果（是/否）及依据。' },
                                            ].map((preset) => (
                                              <button
                                                type="button"
                                                key={preset.label}
                                                className="px-2.5 py-1 bg-neutral-100 text-neutral-800 rounded-md text-[9px] font-black hover:bg-sky-100 cursor-pointer transition-colors shadow-xxs"
                                                title={preset.prompt}
                                                onClick={() => updateSelectedIndicatorField('prompt', preset.prompt)}
                                              >
                                                {preset.label}
                                              </button>
                                            ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </section>
                                    </>
                                  )}
                                </>
                              )
                            }
                            </div>

                            {}
                          </div>
                          
                          {}
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-neutral-300 space-y-4">
                          <FolderTree size={60} className="opacity-10" />
                          <div className="text-center">
                            <p className="text-sm font-black text-neutral-400">请选择左侧层级项进行配置</p>
                            <p className="text-[10px] text-neutral-300 mt-1">支持提示词指令、多类型算子编排、工作流关联及在线逻辑测试</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

                            {}

              {/*  4:      (实时告警) */}
              {drillDownType === 'alarm_task' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 border border-neutral-200 rounded-[13px] flex items-start gap-3">
                    <Bell size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-neutral-800">服务禁语及严重违规实时流截获通知</h4>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        以下是由于包含金融误导性违规禁语（例如：承诺保本、存款安全）而触发秒级告警的拦截日志流：
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-[13px] flex items-start gap-3">
                      <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={15} />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-rose-900">🚨 SESS-09513 一票否决禁语告警</span>
                          <span className="text-[9px] bg-rose-200 text-rose-800 px-1 rounded font-bold font-mono">2026-07-12 15:02:15</span>
                        </div>
                        <p className="text-[10.5px] text-rose-800 leading-normal">
                          坐席薛程月在与客户咨询中提及：“明星主打产品，<strong>绝对稳赚不赔的，保本保收益</strong>... 出了问题我给您垫付”。严重违反国家金融消费合规警示！
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[9px] text-neutral-500 font-bold">已分发预警：</span>
                          <span className="text-[9px] bg-white border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded font-black">飞书推送 ✅</span>
                          <span className="text-[9px] bg-white border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded font-black">企微推送 ✅</span>
                          <span className="text-[9px] bg-white border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded font-black">一审初检工作台拦截待办 ✅</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/*  5:      (数据看板) */}
              {drillDownType === 'dashboard_sync' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-neutral-200 p-4 rounded-[13px] flex flex-col gap-1 shadow-xxs">
                    <span className="text-[10px] font-bold text-neutral-400 block">今日 AI 覆盖质检量</span>
                    <strong className="text-xl font-black text-neutral-900 font-mono">100.0% / 5,432 条</strong>
                    <span className="text-[8.5px] text-emerald-500 font-semibold">● 自动质检覆盖率达到峰值</span>
                  </div>
                  <div className="bg-white border border-neutral-200 p-4 rounded-[13px] flex flex-col gap-1 shadow-xxs">
                    <span className="text-[10px] font-bold text-neutral-400 block">综合合规合格率</span>
                    <strong className="text-xl font-black text-emerald-600 font-mono">92.4%</strong>
                    <span className="text-[8.5px] text-neutral-400">环比昨日下降 0.5%</span>
                  </div>
                  <div className="bg-white border border-neutral-200 p-4 rounded-[13px] flex flex-col gap-1 shadow-xxs">
                    <span className="text-[10px] font-bold text-neutral-400 block">累计拦截违规件</span>
                    <strong className="text-xl font-black text-rose-600 font-mono">14 件</strong>
                    <span className="text-[8.5px] text-rose-500 font-bold animate-pulse">● 已流式分发人工一审</span>
                  </div>
                  <div className="bg-white border border-neutral-200 p-4 rounded-[13px] flex flex-col gap-1 shadow-xxs">
                    <span className="text-[10px] font-bold text-neutral-400 block">好服务 NPS 推荐指数</span>
                    <strong className="text-xl font-black text-sky-600 font-mono">+68.5%</strong>
                    <span className="text-[8.5px] text-sky-500">Promoters 占 74.2%</span>
                  </div>
                </div>
              )}

            </div>

            {}
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end shrink-0">
              <button 
                onClick={() => setShowDrillDown(false)}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-[13px] text-xs font-black shadow-xs transition-all"
              >
                关闭下钻视图
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── -     &    (接入明细 - 具体会话查看弹窗) ── */}
      {/* 通过 Portal 渲染到 body，避免被外层被移出屏幕(left-[-99999px]/w-0/overflow-hidden)的容器裁切导致右侧内容空白 */}
      {showTranscriptModal && selectedSession && createPortal((
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-[13px] shadow-2xl max-w-7xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            
            {}
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-neutral-900 border-l-4 border-neutral-800 pl-3">会话详情</h3>
              </div>
              <button 
                onClick={() => setShowTranscriptModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-[13px] hover:bg-neutral-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[400px]">
              
              {}
              <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden border-r border-neutral-200">
                <div className="px-5 py-3 border-b border-neutral-200 flex flex-col justify-center shrink-0 min-h-[60px]">
                  <h4 className="text-[14px] font-black text-neutral-800">
                    客服{selectedSession.agentName || '星巴克活动预约'}与客户的对话
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-500 mt-1">
                    <Clock size={12} />
                    <span>会话时长: {selectedSession.duration || '11分35秒'}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-neutral-50/30">
                  {selectedSession.transcript && selectedSession.transcript.length > 0 ? (
                    selectedSession.transcript.map((msg: any, idx: number) => {
                      const isUser = msg.role === 'user';
                      
                      const containsProhibited = !isUser && (
                        msg.text.includes("稳赚不赔") || 
                        msg.text.includes("绝对保本") || 
                        msg.text.includes("垫付")
                      );

                      return (
                        <div 
                          key={idx} 
                          className={`flex gap-3 max-w-[85%] ${
                            isUser ? 'mr-auto text-left' : 'ml-auto text-right flex-row-reverse'
                          }`}
                        >
                          {}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isUser ? 'bg-sky-100 text-sky-800' : 'bg-white text-neutral-800 border border-sky-100 shadow-sm'
                          }`}>
                            {isUser ? <User size={16} /> : <span className="text-[10px] font-bold">AI</span>}
                          </div>
                          
                          <div className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}>
                            <span className="text-[10px] text-neutral-400 mb-1">
                              2026-07-11 {msg.time}
                            </span>
                            <div className={`p-3.5 text-[12px] leading-relaxed shadow-xxs max-w-full ${
                              isUser 
                                ? 'bg-white text-neutral-800 rounded-[13px] rounded-tl-sm border border-neutral-200' 
                                : containsProhibited
                                  ? 'bg-rose-50 border border-rose-150 text-rose-800 rounded-[13px] rounded-tr-sm'
                                  : 'bg-white text-neutral-800 rounded-[13px] rounded-tr-sm shadow-sm border border-sky-100'
                            }`}>
                              {msg.text}

                              {containsProhibited && (
                                <div className="mt-2 pt-1.5 border-t border-rose-150 flex items-center gap-1 text-[8.5px] text-rose-700 font-black">
                                  <AlertTriangle size={10} />
                                  <span>[合规拦截警示]：触发一票否决红线！</span>
                                </div>
                              )}
                            </div>
                            
                            {/* 查看日志     */}
                            {isUser && (
                              <button 
                                onClick={() => setActiveRightTab('logs')}
                                className="mt-2 flex items-center gap-1 px-2.5 py-1 bg-white border border-neutral-200 rounded-lg text-neutral-800 hover:text-neutral-700 hover:bg-neutral-50 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <span className="rotate-180">☊</span> [查看日志]
                              </button>
                            )}

                            {/* 消息维度命中打标：当质检项作用于「消息维度/消息维度（含上文）」时，在对应消息下方展示命中的质检项名称 */}
                            {msgLevelHits[idx] && msgLevelHits[idx].some(hit => (hit.name.includes('身份核验') ? mockHit3 : hit.name.includes('过度承诺') ? mockHit2 : '命中') === '命中') && (
                              <div className={`mt-2 flex flex-wrap gap-1.5 ${isUser ? 'justify-start' : 'justify-end'}`}>
                                {msgLevelHits[idx].map((hit, hi) => {
                                  const hitState = hit.name.includes('身份核验') ? mockHit3 : hit.name.includes('过度承诺') ? mockHit2 : '命中';
                                  // 未命中的质检项不在消息底部展示标签
                                  if (hitState !== '命中') return null;
                                  return (
                                  <span
                                    key={hi}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 text-rose-600 border-rose-150"
                                    title={hit.scope}
                                  >
                                    <AlertTriangle size={9} />
                                    命中：{hit.name}
                                  </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-400 italic text-[11px]">
                      <MessageSquare size={24} className="mb-1 text-neutral-300" />
                      暂无原始对话文本转写记录
                    </div>
                  )}
                </div>
              </div>

              {}
              <div className="w-full md:w-[680px] shrink-0 bg-neutral-50 flex flex-col overflow-hidden text-left">
                {activeRightTab === 'logs' ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-5 py-4 border-b border-neutral-200 flex items-center gap-2">
                      <button 
                        onClick={() => setActiveRightTab('details')}
                        className="text-neutral-800 hover:text-neutral-800 flex items-center gap-1 text-[12px] font-bold transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={14} /> 返回会话详情
                      </button>
                      <span className="ml-auto text-neutral-800 flex items-center gap-1 text-[12px] font-bold">
                        <Sparkles size={14} /> 智能轨迹日志
                      </span>
                    </div>
                    <div className="px-5 py-3 border-b border-neutral-200 bg-white flex items-center justify-between text-[11px]">
                      <span className="text-neutral-500 font-medium">消息ID: <span className="font-mono text-neutral-800 font-bold">{FOOD_INSURANCE_TRACE.metrics.messageid}</span></span>
                      <div className="flex gap-3">
                        <span className="text-neutral-500">总耗时: <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono font-bold">{FOOD_INSURANCE_TRACE.metrics.totalCostMs}ms</span></span>
                        <span className="text-neutral-500">首包时长: <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono font-bold">{FOOD_INSURANCE_TRACE.metrics.firstPacketMs}ms</span></span>
                        <span className="text-neutral-500">Tokens: <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono font-bold">{FOOD_INSURANCE_TRACE.metrics.totalTokens}</span></span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5">
                      <div className="text-[11px] text-neutral-500 mb-4 font-bold">链路节点日志 <span className="font-normal">({FOOD_INSURANCE_TRACE.nodes.length} 个节点)</span></div>
                      <div className="space-y-0">
                        {FOOD_INSURANCE_TRACE.nodes.map((node, i) => (
                          <TraceNodeCard key={node.id} node={node} orderIndex={i + 1} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center border-b border-neutral-200 px-2 shrink-0 overflow-x-auto">
                      <button 
                        onClick={() => setActiveRightTab('details')}
                        className={`px-4 py-4 text-[12px] font-black whitespace-nowrap transition-colors border-b-2 ${
                          activeRightTab === 'details' ? 'border-neutral-800 text-neutral-800' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100/50'
                        }`}
                      >
                        会话详情
                      </button>
                      <button 
                        onClick={() => setActiveRightTab('evaluation')}
                        className={`px-4 py-4 text-[12px] font-black whitespace-nowrap transition-colors border-b-2 ${
                          activeRightTab === 'evaluation' ? 'border-neutral-800 text-neutral-800' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100/50'
                        }`}
                      >
                        评价信息
                      </button>
                      {drillDownType === 'ai_task' && (
                        <button 
                          onClick={() => setActiveRightTab('ai_analysis')}
                          className={`px-4 py-4 text-[12px] font-black whitespace-nowrap transition-colors border-b-2 ${
                            activeRightTab === 'ai_analysis' ? 'border-neutral-800 text-neutral-800' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100/50'
                          }`}
                        >
                          AI结果
                        </button>
                      )}
                      {drillDownType === 'ai_task' && (
                        <button 
                          onClick={() => setActiveRightTab('history')}
                          className={`px-4 py-4 text-[12px] font-black whitespace-nowrap transition-colors border-b-2 ${
                            activeRightTab === 'history' ? 'border-neutral-800 text-neutral-800' : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100/50'
                          }`}
                        >
                          历史记录
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      {activeRightTab === 'details' && (
                        <div className="space-y-4 text-[12px]">
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">会话ID</span>
                            <span className="font-mono text-neutral-800 text-right break-all">{selectedSession.id}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">数字员工ID</span>
                            <span className="font-mono text-neutral-800 text-right">{selectedSession.agentId || 'agent_3685446d7eab4b74'}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">数字员工名称</span>
                            <span className="text-neutral-800 text-right">{selectedSession.agentName || '星巴克活动预约'}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">在线状态</span>
                            <span className="text-neutral-800 text-right flex items-center gap-1 justify-end">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 结束
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">是否转人工</span>
                            <span className="text-neutral-800 text-right font-bold text-emerald-600">否</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">开始时间</span>
                            <span className="font-mono text-neutral-800 text-right">2026-07-11 {selectedSession.startTime || '14:50:45'}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">结束时间</span>
                            <span className="font-mono text-neutral-800 text-right">2026-07-11 15:02:20</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">通话时长</span>
                            <span className="text-neutral-800 text-right">{selectedSession.duration || '11分35秒'}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">消息条数</span>
                            <span className="font-mono text-neutral-800 text-right">{selectedSession.transcript?.length || 8} 条</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">用户PIN</span>
                            <span className="font-mono text-neutral-800 text-right break-all">4370373b-e36f-4b6c-84dc-9f504f4a470d</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-neutral-500 w-24 shrink-0">满意度</span>
                            <span className="text-neutral-800 text-right">{selectedSession.satisfaction || '买家未评价'}</span>
                          </div>
                        </div>
                      )}
                      
                      {activeRightTab === 'evaluation' && (() => {
                        const satisfactionList = (selectedSession as any)?.satisfactionRecords || [];
                        return (
                        <div className="space-y-3 text-[12px]">
                          {satisfactionList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                              <Star size={36} className="mb-3 text-neutral-300" />
                              <div className="text-[13px] font-bold text-neutral-500">暂无客户满意度评价</div>
                              <div className="text-[11px] text-neutral-400 mt-1">该会话尚未收到客户的满意度评价</div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between px-1">
                                <h4 className="text-[12px] font-black text-neutral-800 flex items-center gap-2">
                                  <span className="bg-amber-500 w-1 h-3 rounded-full"></span>客户满意度评价
                                </h4>
                                <span className="text-[11px] text-neutral-500">共 {satisfactionList.length} 次评价</span>
                              </div>
                              {satisfactionList.map((rec: any, idx: number) => (
                                <div key={idx} className="bg-white border border-neutral-200 rounded-[13px] p-4 shadow-xxs">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-0.5">
                                      {[1,2,3,4,5].map(s => (
                                        <Star key={s} size={16} className={s <= (rec.score || 0) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'} />
                                      ))}
                                      <span className="ml-1.5 text-[11px] font-bold text-amber-600">{rec.level || ''}</span>
                                    </div>
                                    <span className="text-[10px] text-neutral-400 font-mono">{rec.time || ''}</span>
                                  </div>
                                  {rec.comment && (
                                    <div className="text-[11px] text-neutral-700 leading-relaxed bg-neutral-50 rounded-lg px-3 py-2">{rec.comment}</div>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                        );
                      })()}

                      {false && activeRightTab === 'evaluation' && (
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar text-left relative bg-neutral-50/30">
                          
                          {/* 1. 多维度评分类结果 */}
                          <div className="space-y-3 pt-2">
                            <div 
                              className="flex items-center justify-between cursor-pointer group bg-white border border-neutral-200 px-4 py-3 rounded-[7px] shadow-xxs hover:shadow-xs transition-shadow" 
                              onClick={() => setIsMultiDimCollapsed(!isMultiDimCollapsed)}
                            >
                              <h4 className="text-[12px] font-black text-neutral-900 flex items-center gap-2">
                                <span className="bg-sky-500 w-1 h-3 rounded-full"></span>多维度评分类结果
                              </h4>
                              <span className="text-[10px] text-sky-400 group-hover:text-neutral-800 font-bold">{isMultiDimCollapsed ? '展开' : '折叠'}</span>
                            </div>
                            
                            {!isMultiDimCollapsed && (
                              <div className="p-4 bg-white border border-neutral-200 rounded-[13px] shadow-xxs animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[11px] font-black text-neutral-900">服务质量评估</span>
                                  <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">总分: 85</span>
                                </div>
                                <div className="flex flex-col gap-6 items-center">
                                  <div className="w-full max-w-[300px] h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={['服务态度','专业知识','沟通技巧','问题解决','响应速度'].map(k => ({ subject: k, A: radarScores[k], fullMark: 100 }))}>
                                        <PolarGrid stroke="#e5e7eb" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 9 }} />
                                        <Radar name="得分" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                                        <RechartsTooltip 
                                          contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '10px' }}
                                          itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                                        />
                                      </RadarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 2. 分类标签结果 */}
                          <div className="space-y-3 pt-4">
                            <div 
                              className="flex items-center justify-between cursor-pointer group bg-white border border-sky-100 px-4 py-3 rounded-[7px] shadow-xxs hover:shadow-xs transition-shadow" 
                              onClick={() => setIsLabelCollapsed(!isLabelCollapsed)}
                            >
                              <h4 className="text-[12px] font-black text-sky-900 flex items-center gap-2">
                                <span className="bg-sky-500 w-1 h-3 rounded-full"></span>分类标签结果
                              </h4>
                              <span className="text-[10px] text-sky-400 group-hover:text-sky-600 font-bold">{isLabelCollapsed ? '展开' : '折叠'}</span>
                            </div>
                            
                            {!isLabelCollapsed && (
                              <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-3 bg-white border border-neutral-200 rounded-[13px] shadow-xxs flex flex-col gap-2">
                                  <div className="text-[11px] font-black text-sky-900 mb-1">情绪标签</div>
                                  <div className="w-full flex flex-col gap-2">
                                    <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 flex flex-col gap-2">
                                      <div className="flex flex-col gap-1.5">
                                        <div className="font-bold text-[11px] text-rose-600">愤怒</div>
                                        <div className="text-[10px] text-neutral-600 w-full">
                                          <div className="font-bold text-neutral-700 mb-0.5">AI识别原因</div>
                                          <div className="text-neutral-600">表达强烈不满。</div>
                                        </div>
                                      </div>
                                      {/* 已按需求删除分类置信度与匹配关键词展示 */}
                                      {isCorrectionMode && (
                                        <div className="flex items-center gap-4 pt-2 border-t border-neutral-100">
                                          <div className="w-16 font-bold text-[10px] text-neutral-800 shrink-0">纠错修改</div>
                                          <input type="text" value={editEmotionLabel} onChange={(e) => setEditEmotionLabel(e.target.value)} placeholder="情绪标签..." className="w-24 border border-neutral-200 rounded p-1 text-[10px] text-neutral-700 bg-white focus:outline-none focus:border-neutral-400" />
                                          <input type="text" placeholder="人工备注原因..." className="flex-1 border border-neutral-200 rounded p-1 text-[10px] bg-white focus:outline-none focus:border-neutral-400" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3 bg-white border border-neutral-200 rounded-[13px] shadow-xxs flex flex-col gap-2">
                                  <div className="text-[11px] font-black text-sky-900 mb-1">服务意图</div>
                                  <div className="w-full flex flex-col gap-2">
                                    <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 flex flex-col gap-2">
                                      <div className="flex flex-col gap-1.5">
                                        <div className="font-bold text-[11px] text-sky-600">退保申诉</div>
                                        <div className="text-[10px] text-neutral-600 w-full">
                                          <div className="font-bold text-neutral-700 mb-0.5">AI识别原因</div>
                                          <div className="text-neutral-600">为什么扣我钱，需要退钱。</div>
                                        </div>
                                      </div>
                                      {/* 已按需求删除分类置信度与匹配关键词展示 */}
                                      {isCorrectionMode && (
                                        <div className="flex items-center gap-4 pt-2 border-t border-neutral-100">
                                          <div className="w-16 font-bold text-[10px] text-neutral-800 shrink-0">纠错修改</div>
                                          <input type="text" defaultValue="退保申诉" className="w-24 border border-neutral-200 rounded p-1 text-[10px] text-neutral-700 bg-white focus:outline-none focus:border-neutral-400" />
                                          <input type="text" placeholder="人工备注原因..." className="flex-1 border border-neutral-200 rounded p-1 text-[10px] bg-white focus:outline-none focus:border-neutral-400" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 3. 质检类结果展示区 */}
                          <div className="space-y-3 pt-4 pb-10">
                            <div 
                              className="flex items-center justify-between cursor-pointer group bg-white border border-emerald-100 px-4 py-3 rounded-[7px] shadow-xxs hover:shadow-xs transition-shadow" 
                              onClick={() => setIsQualityCollapsed(!isQualityCollapsed)}
                            >
                              <h4 className="text-[12px] font-black text-emerald-900 flex items-center gap-2">
                                <span className="bg-emerald-500 w-1 h-3 rounded-full"></span>质检类结果
                              </h4>
                              <span className="text-[10px] text-emerald-400 group-hover:text-emerald-600 font-bold">{isQualityCollapsed ? '展开' : '折叠'}</span>
                            </div>
                            
                            {!isQualityCollapsed && (
                              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* 总分与等级 */}
                                <div className="flex items-center gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-[13px]">
                                  <div className="w-14 h-14 bg-white rounded-full border-4 border-emerald-400 flex items-center justify-center flex-col shadow-sm shrink-0">
                                    <span className="text-lg font-black text-emerald-600 leading-none">{editAiScore}</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">最终质检得分</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[14px] font-black text-neutral-800">
                                        {editAiScore >= 80 ? '优秀' : editAiScore >= 60 ? '中等' : '差'}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${editAiScore >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {editAiScore >= 60 ? '质检合格' : '不合格'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 质检明细表 */}
                                <div className="bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs text-left">
                                  <table className="w-full text-left border-collapse table-fixed">
                                    <thead>
                                      <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-200">
                                        <th className="px-3 py-2 border-r border-neutral-200 w-[15%]">一级项</th>
                                        <th className="px-3 py-2 border-r border-neutral-200 w-[15%]">二级项名称</th>
                                        <th className="px-3 py-2 border-r border-neutral-200 text-center w-[12%]">结果</th>
                                        <th className="px-3 py-2 border-r border-neutral-200 text-right w-[12%]">分值</th>
                                        <th className="px-3 py-2 w-[46%]">命中原因</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 text-[10px]">
                                      {/* Row 1 */}
                                      <tr className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-neutral-100 font-bold text-neutral-600 bg-neutral-50/50" rowSpan={2}>合规标准</td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-neutral-700">
                                          <div className="flex items-center gap-1">
                                            服务禁语核查
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-center">
                                          {isCorrectionMode ? (
                                            <select 
                                              value={mockHit1}
                                              onChange={e => setMockHit1(e.target.value)}
                                              className={`${mockHit1 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded-md cursor-pointer border border-current/40 outline-none text-center w-full hover:shadow-xs transition-shadow`}
                                            >
                                              <option value="未命中">未命中</option>
                                              <option value="命中">命中</option>
                                            </select>
                                          ) : (
                                            <span className={`${mockHit1 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded text-center inline-block w-full cursor-not-allowed`} title="您暂无纠错权限，结果仅可查看">
                                              {mockHit1}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-right font-mono font-bold text-emerald-600">{mockHit1 === '命中' ? '-10' : '0'}</td>
                                        <td className="px-3 py-2 text-neutral-600">
                                          <div className="flex flex-col gap-1">
                                            <div className="truncate text-neutral-500" title="-"><span className="font-bold text-neutral-700">AI识别:</span> -</div>
                                            {isCorrectionMode && (
                                              <input type="text" value={itemNotes['服务禁语核查'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '服务禁语核查': e.target.value })); setCorrectSaved(false); }} placeholder="人工备注：记录本项纠错原因..." className="w-full border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:ring-1 focus:ring-rose-400" />
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                      {/* Row 2 */}
                                      <tr className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-neutral-100 text-neutral-700">
                                          <div className="flex items-center gap-1">
                                            过度承诺判定
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-center">
                                          {isCorrectionMode ? (
                                            <select 
                                              value={mockHit2}
                                              onChange={e => setMockHit2(e.target.value)}
                                              className={`${mockHit2 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded-md cursor-pointer border border-current/40 outline-none text-center w-full hover:shadow-xs transition-shadow`}
                                            >
                                              <option value="未命中">未命中</option>
                                              <option value="命中">命中</option>
                                            </select>
                                          ) : (
                                            <span className={`${mockHit2 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded text-center inline-block w-full cursor-not-allowed`} title="您暂无纠错权限，结果仅可查看">
                                              {mockHit2}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-right font-mono font-bold text-rose-600">{mockHit2 === '命中' ? '-15' : '0'}</td>
                                        <td className="px-3 py-2 text-neutral-600">
                                          <div className="flex flex-col gap-1">
                                            <div className="truncate text-rose-600 text-[9.5px]" title="客服在第3句回复中说到“绝对可以给您退全款”，属于过度承诺。">
                                              <span className="font-bold text-neutral-700">AI识别:</span> 客服在第3句回复中说到“绝对可以给您退全款”，属于过度承诺。
                                            </div>
                                            {isCorrectionMode && (
                                              <input type="text" value={itemNotes['过度承诺判定'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '过度承诺判定': e.target.value })); setCorrectSaved(false); }} placeholder="人工备注：记录本项纠错原因..." className="w-full border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:ring-1 focus:ring-rose-400" />
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                      {/* Row 3 */}
                                      <tr className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-neutral-100 font-bold text-neutral-600 bg-neutral-50/50" rowSpan={2}>流程规范</td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-neutral-700">
                                          <div className="flex items-center gap-1">
                                            身份核验
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-center">
                                          {isCorrectionMode ? (
                                            <select 
                                              value={mockHit3}
                                              onChange={e => setMockHit3(e.target.value)}
                                              className={`${mockHit3 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded-md cursor-pointer border border-current/40 outline-none text-center w-full hover:shadow-xs transition-shadow`}
                                            >
                                              <option value="未命中">未命中</option>
                                              <option value="命中">命中</option>
                                            </select>
                                          ) : (
                                            <span className={`${mockHit3 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded text-center inline-block w-full cursor-not-allowed`} title="您暂无纠错权限，结果仅可查看">
                                              {mockHit3}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-right font-mono font-bold text-rose-600">{mockHit3 === '命中' ? '-5' : '0'}</td>
                                        <td className="px-3 py-2 text-neutral-600">
                                          <div className="flex flex-col gap-1">
                                            <div className={`truncate text-[9.5px] ${mockHit3 === '命中' ? 'text-rose-600' : 'text-neutral-500'}`} title={mockHit3 === '命中' ? '未向客户核实预留手机号。' : '-'}>
                                              <span className="font-bold text-neutral-700">AI识别:</span> {mockHit3 === '命中' ? '未向客户核实预留手机号。' : '-'}
                                            </div>
                                            {isCorrectionMode && (
                                              <input type="text" value={itemNotes['身份核验'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '身份核验': e.target.value })); setCorrectSaved(false); }} placeholder="人工备注：记录本项纠错原因..." className="w-full border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:ring-1 focus:ring-rose-400" />
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                      {/* Row 4 - 不可纠错示例：结果与分值均不可修改 */}
                                      <tr className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-neutral-100 text-neutral-700">
                                          <div className="flex items-center gap-1">
                                            结束语规范
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-center">
                                          <span className={`${mockHit4 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded text-center inline-block w-full cursor-not-allowed`} title={isCorrectionMode ? '该质检项不支持人工修改结果' : '非纠错模式下无法修改'}>
                                            {mockHit4}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 border-r border-neutral-100 text-right font-mono font-bold text-emerald-600">{mockHit4 === '命中' ? '-5' : '0'}</td>
                                        <td className="px-3 py-2 text-neutral-600">
                                          <div className="flex flex-col gap-1">
                                            <div className="truncate text-neutral-500" title="-"><span className="font-bold text-neutral-700">AI识别:</span> -</div>
                                            {isCorrectionMode && (
                                              <div className="text-[9px] text-neutral-400 italic">该质检项不支持人工修改结果</div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                          
                        </div>
                      )}

                      {activeRightTab === 'ai_analysis' && drillDownType === 'ai_task' && (
                        <div className="space-y-3">
                          {/* 0. 顶部总结信息 () */}
                          <div className="bg-neutral-100/50 border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs">
                     <div className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-neutral-100/80 transition-colors"
                              onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                            >
                              <h4 className="text-[11px] font-black text-neutral-900 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-neutral-800" />
                                智能总结
                              </h4>
                              <span className="text-[10px] text-sky-500 font-bold">{isSummaryCollapsed ? '展开' : '折叠'}</span>
                            </div>
                            {!isSummaryCollapsed && (
                            <div className="px-4 py-3 border-t border-neutral-200 space-y-3 bg-white/50 text-left transition-all">
                              <div>
                                <div className="text-[10px] font-bold text-neutral-500 uppercase">客户核心意图</div>
                                <div className="text-[11px] text-neutral-800 mt-0.5">客户主要咨询套餐变更及退费问题。</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-neutral-500 uppercase">分析结果总结</div>
                                <div className="text-[11px] text-neutral-800 mt-0.5">服务态度良好，但未清晰说明退款周期，引起客户短暂焦虑。</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-neutral-500 uppercase">质检结果总结</div>
                                <div className="text-[11px] text-neutral-800 mt-0.5">命中1项违规（过度承诺），其他流程规范正常。</div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold text-neutral-500 uppercase">改善意见</div>
                                <div className="text-[11px] text-neutral-800 mt-0.5">客服需要加强退费政策培训，避免向客户承诺绝对退款。</div>
                              </div>
                         </div>
                            )}
                          </div>

                                {/* 1. 质检类结果展示区 ( ) */}
                          <div className="space-y-3 pt-2">
                            <div
                              className="flex items-center justify-between cursor-pointer group bg-white border border-emerald-100 px-4 py-3 rounded-[7px] shadow-xxs hover:shadow-xs transition-shadow"
                              onClick={() => setIsQualityCollapsed(!isQualityCollapsed)}
                            >
                              <h4 className="text-[12px] font-black text-emerald-900 flex items-center gap-2">
                                <span className="bg-emerald-500 w-1 h-3 rounded-full"></span>质检类结果
                              </h4>
                              <span className="text-[10px] text-emerald-400 group-hover:text-emerald-600 font-bold">{isQualityCollapsed ? '展开' : '折叠'}</span>
                            </div>
                            {!isQualityCollapsed && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            
                            {/* 总分与等级 */}
                            <div className="flex items-center gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-[13px]">
                              <div className="w-14 h-14 bg-white rounded-full border-4 border-emerald-400 flex items-center justify-center flex-col shadow-sm shrink-0">
                                <span className="text-lg font-black text-emerald-600 leading-none">{editAiScore}</span>
                              </div>
                              <div className="flex-1">
                                <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">最终质检得分</div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[14px] font-black text-neutral-800">
                                    {editAiScore >= 80 ? '优秀' : editAiScore >= 60 ? '中等' : '差'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black ${editAiScore >= 60 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {editAiScore >= 60 ? '质检合格' : '不合格'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 质检明细表 */}
                            <div className="bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs text-left">
                              <table className="w-full text-left border-collapse table-fixed">
                                <thead>
                                  <tr className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-200">
                                    <th className="px-3 py-2 border-r border-neutral-200 w-[20%]">一级项</th>
                                    <th className="px-3 py-2 border-r border-neutral-200 w-[20%]">二级项名称</th>
                                    <th className="px-3 py-2 border-r border-neutral-200 text-center w-[15%]">结果</th>
                                    <th className="px-3 py-2 border-r border-neutral-200 text-right w-[15%]">得分/扣分</th>
                                    <th className="px-3 py-2 w-[30%]">命中原因</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 text-[10px]">
                                  <tr className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-3 py-2 border-r border-neutral-100 font-bold text-neutral-600 bg-neutral-50/50" rowSpan={2}>合规标准</td>
                                    <td className="px-3 py-2 border-r border-neutral-100 text-neutral-700">服务禁语核查</td>
                                    <td className="px-3 py-2 border-r border-neutral-100 text-center relative group/edit">
                                      {hasCorrectPermission ? (
                                        <select 
                                          value={mockHit1}
                                          onChange={e => setMockHit1(e.target.value)}
                                          className={`${mockHit1 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded-md cursor-pointer border border-current/40 outline-none text-center hover:shadow-xs transition-shadow`}
                                        >
                                          <option value="未命中">未命中</option>
                                          <option value="命中">命中</option>
                                        </select>
                                      ) : (
                                        <span className={`${mockHit1 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded text-center inline-block cursor-not-allowed`}>
                                          {mockHit1}
                                        </span>
                                      )}
                                    </td>
                                    <td className={`px-3 py-2 border-r border-neutral-100 text-right font-mono font-bold ${mockHit1 === '命中' ? 'text-rose-600' : 'text-emerald-600'}`}>{mockHit1 === '命中' ? '-10' : '0'}</td>
                                    <td className="px-3 py-2 text-neutral-500">
                                      <div className="flex items-center justify-between gap-2">
                               <span className="truncate" title="-">-</span>
                                        {hasCorrectPermission && (
                                          <button type="button" onClick={() => toggleNote('服务禁语核查')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['服务禁语核查'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['服务禁语核查'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['服务禁语核查'] ? ' ●' : ''}</button>
                                        )}
                                      </div>
                                    </td>
                         </tr>
                                  {hasCorrectPermission && noteExpanded['服务禁语核查'] && (
                                  <tr className="bg-neutral-100/30">
                                    <td colSpan={5} className="px-3 py-2 border-t border-neutral-200">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['服务禁语核查'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '服务禁语核查': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    </td>
                                  </tr>
                                  )}
                                  <tr className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-3 py-2 border-r border-neutral-100 text-neutral-700">过度承诺判定</td>
                                    <td className="px-3 py-2 border-r border-neutral-100 text-center relative group/edit">
                                      {hasCorrectPermission ? (
                                        <select 
                                          value={mockHit2}
                                          onChange={e => setMockHit2(e.target.value)}
                                          className={`${mockHit2 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded-md cursor-pointer border border-current/40 outline-none text-center hover:shadow-xs transition-shadow`}
                                        >
                                          <option value="未命中">未命中</option>
                                          <option value="命中">命中</option>
                                        </select>
                                      ) : (
                                        <span className={`${mockHit2 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded text-center inline-block cursor-not-allowed`}>
                                          {mockHit2}
                                        </span>
                                      )}
                                    </td>
                                    <td className={`px-3 py-2 border-r border-neutral-100 text-right font-mono font-bold ${mockHit2 === '命中' ? 'text-rose-600' : 'text-emerald-600'}`}>{mockHit2 === '命中' ? '-15' : '0'}</td>
                                    <td className="px-3 py-2 text-rose-600 text-[9.5px]">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate" title="客服在第3句回复中说到“绝对可以给您退全款”，属于过度承诺。">客服在第3句回复中说到“绝对可以给您退全款”，属于过度承诺。</span>
                                        {hasCorrectPermission && (
                                          <button type="button" onClick={() => toggleNote('过度承诺判定')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['过度承诺判定'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['过度承诺判定'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['过度承诺判定'] ? ' ●' : ''}</button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {hasCorrectPermission && noteExpanded['过度承诺判定'] && (
                                  <tr className="bg-neutral-100/30">
                                    <td colSpan={5} className="px-3 py-2 border-t border-neutral-200">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['过度承诺判定'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '过度承诺判定': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    </td>
                                  </tr>
                                  )}
                                  <tr className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-3 py-2 border-r border-neutral-100 font-bold text-neutral-600 bg-neutral-50/50" rowSpan={2}>流程规范</td>
                                    <td className="px-3 py-2 border-r border-neutral-100 text-neutral-700">身份核验</td>
                                    <td className="px-3 py-2 border-r border-neutral-100 text-center relative group/edit">
                                      {hasCorrectPermission ? (
                                        <select 
                                          value={mockHit3}
                                          onChange={e => setMockHit3(e.target.value)}
                                          className={`${mockHit3 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded-md cursor-pointer border border-current/40 outline-none text-center hover:shadow-xs transition-shadow`}
                                        >
                                          <option value="未命中">未命中</option>
                                          <option value="命中">命中</option>
                                        </select>
                                      ) : (
                                        <span className={`${mockHit3 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded text-center inline-block cursor-not-allowed`}>
                                          {mockHit3}
                                        </span>
                                      )}
                                    </td>
                                    <td className={`px-3 py-2 border-r border-neutral-100 text-right font-mono font-bold ${mockHit3 === '命中' ? 'text-rose-600' : 'text-emerald-600'}`}>{mockHit3 === '命中' ? '-5' : '0'}</td>
                                    <td className="px-3 py-2 text-rose-600 text-[9.5px]">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate" title="未向客户核实预留手机号。">未向客户核实预留手机号。</span>
                                        {hasCorrectPermission && (
                                          <button type="button" onClick={() => toggleNote('身份核验')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['身份核验'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['身份核验'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['身份核验'] ? ' ●' : ''}</button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {hasCorrectPermission && noteExpanded['身份核验'] && (
                                  <tr className="bg-neutral-100/30">
                                    <td colSpan={5} className="px-3 py-2 border-t border-neutral-200">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['身份核验'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '身份核验': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    </td>
                                  </tr>
                                  )}
                                  <tr className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-3 py-2 border-r border-neutral-100 text-neutral-700">结束语规范</td>
                                    <td className="px-3 py-2 border-r border-neutral-100 text-center relative group/edit">
                                      {hasCorrectPermission ? (
                                        <select 
                                          value={mockHit4}
                                          onChange={e => setMockHit4(e.target.value)}
                                          className={`${mockHit4 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded-md cursor-pointer border border-current/40 outline-none text-center hover:shadow-xs transition-shadow`}
                                        >
                                          <option value="未命中">未命中</option>
                                          <option value="命中">命中</option>
                                        </select>
                                      ) : (
                                        <span className={`${mockHit4 === '命中' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'} font-bold px-1.5 py-0.5 rounded text-center inline-block cursor-not-allowed`}>
                                          {mockHit4}
                                        </span>
                                      )}
                                    </td>
                                    <td className={`px-3 py-2 border-r border-neutral-100 text-right font-mono font-bold ${mockHit4 === '命中' ? 'text-rose-600' : 'text-emerald-600'}`}>{mockHit4 === '命中' ? '-5' : '0'}</td>
                                    <td className="px-3 py-2 text-neutral-500">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate" title="-">-</span>
                                        {hasCorrectPermission && (
                                          <button type="button" onClick={() => toggleNote('结束语规范')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['结束语规范'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['结束语规范'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['结束语规范'] ? ' ●' : ''}</button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {hasCorrectPermission && noteExpanded['结束语规范'] && (
                                  <tr className="bg-neutral-100/30">
                                    <td colSpan={5} className="px-3 py-2 border-t border-neutral-200">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['结束语规范'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '结束语规范': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    </td>
                                  </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            </div>
                            )}
                          </div>

                          {/* 2. 多维度评分类结果展示区 ( ) */}
                          <div className="space-y-3 pt-3 border-t border-neutral-200 pb-3">
                            <div
                              className="flex items-center justify-between cursor-pointer group bg-white border border-neutral-200 px-4 py-3 rounded-[7px] shadow-xxs hover:shadow-xs transition-shadow"
                              onClick={() => setIsMultiDimCollapsed(!isMultiDimCollapsed)}
                            >
                              <h4 className="text-[12px] font-black text-neutral-900 flex items-center gap-2">
                                <span className="bg-sky-500 w-1 h-3 rounded-full"></span>多维度评分类结果
                              </h4>
                              <span className="text-[10px] text-sky-400 group-hover:text-neutral-800 font-bold">{isMultiDimCollapsed ? '展开' : '折叠'}</span>
                            </div>
                            {!isMultiDimCollapsed && (
                            <div className="p-4 bg-white border border-neutral-200 rounded-[13px] shadow-xxs">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-black text-neutral-900">服务质量评估</span>
                                <span className="text-[10px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">总分: 85</span>
                              </div>
                              
                              <div className="flex flex-col gap-6 items-center">
                                <div className="w-full max-w-[300px] h-[260px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={['服务态度','专业知识','沟通技巧','问题解决','响应速度'].map(k => ({ subject: k, A: radarScores[k], fullMark: 100 }))}>
                                      <PolarGrid stroke="#e5e7eb" />
                                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 'bold' }} />
                                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 9 }} />
                                      <Radar name="得分" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                                      <RechartsTooltip 
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '10px' }}
                                        itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                                      />
                                    </RadarChart>
                                  </ResponsiveContainer>
                                </div>
                                
                                {/* 详细分类信息 (横向列表展示) */}
                                <div className="w-full flex flex-col gap-2 border-t border-neutral-100 pt-4">
                                  
                                  {/* NPS 推荐值（多维度评分总览指标） */}
                                  <div className="border border-neutral-200 rounded-lg p-2 bg-neutral-100/40 flex flex-wrap items-center gap-4">
                                    <div className="w-16 font-black text-[11px] text-neutral-900 shrink-0">NPS推荐值</div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {hasCorrectPermission ? (
                                        <input type="number" defaultValue={90} className="w-12 border border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-800 font-bold focus:border-neutral-400 focus:outline-none" />
                                      ) : (
                                        <span className="text-[10px] font-mono text-neutral-800 font-bold bg-white px-2 py-1 rounded border border-neutral-200">90</span>
                                      )}
                                      <span className="text-[9px] text-neutral-400">分</span>
                                    </div>
                                    <div className="text-[9.5px] text-neutral-500 leading-relaxed bg-white p-1.5 rounded border border-neutral-100 truncate hover:whitespace-normal cursor-pointer flex-1" title="客户整体体验良好，主动表达了推荐意愿，无明显不满情绪。">
                                      <span className="font-bold text-neutral-700">原因: </span>
                                      客户整体体验良好，主动表达了推荐意愿，无明显不满情绪。
                                    </div>
                                    {hasCorrectPermission && (
                                      <button type="button" onClick={() => toggleNote('NPS推荐值')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['NPS推荐值'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['NPS推荐值'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['NPS推荐值'] ? ' ●' : ''}</button>
                                    )}
                                    {hasCorrectPermission && noteExpanded['NPS推荐值'] && (
                                      <div className="w-full flex items-center gap-2 pt-1">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['NPS推荐值'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, 'NPS推荐值': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 flex flex-wrap items-center gap-4">
                                    <div className="w-16 font-bold text-[11px] text-neutral-800 shrink-0 flex flex-col gap-0.5">
                                      服务态度
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {hasCorrectPermission ? (
                                        <input type="number" value={radarScores['服务态度']} onChange={(e) => setRadarScores(s => ({ ...s, '服务态度': Number(e.target.value) || 0 }))} className="w-12 border border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-800 font-bold focus:border-neutral-400 focus:outline-none" />
                                      ) : (
                                        <span className="text-[10px] font-mono text-neutral-800 font-bold bg-neutral-100 px-2 py-1 rounded">{radarScores['服务态度']}</span>
                                      )}
                                      <span className="text-[9px] text-neutral-400">分</span>
                                    </div>
                                    <div className="text-[9.5px] text-neutral-500 leading-relaxed bg-white p-1.5 rounded border border-neutral-100 truncate hover:whitespace-normal cursor-pointer flex-1" title="客服在沟通过程中使用了较多敬语，并在客户表达不满时进行了及时安抚，态度热情。">
                                      <span className="font-bold text-neutral-700">原因: </span>
                                      客服在沟通过程中使用了较多敬语，并在客户表达不满时进行了及时安抚，态度热情。
                                    </div>
                                    {hasCorrectPermission && (
                                      <button type="button" onClick={() => toggleNote('服务态度')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['服务态度'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['服务态度'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['服务态度'] ? ' ●' : ''}</button>
                                    )}
                                    {hasCorrectPermission && noteExpanded['服务态度'] && (
                                      <div className="w-full flex items-center gap-2 pt-1">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['服务态度'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '服务态度': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 flex flex-wrap items-center gap-4">
                                    <div className="w-16 font-bold text-[11px] text-neutral-800 shrink-0 flex flex-col gap-0.5">
                                      专业知识
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {hasCorrectPermission ? (
                                        <input type="number" value={radarScores['专业知识']} onChange={(e) => setRadarScores(s => ({ ...s, '专业知识': Number(e.target.value) || 0 }))} className="w-12 border border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-800 font-bold focus:border-neutral-400 focus:outline-none" />
                                      ) : (
                                        <span className="text-[10px] font-mono text-neutral-800 font-bold bg-neutral-100 px-2 py-1 rounded">{radarScores['专业知识']}</span>
                                      )}
                                      <span className="text-[9px] text-neutral-400">分</span>
                                    </div>
                                    <div className="text-[9.5px] text-neutral-500 leading-relaxed bg-white p-1.5 rounded border border-neutral-100 truncate hover:whitespace-normal cursor-pointer flex-1" title="准确解答了关于套餐扣费规则的问题，但对退费到账时间的说明不够清晰。">
                                      <span className="font-bold text-neutral-700">原因: </span>
                                      准确解答了关于套餐扣费规则的问题，但对退费到账时间的说明不够清晰。
                                    </div>
                                    {hasCorrectPermission && (
                                      <button type="button" onClick={() => toggleNote('专业知识')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['专业知识'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['专业知识'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['专业知识'] ? ' ●' : ''}</button>
                                    )}
                                    {hasCorrectPermission && noteExpanded['专业知识'] && (
                                      <div className="w-full flex items-center gap-2 pt-1">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['专业知识'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '专业知识': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 flex flex-wrap items-center gap-4">
                                    <div className="w-16 font-bold text-[11px] text-neutral-800 shrink-0 flex flex-col gap-0.5">
                                      沟通技巧
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {hasCorrectPermission ? (
                                        <input type="number" value={radarScores['沟通技巧']} onChange={(e) => setRadarScores(s => ({ ...s, '沟通技巧': Number(e.target.value) || 0 }))} className="w-12 border border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-800 font-bold focus:border-neutral-400 focus:outline-none" />
                                      ) : (
                                        <span className="text-[10px] font-mono text-neutral-800 font-bold bg-neutral-100 px-2 py-1 rounded">{radarScores['沟通技巧']}</span>
                                      )}
                                      <span className="text-[9px] text-neutral-400">分</span>
                                    </div>
                                    <div className="text-[9.5px] text-neutral-500 leading-relaxed bg-white p-1.5 rounded border border-neutral-100 truncate hover:whitespace-normal cursor-pointer flex-1" title="引导客户情绪较好，但话术略显生硬。">
                                      <span className="font-bold text-neutral-700">原因: </span>
                                      引导客户情绪较好，但话术略显生硬。
                                    </div>
                                    {hasCorrectPermission && (
                                      <button type="button" onClick={() => toggleNote('沟通技巧')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['沟通技巧'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['沟通技巧'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['沟通技巧'] ? ' ●' : ''}</button>
                                    )}
                                    {hasCorrectPermission && noteExpanded['沟通技巧'] && (
                                      <div className="w-full flex items-center gap-2 pt-1">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['沟通技巧'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '沟通技巧': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 flex flex-wrap items-center gap-4">
                                    <div className="w-16 font-bold text-[11px] text-neutral-800 shrink-0 flex flex-col gap-0.5">
                                      问题解决
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {hasCorrectPermission ? (
                                        <input type="number" value={radarScores['问题解决']} onChange={(e) => setRadarScores(s => ({ ...s, '问题解决': Number(e.target.value) || 0 }))} className="w-12 border border-neutral-200 rounded p-1 text-[10px] font-mono text-neutral-800 font-bold focus:border-neutral-400 focus:outline-none" />
                                      ) : (
                                        <span className="text-[10px] font-mono text-neutral-800 font-bold bg-neutral-100 px-2 py-1 rounded">{radarScores['问题解决']}</span>
                                      )}
                                      <span className="text-[9px] text-neutral-400">分</span>
                                    </div>
                                    <div className="text-[9.5px] text-neutral-500 leading-relaxed bg-white p-1.5 rounded border border-neutral-100 truncate hover:whitespace-normal cursor-pointer flex-1" title="最终协助客户完成了退费申请，客户确认没有其他问题。">
                                      <span className="font-bold text-neutral-700">原因: </span>
                                      最终协助客户完成了退费申请，客户确认没有其他问题.
                                    </div>
                                    {hasCorrectPermission && (
                                      <button type="button" onClick={() => toggleNote('问题解决')} className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${noteExpanded['问题解决'] ? 'bg-sky-500 text-white border-neutral-500' : itemNotes['问题解决'] ? 'bg-neutral-100 text-neutral-800 border-sky-200' : 'bg-white text-neutral-400 border-neutral-200 hover:text-neutral-800 hover:border-sky-300'}`}>操作备注{itemNotes['问题解决'] ? ' ●' : ''}</button>
                                    )}
                                    {hasCorrectPermission && noteExpanded['问题解决'] && (
                                      <div className="w-full flex items-center gap-2 pt-1">
                                        <span className="text-[9px] font-bold text-neutral-800 shrink-0">人工备注</span>
                                        <input type="text" value={itemNotes['问题解决'] || ''} onChange={(e) => { setItemNotes(n => ({ ...n, '问题解决': e.target.value })); setCorrectSaved(false); }} placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[9px] bg-white focus:outline-none focus:border-neutral-400" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            )}
                          </div>

                          {/* 3. 分类标签结果 */}
                          <div className="space-y-3 pt-3 border-t border-neutral-200 pb-4">
                            <div
                              className="flex items-center justify-between cursor-pointer group bg-white border border-sky-100 px-4 py-3 rounded-[7px] shadow-xxs hover:shadow-xs transition-shadow"
                              onClick={() => setIsLabelCollapsed(!isLabelCollapsed)}
                            >
                              <h4 className="text-[12px] font-black text-sky-900 flex items-center gap-2">
                                <span className="bg-sky-500 w-1 h-3 rounded-full"></span>分类标签结果
                              </h4>
                              <span className="text-[10px] text-sky-400 group-hover:text-sky-600 font-bold">{isLabelCollapsed ? '展开' : '折叠'}</span>
                            </div>
                            {!isLabelCollapsed && (
                              <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 bg-white border border-neutral-200 rounded-[13px] shadow-xxs flex flex-col gap-2">
                                  <div className="text-[11px] font-black text-sky-900 mb-1">情绪标签</div>
                                  <div className="w-full flex flex-col gap-2">
                                    <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 flex flex-col gap-2">
                                      <div className="flex items-start gap-4">
                                        <div className="w-28 shrink-0 flex flex-col gap-1">
                                          <div className="font-bold text-[10px] text-neutral-700">分类值</div>
                                          {hasCorrectPermission ? (
                                            <input type="text" value={editEmotionLabel} onChange={(e) => setEditEmotionLabel(e.target.value)} className="w-full border border-rose-200 rounded p-1 text-[11px] font-bold text-rose-600 bg-white focus:ring-1 focus:ring-rose-500 focus:outline-none" />
                                          ) : (
                                            <div className="font-bold text-[11px] text-rose-600">{editEmotionLabel}</div>
                                          )}
                                        </div>
                                        <div className="flex-1 flex flex-col gap-0.5">
                                          <div className="font-bold text-[10px] text-neutral-700">原因</div>
                                          <div className="text-[10px] text-neutral-600 leading-relaxed">客户多次使用感叹号，且表达了强烈的不满。</div>
                                           {hasCorrectPermission && (
                                             <div className="flex items-center gap-2 pt-2 mt-1 border-t border-neutral-100">
                                               <span className="text-[10px] font-bold text-neutral-800 shrink-0">单项备注</span>
                                               <input type="text" placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[10px] bg-white focus:outline-none focus:border-neutral-400" />
                                             </div>
                                           )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3 bg-white border border-neutral-200 rounded-[13px] shadow-xxs flex flex-col gap-2">
                                  <div className="text-[11px] font-black text-sky-900 mb-1">服务意图</div>
                                  <div className="w-full flex flex-col gap-2">
                                    <div className="border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 flex flex-col gap-2">
                                      <div className="flex items-start gap-4">
                                        <div className="w-28 shrink-0 flex flex-col gap-1">
                                          <div className="font-bold text-[10px] text-neutral-700">分类值</div>
                                          {hasCorrectPermission ? (
                                            <input type="text" value={editIntent || '业务咨询'} onChange={(e) => setEditIntent(e.target.value)} className="w-full border border-sky-200 rounded p-1 text-[11px] font-bold text-neutral-800 bg-white focus:border-neutral-400 focus:outline-none" />
                                          ) : (
                                            <div className="font-bold text-[11px] text-neutral-800">{editIntent || '业务咨询'}</div>
                                          )}
                                        </div>
                                        <div className="flex-1 flex flex-col gap-0.5">
                                          <div className="font-bold text-[10px] text-neutral-700">原因</div>
                                          <div className="text-[10px] text-neutral-600 leading-relaxed">根据客户首句“为什么扣我钱”，判定为费用疑问/业务咨询。</div>
                                           {hasCorrectPermission && (
                                             <div className="flex items-center gap-2 pt-2 mt-1 border-t border-neutral-100">
                                               <span className="text-[10px] font-bold text-neutral-800 shrink-0">单项备注</span>
                                               <input type="text" placeholder="人工修改原因/备注..." className="flex-1 border border-neutral-200 rounded p-1 text-[10px] bg-white focus:outline-none focus:border-neutral-400" />
                                             </div>
                                           )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 底部：人工纠错备注 + 纠错保存（仅具备「纠错」权限账号可见） */}
                          {hasCorrectPermission && (
                            <div className="bg-white border border-neutral-200 rounded-[13px] shadow-xxs p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-rose-500 w-1 h-3 rounded-full"></span>
                                <h4 className="text-[12px] font-black text-neutral-800">人工备注</h4>
                                <span className="text-[10px] text-neutral-400">（选填，记录本次纠错的依据与说明）</span>
                              </div>
                              <textarea
                                value={correctNote}
                                onChange={(e) => { setCorrectNote(e.target.value); setCorrectSaved(false); }}
                                placeholder="请填写纠错说明，例如：AI 误判为过度承诺，实际客服未做绝对化表述，据此修正结果……"
                                className="w-full h-20 text-[11px] text-neutral-700 border border-neutral-200 rounded-[13px] p-3 outline-none focus:border-sky-400 resize-none custom-scrollbar"
                              />
                              <div className="flex items-center">
                                <span className={`text-[11px] font-bold ${correctSaved ? 'text-emerald-600' : 'text-transparent'}`}>
                                  纠错结果已保存，将写入历史记录
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {activeRightTab === 'history' && (
                        <div className="space-y-6 text-left">
                          {/* 1. 数据接入日志 */}
                          <div className="bg-white border border-neutral-200 rounded-[13px] shadow-xxs overflow-hidden">
                            <div className="px-4 py-3 bg-sky-50/60 border-b border-neutral-200 flex items-center gap-2">
                              <span className="bg-sky-500 w-1 h-3 rounded-full"></span>
                              <h4 className="text-[12px] font-black text-sky-900">数据接入日志</h4>
                            </div>
                            <div className="divide-y divide-neutral-100">
                              {[
                                { time: '2026-07-11 14:50:47', source: '在线会话接入（人工坐席大厅）', count: '8 条消息', status: '成功' },
                                { time: '2026-07-11 15:02:22', source: '会话结束事件同步', count: '1 条记录', status: '成功' },
                              ].map((log, i) => (
                                <div key={i} className="px-4 py-3 flex items-center gap-4 text-[11px]">
                                  <span className="font-mono text-neutral-500 shrink-0 w-36">{log.time}</span>
                                  <span className="text-neutral-800 flex-1">{log.source}</span>
                                  <span className="text-neutral-500">{log.count}</span>
                                  <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px]">{log.status}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 2. 识别结果 */}
                          <div className="bg-white border border-neutral-200 rounded-[13px] shadow-xxs overflow-hidden">
                            <div className="px-4 py-3 bg-neutral-100/60 border-b border-neutral-200 flex items-center gap-2">
                              <span className="bg-sky-500 w-1 h-3 rounded-full"></span>
                              <h4 className="text-[12px] font-black text-neutral-900">识别结果</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[620px] text-left text-[11px]">
                                <thead>
                                  <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-bold">
                                    <th className="px-4 py-2.5 font-bold w-[15%]">识别类型</th>
                                    <th className="px-4 py-2.5 font-bold w-[30%]">识别项（一级/二级）</th>
                                    <th className="px-4 py-2.5 font-bold w-[15%]">识别结果</th>
                                    <th className="px-4 py-2.5 font-bold w-[40%]">原因</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                                  {[
                                    { type: '质检类', item: '合规标准 / 过度承诺判定', result: '命中', reason: '客服在第3句回复中说到"绝对可以给您退全款"，属于过度承诺。', level: 'rose' },
                                    { type: '质检类', item: '流程规范 / 身份核验', result: '命中', reason: '未向客户核实预留手机号。', level: 'rose' },
                                    { type: '多维度评分', item: '服务质量 / 服务态度', result: '90 分', reason: '全程语气礼貌，主动安抚客户情绪。', level: 'sky' },
                                    { type: '多维度评分', item: '服务质量 / 专业知识', result: '85 分', reason: '业务解答基本准确，个别政策表述不够严谨。', level: 'sky' },
                                    { type: '多维度评分', item: '服务质量 / 沟通技巧', result: '80 分', reason: '存在2次打断客户的情况。', level: 'sky' },
                                    { type: '多维度评分', item: '服务质量 / 问题解决', result: '95 分', reason: '最终为客户完成套餐变更并说明退费。', level: 'sky' },
                                    { type: '多维度评分', item: '服务质量 / 响应速度', result: '90 分', reason: '各轮响应及时，无长时间等待。', level: 'sky' },
                                    { type: '分类标签', item: '情绪标签', result: '愤怒', reason: '客户多次强调"必须马上退款"，情绪激动。', level: 'indigo' },
                                    { type: '分类标签', item: '服务意图', result: '退保申诉', reason: '客户核心诉求为退保并对处理结果表达不满。', level: 'indigo' },
                                  ].map((log, i) => (
                                    <tr key={i} className="hover:bg-neutral-50 align-top">
                                      <td className="px-4 py-2.5"><span className="bg-neutral-100 text-neutral-600 font-bold px-2 py-0.5 rounded text-[10px]">{log.type}</span></td>
                                      <td className="px-4 py-2.5 text-neutral-800">{log.item}</td>
                                      <td className="px-4 py-2.5"><span className={`font-bold px-2 py-0.5 rounded text-[10px] ${log.level === 'rose' ? 'bg-rose-50 text-rose-700' : log.level === 'sky' ? 'bg-sky-50 text-sky-700' : 'bg-neutral-100 text-neutral-700'}`}>{log.result}</span></td>
                                      <td className="px-4 py-2.5 text-neutral-500 text-[10.5px] leading-relaxed">{log.reason}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 3. 纠错审计日志（谁/何时/改了哪些/改成什么） */}
                          <div className="bg-white border border-neutral-200 rounded-[13px] shadow-xxs overflow-hidden">
                            <div className="px-4 py-3 bg-amber-50/60 border-b border-neutral-200 flex items-center gap-2">
                              <span className="bg-amber-500 w-1 h-3 rounded-full"></span>
                              <h4 className="text-[12px] font-black text-amber-900">人工纠错记录</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[680px] text-left text-[11px]">
                                <thead>
                                  <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-bold">
                                    <th className="px-4 py-2.5 font-bold">操作人</th>
                                    <th className="px-4 py-2.5 font-bold">操作时间</th>
                                    <th className="px-4 py-2.5 font-bold">修改类型</th>
                                    <th className="px-4 py-2.5 font-bold">修改项</th>
                                    <th className="px-4 py-2.5 font-bold">修改前</th>
                                    <th className="px-4 py-2.5 font-bold">修改后</th>
                                    <th className="px-4 py-2.5 font-bold">单项备注</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                                  {[
                                    { user: '张质检', time: '2026-07-11 16:20:11', type: '分类标签', field: '情绪标签', from: '愤怒', to: '焦虑', note: 'AI误判，客户实际为焦虑而非愤怒' },
                                    { user: '李班长', time: '2026-07-11 16:35:48', type: '多维度评分', field: '服务质量 / 服务态度', from: '90', to: '78', note: '坐席打断客户2次，态度分应下调' },
                                    { user: '张质检', time: '2026-07-11 16:41:02', type: '质检类', field: '合规标准 / 过度承诺判定', from: '命中', to: '未命中', note: '原文为风险提示语，非保本承诺，误命中' },
                                  ].concat(submittedNotes).map((log, i) => (
                                    <tr key={i} className="hover:bg-neutral-50">
                                      <td className="px-4 py-2.5 font-bold text-neutral-800">{log.user}</td>
                                      <td className="px-4 py-2.5 font-mono text-neutral-500">{log.time}</td>
                                      <td className="px-4 py-2.5"><span className="bg-neutral-100 text-neutral-600 font-bold px-2 py-0.5 rounded text-[10px]">{log.type}</span></td>
                                      <td className="px-4 py-2.5">{log.field}</td>
                                      <td className="px-4 py-2.5"><span className="bg-neutral-100 text-neutral-500 line-through px-1.5 py-0.5 rounded">{log.from}</span></td>
                                      <td className="px-4 py-2.5"><span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">{log.to}</span></td>
                                      <td className="px-4 py-2.5 text-neutral-500 max-w-[220px]"><span className="text-[10.5px] leading-relaxed">{log.note || '—'}</span></td>
                           </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </>
                )}
              </div>

            </div>

            {}
            <div className="px-6 py-4 bg-white border-t border-neutral-200 flex items-center justify-between shrink-0">
              <div className="text-[12px] text-neutral-500">
                数据记录：第 <span className="font-bold text-neutral-900">{recordIndex}</span> 条 / 共 <span className="font-bold text-neutral-900">{TOTAL_RECORDS.toLocaleString()}</span> 条
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowTranscriptModal(false)}
                  className="px-5 py-1.5 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 rounded-[13px] text-[12px] font-bold shadow-xxs transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={() => applyRecord(recordIndex - 1)}
                  disabled={recordIndex <= 1}
                  className={`px-5 py-1.5 border border-neutral-200 rounded-[13px] text-[12px] font-bold shadow-xxs transition-colors ${recordIndex <= 1 ? 'bg-neutral-50 text-neutral-300 cursor-not-allowed' : 'bg-white hover:bg-neutral-50 text-neutral-700 cursor-pointer'}`}
                >
                  上一条
                </button>
              <button
                  onClick={() => applyRecord(recordIndex + 1)}
                  disabled={recordIndex >= TOTAL_RECORDS}
                  className={`px-5 py-1.5 border border-neutral-200 rounded-[13px] text-[12px] font-bold shadow-xxs transition-colors ${recordIndex >= TOTAL_RECORDS ? 'bg-neutral-50 text-neutral-300 cursor-not-allowed' : 'bg-white hover:bg-neutral-50 text-neutral-700 cursor-pointer'}`}
                >
                  下一条
                </button>
                {hasCorrectPermission && (
                  <button
                    onClick={submitCorrection}
                    className="px-5 py-1.5 rounded-[13px] text-[12px] font-bold shadow-xxs transition-colors bg-sky-500 hover:bg-sky-600 text-white cursor-pointer"
                  >
                    纠错
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      ), document.body)}

      {}
      {showConfigModal && activeNode && (
        <div className="fixed inset-0 z-[1000] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowConfigModal(false)}></div>
          <div className="bg-white border-l border-neutral-200 shadow-2xl w-full max-w-xl h-full flex flex-col relative z-10 animate-fade-in-right">
            
            {}
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2">
                {getIconForType(activeNode.data.type)}
                <div className="text-left">
                  <h3 className="text-sm font-black text-neutral-900 truncate max-w-[200px]">{activeNode.data.label}</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">节点配置与授权设定</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors bg-neutral-100"
              >
                <X size={14} />
              </button>
            </div>

            {}
            <div className="px-5 py-1.5 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveConfigTab('content')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all ${
                  activeConfigTab === 'content'
                    ? 'bg-sky-500 text-white shadow-xxs'
                    : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                <Sliders size={11} />
                <span>① 核心业务参数</span>
              </button>
              
              <button
                type="button"
                disabled
                title="该功能暂不开放"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all text-neutral-300 cursor-not-allowed"
              >
                <Lock size={11} />
                <span>② 权限配置</span>
                <span className="ml-1 px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-400 text-[8.5px] font-bold">暂不开放</span>
              </button>
            </div>

            {}
            {!hasConfigPermission(activeNode.data) && (
              <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-800 flex items-center gap-2 shrink-0">
                <AlertTriangle size={13} className="text-rose-500" />
                <span className="text-[9.5px] font-black">
                  🔒 安全隔离只读视图：您当前登录角色【{ROLE_LABELS[role]}】无权修改此节点配置，仅限查看！
                </span>
              </div>
            )}

            {}
            <fieldset disabled={!hasConfigPermission(activeNode.data)} className="p-5 overflow-y-auto flex-1 space-y-4 text-left">
              
              {}
              {activeConfigTab === 'content' && (
                <div className="space-y-4">
                  
                  {}
                  <div className="grid grid-cols-2 gap-3">
                    {activeNode.data.type !== 'template' && activeNode.data.type !== 'ai_task' && (
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1">节点显示名称</label>
                        <input 
                          type="text" 
                          value={formData.label || ''} 
                          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                          className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:border-neutral-400 outline-none text-neutral-800 bg-white"
                        />
                      </div>
                    )}
                    {(activeNode.data.type === 'template' || activeNode.data.type === 'ai_task') ? (
                      <>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-neutral-400 mb-1">
                            {activeNode.data.type === 'template' ? '质检模板名称' : '任务名称'}
                          </label>
                          <input 
                            type="text" 
                            placeholder={`请输入${activeNode.data.type === 'template' ? '质检模板' : '质检任务'}的具体业务名称...`}
                            value={formData.label || ''} 
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-black focus:border-neutral-400 outline-none text-neutral-800 bg-white shadow-sm"
                          />
                        </div>
                        {activeNode.data.type === 'template' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-neutral-400 mb-1 flex items-center justify-between">
                              <span>基础分配置 (Base Score)</span>
                              <span className="text-[9px] text-neutral-400 font-normal">满分通常为100</span>
                            </label>
                            <input 
                              type="number" 
                              placeholder="例如: 100"
                              value={formData.baseScore || '100'} 
                              onChange={(e) => setFormData({ ...formData, baseScore: e.target.value })}
                              className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-bold focus:border-neutral-400 outline-none text-neutral-800 bg-white shadow-sm font-mono"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1">简要描述</label>
                        <input 
                          type="text" 
                          value={formData.desc || ''} 
                          onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                          className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:border-neutral-400 outline-none text-neutral-800 bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-neutral-100 pt-3"></div>

                  {}
                  {activeNode.data.type === 'data_access' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">接入方式</label>
                          <select 
                            value={formData.accessMode || 'internal'} 
                            onChange={(e) => setFormData({ ...formData, accessMode: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs font-bold outline-none"
                          >
                            <option value="internal">内部接入</option>
                          </select>
                        </div>
                        {(!formData.accessMode || formData.accessMode === 'internal') && (
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">数字员工名称</label>
                            <select 
                              value={formData.agentName || ''} 
                              onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                              className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs font-bold outline-none"
                            >
                              <option value="">请选择...</option>
                              <option value="agent_starbucks">星巴克活动预约</option>
                              <option value="agent_bank">万安银行客服助手</option>
                              <option value="agent_telecom">电信宽带售后助手</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">数据类型</label>
                          <select 
                            value={formData.dataType || 'manual_chat'} 
                            onChange={(e) => setFormData({ ...formData, dataType: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs font-bold outline-none"
                          >
                            <option value="manual_chat">人工在线会话</option>
                            <option value="manual_voice">人工语音会话</option>
                            <option value="digital_chat">在线数字员工</option>
                            <option value="digital_voice">语音数字员工</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeNode.data.type === 'template' && (
                    <div className="space-y-4">
                      {/* 分数等级通用配置 */}
                      <div className="space-y-2 border border-neutral-200 p-4 bg-white rounded-[13px] shadow-xxs">
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] font-black text-neutral-900 uppercase tracking-wider">
                            分数等级配置 (全局通用)
                          </label>
                          <button 
                            className="px-2 py-1 bg-neutral-100 text-neutral-800 rounded text-[9px] font-black hover:bg-sky-100"
                            onClick={() => {
                              const currentGrades = formData.grades || [
                                { min: 0, max: 60, label: '差' },
                                { min: 61, max: 80, label: '中等' },
                                { min: 81, max: 100, label: '优秀' }
                              ];
                              setFormData({ ...formData, grades: [...currentGrades, { min: 0, max: 0, label: '新等级' }] });
                            }}
                          >
                            + 新增等级
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(formData.grades || [
                            { min: 0, max: 60, label: '差' },
                            { min: 61, max: 80, label: '中等' },
                            { min: 81, max: 100, label: '优秀' }
                          ]).map((grade: any, i: number, arr: any[]) => (
                            <div key={i} className="flex items-center gap-2">
                              <input 
                                type="number" 
                                value={grade.min} 
                                onChange={(e) => {
                                  const newGrades = [...arr];
                                  newGrades[i] = { ...grade, min: parseInt(e.target.value) || 0 };
                                  setFormData({ ...formData, grades: newGrades });
                                }}
                                className="w-16 px-2 py-1 border border-neutral-200 rounded text-[10px] text-center outline-none focus:border-sky-400"
                              />
                              <span className="text-[10px] text-neutral-500 font-bold">-</span>
                              <input 
                                type="number" 
                                value={grade.max} 
                                onChange={(e) => {
                                  const newGrades = [...arr];
                                  newGrades[i] = { ...grade, max: parseInt(e.target.value) || 0 };
                                  setFormData({ ...formData, grades: newGrades });
                                }}
                                className="w-16 px-2 py-1 border border-neutral-200 rounded text-[10px] text-center outline-none focus:border-sky-400"
                              />
                              <span className="text-[10px] text-neutral-500 font-bold ml-1">分</span>
                              <input 
                                type="text" 
                                value={grade.label} 
                                onChange={(e) => {
                                  const newGrades = [...arr];
                                  newGrades[i] = { ...grade, label: e.target.value };
                                  setFormData({ ...formData, grades: newGrades });
                                }}
                                className="flex-1 px-3 py-1 border border-neutral-200 rounded text-[10px] outline-none focus:border-sky-400"
                                placeholder="等级名称 (如：优秀)"
                              />
                              <button 
                                onClick={() => {
                                  const newGrades = arr.filter((_, idx) => idx !== i);
                                  setFormData({ ...formData, grades: newGrades });
                                }}
                                className="text-neutral-400 hover:text-rose-500 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 评分逻辑配置 */}
                      <div className="space-y-3 border border-neutral-200 p-4 bg-white rounded-[13px] shadow-xxs">
                        <label className="block text-[11px] font-black text-neutral-900 uppercase tracking-wider">
                          评分逻辑配置
                        </label>
                        <div className="flex bg-neutral-100 p-1 rounded-lg w-fit">
                          <button
                            onClick={() => setFormData({ ...formData, scoringType: 'regular' })}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${(!formData.scoringType || formData.scoringType === 'regular') ? 'bg-white shadow-sm text-neutral-800' : 'text-neutral-500'}`}
                          >
                            常规逻辑配置 (扣分制)
                          </button>

                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in">
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-400 mb-1">扣分制最高分</label>
                              <input 
                                type="number" 
                                value={formData.maxScore || 100}
                                onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-bold outline-none bg-neutral-50 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-400 mb-1">扣分制最低分</label>
                              <input 
                                type="number" 
                                value={formData.minScore || 0}
                                onChange={(e) => setFormData({ ...formData, minScore: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-bold outline-none bg-neutral-50 focus:bg-white"
                              />
                            </div>
                          </div>
                      </div>
                    </div>
                  )}
                  {activeNode.data.type === 'ai_task' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider flex items-center gap-1">
                            <UserCheck size={10} /> 识别客服
                          </label>
                          <select 
                            value={formData.targetAgent || '全部客服'}
                            onChange={(e) => setFormData({ ...formData, targetAgent: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-bold outline-none bg-white focus:border-neutral-400"
                          >
                            <option value="全部客服">全部客服 (全量分析)</option>
                            <option value="指定技能组">指定技能组</option>
                            <option value="新入职坐席">新入职坐席</option>
                            <option value="指定个人账号">指定个人账号</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider flex items-center gap-1">
                            <Clock size={10} /> 质检频率
                          </label>
                          <select 
                            value={formData.frequency || 'realtime'} 
                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs font-bold outline-none focus:border-neutral-400"
                          >
                            <option value="realtime">实时分析 (推送至实时看板)</option>
                            <option value="once">单次离线分析 (最大跨度31天)</option>
                          </select>
                        </div>
                      </div>

                      {formData.frequency === 'once' && (
                        <div className="p-4 bg-neutral-50 rounded-[13px] border border-neutral-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">分析时间范围 (支持当天及之前，跨度最大31天)</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="date" 
                              className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-xs font-bold outline-none shadow-inner"
                              max={new Date().toISOString().split('T')[0]}
                            />
                            <span className="text-neutral-400 font-bold">至</span>
                            <input 
                              type="date" 
                              className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-xs font-bold outline-none shadow-inner"
                              max={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div className="text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-100/50">
                            提示：单次任务将扫描指定时间范围内的全量存档会话。
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-neutral-50 rounded-[13px] border border-neutral-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                            会话总结
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={formData.enableSummary || false}
                              onChange={(e) => setFormData({ ...formData, enableSummary: e.target.checked })}
                            />
                            <div className="w-8 h-4 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-neutral-800"></div>
                          </label>
                        </div>
                        
                        {formData.enableSummary && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">识别模型</label>
                              <select
                                value={formData.summaryModel || 'gpt-4o'}
                                onChange={(e) => setFormData({ ...formData, summaryModel: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-bold outline-none bg-white focus:border-neutral-400"
                              >
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="deepseek-v3">DeepSeek-V3</option>
                                <option value="qwen-max">Qwen-Max</option>
                                <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">识别逻辑</label>
                              <textarea
                                rows={3}
                                value={formData.summaryPrompt || ''}
                                onChange={(e) => setFormData({ ...formData, summaryPrompt: e.target.value })}
                                placeholder="请输入总结识别逻辑，例如：请提取会话中的核心问题、客户情绪和最终解决方案..."
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs outline-none bg-white focus:border-neutral-400 resize-none shadow-inner"
                              />
                            </div>
                            <div>
                           <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">识别节点</label>
                              <select
                                value={formData.summaryTiming || 'view_time'}
                                onChange={(e) => setFormData({ ...formData, summaryTiming: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs font-bold outline-none bg-white focus:border-neutral-400"
                              >
                                <option value="view_time">查看时总结</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-neutral-100/50 rounded-[13px] border border-neutral-200/50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest">关联质检模板状态</span>
                          <span className="px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full shadow-sm">已自动继承</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-3 rounded-[7px] border border-neutral-100 shadow-xxs">
                          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                            <FileText size={14} />
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-neutral-800">当前生效模板: {formData.label || '默认模板'}</div>
                            <div className="text-[9px] text-neutral-400 leading-tight">已从前置节点同步评分脚本、权重与质检算子。</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeNode.data.type === 'alarm_task' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1">警告拦截触发核心指标阈值设定</label>
                        <input 
                          type="text" 
                          value={formData.alertCondition || ''} 
                          onChange={(e) => setFormData({ ...formData, alertCondition: e.target.value })}
                          className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:border-neutral-400 outline-none text-neutral-800 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1">机器人 Webhook 推送地址 URL</label>
                        <input 
                          type="text" 
                          value={formData.webhookUrl || ''} 
                          onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                          className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:border-neutral-400 outline-none text-neutral-800 font-mono bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {activeNode.data.type === 'dashboard_sync' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 mb-1">看板展现核心指标 (多选)</label>
                        <div className="grid grid-cols-2 gap-2 mt-1.5">
                          {['合格率', '抽检量', '违规预警数', 'AI覆盖率', '平均响应时长', '敏感词命中数'].map((metric) => {
                            const list = formData.metricsToShow || [];
                            const isChecked = list.includes(metric);
                            return (
                              <label key={metric} className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({ ...formData, metricsToShow: [...list, metric] });
                                    } else {
                                      setFormData({ ...formData, metricsToShow: list.filter(m => m !== metric) });
                                    }
                                  }}
                                  className="rounded text-neutral-800 focus:border-neutral-400 h-3.5 w-3.5" 
                                />
                                {metric}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {}
              {false && activeConfigTab === 'permissions' && (
                <div className="space-y-6 overflow-y-auto pr-1 h-full pb-20 text-left relative">
                  <div className="p-4 bg-neutral-100/50 rounded-[13px] border border-neutral-200/50">
                    <h4 className="text-[11px] font-black text-neutral-900 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-neutral-800" />
                      权限配置 (页面权限与操作权限)
                    </h4>
                    <p className="text-[9.5px] text-neutral-900 mt-1 leading-normal">
                      支持针对不同【角色】或【账号】配置详细的页面展示权限与操作权限。
                    </p>
                  </div>
                  
                  <div className="space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest">1. 授权对象选择</label>
                      <button 
                        onClick={() => setShowAuthAddModal(true)}
                        className="px-2.5 py-1 bg-neutral-800 text-white rounded text-[10px] font-black hover:opacity-90 cursor-pointer shadow-sm"
                      >
                        + 快速添加
                      </button>
                    </div>

                    {}
                    {showAuthAddModal && (
                      <div className="absolute top-10 right-0 w-80 bg-white rounded-[13px] shadow-2xl border border-neutral-200 z-50 overflow-hidden">
                        <div className="flex border-b border-neutral-100">
                          <button 
                            className={`flex-1 py-2 text-[10px] font-bold ${authAddType === 'role' ? 'text-neutral-800 border-b-2 border-neutral-800 bg-neutral-100/30' : 'text-neutral-500 hover:bg-neutral-50'}`}
                            onClick={() => { setAuthAddType('role'); setAuthSelectedRolePath([]); }}
                          >
                            选择角色
                          </button>
                          <button 
                            className={`flex-1 py-2 text-[10px] font-bold ${authAddType === 'account' ? 'text-neutral-800 border-b-2 border-neutral-800 bg-neutral-100/30' : 'text-neutral-500 hover:bg-neutral-50'}`}
                            onClick={() => { setAuthAddType('account'); setAuthSelectedAccountPath([]); setAuthSearchQuery(''); }}
                          >
                            选择账号
                          </button>
                        </div>
                        
                        <div className="p-3">
                          {authAddType === 'role' ? (
                            <div className="space-y-2">
                              <div className="flex gap-2 text-[10px]">
                                <select 
                                  className="flex-1 border border-neutral-200 rounded p-1.5"
                                  onChange={(e) => setAuthSelectedRolePath([e.target.value])}
                                >
                                  <option value="">选择角色...</option>
                                  <option value="一线客服">一线客服</option>
                                  <option value="二线客服">二线客服</option>
                                  <option value="专职质检员">专职质检员</option>
                                  <option value="质检主管">质检主管</option>
                                  <option value="超级管理员">超级管理员</option>
                                </select>
                              </div>
                              <button 
                                disabled={authSelectedRolePath.length === 0 || authorizedEntities.some(e => e.type === 'role' && e.value === authSelectedRolePath[0])}
                                onClick={() => {
                                  const roleName = authSelectedRolePath[0];
                                  const newEntity = { id: Date.now().toString(), type: 'role', value: roleName, icon: <Users size={10} />, dataScope: '个人数据', perms: ['质检任务列表查看'] };
                                  setAuthorizedEntities([...authorizedEntities, newEntity]);
                                  setShowAuthAddModal(false);
                                  setSelectedEntityId(newEntity.id);
                                }}
                                className="w-full py-1.5 mt-2 bg-neutral-800 disabled:bg-neutral-300 text-white text-[10px] font-bold rounded"
                              >
                                {authorizedEntities.some(e => e.type === 'role' && e.value === authSelectedRolePath[0]) ? '该角色已添加' : '确认添加角色'}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input 
                                type="text" 
                                placeholder="搜索账号..." 
                                className="w-full border border-neutral-200 rounded p-1.5 text-[10px]"
                                value={authSearchQuery}
                                onChange={(e) => setAuthSearchQuery(e.target.value)}
                              />
                              <div className="max-h-32 overflow-y-auto border border-neutral-100 rounded">
                                {['zhangsan (张三)', 'lisi (李四)', 'wangwu (王五)'].filter(acc => acc.includes(authSearchQuery)).map(acc => {
                                  const isAdded = authorizedEntities.some(e => e.type === 'account' && e.value === acc);
                                  return (
                                    <div key={acc} className={`p-1.5 text-[10px] flex justify-between items-center ${isAdded ? 'bg-neutral-50 opacity-50' : 'hover:bg-neutral-100 cursor-pointer'}`}
                                      onClick={() => {
                                        if (isAdded) return;
                                        if (authSelectedAccountPath.includes(acc)) {
                                          setAuthSelectedAccountPath(authSelectedAccountPath.filter(a => a !== acc));
                                        } else {
                                          setAuthSelectedAccountPath([...authSelectedAccountPath, acc]);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input type="checkbox" checked={authSelectedAccountPath.includes(acc)} readOnly className="accent-neutral-800" />
                                        <span>{acc}</span>
                                      </div>
                                      {isAdded && <span className="text-neutral-400 text-[9px]">已添加</span>}
                                    </div>
                                  )
                                })}
                              </div>
                              <button 
                                disabled={authSelectedAccountPath.length === 0}
                                onClick={() => {
                                  const newEntities = authSelectedAccountPath.map(accName => ({
                                    id: Date.now().toString() + accName, 
                                    type: 'account', 
                                    value: accName, 
                                    icon: <User size={10} />, 
                                    dataScope: '个人数据',
                                    perms: ['质检任务列表查看'] 
                                  }));
                                  setAuthorizedEntities([...authorizedEntities, ...newEntities]);
                                  setShowAuthAddModal(false);
                                  if (newEntities.length > 0) setSelectedEntityId(newEntities[0].id);
                                  setAuthSelectedAccountPath([]);
                                }}
                                className="w-full py-1.5 mt-2 bg-neutral-800 disabled:bg-neutral-300 text-white text-[10px] font-bold rounded"
                              >
                                确认添加选中账号
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="p-2 border-t border-neutral-100 bg-neutral-50 text-right">
                          <button onClick={() => setShowAuthAddModal(false)} className="text-[9px] text-neutral-500 hover:text-neutral-700 font-bold">取消关闭</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {authorizedEntities.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedEntityId(item.id)}
                          className={`flex items-center gap-3 p-3 border rounded-[13px] shadow-xxs group/auth cursor-pointer transition-all ${
                            selectedEntityId === item.id 
                              ? 'bg-neutral-100 border-sky-300 ring-1 ring-sky-200' 
                              : 'bg-white border-neutral-200 hover:border-sky-200'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'role' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600'}`}>
                            {item.icon}
                          </div>
                          <div className="flex-1">
                            <div className="text-[11px] font-black text-neutral-800">{item.value}</div>
                            <div className="text-[9px] text-neutral-400">
                              {item.type === 'role' ? '角色授权' : '账号授权'}
                            </div>
                          </div>
                          {selectedEntityId === item.id && <div className="w-2 h-2 rounded-full bg-neutral-800 animate-pulse"></div>}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setAuthorizedEntities(authorizedEntities.filter(e => e.id !== item.id));
                              if (selectedEntityId === item.id) setSelectedEntityId(null);
                            }}
                            className="p-1.5 hover:bg-rose-50 text-rose-400 rounded-lg transition-all opacity-0 group-hover/auth:opacity-100 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedEntityId ? (
                    <div className="space-y-4 pt-4 border-t border-neutral-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-neutral-800 px-2 py-0.5 bg-neutral-100 rounded">
                          正在配置: {authorizedEntities.find(e => e.id === selectedEntityId)?.value}
                        </span>
                      </div>

                      <div className="bg-neutral-50 rounded-[13px] p-4 space-y-4 border border-neutral-200">
                        {/* 数据权限 */}
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-neutral-500 uppercase flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-emerald-600" />
                            数据权限 (控制可见数据范围)
                          </label>
                          <select 
                            className="w-full border border-neutral-200 rounded p-2 text-[10px] bg-white text-neutral-700"
                            value={authorizedEntities.find(e => e.id === selectedEntityId)?.dataScope || '个人数据'}
                            onChange={(e) => {
                              const updated = authorizedEntities.map(entity => 
                                entity.id === selectedEntityId ? { ...entity, dataScope: e.target.value } : entity
                              );
                              setAuthorizedEntities(updated);
                            }}
                          >
                            <option value="个人数据">个人数据</option>
                            <option value="全量数据">全量数据</option>
                          </select>
                        </div>

                        {/* 页面权限 */}
                        <div className="space-y-3 pt-3 border-t border-neutral-200/50">
                          <label className="block text-[10px] font-black text-neutral-500 uppercase flex items-center gap-1.5">
                            <Settings size={12} className="text-neutral-800" />
                            页面权限 (控制可见视图)
                          </label>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {['质检任务列表查看', '质检结果下钻查看', '质检报表看板查看'].map(perm => {
                              const currentEntity = authorizedEntities.find(e => e.id === selectedEntityId);
                              const perms = currentEntity?.perms || [];
                              const isChecked = perms.includes(perm);
                              return (
                                <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                                  <div 
                                    onClick={() => {
                                      const newPerms = isChecked ? perms.filter(p => p !== perm) : [...perms, perm];
                                      const updated = authorizedEntities.map(e => e.id === selectedEntityId ? { ...e, perms: newPerms } : e);
                                      setAuthorizedEntities(updated);
                                    }}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-neutral-800 border-neutral-800' : 'bg-white border-neutral-300 group-hover:border-sky-400'}`}
                                  >
                                    {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                  </div>
                                  <span className={`text-[10.5px] font-bold transition-colors ${isChecked ? 'text-neutral-700' : 'text-neutral-600'}`}>{perm}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* 操作权限 */}
                        <div className="space-y-3 pt-3 border-t border-neutral-200/50">
                          <label className="block text-[10px] font-black text-neutral-500 uppercase flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-rose-500" />
                            操作权限 (控制高危操作)
                          </label>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {['编辑质检配置', '纠错', '导出质检明细数据'].map(perm => {
                              const currentEntity = authorizedEntities.find(e => e.id === selectedEntityId);
                              const perms = currentEntity?.perms || [];
                              const isChecked = perms.includes(perm);
                              return (
                                <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                                  <div 
                                    onClick={() => {
                                      const newPerms = isChecked ? perms.filter(p => p !== perm) : [...perms, perm];
                                      const updated = authorizedEntities.map(e => e.id === selectedEntityId ? { ...e, perms: newPerms } : e);
                                      setAuthorizedEntities(updated);
                                    }}
                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-rose-500 border-rose-500' : 'bg-white border-neutral-300 group-hover:border-rose-300'}`}
                                  >
                                    {isChecked && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                                  </div>
                                  <span className={`text-[10.5px] font-bold transition-colors ${isChecked ? 'text-rose-700' : 'text-neutral-600'}`}>{perm}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 flex flex-col items-center justify-center text-neutral-300 space-y-3 border-2 border-dashed border-neutral-100 rounded-[13px] bg-neutral-50/30">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <ShieldCheck size={24} className="opacity-40 text-neutral-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-[11px] font-black text-neutral-500">请选择上方的授权对象</p>
                        <p className="text-[9px] text-neutral-400 mt-0.5 px-6 leading-relaxed">针对不同角色或个人配置差异化的页面与操作权限。</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </fieldset>

            {}
            <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-2 shrink-0">
              
              {}
              {hasConfigPermission(activeNode.data) && activeNode.data.type !== 'data_access' && (
                <button 
                  type="button"
                  onClick={() => {
                    if (confirm(`确认要彻底删除质检节点【${activeNode.data.label}】及与其相连的关系链吗？`)) {
                      setNodes(nds => nds.filter(n => n.id !== activeNode.id));
                      setEdges(eds => eds.filter(e => e.source !== activeNode.id && e.target !== activeNode.id));
                      setShowConfigModal(false);
                      setActiveNode(null);
                    }
                  }}
                  className="mr-auto flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-[7px] text-xs font-black transition-all cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>删除此节点</span>
                </button>
              )}

              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-1.5 border border-neutral-200 rounded-[7px] text-xs font-black text-neutral-600 hover:bg-white hover:text-neutral-800 bg-white cursor-pointer shadow-xxs transition-colors"
              >
                关闭
              </button>
              
              {hasConfigPermission(activeNode.data) && (
                <button 
                  onClick={handleSaveConfig}
                  className="flex items-center gap-1 px-5 py-1.5 bg-neutral-800 hover:opacity-90 text-white rounded-[7px] text-xs font-black shadow-lg shadow-sky-200 transition-all cursor-pointer active:scale-95"
                >
                  <Save size={12} />
                  保存参数配置
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {}
      <div className={`fixed right-0 top-0 bottom-0 z-[10000] flex transition-all duration-300 ${isBotOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="w-80 h-full bg-white border-l border-neutral-200 shadow-2xl flex flex-col overflow-hidden">
          {}
          <div className="bg-neutral-800 p-5 text-white flex items-center justify-between shrink-0 h-16">
            <div className="flex items-center gap-3">
              <Bot size={22} />
              <div>
                <h4 className="text-sm font-black tracking-tight">质检数字员工</h4>
                <div className="flex items-center gap-1.5 opacity-80 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[9px] font-bold">配置辅助中</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsBotOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50">
            <div className="bg-white rounded-[13px] p-4 text-[11.5px] text-neutral-600 leading-relaxed border border-sky-50 shadow-sm relative">
              "您好！我是您的质检助手。您可以让我帮您：<br/><br/>
              • <span className="text-neutral-800 font-bold underline decoration-dotted">配置一个针对证券投顾业务的质检模板</span><br/>
              • <span className="text-neutral-800 font-bold underline decoration-dotted">帮我检查当前流程的合规性并输出优化建议</span><br/>
              • <span className="text-neutral-800 font-bold underline decoration-dotted">自动生成数据看板及全景大屏报表</span>"
              <div className="absolute -right-1 top-4 w-2 h-2 bg-white border-r border-t border-sky-50 rotate-45"></div>
            </div>
          </div>

          {}
          <div className="p-4 bg-white border-t border-neutral-100 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <label
                title="上传文件 (支持 Excel/Word/图片/PDF)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-neutral-100 hover:text-neutral-800 rounded-lg text-neutral-500 transition-colors cursor-pointer"
              >
                <Paperclip size={16} />
                <span className="text-[11px] font-bold">上传文件</span>
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.docx,.doc,.pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length) qcNotify(`已上传 ${files.length} 个文件，正在解析文档语义...`);
                  }}
                />
              </label>
              <button title="AI 算子市场" className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-colors">
                <LayoutGrid size={16} />
              </button>
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <span className="text-[10px] font-bold text-neutral-400 shrink-0">数字员工</span>
                <div className="relative flex-1">
                  <select
                    value={selectedDigitalStaff}
                    onChange={(e) => setSelectedDigitalStaff(e.target.value)}
                    className="w-full appearance-none bg-neutral-100 text-neutral-700 text-[11px] font-bold rounded-lg pl-2.5 pr-7 py-1.5 border border-neutral-200 outline-none focus:border-sky-300 cursor-pointer transition-colors"
                  >
                    <option value="质检类数字员工">质检类数字员工</option>
                    <option value="分析类数字员工">分析类数字员工</option>
                    <option value="报表类数字员工">报表类数字员工</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-sky-400 pointer-events-none" />
                </div>
              </div>
              <textarea 
                rows={3}
                placeholder="在此输入您的指令，支持描述需求..."
                className="w-full px-4 py-3 bg-neutral-100 rounded-[13px] text-xs border border-transparent focus:bg-white focus:border-sky-300 outline-none transition-all resize-none font-medium"
              />
              <button className="absolute right-3 bottom-3 w-8 h-8 bg-neutral-800 text-white rounded-[7px] flex items-center justify-center shadow-lg shadow-sky-200 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {}
      {!isBotOpen && (
        <div className="fixed bottom-8 right-8 z-[10001] group">
          <button 
            onClick={() => setIsBotOpen(true)}
            className="w-16 h-16 bg-neutral-800 hover:opacity-90 text-white rounded-full shadow-2xl shadow-sky-200 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-white"
          >
            <Bot size={32} />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[11px] font-black">1</div>
          </button>
        </div>
      )}

      </div>
      </ReactFlowProvider>
    </WorkflowContext.Provider>
  );
});

WorkflowEditor.displayName = 'WorkflowEditor';
