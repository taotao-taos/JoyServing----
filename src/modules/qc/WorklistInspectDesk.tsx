import React, { useState } from 'react';
import { AuditTask, Role, QualityTemplate } from './types';
import { 
  CheckSquare, Search, Filter, MessageSquare, ShieldAlert, CheckCircle, 
  ArrowRight, User, Clock, AlertTriangle, AlertCircle, Info, Smile, 
  Check, X, HelpCircle, FileText, ChevronLeft, ChevronRight, Sparkles, 
  Award, Cpu, Layers, Sliders, Play, TrendingUp
} from '@/lib/icons';

interface WorklistInspectDeskProps {
  role: Role;
  auditTasks: AuditTask[];
  setAuditTasks: React.Dispatch<React.SetStateAction<AuditTask[]>>;
  templates: QualityTemplate[];
  selectedTask: AuditTask | null;
  setSelectedTask: (task: AuditTask | null) => void;
  auditChecklist: any;
  setAuditChecklist: any;
  manualScores: any;
  setManualScores: any;
  inspectorComment: string;
  setInspectorComment: string;
  handleFirstAuditSubmit: () => void;
}

export const WorklistInspectDesk: React.FC<WorklistInspectDeskProps> = ({
  role,
  auditTasks,
  setAuditTasks,
  templates,
  selectedTask,
  setSelectedTask,
  auditChecklist,
  setAuditChecklist,
  manualScores,
  setManualScores,
  inspectorComment,
  setInspectorComment,
  handleFirstAuditSubmit
}) => {
  
  const [isTaskListCollapsed, setIsTaskListCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'pending' | 'warning' | 'resolved'>('pending');
  const [sessionTypeFilter, setSessionTypeFilter] = useState<'all' | 'human' | 'digital'>('all');
  
  
  const [activeOnboardingStep, setActiveOnboardingStep] = useState<number>(1);
  const [showNewbieGuide, setShowNewbieGuide] = useState(true);

  
  const getTaskIntent = (task: AuditTask) => {
    if (task.intentCategory) return task.intentCategory;
    if (task.id === 'task-4' || task.sessionID.includes("89033")) return '固收加理财产品净值波动与保本承诺核查';
    if (task.id === 'task-5' || task.sessionID.includes("89008")) return '理财产品质押融资贷款条件与额度咨询';
    if (task.id === 'task-6' || task.sessionID.includes("89045")) return '退保现金价值扣减纠纷与坐席态度核查';
    if (task.id === 'task-7' || task.sessionID.includes("89066")) return '信用卡账单扣年费核减与退回申请咨询';
    return '一般客户服务及业务办理流程引导';
  };

  const getTaskType = (task: AuditTask): 'human' | 'digital' => {
    if (task.sessionType) return task.sessionType;
    if (task.agentName.includes("智能") || task.agentName.includes("助手") || task.agentId.includes("ai")) {
      return 'digital';
    }
    return 'human';
  };

  const getTaskTags = (task: AuditTask): string[] => {
    if (task.tags && task.tags.length > 0) return task.tags;
    if (task.id === 'task-4') return ['适当性违规', '一票否决项'];
    if (task.id === 'task-5') return ['到我为止', '解答模范', '专业致谢'];
    if (task.id === 'task-6') return ['高投诉预警', '态度急躁'];
    if (task.id === 'task-7') return ['到我为止', '首问一次性解决'];
    return ['标准会话'];
  };

  
  const filteredTasks = auditTasks.filter(t => {
    
    const isMatchedStatus = 
      taskStatusFilter === 'all' ? true :
      taskStatusFilter === 'pending' ? (t.status === 'pending' || t.status === 'warning') :
      t.status === taskStatusFilter;

    
    const matchesSearch = t.sessionID.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getTaskIntent(t).toLowerCase().includes(searchQuery.toLowerCase());
    
    
    const matchesSentiment = sentimentFilter === 'all' ? true : t.sentiment === sentimentFilter;

    
    const matchesType = 
      sessionTypeFilter === 'all' ? true : 
      sessionTypeFilter === 'human' ? getTaskType(t) === 'human' : 
      getTaskType(t) === 'digital';

    
    if (role === 'csr' && t.agentName !== '薛程月') return false;

    return isMatchedStatus && matchesSearch && matchesSentiment && matchesType;
  });

  const selectActiveTask = (task: AuditTask) => {
    setSelectedTask(task);
    
    setIsTaskListCollapsed(true);
    
    
    setManualScores({
      greeting: task.scoreBreakdown.greeting,
      compliance: task.scoreBreakdown.compliance,
      accuracy: task.scoreBreakdown.accuracy
    });
    setAuditChecklist({
      greetingOk: task.scoreBreakdown.greeting > 5,
      complianceOk: task.scoreBreakdown.compliance > 20,
      accuracyOk: task.scoreBreakdown.accuracy > 30,
      noBannedWords: task.scoreBreakdown.bannedPenalty === 0,
      responseTimeOk: task.scoreBreakdown.timeoutPenalty === 0
    });
    setInspectorComment("");
    
    setActiveOnboardingStep(2);
  };

  
  const PRESET_COMMENTS = [
    "会话礼貌话术严谨，问题解答准确完整，场景识别‘到我为止’触达，同意AI初评。",
    "坐席在解答理财限额时未进行适当性评估警示，存在潜在合规风险，予以扣分扣罚说明。",
    "坐席触发保本承诺红线禁用词，予以警告处罚并自动派发闭环辅导指令单。",
    "单次回复超时超过90秒，且未给出主动挽留解释，予以扣分建议温习大纲。"
  ];

  
  const getDynamicScoreBreakdown = () => {
    const penaltyTotal = 
      (!auditChecklist.noBannedWords ? -20 : 0) + 
      (!auditChecklist.responseTimeOk ? -10 : 0);

    const score = Math.max(0, Math.min(100, 
      Number(manualScores.greeting) + 
      Number(manualScores.compliance) + 
      Number(manualScores.accuracy) + 
      penaltyTotal
    ));
    return {
      score,
      penaltyTotal,
      isCoachingRequired: score < 80
    };
  };

  const currentCalc = getDynamicScoreBreakdown();

  
  const renderHighlightedDialogueText = (text: string, task: AuditTask) => {
    const banned = ["保证保本", "稳赚不赔", "闭眼买", "自己看着办", "随便你投诉", "不知道"];
    
    let hasMatch = false;
    let matchedWord = "";
    for (const w of banned) {
      if (text.includes(w)) {
        hasMatch = true;
        matchedWord = w;
        break;
      }
    }

    if (!hasMatch) return <span>{text}</span>;

    const parts = text.split(matchedWord);
    return (
      <span>
        {parts[0]}
        <span className="bg-rose-100 text-rose-800 border-b-2 border-rose-400 px-1 font-bold rounded mx-0.5 animate-pulse" title="AI 检测触发红线词">
          {matchedWord}
          <span className="text-[8px] bg-rose-500 text-white px-1 py-0.5 rounded-full inline-block scale-90 ml-1 font-black">AI阻断</span>
        </span>
        {parts[1]}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-3.5">
      
      {}
      {showNewbieGuide && (
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-800 rounded-[13px] p-4 text-white shadow-[0_2px_10px_rgba(31,35,41,0.02)] relative overflow-hidden shrink-0">
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-8 opacity-10">
            <Sparkles size={160} />
          </div>
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1.5 text-left">
              <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-[9px] font-black uppercase tracking-wider">
                业务小白快速通关指南
              </span>
              <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                如何理解和使用「人工审核工作台（一审复核）」？
                <Sparkles size={12} className="text-amber-400 animate-pulse" />
              </h3>
              <p className="text-[10px] text-neutral-300 leading-relaxed max-w-5xl">
                这是质检的主要业务战场。当数据接入后，系统里的<strong>AI智能脑会 100% 自动初筛</strong>每一条会话并给出初步评分与违规扣分原因。
                凡是AI评分<strong>低于 80 分（异常件）</strong>，或者触发了类似 “保证保本” 的高危红线禁用词，就会自动进入左侧的待办审核列表。
                您的任务是核对 AI 的判罚是否合理，并在右侧进行<strong>人工纠偏及最终打分裁决</strong>。如果确认不合格，系统将一键联动触发业务自愈机制（向客服导师派发辅导工单）。
              </p>
            </div>
            
            <button 
              onClick={() => setShowNewbieGuide(false)}
              className="text-neutral-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
              title="隐藏指引"
            >
              <X size={14} />
            </button>
          </div>

          {}
          <div className="grid grid-cols-4 gap-3 mt-3.5 pt-3.5 border-t border-neutral-800 text-center relative z-10">
            {}
            <div className={`p-2 rounded-[13px] transition-all ${activeOnboardingStep === 1 ? 'bg-neutral-800/40 border border-neutral-500 shadow-sm' : 'bg-white/5 border border-white/5 opacity-70'}`}>
              <div className="mx-auto w-4.5 h-4.5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-bold mb-1">1</div>
              <span className="text-[10px] font-bold block text-white">① 选取异常会话</span>
              <span className="text-[8.5px] text-neutral-400 block mt-0.5">左侧队列中点击任意一条异常件</span>
            </div>

            {}
            <div className={`p-2 rounded-[13px] transition-all ${activeOnboardingStep === 2 ? 'bg-neutral-800/40 border border-neutral-500 shadow-sm' : 'bg-white/5 border border-white/5 opacity-70'}`}>
              <div className="mx-auto w-4.5 h-4.5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-bold mb-1">2</div>
              <span className="text-[10px] font-bold block text-white">② 审阅上下文 & AI分析</span>
              <span className="text-[8.5px] text-neutral-400 block mt-0.5">中间区域阅读高危词与服务标签</span>
            </div>

            {}
            <div className={`p-2 rounded-[13px] transition-all ${activeOnboardingStep === 3 ? 'bg-neutral-800/40 border border-neutral-500 shadow-sm' : 'bg-white/5 border border-white/5 opacity-70'}`}>
              <div className="mx-auto w-4.5 h-4.5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-bold mb-1">3</div>
              <span className="text-[10px] font-bold block text-white">③ 调节计分与核准</span>
              <span className="text-[8.5px] text-neutral-400 block mt-0.5">右侧滑动微调，核对红线扣罚</span>
            </div>

            {}
            <div className={`p-2 rounded-[13px] transition-all ${activeOnboardingStep === 4 ? 'bg-neutral-800/40 border border-neutral-500 shadow-sm' : 'bg-white/5 border border-white/5 opacity-70'}`}>
              <div className="mx-auto w-4.5 h-4.5 rounded-full bg-sky-500 flex items-center justify-center text-[10px] font-bold mb-1">4</div>
              <span className="text-[10px] font-bold block text-white">④ 一键裁决归档</span>
              <span className="text-[8.5px] text-neutral-400 block mt-0.5">载入快捷评语，点最终提交</span>
            </div>
          </div>
        </div>
      )}

      {}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden relative">
        
        {}
        <button 
          onClick={() => setIsTaskListCollapsed(!isTaskListCollapsed)}
          className="absolute left-0 top-[18px] z-20 hidden lg:flex items-center justify-center w-5.5 h-12 bg-neutral-800 hover:bg-neutral-800 text-white rounded-r-xl shadow-[0_2px_10px_rgba(31,35,41,0.02)] border-y border-r border-neutral-700 hover:scale-105 transition-all"
          style={{ transform: isTaskListCollapsed ? 'translateX(0)' : 'translateX(296px)' }}
          title={isTaskListCollapsed ? "展开左侧待检队列列表" : "临时折叠左侧，将大屏无遮挡释放给质检打分面板！"}
        >
          {isTaskListCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {}
        <div 
          className={`shrink-0 bg-white border border-neutral-200 rounded-[13px] overflow-hidden flex flex-col h-full shadow-xxs transition-all duration-300 ${
            isTaskListCollapsed ? 'w-0 opacity-0 lg:w-0 overflow-hidden border-none' : 'w-full lg:w-[300px]'
          }`}
        >
          {}
          <div className="p-3 border-b border-neutral-200 space-y-2.5 bg-neutral-50/50 shrink-0">
            
            {}
            <div className="flex border border-neutral-200 rounded-lg p-1 bg-white text-[10px]">
              <button 
                onClick={() => setSessionTypeFilter('all')}
                className={`flex-1 py-1 rounded-md text-center font-black transition-all ${
                  sessionTypeFilter === 'all' 
                    ? 'bg-neutral-800 text-white shadow-xxs' 
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                全部
              </button>
              <button 
                onClick={() => setSessionTypeFilter('human')}
                className={`flex-1 py-1 rounded-md text-center font-black transition-all ${
                  sessionTypeFilter === 'human' 
                    ? 'bg-neutral-800 text-white shadow-xxs' 
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                人工会话
              </button>
              <button 
                onClick={() => setSessionTypeFilter('digital')}
                className={`flex-1 py-1 rounded-md text-center font-black transition-all ${
                  sessionTypeFilter === 'digital' 
                    ? 'bg-neutral-800 text-white shadow-xxs' 
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                数字员工
              </button>
            </div>

            {}
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索流水ID、客服人员..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7.5 pr-3 py-1 border border-neutral-250 rounded-lg text-[10.5px] placeholder-neutral-400 focus:outline-none focus:border-neutral-400 bg-white text-neutral-800 font-medium"
              />
            </div>

            {}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-bold text-neutral-400 uppercase">业务状态</span>
                <select
                  value={taskStatusFilter}
                  onChange={(e: any) => setTaskStatusFilter(e.target.value)}
                  className="border border-neutral-200 rounded-md p-1 text-[10px] font-black text-neutral-600 outline-none bg-white"
                >
                  <option value="pending">待一审复核</option>
                  <option value="warning">纠偏整改中</option>
                  <option value="resolved">合格归档件</option>
                  <option value="all">全量历史</option>
                </select>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-bold text-neutral-400 uppercase">客户情绪</span>
                <select
                  value={sentimentFilter}
                  onChange={(e: any) => setSentimentFilter(e.target.value)}
                  className="border border-neutral-200 rounded-md p-1 text-[10px] font-black text-neutral-600 outline-none bg-white"
                >
                  <option value="all">所有语气</option>
                  <option value="negative">愤怒不满</option>
                  <option value="neutral">平和中性</option>
                  <option value="positive">愉悦满意</option>
                </select>
              </div>
            </div>

          </div>

          {}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-neutral-50/20">
            <div className="text-[8.5px] font-black text-neutral-400 uppercase flex items-center justify-between mb-1.5">
              <span>待处理队列 (共 {filteredTasks.length} 条)</span>
              <span>数据正常同步</span>
            </div>

            {filteredTasks.map(task => {
              const taskType = getTaskType(task);
              const taskIntent = getTaskIntent(task);
              const taskTags = getTaskTags(task);

              return (
                <div
                  key={task.id}
                  onClick={() => selectActiveTask(task)}
                  className={`p-2.5 border rounded-[13px] cursor-pointer transition-all flex flex-col gap-2 relative group ${
                    selectedTask?.id === task.id
                      ? 'border-neutral-800 bg-neutral-100/25 shadow-xxs ring-1 ring-neutral-800/30'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  {}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded">
                      {task.sessionID}
                    </span>
                    
                    <span className={`px-1 rounded text-[8px] font-black uppercase ${
                      task.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      task.status === 'warning' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {task.status === 'pending' ? '待审核' :
                       task.status === 'warning' ? '需要纠偏' : '已归档'}
                    </span>
                  </div>

                  {}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black text-neutral-800 truncate max-w-[120px]">
                        {task.agentName}
                        <span className="text-[9px] text-neutral-400 font-normal ml-0.5">({task.group})</span>
                      </div>
                      <span className="text-[10px] font-mono font-black text-neutral-800">
                        AI: {task.aiScore}分
                      </span>
                    </div>

                    <p className="text-[9.5px] text-neutral-400 truncate mt-0.5 font-semibold">
                      {taskIntent}
                    </p>
                  </div>

                  {}
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-2 mt-0.5 shrink-0">
                    <span className="text-[8.5px] text-neutral-400 font-mono">
                      {task.sentiment === 'negative' ? '负面语气' : task.sentiment === 'positive' ? '满意' : '中立'}
                    </span>
                    
                    <div className="flex gap-1">
                      {taskTags.slice(0, 1).map((t, i) => (
                        <span 
                          key={i} 
                          className="text-[8px] px-1 bg-neutral-100 text-neutral-600 rounded font-black"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 bg-white border border-dashed border-neutral-200 rounded-[13px] p-4">
                <CheckSquare size={28} className="mx-auto text-neutral-300" />
                <p className="text-[10.5px] text-neutral-500 mt-2 font-bold">无匹配的异常件流水</p>
              </div>
            )}
          </div>
        </div>

        {}
        <div className="flex-1 bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-xxs flex flex-col h-full">
          {selectedTask ? (
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full">
              
              {}
              <div className="flex-[1.1] border-r border-neutral-200 flex flex-col h-full overflow-hidden">
                
                {}
                <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50/50 shrink-0 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {}
                    {isTaskListCollapsed && (
                      <button 
                        onClick={() => setIsTaskListCollapsed(false)}
                        className="mr-2 px-2.5 py-1 bg-neutral-100 hover:bg-sky-100 text-neutral-700 border border-neutral-200 rounded-lg text-[9.5px] font-black flex items-center gap-1 transition-all"
                        title="点击此按钮再次拉出左侧流水队列"
                      >
                        <ChevronRight size={11} className="text-neutral-800 animate-pulse" />
                        <span>展开左侧流水</span>
                      </button>
                    )}

                    <MessageSquare size={13} className="text-neutral-800" />
                    <div>
                      <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5 leading-none">
                        会话对话交互上下文详情 ({selectedTask.sessionID})
                        <span className={`text-[8.5px] px-1 py-0.5 rounded ${
                          getTaskType(selectedTask) === 'digital' 
                            ? 'bg-sky-50 text-sky-700 font-bold' 
                            : 'bg-blue-150 text-sky-700 font-bold'
                        }`}>
                          {getTaskType(selectedTask) === 'digital' ? '数字员工' : '人工客服'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono font-bold">{selectedTask.time}</span>
                </div>

                {}
                <div className="bg-neutral-100/20 border-b border-neutral-200 p-4 shrink-0 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-neutral-700 uppercase tracking-wider block">
                      AI 智能多分类场景深度洞察 (Intelligent Analysis)
                    </span>
                    <span className="text-[8.5px] text-neutral-400 font-bold">语义情感自动抽取完成</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {}
                    <div className="bg-white p-2.5 rounded-[13px] border border-neutral-200/60 shadow-xxs">
                      <span className="text-[8.5px] font-bold text-neutral-400 block mb-0.5">业务质检场景核心分类</span>
                      <span className="text-xs font-black text-neutral-850 truncate block">
                        {getTaskIntent(selectedTask)}
                      </span>
                    </div>

                    {/*  :    / 到我为止 */}
                    <div className="bg-white p-2.5 rounded-[13px] border border-neutral-200/60 shadow-xxs flex flex-col justify-between">
                      <div>
                        <span className="text-[8.5px] font-bold text-neutral-400 block mb-0.5">到我为止·优质服务多分类识别</span>
                        
                        <div className="flex flex-wrap gap-1 mt-1">
                          {getTaskTags(selectedTask).includes('到我为止') || selectedTask.aiScore >= 90 ? (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-lg border border-emerald-400 shadow-xxs animate-pulse">
                              <Award size={10} />
                              优质：到我为止 (Ends With Me)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[8.5px] bg-neutral-100 text-neutral-500 font-bold px-1.5 py-0.5 rounded-md">
                              <Info size={9} />
                              常规跟进类答复
                            </span>
                          )}

                          <span className="text-[8.5px] bg-neutral-100 text-neutral-800 font-bold px-1.5 py-0.5 rounded-md">
                            {selectedTask.sentiment === 'negative' ? '需安抚语气' : '语气良好'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-50/20">
                  {selectedTask.transcript.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] ${
                        msg.role === 'user' ? 'mr-auto items-start' : 'ml-auto items-end'
                      }`}
                    >
                      <span className="text-[9px] text-neutral-400 font-semibold mb-1">
                        {msg.role === 'user' ? '访客客户' : `坐席: ${selectedTask.agentName}`} · {msg.time}
                      </span>
                      <div className={`p-2.5 rounded-[13px] text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-white text-neutral-850 rounded-tl-none border border-neutral-200 shadow-xxs' 
                          : 'bg-neutral-800 text-white rounded-tr-none shadow-xxs'
                      }`}>
                        {msg.role === 'agent' 
                          ? renderHighlightedDialogueText(msg.text, selectedTask) 
                          : msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {}
                <div className="p-3.5 border-t border-neutral-200 bg-neutral-50/50 text-[9.5px] text-neutral-400 flex items-center gap-1.5 shrink-0">
                  <Smile size={11} className="text-emerald-500" />
                  <span>AI 提示：红色高亮为底层 NLP 模型识别出的保本禁词，多分类算子自动捕捉并进行一票扣罚拦截。</span>
                </div>
              </div>

              {}
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                
                <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50/50 shrink-0 flex items-center justify-between">
                  <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                    <Sliders size={13} className="text-neutral-800" />
                    人工核准评分细则 (Scoring Controls)
                  </span>
                  
                  <span className="text-[9.5px] font-mono font-bold text-neutral-400">
                    初评: {selectedTask.aiScore}分 ➜ 人工复核中
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  
                  {}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-black text-neutral-400 uppercase tracking-wider block">分项调节计分器 (微调判定)</span>
                      <span className="text-[9px] text-sky-500 font-bold">滑动即可实时调整</span>
                    </div>
                    
                    <div className="space-y-3.5 p-4 bg-neutral-50 rounded-[13px] border border-neutral-200">
                      
                      {}
                      <div>
                        <div className="flex justify-between text-[10.5px] font-bold text-neutral-700">
                          <span>礼貌用语规范 (最高 10 分)</span>
                          <span className="font-mono text-neutral-800 font-black">{manualScores.greeting} 分</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={manualScores.greeting}
                          onChange={(e) => {
                            setManualScores({ ...manualScores, greeting: Number(e.target.value) });
                            setActiveOnboardingStep(3);
                          }}
                          className="w-full mt-1 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                        />
                      </div>

                      {}
                      <div>
                        <div className="flex justify-between text-[10.5px] font-bold text-neutral-700">
                          <span>合规程序标准流程 (最高 40 分)</span>
                          <span className="font-mono text-neutral-800 font-black">{manualScores.compliance} 分</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          value={manualScores.compliance}
                          onChange={(e) => {
                            setManualScores({ ...manualScores, compliance: Number(e.target.value) });
                            setActiveOnboardingStep(3);
                          }}
                          className="w-full mt-1 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                        />
                      </div>

                      {}
                      <div>
                        <div className="flex justify-between text-[10.5px] font-bold text-neutral-700">
                          <span>专业解答与指引准确率 (最高 50 分)</span>
                          <span className="font-mono text-neutral-800 font-black">{manualScores.accuracy} 分</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={manualScores.accuracy}
                          onChange={(e) => {
                            setManualScores({ ...manualScores, accuracy: Number(e.target.value) });
                            setActiveOnboardingStep(3);
                          }}
                          className="w-full mt-1 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
                        />
                      </div>

                    </div>
                  </div>

                  {}
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-black text-neutral-400 uppercase tracking-wider block">高危红线处罚核准</span>
                    
                    <div className="space-y-2 bg-neutral-50/50 p-2.5 rounded-[13px] border border-neutral-200">
                      <label className="flex items-start gap-2 text-xs text-neutral-700 cursor-pointer p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={auditChecklist.noBannedWords}
                          onChange={(e) => {
                            setAuditChecklist({ ...auditChecklist, noBannedWords: e.target.checked });
                            setActiveOnboardingStep(3);
                          }}
                          className="w-4 h-4 rounded text-neutral-800 border-neutral-300 focus:border-neutral-400 mt-0.5"
                        />
                        <div>
                          <span className="font-bold text-neutral-800">未触发保本承诺禁语</span>
                          <span className="text-[9px] text-neutral-400 block mt-0.5">
                            若勾选失效，表示该客服承诺了“保本保收益”，<b>一票扣减 20 分</b>。
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2 text-xs text-neutral-700 cursor-pointer p-1.5 hover:bg-neutral-100 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={auditChecklist.responseTimeOk}
                          onChange={(e) => {
                            setAuditChecklist({ ...auditChecklist, responseTimeOk: e.target.checked });
                            setActiveOnboardingStep(3);
                          }}
                          className="w-4 h-4 rounded text-neutral-800 border-neutral-300 focus:border-neutral-400 mt-0.5"
                        />
                        <div>
                          <span className="font-bold text-neutral-800">单次响应时限正常</span>
                          <span className="text-[9px] text-neutral-400 block mt-0.5">
                            若勾选失效，表示该客服单次应答超时超过90秒，<b>扣罚 10 分</b>。
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {}
                  <div className="bg-neutral-100/50 p-3.5 border border-neutral-200 rounded-[13px] space-y-2">
                    <div className="flex items-center justify-between text-[9px] font-black text-neutral-700 uppercase">
                      <span>动态得分实时试算计分器</span>
                      <span>实时计分公式</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-[10px] font-mono font-bold text-neutral-500">
                        {manualScores.greeting} (礼) + {manualScores.compliance} (规) + {manualScores.accuracy} (准) 
                        {currentCalc.penaltyTotal !== 0 ? ` - ${Math.abs(currentCalc.penaltyTotal)} (罚)` : ''}
                      </div>
                      
                      <div className="text-right">
                        <span className="text-lg font-black font-mono text-neutral-700">
                          {currentCalc.score}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-bold ml-0.5">分</span>
                      </div>
                    </div>

                    <div className="w-full bg-neutral-250 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          currentCalc.score >= 80 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                        }`}
                        style={{ width: `${currentCalc.score}%` }}
                      ></div>
                    </div>

                    {currentCalc.isCoachingRequired ? (
                      <div className="p-1.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-lg text-[9px] font-black flex items-center gap-1">
                        <AlertTriangle size={11} className="text-rose-500 shrink-0" />
                        <span>警报：得分低于80及格线，提交后将联动触发【整改辅导指令】。</span>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-[9px] font-black flex items-center gap-1">
                        <Check size={11} className="text-emerald-500 shrink-0" />
                        <span>合格件：分数达到客服业务标准，提交后将安全归档。</span>
                      </div>
                    )}
                  </div>

                  {}
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-black text-neutral-400 uppercase tracking-wider block">人工质检意见评语 (文字定评)</span>
                    <textarea
                      value={inspectorComment}
                      onChange={(e) => {
                        setInspectorComment(e.target.value);
                        setActiveOnboardingStep(4);
                      }}
                      placeholder="结合会话表现撰写复核评语。可直接点击下方常用快捷模板一键加载，大大降低打字负担..."
                      className="w-full border border-neutral-200 rounded-[13px] p-3 text-xs text-neutral-700 outline-none focus:border-neutral-400 h-20"
                    />

                    {}
                    <div className="space-y-1">
                      <span className="text-[8.5px] text-neutral-400 font-bold block uppercase">常用快捷输入模板 (点击即刻载入)</span>
                      <div className="flex flex-col gap-1">
                        {PRESET_COMMENTS.map((preset, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setInspectorComment(preset);
                              setActiveOnboardingStep(4);
                            }}
                            className="text-left text-[9px] bg-neutral-50 hover:bg-neutral-100 p-2 border border-neutral-200 text-neutral-600 rounded-lg truncate transition-all font-medium"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="pt-3 border-t border-neutral-100 shrink-0">
                    <button
                      onClick={() => {
                        handleFirstAuditSubmit();
                        setActiveOnboardingStep(1);
                        
                        alert("恭喜！当前会话质检人工复核成功，打分裁决评定已同步写入底层持久数据库并通知该一线坐席，完美跑通本次 AI+人工联合质检生命周期！");
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-neutral-800 hover:opacity-90 text-white rounded-[13px] text-xs font-black shadow-sm transition-colors"
                    >
                      <CheckCircle size={13} />
                      确认人工复核并提交裁决
                    </button>
                    <p className="text-[8.5px] text-neutral-400 text-center mt-1.5 font-bold">
                      点击后，最终得分将覆盖 AI 初筛分，并在分析大盘和效能报表中实时更新。
                    </p>
                  </div>

                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-50/20">
              <div className="w-16 h-16 bg-neutral-100 rounded-[13px] flex items-center justify-center border border-neutral-200 mb-4 text-neutral-400 shadow-xxs animate-bounce-short">
                <Layers size={24} />
              </div>
              <h3 className="text-xs font-black text-neutral-850">请在左侧待处理队列中选择一条会话进行质检复核</h3>
              <p className="text-[10.5px] text-neutral-400 max-w-sm mt-1.5 leading-relaxed font-bold">
                点击左侧异常件，AI 机器人的深度语义分析与提取结果将即刻在中间展现，您可 10 毫秒极速定位问题、纠偏、最终打分归档。
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
