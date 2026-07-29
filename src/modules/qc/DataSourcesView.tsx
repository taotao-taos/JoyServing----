import React, { useState, useRef } from 'react';
import { DataSource, Role } from './types';
import { 
  Database, Plus, Search, Filter, RefreshCw, Sliders, Play, Trash2, ArrowRight, Settings2, Info, AlertTriangle, CheckCircle, AlertCircle, Cpu, ShieldCheck, BookOpen, Layers, HelpCircle, Code2, Zap, ArrowDownRight, Sparkles,
  X, Save, Award, Clock, User, ThumbsUp, Check, MessageSquare, FileText, ChevronLeft, ChevronDown, ChevronUp, Lock, Settings, Users
} from '@/lib/icons';
import { WorkflowEditor, WorkflowEditorHandle } from './WorkflowEditor';

interface DataSourcesViewProps {
  role: Role;
  dataSources: DataSource[];
  setDataSources: React.Dispatch<React.SetStateAction<DataSource[]>>;
  showAddSourceModal: boolean;
  setShowAddSourceModal: (show: boolean) => void;
  newSource: any;
  setNewSource: any;
  handleAddDataSource: () => void;
  toggleSourceStatus: (id: string) => void;
}

export const getSourceBadgeInfo = (type: string) => {
  switch (type) {
    case 'manual_voice':
      return { label: '人工语音会话', styles: 'bg-neutral-100 text-neutral-700 border-sky-200' };
    case 'manual_chat':
      return { label: '人工在线会话', styles: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'digital_chat':
      return { label: '数字员工在线会话', styles: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
    case 'digital_voice':
      return { label: '数字员工语音会话', styles: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'unified_chat':
      return { label: '在线融合工作台会话', styles: 'bg-amber-50 text-amber-700 border-amber-200' };
    default:
      return { label: '自定义数据源', styles: 'bg-neutral-50 text-neutral-700 border-neutral-200' };
  }
};

export const DataSourcesView: React.FC<DataSourcesViewProps> = ({
  role,
  dataSources,
  setDataSources,
  showAddSourceModal,
  setShowAddSourceModal,
  newSource,
  setNewSource,
  handleAddDataSource,
  toggleSourceStatus
}) => {
  const [modalTab, setModalTab] = useState<'basic' | 'permission'>('basic');
  const [showAuthAddModal, setShowAuthAddModal] = useState(false);
  const [authAddType, setAuthAddType] = useState<'role' | 'account'>('role');
  const [authSelectedRolePath, setAuthSelectedRolePath] = useState<string[]>([]);
  const [authSelectedAccountPath, setAuthSelectedAccountPath] = useState<string[]>([]);
  const [authSearchQuery, setAuthSearchQuery] = useState('');
  const [authorizedEntities, setAuthorizedEntities] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'error'>('all');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(dataSources[0]?.id || null);
  
  
  const [activeDetailTab, setActiveDetailTab] = useState<'records' | 'workflow'>('records');

  const [recordSourceType, setRecordSourceType] = useState<'sessions' | 'workorders'>('sessions');

  
  const [inputSessionId, setInputSessionId] = useState("");
  const [inputCustomerName, setInputCustomerName] = useState("");
  const [inputAgentName, setInputAgentName] = useState("");
  const [inputSatisfaction, setInputSatisfaction] = useState("all");
  const [inputKeyword, setInputKeyword] = useState("");
  const [inputInitiator, setInputInitiator] = useState("all");
  const [inputSkillGroup, setInputSkillGroup] = useState("");
  const [inputCustomerPhone, setInputCustomerPhone] = useState("");
  const [inputAgentId, setInputAgentId] = useState("");
  const [inputAgentDept, setInputAgentDept] = useState("");
  const [inputWorkOrderId, setInputWorkOrderId] = useState("");
  const [inputLeadValue, setInputLeadValue] = useState("");
  const [inputDurationMin, setInputDurationMin] = useState("");
  const [inputDurationMax, setInputDurationMax] = useState("");
  const [inputMsgCountMin, setInputMsgCountMin] = useState("");
  const [inputMsgCountMax, setInputMsgCountMax] = useState("");
  const [inputSummary, setInputSummary] = useState("");
  const [inputHangupBy, setInputHangupBy] = useState("all");
  const [inputConnectStatus, setInputConnectStatus] = useState("all");

  const [appliedFilters, setAppliedFilters] = useState({
    sessionId: "",
    customerName: "",
    agentName: "",
    satisfaction: "all",
    keyword: "",
    initiator: "all",
    skillGroup: "",
    customerPhone: "",
    agentId: "",
    agentDept: "",
    workOrderId: "",
    leadValue: "",
    durationMin: "",
    durationMax: "",
    msgCountMin: "",
    msgCountMax: "",
    summary: "",
    hangupBy: "all",
    connectStatus: "all"
  });

  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const handleQuery = () => {
    setAppliedFilters({
      sessionId: inputSessionId,
      customerName: inputCustomerName,
      agentName: inputAgentName,
      satisfaction: inputSatisfaction,
      keyword: inputKeyword,
      initiator: inputInitiator,
      skillGroup: inputSkillGroup,
      customerPhone: inputCustomerPhone,
      agentId: inputAgentId,
      agentDept: inputAgentDept,
      workOrderId: inputWorkOrderId,
      leadValue: inputLeadValue,
      durationMin: inputDurationMin,
      durationMax: inputDurationMax,
      msgCountMin: inputMsgCountMin,
      msgCountMax: inputMsgCountMax,
      summary: inputSummary,
      hangupBy: inputHangupBy,
      connectStatus: inputConnectStatus
    });
    setCurrentPage(1);
  };

  const handleReset = () => {
    setInputSessionId("");
    setInputCustomerName("");
    setInputAgentName("");
    setInputSatisfaction("all");
    setInputKeyword("");
    setInputInitiator("all");
    setInputSkillGroup("");
    setInputCustomerPhone("");
    setInputAgentId("");
    setInputAgentDept("");
    setInputWorkOrderId("");
    setInputLeadValue("");
    setInputDurationMin("");
    setInputDurationMax("");
    setInputMsgCountMin("");
    setInputMsgCountMax("");
    setInputSummary("");
    setInputHangupBy("all");
    setInputConnectStatus("all");
    setAppliedFilters({
      sessionId: "",
      customerName: "",
      agentName: "",
      satisfaction: "all",
      keyword: "",
      initiator: "all",
      skillGroup: "",
      customerPhone: "",
      agentId: "",
      agentDept: "",
      workOrderId: "",
      leadValue: "",
      durationMin: "",
      durationMax: "",
      msgCountMin: "",
      msgCountMax: "",
      summary: "",
      hangupBy: "all",
      connectStatus: "all"
    });
    setCurrentPage(1);
  };

  
  const [streamSessions, setStreamSessions] = useState([
    {
      id: "SESS-09512",
      customerName: "李理财",
      agentName: "薛程月",
      startTime: "14:40:22",
      duration: "180 秒",
      satisfaction: "非常满意",
      intent: "稳健理财收益结转计算纠纷",
      npsClass: "promoter" as const,
      npsScore: 9,
      aiScore: 95,
      transcript: [
        { role: "user" as const, text: "你们这个稳健性理财产品，说是年化4%，怎么我买了一个月才收益这么点？", time: "14:40:22" },
        { role: "agent" as const, text: "您好！非常抱歉给您带来疑惑。年化收益率4%是指持有满一年期的预期收益水平。由于理财产品刚买入1个月，收益尚未到期完全释放，且受近期固收净值小幅波动影响，实际日结转会有波动，需要以最终结转到期为准。", time: "14:40:55" },
        { role: "user" as const, text: "那中途我要是用钱能提前赎回退出来吗？", time: "14:41:12" },
        { role: "agent" as const, text: "本产品为封闭式稳健理财，合同细则约定中途是不支持提前赎回的。建议您后续根据自身的资金使用流转规划选择更合适期限的产品，我们会竭诚为您关注后续净值表现。", time: "14:41:40" }
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
      npsClass: "detractor" as const,
      npsScore: 3,
      aiScore: 55,
      transcript: [
        { role: "user" as const, text: "我想买那个高息理财，这个产品稳赚不赔吧？", time: "15:01:10" },
        { role: "agent" as const, text: "您好，我们理财都是根据适当性评测推荐 of 推荐的，理论上无法做口头保本承诺的。", time: "15:01:30" },
        { role: "user" as const, text: "那你们之前宣传说有存款一样的安全度？", time: "15:01:50" },
        { role: "agent" as const, text: "哎呀，跟您说实话吧，这个是咱们行里的明星主打产品，绝对稳赚不赔的，保本保收益，我们自己全家都买了这个，您放心买就是了！出了问题我给您垫付违约金！", time: "15:02:15" },
        { role: "user" as const, text: "那行，那我就全投进去了。", time: "15:02:40" }
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
      npsClass: "passive" as const,
      npsScore: 7,
      aiScore: 82,
      transcript: [
        { role: "user" as const, text: "你好，我的固收理财今天怎么亏损了？之前买的时候没告诉我会有本金损失啊！", time: "16:11:45" },
        { role: "agent" as const, text: "您好！由于近期债市出现一定幅度调整，固收+等理财产品的底层债券资产估值产生了一些净值波动，属于正常的市场变化。", time: "16:12:10" },
        { role: "user" as const, text: "那我还要继续持有吗？还是赶紧割肉？", time: "16:12:30" },
        { role: "agent" as const, text: "从历史数据看，债市短期调整后往往会逐步修复，建议您根据个人的风险承受偏好与长短投资周期，保持理性关注，不建议盲目在低点赎回割肉。", time: "16:12:55" }
      ]
    },
    {
      id: "SESS-09515",
      customerName: "钱贷款",
      agentName: "刘晓雅",
      startTime: "16:30:00",
      duration: "210 秒",
      satisfaction: "非常满意",
      intent: "理财产品质押融资贷款条件与额度咨询",
      npsClass: "promoter" as const,
      npsScore: 10,
      aiScore: 92,
      transcript: [
        { role: "user" as const, text: "你好，我手里有几万块定期理财，现在想急用钱，能拿这个理财办质押贷款吗？大概多久能放款？", time: "16:30:00" },
        { role: "agent" as const, text: "您好！可以的，我行支持特定封闭式理财产品作为质押办理自助消费贷款。您可以通过手机银行自助提交申请，额度最高为理财净值的90%，一般在审批通过后最快5分钟即可实时划拨至您的结算借记卡中，十分便利。", time: "16:30:35" },
        { role: "user" as const, text: "太好了，利息是怎么计算的呢？", time: "16:30:50" },
        { role: "agent" as const, text: "质押贷款利率目前执行年化3.85%左右，按日计息，支持随时提前还款，不收取任何违约金。您可以根据自身资金周转需求随时结清，完全不会耽误您的收益结转。", time: "16:31:15" }
      ]
    },
    {
      id: "SESS-09516",
      customerName: "孙保险",
      agentName: "王伟",
      startTime: "17:10:12",
      duration: "280 秒",
      satisfaction: "一般",
      intent: "退保现金价值扣减纠纷与坐席态度核查",
      npsClass: "detractor" as const,
      npsScore: 4,
      aiScore: 72,
      transcript: [
        { role: "user" as const, text: "怎么我买的这个保险退保要扣这么多钱？当时买的时候你们怎么不提醒现金价值折算的事？", time: "17:10:12" },
        { role: "agent" as const, text: "您好，保险合同里都有明确的现金价值表格的，您自己签字前就该看仔细啊，不能退了钱又说我们没提醒。", time: "17:10:40" },
        { role: "user" as const, text: "你这是什么态度？几万块钱的事你说的这么轻松？我要投诉你！", time: "17:11:00" },
        { role: "agent" as const, text: "唉，随便您投诉吧，反正规定就是这样的。退保就按现价表格扣减，退保单已经在流转了，您要是执意要退，损失只能自己承担了。", time: "17:11:30" }
      ]
    }
  ]);

  
  const [streamWorkOrders, setStreamWorkOrders] = useState([
    {
      id: "ORDER-20391",
      customerName: "周红梅",
      agentName: "薛程月",
      startTime: "2026-07-12 10:15:30",
      duration: "12 小时",
      satisfaction: "非常满意",
      intent: "违规承诺保本退保申诉",
      npsClass: "promoter" as const,
      npsScore: 9,
      aiScore: 95,
      status: "已处理完毕",
      transcript: [
        { role: "user" as const, text: "工单描述：客户周红梅在柜台申诉，其上周在线上购买定期理财产品时，因坐席介绍涉及保本宣传，现要求办理全额无损退保并减免违约罚息。", time: "10:15:30" },
        { role: "agent" as const, text: "处理记录：经一审调阅 SESS-09513 服务会话包，确认该坐席确实存在违规说辞。质检中心已协助退回退保罚金扣减，工单予以完结核减。", time: "16:45:10" }
      ]
    },
    {
      id: "ORDER-20392",
      customerName: "杨文理",
      agentName: "刘晓雅",
      startTime: "2026-07-12 11:22:45",
      duration: "4 小时",
      satisfaction: "不满意",
      intent: "稳健理财收益结转计算纠纷",
      npsClass: "detractor" as const,
      npsScore: 3,
      aiScore: 60,
      status: "待一审复核",
      transcript: [
        { role: "user" as const, text: "工单描述：客户杨文理对稳健理财计息首月结转金额产生纠纷，认为前三十天日均年化没有达到合意指标。", time: "11:22:45" },
        { role: "agent" as const, text: "处理记录：坐席刘晓雅向其反馈说底层固收配比问题。客户坚持认为销售时误导，工单仍在流转。", time: "13:10:00" }
      ]
    },
    {
      id: "ORDER-20393",
      customerName: "马信用卡",
      agentName: "王伟",
      startTime: "2026-07-11 16:30:10",
      duration: "24 小时",
      satisfaction: "一般",
      intent: "信用卡超期还款滞纳金减免",
      npsClass: "passive" as const,
      npsScore: 7,
      aiScore: 82,
      status: "正在处理",
      transcript: [
        { role: "user" as const, text: "工单描述：客户因境外刷卡导致逾期2天，扣罚高额利息和滞纳金，客户认为其没有收到短信通知，申请核减退回。", time: "16:30:10" },
        { role: "agent" as const, text: "处理记录：王伟已调取短信发送网关，确认已发出。客户反馈未查收，王伟提交后台继续核验中。", time: "18:00:15" }
      ]
    },
    {
      id: "ORDER-20394",
      customerName: "金大鹏",
      agentName: "薛程月",
      startTime: "2026-07-11 12:00:00",
      duration: "48 小时",
      satisfaction: "非常满意",
      intent: "线上渠道网络崩溃闪退故障申报",
      npsClass: "promoter" as const,
      npsScore: 10,
      aiScore: 98,
      status: "已处理完毕",
      transcript: [
        { role: "user" as const, text: "工单描述：客户在APP赎回开放式基金时遭遇闪退错误，导致多耗时半天，期间净值小跌0.5%，要求行里给出技术调查与合理解释，并补偿折现点差。", time: "12:00:00" },
        { role: "agent" as const, text: "处理记录：系统运营分析属于高负载节点抖动，薛程月已向技术科发起工单追查并给予客户定心补偿说明，客户对此非常满意。", time: "14:30:00" }
      ]
    }
  ]);

  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const workflowEditorRef = useRef<WorkflowEditorHandle | null>(null);
  // 暂停/删除二次确认弹窗；启动直接提示（不确认）
  const [confirmAction, setConfirmAction] = useState<{ type: 'pause' | 'delete'; id: string; name: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string>("");
  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(""), 2200);
  };
  // 暂停/恢复接入：暂停需二次确认，启动（恢复）直接执行并提示
  const handleToggleStatus = (id: string) => {
    const src = dataSources.find(s => s.id === id);
    if (!src) return;
    if (src.status === 'active') {
      // 暂停 → 二次确认
      setConfirmAction({ type: 'pause', id, name: src.agentName || src.name });
    } else {
      // 启动 → 直接执行 + 提示
      toggleSourceStatus(id);
      showToast(`已启动「${src.agentName || src.name}」的数据接入`);
    }
  };
  // 删除：二次确认
  const handleDeleteSource = (id: string) => {
    const src = dataSources.find(s => s.id === id);
    if (!src) return;
    setConfirmAction({ type: 'delete', id, name: src.agentName || src.name });
  };
  // 确认弹窗执行
  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, id, name } = confirmAction;
    if (type === 'pause') {
      toggleSourceStatus(id);
      showToast(`已暂停「${name}」的数据接入`);
    } else if (type === 'delete') {
      setDataSources(prev => prev.filter(s => s.id !== id));
      showToast(`已删除「${name}」`);
    }
    setConfirmAction(null);
  };
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'details' | 'evaluation' | 'logs'>('details');
  const [isRecordSession, setIsRecordSession] = useState(true); 
  
  
  const [editIntent, setEditIntent] = useState<string>("");
  const [editNpsClass, setEditNpsClass] = useState<'promoter' | 'passive' | 'detractor'>("promoter");
  const [editNpsScore, setEditNpsScore] = useState<number>(10);
  const [editAiScore, setEditAiScore] = useState<number>(95);

  const handleOpenDetailModal = (record: any, isSession: boolean) => {
    setSelectedRecord(record);
    setIsRecordSession(isSession);
    setEditIntent(record.intent);
    setEditNpsClass(record.npsClass);
    setEditNpsScore(record.npsScore);
    setEditAiScore(record.aiScore);
    setActiveRightTab('details');
    setShowDetailModal(true);
  };

  const handleSaveRecordAdjustments = () => {
    if (!selectedRecord) return;

    if (isRecordSession) {
      setStreamSessions(prev => prev.map(s => {
        if (s.id === selectedRecord.id) {
          return {
            ...s,
            intent: editIntent,
            npsClass: editNpsClass,
            npsScore: editNpsScore,
            aiScore: editAiScore
          };
        }
        return s;
      }));
    } else {
      setStreamWorkOrders(prev => prev.map(o => {
        if (o.id === selectedRecord.id) {
          return {
            ...o,
            intent: editIntent,
            npsClass: editNpsClass,
            npsScore: editNpsScore,
            aiScore: editAiScore
          };
        }
        return o;
      }));
    }

    alert(`质检会话详情弹窗数据调整保存成功！\n- 意图分类修正为：${editIntent}\n- NPS分类修正为：${editNpsClass === 'promoter' ? '净推荐者' : editNpsClass === 'passive' ? '被动者' : '贬损者'} (${editNpsScore} 分)\n- 质检最终评分修正为：${editAiScore} 分\n\n该数据包调整结果已自动下发物理网关并同步至大盘！`);
    setShowDetailModal(false);
  };

  
  const filteredSources = dataSources.filter(src => {
    const matchesSearch = src.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (src.config?.apiUrl?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && src.status === statusFilter;
  });

  const activeSource = dataSources.find(s => s.id === selectedSourceId) || dataSources[0];

  
  const filteredSessionsList = streamSessions.filter(record => {
    if (appliedFilters.sessionId && !record.id.toLowerCase().includes(appliedFilters.sessionId.toLowerCase())) return false;
    if (appliedFilters.customerName && !record.customerName.toLowerCase().includes(appliedFilters.customerName.toLowerCase())) return false;
    if (appliedFilters.agentName && !record.agentName.toLowerCase().includes(appliedFilters.agentName.toLowerCase())) return false;
    if (appliedFilters.satisfaction !== 'all' && record.satisfaction !== appliedFilters.satisfaction) return false;
    if (appliedFilters.keyword) {
      const kw = appliedFilters.keyword.toLowerCase();
      const matchIntent = record.intent.toLowerCase().includes(kw);
      const matchTranscript = record.transcript?.some(t => t.text.toLowerCase().includes(kw));
      if (!matchIntent && !matchTranscript) return false;
    }
    if (appliedFilters.initiator !== 'all') {
      const firstRole = record.transcript?.[0]?.role;
      if (appliedFilters.initiator === 'user' && firstRole !== 'user') return false;
      if (appliedFilters.initiator === 'agent' && firstRole !== 'agent') return false;
    }
    return true;
  });

  const totalFilteredSessions = filteredSessionsList.length;
  const totalPages = Math.ceil(totalFilteredSessions / pageSize) || 1;
  const paginatedSessionsList = filteredSessionsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTestConnection = (id: string) => {
    alert(`[${activeSource?.name || '主网关'}] 接口连通性测试成功！\n系统已成功拉取最近1条实时测试会话包。\nAPI网关应答代码：【200 OK / 秘钥验证通过】`);
  };

  
  const sourceFields = [
    { name: "会话流水号", key: "session_id", type: "字符 (string)", desc: "微信或电话呼叫的全局唯一服务标识，用于溯源追数", sample: "REQ-9524108" },
    { name: "坐席客服名称", key: "agent_name", type: "字符 (string)", desc: "处理本次咨询服务的坐席客服员工真实姓名", sample: "薛程月" },
    { name: "咨询客户昵称", key: "customer_name", type: "字符 (string)", desc: "发起业务咨询的客户昵称或系统关联姓名", sample: "王理财" },
    { name: "服务发起时间", key: "start_time", type: "时间 (datetime)", desc: "客户首句发言或电话接通的精确时间戳", sample: "2026-07-12 14:40:22" },
    { name: "咨询服务时长", key: "duration_sec", type: "整数 (integer)", desc: "会话或通话总持续的时长（单位：秒）", sample: "345 秒" },
    { name: "客户满意度", key: "satisfaction", type: "字符 (string)", desc: "客户挂机或结束对话时自主选定的评价星级", sample: "非常满意 (5星)" },
    { name: "对话转写消息流", key: "chat_transcript", type: "数组 (array)", desc: "核心AI质检文本。包含发言人角色、精确发言时间以及发言话术文本", sample: "[{role: 'user', text: '保本吗...'}, {role: 'agent', text: '保证稳赚...'}]" },
  ];

  return (
    <>
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4">
      
      {}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden">
        
        {}
        <div className={`${isSidebarOpen ? 'w-full lg:w-90' : 'w-12'} flex flex-col shrink-0 gap-4 overflow-hidden transition-all duration-300`}>

          {}
          {/* [目标锁定]: 数据源列表容器 */}
          {/* [影响评估]: 使用  动态调整 -1/-0，收起时高度自适应 */}
          {/* [修改边界]: 仅修改该容器类名及添加展开收起按钮 */}
          <div className={`${isListExpanded ? 'flex-1' : 'shrink-0'} flex flex-col bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs transition-all`}>
            {}
            <div className="p-3 border-b border-neutral-200 space-y-2 bg-neutral-50/50 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                {isSidebarOpen && <span className="text-[12px] font-black text-neutral-700 flex items-center gap-1"><Database size={14} className="text-neutral-800"/> 数据源列表</span>}
                <div className="flex items-center gap-1">
                  {isSidebarOpen && (
                    <button onClick={() => setShowAddSourceModal(true)} className="flex items-center gap-1 px-2 py-1 bg-white border border-neutral-200 hover:bg-neutral-50 rounded text-neutral-600 text-[10px] font-bold cursor-pointer transition-colors shadow-xxs">
                      <Plus size={12} />
                      接入数据
                    </button>
                  )}
                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-neutral-200 rounded text-neutral-500 cursor-pointer">
                    {isSidebarOpen ? <ChevronLeft size={16} /> : <Database size={16} />}
                  </button>
                </div>
              </div>
              <div className={`relative ${!isSidebarOpen && 'hidden'}`}>
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="搜索客服通道名称、API 路由..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1 border border-neutral-200 rounded-lg text-[10.5px] placeholder-neutral-400 focus:outline-none focus:border-neutral-400 bg-white"
                />
              </div>

              {}
              {/* [_1_]: 列表内容收起展开开关，仅控制下方    */}
              <div className={`flex items-center justify-between ${!isSidebarOpen && 'hidden'}`}>
                <div className="flex gap-1">
                  {(['all', 'active', 'inactive'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`text-[9px] px-2 py-0.5 rounded-md font-bold transition-all ${
                        statusFilter === tab 
                          ? 'bg-neutral-800 text-white shadow-xxs' 
                          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                      }`}
                    >
                      {tab === 'all' ? '全部渠道' : 
                       tab === 'active' ? '正常同步中' : '已停用'}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setIsListExpanded(!isListExpanded)}
                  className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
                  title={isListExpanded ? "收起列表" : "展开列表"}
                >
                  {isListExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {}
            {isListExpanded && (
              <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredSources.map(src => (
                <div
                  key={src.id}
                  title={!isSidebarOpen ? src.name : undefined}
                  onClick={() => {
                    setSelectedSourceId(src.id);
                    
                    setActiveDetailTab('records');
                  }}
                  className={`p-2.5 border rounded-[13px] cursor-pointer transition-all flex flex-col gap-2 ${
                    selectedSourceId === src.id 
                      ? 'border-neutral-800 bg-neutral-100/20 shadow-xxs' 
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className={`flex items-center justify-between ${!isSidebarOpen && 'justify-center'}`}>
                    <span className={`text-[8.5px] px-1 py-0.5 rounded border font-black tracking-wide ${getSourceBadgeInfo(src.type).styles} ${!isSidebarOpen && 'hidden'}`}>
                      {getSourceBadgeInfo(src.type).label}
                    </span>
                    {!isSidebarOpen && <div className={`w-2 h-2 rounded-full ${src.status === 'active' ? 'bg-emerald-500' : 'bg-neutral-400'}`}></div>}

                    <span className={`flex items-center gap-1 ${!isSidebarOpen && 'hidden'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${src.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`}></span>
                      <span className="text-[8.5px] text-neutral-400 font-bold">
                        {src.status === 'active' ? '同步中' : '已停用'}
                      </span>
                    </span>
                  </div>

                  <div className={!isSidebarOpen ? 'hidden' : ''}>
                    <h4 className="text-[11px] font-black text-neutral-800 truncate flex items-center gap-1">{src.agentName || src.name}</h4>
                    <div className="flex items-center justify-between text-[8.5px] text-neutral-400 mt-0.5 font-mono">
                      <span>接入方式: 内部接入</span>
                      <span>累计: {src.totalRecords.toLocaleString()} 条</span>
                    </div>
                    <div className="flex flex-col text-[8.5px] text-neutral-400 mt-1 font-mono gap-0.5">
                      <div className="flex justify-between"><span>创建时间:</span> <span>{src.createdAt || '2026-07-11 12:00'}</span></div>
                      <div className="flex justify-between"><span>修改人:</span> <span>{src.modifier || '系统管理员'}</span></div>
                      <div className="flex justify-between"><span>修改时间:</span> <span>{src.modifiedAt || '2026-07-11 12:00'}</span></div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-neutral-100" onClick={(e) => e.stopPropagation()}>
                      {src.status === 'active' ? (
                         <button onClick={() => handleToggleStatus(src.id)} className="text-[9px] text-amber-600 hover:text-amber-700 flex items-center gap-0.5 font-bold cursor-pointer"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> 暂停</button>
                      ) : (
                         <button onClick={() => handleToggleStatus(src.id)} className="text-[9px] text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 font-bold cursor-pointer"><Play size={10} /> 恢复</button>
                      )}
                      <button onClick={() => handleDeleteSource(src.id)} className="text-[9px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5 font-bold cursor-pointer"><Trash2 size={10} /> 删除</button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredSources.length === 0 && (
                <div className="text-center py-8">
                  <Database size={24} className="mx-auto text-neutral-300" />
                  <p className="text-[10px] text-neutral-400 mt-1 font-bold">未找到对应的渠道通道</p>
                </div>
              )}
            </div>
            
            {}
            {isSidebarOpen && (
              <div className="p-2 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-[10px] text-neutral-500 shrink-0">
                <span>共 {filteredSources.length} 条</span>
                <div className="flex items-center gap-1">
                  <button className="px-1.5 py-0.5 border border-neutral-200 bg-white rounded cursor-pointer hover:bg-neutral-100">&lt;</button>
                  <span className="font-mono">1/1</span>
                  <button className="px-1.5 py-0.5 border border-neutral-200 bg-white rounded cursor-pointer hover:bg-neutral-100">&gt;</button>
                </div>
              </div>
            )}
            </>
            )}
          </div>

        </div>

        {}
        <div className="flex-1 bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs flex flex-col h-full">
          {activeSource ? (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              
              {}
              <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50/40 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[7px] bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-800">
                    <Database size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black text-neutral-900 leading-none">{activeSource.name}</h3>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black ${getSourceBadgeInfo(activeSource.type).styles}`}>
                        {getSourceBadgeInfo(activeSource.type).label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {(role === 'manager' || role === 'operator') && (
                    <button
                      onClick={() => handleToggleStatus(activeSource.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border shadow-xxs ${
                        activeSource.status === 'active'
                          ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {activeSource.status === 'active' ? '暂停同步' : '恢复同步'}
                    </button>
                  )}
                </div>
              </div>

              {}
              <div className="border-b border-neutral-200 bg-neutral-50/25 shrink-0 px-5 py-2 flex items-center justify-between overflow-x-auto">
                <div className="flex items-center gap-1 flex-nowrap shrink-0 whitespace-nowrap">
                  <button
                    onClick={() => setActiveDetailTab('records')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all ${
                      activeDetailTab === 'records'
                        ? 'bg-neutral-800 text-white shadow-xxs'
                        : 'text-neutral-600 hover:bg-neutral-100 font-bold'
                    }`}
                  >
                    <Layers size={12} />
                    <span>原始数据明细</span>
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('workflow')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all ${
                      activeDetailTab === 'workflow'
                        ? 'bg-neutral-800 text-white shadow-xxs'
                        : 'text-neutral-800 hover:bg-neutral-100 font-extrabold'
                    }`}
                  >
                    <Zap size={12} />
                    <span>专属质检流程配置</span>
                  </button>
                </div>
              </div>

              {}
              <div className="flex-1 overflow-hidden flex flex-col bg-white">
                
                {}
                {activeDetailTab === 'records' && (
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left">
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

                      </div>

                      <div className="flex justify-end gap-2.5 pt-4 mt-2">
                        <button className="px-5 h-8 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 rounded-lg font-bold text-[11px] shadow-xxs transition-colors cursor-pointer">
                          重置
                        </button>
                        <button className="px-6 h-8 bg-neutral-800 hover:bg-black text-white rounded-lg font-black text-[11px] shadow-xs transition-colors cursor-pointer">
                          查询
                        </button>
                      </div>
                    </div>

                    <div className="border border-neutral-200 bg-white rounded-[13px] shadow-xs mt-4">
                      <div className="px-4 py-3 border-b border-neutral-200 flex justify-between items-center bg-white rounded-t-2xl">
                        <div className="text-[12px] font-bold text-neutral-800">
                          会话列表 <span className="text-neutral-500 font-medium ml-2 text-[11px]">共 21991 条记录</span>
                        </div>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-black text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> 导出
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px] text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-neutral-50/70 border-b border-neutral-200 text-neutral-500 font-bold tracking-wider">
                              <th className="p-4 w-40 font-bold text-[10.5px] sticky left-0 z-10 bg-neutral-50/90 shadow-[1px_0_0_#f5f5f5]">会话ID</th>
                              <th className="p-4 font-bold text-[10.5px]">会话开始时间</th>
                              <th className="p-4 w-56 font-bold text-[10.5px]">用户PIN</th>
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
                            {paginatedSessionsList.map((sess) => (
                              <tr key={sess.id} className="hover:bg-neutral-50/50 transition-colors group">
                                <td className="p-4 font-mono font-bold text-neutral-900 break-all flex items-center gap-2 sticky left-0 z-10 bg-white group-hover:bg-neutral-50 shadow-[1px_0_0_#f5f5f5]">
                                  {sess.id}
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400 cursor-pointer hover:text-neutral-700 shrink-0"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </td>
                                <td className="p-4 font-mono text-neutral-600">2026-07-11 {sess.startTime}</td>
                                <td className="p-4 font-mono text-neutral-600 break-all">{sess.customerPhone || '4370373b-e36f-4b6c-84dc-9f504f4a470d'}</td>
                                <td className="p-4">
                                  <div className="font-bold text-neutral-900">{sess.agentName}</div>
                                  <div className="text-[9px] text-neutral-400 font-mono mt-0.5">{sess.agentId || 'agent_3685446d7eab4b74'}</div>
                                </td>
                                <td className="p-4 text-neutral-600 font-mono">webchat</td>
                                <td className="p-4">
                                  <span className="inline-flex items-center gap-1 text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded text-[10px] font-bold border border-neutral-200">
                                    结束
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    sess.id.endsWith('4a470d') || sess.id.endsWith('624') ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  }`}>
                                    {sess.id.endsWith('4a470d') || sess.id.endsWith('624') ? '是' : '否'}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  {sess.id.endsWith('4a470d') || sess.id.endsWith('624') ? (
                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                      成功
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400">-</span>
                                  )}
                                </td>
                                <td className="p-4 text-neutral-400 font-normal">
                                  买家未评价
                                </td>
                                <td className="p-4 text-neutral-400">-</td>
                                <td className="p-4 text-right sticky right-0 z-10 bg-white group-hover:bg-neutral-50 shadow-[-1px_0_0_#f5f5f5]">
                                  <button
                                    onClick={() => workflowEditorRef.current?.openSessionDetail(sess, 'data_access')}
                                    className="text-sky-600 hover:text-blue-800 font-bold text-[11px] transition-colors flex items-center justify-end gap-1 ml-auto cursor-pointer whitespace-nowrap"
                                  >
                                    查看会话 <span className="text-[12px]">›</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {}
                      <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500 bg-white rounded-b-2xl">
                        <div>
                          共 21991 条
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1 border border-neutral-200 rounded text-neutral-400 cursor-not-allowed">上一页</button>
                          <button className="px-3 py-1 bg-neutral-800 text-white rounded font-bold">1</button>
                          <span className="text-neutral-400">/ 2200</span>
                          <button className="px-3 py-1 border border-neutral-200 rounded hover:bg-neutral-50 text-neutral-600 cursor-pointer">下一页</button>
                          <select className="ml-2 bg-transparent border border-neutral-200 rounded px-2 py-1 outline-none text-neutral-600 cursor-pointer appearance-none pr-6 relative">
                            <option value="10">10 条/页</option>
                            <option value="20">20 条/页</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {}
                <div className={activeDetailTab === 'workflow'
                  ? "flex-1 overflow-hidden flex flex-col bg-white relative"
                  : "absolute left-[-99999px] top-0 w-0 h-0 overflow-hidden flex flex-col bg-white"}>
                   <WorkflowEditor
                     ref={workflowEditorRef}
                     role={role}
                     onViewSessionDetail={(session) => workflowEditorRef.current?.openSessionDetail(session)}
                   />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white text-neutral-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-200 mb-4"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              <p className="text-[12px] font-bold text-neutral-600">请在左侧选择一个数据源查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>

      {}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-neutral-800/30 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowAddSourceModal(false)}
          ></div>
          <div className="bg-white border-l border-neutral-200 shadow-2xl w-full max-w-xl h-full flex flex-col relative z-10 animate-in slide-in-from-right duration-300">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2">
                <Database className="text-neutral-800" size={18} />
                <div className="text-left">
                  <h3 className="text-sm font-black text-neutral-900 truncate max-w-[200px]">数据接入</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">节点配置与授权设定</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddSourceModal(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors bg-neutral-100"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-5 py-1.5 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2 shrink-0">
              <button
                onClick={() => setModalTab('basic')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all ${modalTab === 'basic' ? 'bg-sky-500 text-white shadow-xxs' : 'text-neutral-500 hover:bg-neutral-100'}`}
              >
                <Sliders size={11} />
                <span>① 核心业务参数</span>
              </button>
              <button
                onClick={() => setModalTab('permission')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all ${modalTab === 'permission' ? 'bg-sky-500 text-white shadow-xxs' : 'text-neutral-800 hover:bg-neutral-100 font-extrabold'}`}
              >
                <Lock size={11} />
                <span>② 权限配置</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left">
              {modalTab === 'basic' && (
              <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">节点显示名称</label>
                  <input 
                    type="text" 
                    value={newSource.name || ''} 
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:border-neutral-400 outline-none text-neutral-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1">简要描述</label>
                  <input 
                    type="text" 
                    value={newSource.desc || ''} 
                    onChange={(e) => setNewSource({ ...newSource, desc: e.target.value })}
                    className="w-full px-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:border-neutral-400 outline-none text-neutral-800 bg-white"
                  />
                </div>
              </div>
              <div className="border-t border-neutral-100 pt-3"></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">接入方式</label>
                  <select 
                    value={newSource.accessMethod || 'internal'} 
                    onChange={(e) => setNewSource({...newSource, accessMethod: e.target.value})}
                    className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs font-bold outline-none"
                  >
                    <option value="internal">内部接入</option>
                  </select>
                </div>
                {(!newSource.accessMethod || newSource.accessMethod === 'internal') && (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">数字员工名称</label>
                    <select 
                      value={newSource.agentName || 'agent_starbucks'} 
                      onChange={(e) => setNewSource({...newSource, agentName: e.target.value})}
                      className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs font-bold outline-none"
                    >
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
                    value={newSource.type || 'manual_chat'} 
                    onChange={(e) => setNewSource({...newSource, type: e.target.value})}
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
              {modalTab === 'permission' && (
                <div className="space-y-6 overflow-y-auto pr-1 h-full pb-20 text-left relative p-6">
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
                                disabled={authSelectedRolePath.length === 0 || authorizedEntities.some(en => en.type === 'role' && en.value === authSelectedRolePath[0])}
                                onClick={() => {
                                  const roleName = authSelectedRolePath[0];
                                  const newEntity = { id: Date.now().toString(), type: 'role', value: roleName, icon: <Users size={10} />, dataScope: '个人数据', perms: ['质检任务列表查看'] };
                                  setAuthorizedEntities([...authorizedEntities,newEntity]);
                                  setShowAuthAddModal(false);
                                  setSelectedEntityId(newEntity.id);
                                }}
                                className="w-full py-1.5 mt-2 bg-neutral-800 disabled:bg-neutral-300 text-white text-[10px] font-bold rounded"
                              >
                                {authorizedEntities.some(en => en.type === 'role' && en.value === authSelectedRolePath[0]) ? '该角色已添加' : '确认添加角色'}
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
                                  const isAdded = authorizedEntities.some(en => en.type === 'account' && en.value === acc);
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
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setAuthorizedEntities(authorizedEntities.filter(en => en.id !== item.id));
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
                          正在配置: {authorizedEntities.find(en => en.id === selectedEntityId)?.value}
                        </span>
                      </div>

                      <div className="bg-neutral-50 rounded-[13px] p-4 space-y-4 border border-neutral-200">
                        <div className="space-y-3">
                          <label className="block text-[10px] font-black text-neutral-500 uppercase flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-emerald-600" />
                            数据权限 (控制可见数据范围)
                          </label>
                          <select
                            className="w-full border border-neutral-200 rounded p-2 text-[10px] bg-white text-neutral-700"
                            value={authorizedEntities.find(en => en.id === selectedEntityId)?.dataScope || '个人数据'}
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

                        <div className="space-y-3 pt-3 border-t border-neutral-200/50">
                          <label className="block text-[10px] font-black text-neutral-500 uppercase flex items-center gap-1.5">
                            <Settings size={12} className="text-neutral-800" />
                            页面权限 (控制可见视图)
                          </label>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {['质检任务列表查看', '质检结果下钻查看', '质检报表看板查看'].map(perm => {
                              const currentEntity = authorizedEntities.find(en => en.id === selectedEntityId);
                              const perms = currentEntity?.perms || [];
                              const isChecked = perms.includes(perm);
                              return (
                                <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                                  <div
                                    onClick={() => {
                                      const newPerms = isChecked ? perms.filter(p => p !== perm) : [...perms, perm];
                                      const updated = authorizedEntities.map(en => en.id === selectedEntityId ? { ...en, perms: newPerms } : en);
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

                        <div className="space-y-3 pt-3 border-t border-neutral-200/50">
                          <label className="block text-[10px] font-black text-neutral-500 uppercase flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-rose-500" />
                            操作权限 (控制高危操作)
                          </label>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {['编辑质检配置', '人工复核修正结果', '导出质检明细数据', '授权与分配任务'].map(perm => {
                              const currentEntity = authorizedEntities.find(en => en.id === selectedEntityId);
                              const perms = currentEntity?.perms || [];
                              const isChecked = perms.includes(perm);
                              return (
                                <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                                  <div
                                    onClick={() => {
                                      const newPerms = isChecked ? perms.filter(p => p !== perm) : [...perms, perm];
                                      const updated = authorizedEntities.map(en => en.id === selectedEntityId ? { ...en, perms: newPerms } : en);
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
                </div>              )}
            </div>
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowAddSourceModal(false)} className="px-5 py-2 text-neutral-600 font-bold hover:bg-neutral-200 rounded-lg transition-colors text-[11.5px]">关闭</button>
              <button onClick={() => { handleAddDataSource(); setShowAddSourceModal(false); }} className="px-5 py-2 bg-neutral-800 text-white font-black rounded-lg hover:opacity-90 transition-colors shadow-xs text-[11.5px]">
                保存参数与权限配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 暂停/删除 二次确认弹窗 */}
      {confirmAction && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-[13px] shadow-xl w-[340px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-start gap-3 border-b border-neutral-200">
              <div className={`w-9 h-9 rounded-[7px] flex items-center justify-center shrink-0 ${confirmAction.type === 'delete' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-[13px] font-black text-neutral-900">
                  {confirmAction.type === 'delete' ? '确认删除数据源？' : '确认暂停数据接入？'}
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  {confirmAction.type === 'delete'
                    ? <>删除后「{confirmAction.name}」将不再接入数据，且不可恢复，请谨慎操作。</>
                    : <>暂停后「{confirmAction.name}」将停止实时接入新数据，可随时重新启动。</>}
                </p>
              </div>
            </div>
            <div className="px-5 py-3 bg-neutral-50 flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-1.5 text-neutral-600 font-bold hover:bg-neutral-200 rounded-lg text-[11.5px]">取消</button>
              <button onClick={handleConfirm} className={`px-4 py-1.5 text-white font-black rounded-lg text-[11.5px] shadow-xs ${confirmAction.type === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {confirmAction.type === 'delete' ? '确认删除' : '确认暂停'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 启动等操作的轻提示 */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[130] bg-neutral-800 text-white text-[12px] font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle size={14} className="text-emerald-400" />
          {toastMsg}
        </div>
      )}

    </>
  );
};
export default DataSourcesView;
