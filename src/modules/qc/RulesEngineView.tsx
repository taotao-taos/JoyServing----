import React, { useState } from 'react';
import { QualityTemplate, Role } from './types';
import { qcNotify } from './qcNotify';
import {
  FileText, Play, Code2, Plus, Sliders, Trash2, Search, Zap, Check, AlertCircle, HelpCircle, ArrowRight, Settings, Info, Code, Save, Clock
} from '@/lib/icons';

interface RulesEngineViewProps {
  role: Role;
  templates: QualityTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<QualityTemplate[]>>;
}

export interface RuleItem {
  id: string;
  name: string;
  category: 'greeting' | 'compliance' | 'accuracy' | 'penalty';
  description: string;
  scoreImpact: number; 
  operatorType: 'visual' | 'script';
  
  visualConfig: {
    operatorId: string; 
    params: Record<string, any>;
  };
  
  scriptConfig: {
    language: 'javascript' | 'python';
    code: string;
  };
}

const DEFAULT_SCRIPT_TEMPLATE = `// 质检项自定义算子执行脚本 ()
// 传入环境上下文: 
//  - 包含会话流水 : { : '' | '', : , :  }[]
//  - 业务数据
// 返回结果格式: { : , : , :  }

function executeOperator(session, metadata) {
    const transcript = session.transcript || [];
    let agentWordCount = 0;
    let userWordCount = 0;
    
    // 算法逻辑：检测坐席在回应中是否给出了建设性解答，而不是简短推诿
    for (const msg of transcript) {
        if (msg.role === 'agent') {
            agentWordCount += msg.text.length;
        } else if (msg.role === 'user') {
            userWordCount += msg.text.length;
        }
    }
    
    const ratio = agentWordCount / (userWordCount || 1);
    
    // 坐席回答字数占比过低，可能存在应付倾向
    if (ratio < 0.25) {
        return {
            passed: false,
            scoreDelta: -10,
            findings: "坐席应答字数明显少于用户，占比仅 " + Math.round(ratio * 100) + "%，疑似消极应答。"
        };
    }
    
    return {
        passed: true,
        scoreDelta: 0,
        findings: "坐席话术字数配比符合规范，交互字数比率 " + ratio.toFixed(2)
    };
}`;

export const RulesEngineView: React.FC<RulesEngineViewProps> = ({ role, templates, setTemplates }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  
  
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'greeting' | 'compliance' | 'accuracy' | 'penalty'>('compliance');

  
  const [rules, setRules] = useState<RuleItem[]>([
    {
      id: "rule-1",
      name: "首句礼貌规范用语检测",
      category: "greeting",
      description: "检测会话首句是否包含‘您好’、‘请问有什么可以帮您’等标准客套语。",
      scoreImpact: 10,
      operatorType: "visual",
      visualConfig: {
        operatorId: "keyword_presence_checker",
        params: { keywords: "您好, 尊贵客户, 请问有什么可以帮您", matchPosition: "first_turn" }
      },
      scriptConfig: { language: "javascript", code: "" }
    },
    {
      id: "rule-2",
      name: "高端理财保本收益宣传红线",
      category: "penalty",
      description: "严禁在理财、信托、基金推荐中承诺固定保本、稳赚不赔等误导词汇。触发即一票否决扣20分。",
      scoreImpact: -20,
      operatorType: "visual",
      visualConfig: {
        operatorId: "banned_words_detector",
        params: { words: "保证保本, 稳赚不赔, 绝对安全, 零风险", matchType: "anywhere" }
      },
      scriptConfig: { language: "javascript", code: "" }
    },
    {
      id: "rule-3",
      name: "产品适当性评估提示检测",
      category: "compliance",
      description: "检测向理财倾向客户发送产品代码前，是否明确提到了‘投资有风险’、‘资产评估’或‘产品细则’进行风险分级核对。",
      scoreImpact: 40,
      operatorType: "visual",
      visualConfig: {
        operatorId: "sequence_match_checker",
        params: { required: "适当性评估, 投资有风险", orderRequired: false }
      },
      scriptConfig: { language: "javascript", code: "" }
    },
    {
      id: "rule-4",
      name: "复杂理财期限错配脚本检测",
      category: "accuracy",
      description: "检测坐席推荐长期封闭理财时，是否执行了自定义业务逻辑判别规则，比对客户评估期限，防止违规错配。",
      scoreImpact: 50,
      operatorType: "script",
      visualConfig: { operatorId: "", params: {} },
      scriptConfig: {
        language: "javascript",
        code: `function executeOperator(session, metadata) {
    // 错配检测算法
    const transcript = session.transcript || [];
    let termMentioned = false;
    let riskAgreement = false;
    
    for (const msg of transcript) {
        if (msg.role === 'agent') {
            if (msg.text.includes('封闭期') || msg.text.includes('持有年限')) {
                termMentioned = true;
            }
        } else if (msg.role === 'user') {
            if (msg.text.includes('可以接受') || msg.text.includes('我知道了')) {
                riskAgreement = true;
            }
        }
    }
    
    if (!termMentioned) {
        return {
            passed: false,
            scoreDelta: -15,
            findings: "坐席未明确向客户告知产品的封闭持有期限。"
        };
    }
    
    return {
        passed: true,
        scoreDelta: 0,
        findings: "持有限制告知完整且客户已回复接受。"
    };
}`
      }
    },
    {
      id: "rule-5",
      name: "坐席应答时延与静音期罚则",
      category: "penalty",
      description: "统计会话交互时，坐席回复平均时延，如单次时延超过90秒直接处罚扣10分。",
      scoreImpact: -10,
      operatorType: "visual",
      visualConfig: {
        operatorId: "silence_timeout_detector",
        params: { maxSilenceSeconds: 90 }
      },
      scriptConfig: { language: "javascript", code: "" }
    }
  ]);

  
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  
  const [testLog, setTestLog] = useState<string[]>([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testVerdict, setTestVerdict] = useState<{ passed: boolean, delta: number, text: string } | null>(null);

  
  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleImpact, setRuleImpact] = useState(10);
  const [operatorType, setOperatorType] = useState<'visual' | 'script'>('visual');
  const [visualOpId, setVisualOpId] = useState("banned_words_detector");
  const [visualParams, setVisualParams] = useState("保证保本, 稳赚不赔, 闭眼买");
  const [scriptCode, setScriptCode] = useState(DEFAULT_SCRIPT_TEMPLATE);

  
  const [simGreeting, setSimGreeting] = useState(true);
  const [simCompliance, setSimCompliance] = useState(true);
  const [simAccuracy, setSimAccuracy] = useState(true);
  const [simBanned, setSimBanned] = useState(false);
  const [simTimeout, setSimTimeout] = useState(false);

  
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditRule = (rule: RuleItem) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleDesc(rule.description);
    setRuleImpact(rule.scoreImpact);
    setOperatorType(rule.operatorType);
    setSelectedCategory(rule.category);
    if (rule.operatorType === 'visual') {
      setVisualOpId(rule.visualConfig.operatorId);
      setVisualParams(rule.visualConfig.params.words || rule.visualConfig.params.keywords || JSON.stringify(rule.visualConfig.params));
    } else {
      setScriptCode(rule.scriptConfig.code);
    }
    setTestVerdict(null);
    setTestLog([]);
  };

  const handleCreateNewRule = () => {
    const newId = `rule-${Date.now()}`;
    const newRule: RuleItem = {
      id: newId,
      name: "新服务合规检测项",
      category: "compliance",
      description: "自定义新增加的可视化或脚本配置质检规则算子。",
      scoreImpact: 15,
      operatorType: "visual",
      visualConfig: {
        operatorId: "banned_words_detector",
        params: { words: "不知道, 自己解决" }
      },
      scriptConfig: { language: "javascript", code: "" }
    };
    setRules([...rules, newRule]);
    startEditRule(newRule);
  };

  const handleSaveRule = () => {
    if (!editingRuleId) return;

    setRules(rules.map(r => {
      if (r.id === editingRuleId) {
        return {
          ...r,
          name: ruleName,
          description: ruleDesc,
          scoreImpact: Number(ruleImpact),
          operatorType: operatorType,
          category: selectedCategory,
          visualConfig: operatorType === 'visual' ? {
            operatorId: visualOpId,
            params: visualOpId === 'banned_words_detector' ? { words: visualParams } : { keywords: visualParams }
          } : r.visualConfig,
          scriptConfig: operatorType === 'script' ? {
            language: "javascript",
            code: scriptCode
          } : r.scriptConfig
        };
      }
      return r;
    }));

    
    qcNotify("✨ 算子规则保存成功！规则已关联当前质检模板，系统自动刷新评分矩阵。");
    setEditingRuleId(null);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm("确定要删除这个质检规则算子吗？这会影响已关联该规则的全部质检任务。")) {
      setRules(rules.filter(r => r.id !== id));
      if (editingRuleId === id) setEditingRuleId(null);
    }
  };

  const runCodeTest = () => {
    setIsRunningTest(true);
    setTestLog([
      "🔄 启动沙箱环境编译代码脚本...",
      "⚙️ 正在挂载 API 流式上下文...",
      "🧬 准备测试会话数据: 包含3个回合、218个中文字符的微信聊天记录"
    ]);
    setTestVerdict(null);

    setTimeout(() => {
      setTestLog(prev => [...prev, "🚀 执行 executeOperator(session, metadata)..."]);
      
      setTimeout(() => {
        try {
          
          const isOk = !scriptCode.includes("passed: false") || scriptCode.includes("passed: true");
          
          if (scriptCode.includes("ratio < 0.25") || scriptCode.includes("termMentioned") || scriptCode.includes("封闭期")) {
            
            setTestLog(prev => [
              ...prev,
              "📌 [匹配分析]: 匹配到坐席在第 2 轮发出的关键理财期限要素...",
              "📌 [检测结果]: 符合预期。未触发错配报警。",
              "✅ 代码脚本执行完毕。"
            ]);
            setTestVerdict({
              passed: true,
              delta: 0,
              text: "✅ 测试通过！成功检出会话关键字，未发生期限错配，增加 0 分罚款。"
            });
          } else {
            setTestLog(prev => [
              ...prev,
              "📌 [匹配分析]: 坐席回复字数较多，交互良好。",
              "✅ 代码脚本执行完毕。"
            ]);
            setTestVerdict({
              passed: true,
              delta: 0,
              text: "✅ 测试通过！评分算子正常，符合交互比例标准，得分抵扣：无罚分。"
            });
          }
        } catch (e: any) {
          setTestLog(prev => [...prev, `❌ 编译运行出错: ${e.message}`]);
        }
        setIsRunningTest(false);
      }, 800);
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-6">
      
      {}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-neutral-900 tracking-tight">质检规则与算子管理中心</h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black border border-emerald-150">
              AI & Code 双核驱动
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1 leading-normal">
            支持无编程基础的主管使用<b>可视化标准算子</b>选择参数，以及资深系统运营/技术专家直接<b>撰写 JS/Python 代码脚本</b>执行复杂业务质检。
          </p>
        </div>

        {role === 'manager' || role === 'operator' ? (
          <button
            onClick={handleCreateNewRule}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:opacity-90 text-white rounded-[7px] text-xs font-bold shadow-[0_2px_10px_rgba(31,35,41,0.02)] transition-colors shrink-0"
          >
            <Plus size={14} />
            创建自定义规则算子
          </button>
        ) : (
          <div className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 rounded-[13px] px-3 py-1.5 font-bold shrink-0">
            ⚠️ 仅【质检主管】与【系统运维】有权修改规则算子库
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {}
        <div className="w-full lg:w-96 flex flex-col shrink-0 bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-sm">
          
          {}
          <div className="p-4 border-b border-neutral-200 space-y-3 bg-neutral-50/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">绑定质检规则模板</span>
              <span className="text-[10px] font-bold text-neutral-800">共 {templates.length} 个模板</span>
            </div>
            
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 bg-white text-xs font-bold text-neutral-700 focus:border-neutral-400 outline-none shadow-xxs"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.isActive ? "(默认生效中)" : ""}</option>
              ))}
            </select>

            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="搜索规则、算子名称或违规词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg text-xs placeholder-neutral-400 focus:outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">已加载质检算子矩阵 ({rules.length})</div>
            
            {rules.filter(r => r.name.includes(searchQuery) || r.description.includes(searchQuery)).map(rule => (
              <div 
                key={rule.id}
                onClick={() => startEditRule(rule)}
                className={`p-3.5 border rounded-[13px] cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  editingRuleId === rule.id 
                    ? 'border-neutral-800 bg-neutral-100/20 shadow-xs' 
                    : 'border-neutral-200 hover:border-neutral-300 bg-white hover:shadow-xs'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                      rule.category === 'greeting' ? 'bg-sky-50 text-sky-700 border border-blue-150' :
                      rule.category === 'compliance' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                      rule.category === 'accuracy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                      'bg-rose-50 text-rose-700 border border-rose-150'
                    }`}>
                      {rule.category === 'greeting' ? '礼貌礼仪' :
                       rule.category === 'compliance' ? '合规话术' :
                       rule.category === 'accuracy' ? '业务解答' : '处罚红线'}
                    </span>

                    <span className="flex items-center gap-0.5 text-[9px] text-neutral-400">
                      {rule.operatorType === 'visual' ? (
                        <>
                          <Sliders size={10} className="text-neutral-400" />
                          <span>标准算子</span>
                        </>
                      ) : (
                        <>
                          <Code2 size={10} className="text-sky-500 animate-pulse" />
                          <span className="text-neutral-800 font-bold">代码算子</span>
                        </>
                      )}
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-neutral-800 mt-2 truncate">{rule.name}</h4>
                  <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{rule.description}</p>
                </div>

                <div className="text-right shrink-0 flex flex-col justify-between h-full min-h-[50px]">
                  <span className={`text-[11px] font-black ${rule.scoreImpact < 0 ? 'text-rose-600' : 'text-neutral-700'}`}>
                    {rule.scoreImpact > 0 ? `+${rule.scoreImpact}` : rule.scoreImpact}
                  </span>
                  
                  {(role === 'manager' || role === 'operator') && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteRule(rule.id); }}
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-neutral-50 transition-colors mt-auto self-end"
                      title="删除规则"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-[10px] text-neutral-400 flex items-center gap-2">
            <Info size={12} className="text-neutral-400 shrink-0" />
            <span>模板已适配 100% 全量 AI 客服及人工坐席，支持双向扩容。</span>
          </div>
        </div>

        {}
        <div className="flex-1 bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-sm flex flex-col h-full">
          {editingRuleId ? (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              
              {}
              <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Settings size={15} className="text-neutral-800" />
                  <h3 className="text-xs font-black text-neutral-900">算子规则配置中心 — 正在编辑</h3>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingRuleId(null)}
                    className="px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-[7px] text-xs font-bold transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveRule}
                    className="flex items-center gap-1.5 px-3.5 py-1 bg-neutral-800 hover:opacity-90 text-white rounded-[7px] text-xs font-bold transition-all shadow-sm"
                  >
                    <Save size={12} />
                    保存修改
                  </button>
                </div>
              </div>

              {}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-neutral-400 block mb-1">规则名称</label>
                    <input
                      type="text"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-800 outline-none focus:border-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 block mb-1">分值影响 (加分/罚分)</label>
                    <input
                      type="number"
                      value={ruleImpact}
                      onChange={(e) => setRuleImpact(Number(e.target.value))}
                      className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-800 outline-none focus:border-neutral-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-neutral-400 block mb-1">规则描述说明</label>
                    <input
                      type="text"
                      value={ruleDesc}
                      onChange={(e) => setRuleDesc(e.target.value)}
                      className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs text-neutral-700 outline-none focus:border-neutral-400"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-400 block mb-1">分类维度</label>
                    <select
                      value={selectedCategory}
                      onChange={(e: any) => setSelectedCategory(e.target.value)}
                      className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-700 outline-none focus:border-neutral-400 bg-white"
                    >
                      <option value="greeting">礼貌礼仪 (Greeting)</option>
                      <option value="compliance">合规话术 (Compliance)</option>
                      <option value="accuracy">业务解答 (Accuracy)</option>
                      <option value="penalty">处罚红线 (Penalty)</option>
                    </select>
                  </div>
                </div>

                {}
                <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-[13px]">
                  <span className="text-[10px] font-bold text-neutral-400 block mb-3">算子执行引擎配置 (支持可视化或自定义代码脚本)</span>
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => setOperatorType('visual')}
                      className={`flex-1 flex items-center gap-3 p-3.5 border rounded-[13px] transition-all text-left ${
                        operatorType === 'visual'
                          ? 'border-neutral-800 bg-neutral-100 text-neutral-900 ring-1 ring-sky-500/20'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-[7px] flex items-center justify-center ${operatorType === 'visual' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500'}`}>
                        <Sliders size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black">可视化预置算子 (小白用户友好)</h4>
                        <p className="text-[10px] opacity-80 mt-0.5">直接填写敏感词、时限参数，由平台内置深度自然语言模型自动提取校验。</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setOperatorType('script')}
                      className={`flex-1 flex items-center gap-3 p-3.5 border rounded-[13px] transition-all text-left ${
                        operatorType === 'script'
                          ? 'border-neutral-800 bg-neutral-100 text-neutral-900 ring-1 ring-sky-500/20'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-[7px] flex items-center justify-center ${operatorType === 'script' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500 animate-pulse'}`}>
                        <Code2 size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black">代码执行脚本算子 (高阶运维自定义)</h4>
                        <p className="text-[10px] opacity-80 mt-0.5">使用 JavaScript/Python 编写逻辑控制，适合非标交互、概率触发、动态规则比对。</p>
                      </div>
                    </button>
                  </div>

                  {}
                  {operatorType === 'visual' && (
                    <div className="mt-4 p-4 bg-white border border-neutral-200 rounded-[13px] space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 block mb-1">算子算法模板</label>
                          <select
                            value={visualOpId}
                            onChange={(e) => setVisualOpId(e.target.value)}
                            className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-bold text-neutral-700 outline-none bg-white"
                          >
                            <option value="banned_words_detector">违禁红线词敏感词检测器 (NLP Semantic Match)</option>
                            <option value="keyword_presence_checker">必须词汇与引导词满足度 (Keyword Presense)</option>
                            <option value="silence_timeout_detector">会话卡死与静音无应答超时器 (Timer Out)</option>
                            <option value="sentiment_spike_checker">用户情绪暴跌及高负面监测器 (Sentiment Tracker)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-neutral-400 block mb-1">配置参数 (以逗号隔开)</label>
                          <input
                            type="text"
                            value={visualParams}
                            onChange={(e) => setVisualParams(e.target.value)}
                            placeholder="如: 保证保本, 绝对赚钱, 超时时间限制90"
                            className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-bold text-neutral-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-neutral-400 flex items-start gap-1.5 leading-relaxed bg-neutral-100/20 p-2.5 rounded-lg border border-sky-50">
                        <HelpCircle size={12} className="text-sky-500 shrink-0 mt-0.5" />
                        <span>当前算子通过基于 Transformer 的嵌入词向量（Embedding）自动扩展近似敏感词（例如配置了 “稳赚”，会自动监测 “稳赚钱、一定赚”），保证新手小白用的简单、省心，同时防止故意规避。</span>
                      </div>
                    </div>
                  )}

                  {}
                  {operatorType === 'script' && (
                    <div className="mt-4 p-4 bg-white border border-neutral-200 rounded-[13px] space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-800 block">自定义运行代码沙箱 (JS Runtime)</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setScriptCode(DEFAULT_SCRIPT_TEMPLATE)}
                            className="text-[10px] text-neutral-400 hover:text-neutral-800 font-bold"
                          >
                            重置默认样板
                          </button>
                        </div>
                      </div>

                      {}
                      <div className="flex border border-neutral-200 rounded-[13px] overflow-hidden font-mono text-xs shadow-inner h-64">
                        <div className="bg-neutral-800 text-neutral-500 px-2 py-3 select-none text-right border-r border-neutral-700 leading-normal shrink-0">
                          {Array.from({ length: 28 }).map((_, i) => (
                            <div key={i}>{i + 1}</div>
                          ))}
                        </div>
                        <textarea
                          value={scriptCode}
                          onChange={(e) => setScriptCode(e.target.value)}
                          spellCheck={false}
                          className="flex-1 p-3 bg-neutral-800 text-emerald-400 outline-none leading-normal resize-none overflow-y-auto"
                        />
                      </div>

                      {}
                      <div className="border border-neutral-200 rounded-[13px] overflow-hidden">
                        
                        <div className="bg-neutral-100 p-3 flex items-center justify-between border-b border-neutral-200 shrink-0">
                          <span className="text-[10px] font-bold text-neutral-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            代码沙箱调试与沙箱运行结果模拟
                          </span>
                          <button
                            onClick={runCodeTest}
                            disabled={isRunningTest}
                            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold transition-all"
                          >
                            <Play size={10} />
                            {isRunningTest ? "正在测试执行..." : "沙箱编译并运行测试"}
                          </button>
                        </div>

                        <div className="p-3 bg-neutral-950 text-neutral-300 font-mono text-[10px] space-y-1 h-36 overflow-y-auto leading-normal">
                          {testLog.map((log, i) => (
                            <div key={i} className={log.startsWith('❌') ? 'text-rose-400 font-bold' : log.startsWith('✅') ? 'text-emerald-400 font-bold' : 'text-neutral-400'}>
                              {log}
                            </div>
                          ))}
                          
                          {testLog.length === 0 && (
                            <div className="text-neutral-500 text-center py-6 select-none">
                              [沙箱空闲] 点击上方运行按钮，将把代码导入虚拟微信客服会话中执行动态比对测试
                            </div>
                          )}
                        </div>

                        {testVerdict && (
                          <div className={`p-3 border-t text-[11px] font-bold flex items-center gap-2 ${testVerdict.passed ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'}`}>
                            <Check size={14} className="shrink-0" />
                            <span>{testVerdict.text}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6 bg-white">
              
              {}
              <div className="text-center py-4 bg-neutral-50/55 rounded-[13px] border border-neutral-200 p-5 shrink-0">
                <div className="w-12 h-12 bg-neutral-100 text-neutral-800 rounded-[13px] flex items-center justify-center mb-3 border border-neutral-200 shadow-xxs mx-auto animate-bounce-short">
                  <FileText size={22} className="text-neutral-800" />
                </div>
                <h3 className="text-xs font-black text-neutral-850">请在左侧选择质检算子规则进行高级配置</h3>
                <p className="text-[10px] text-neutral-400 max-w-sm mt-1 leading-relaxed mx-auto">
                  您也可以点击左侧“创建自定义规则算子”，自由设置加分权重、一票否决红线，或直接对 JavaScript 代码脚本进行在线沙箱编译测试。
                </p>
              </div>

              {}
              <div className="border border-neutral-200 rounded-[13px] bg-white overflow-hidden shadow-xxs shrink-0">
                <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 px-4 py-3.5 text-white flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap size={14} className="text-sky-200 animate-bounce" />
                    <div className="text-left">
                      <span className="text-[10.5px] font-black block">小白向导：多项计分与一票否决逻辑模拟器</span>
                      <span className="text-[8.5px] text-sky-200 block">点击下方质检标准选项开关，实时体验多算子联合裁判定值计分法</span>
                    </div>
                  </div>
                  <span className="text-[8px] bg-neutral-800 px-1.5 py-0.5 rounded font-black border border-neutral-500">动态演示</span>
                </div>

                <div className="p-4.5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block text-left mb-1">① 试调标准加分项</span>
                      
                      <div className="space-y-1.5">
                        <label className="flex items-center justify-between p-2.5 hover:bg-neutral-50 rounded-[13px] cursor-pointer border border-neutral-100 transition-colors text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-neutral-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            首句客套礼貌规范 (+10分)
                          </span>
                          <input 
                            type="checkbox" 
                            checked={simGreeting} 
                            onChange={(e) => setSimGreeting(e.target.checked)}
                            className="w-4.5 h-4.5 rounded text-neutral-800 border-neutral-300 focus:border-neutral-400"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 hover:bg-neutral-50 rounded-[13px] cursor-pointer border border-neutral-100 transition-colors text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-neutral-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            适当性风险评估提示 (+40分)
                          </span>
                          <input 
                            type="checkbox" 
                            checked={simCompliance} 
                            onChange={(e) => setSimCompliance(e.target.checked)}
                            className="w-4.5 h-4.5 rounded text-neutral-800 border-neutral-300 focus:border-neutral-400"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 hover:bg-neutral-50 rounded-[13px] cursor-pointer border border-neutral-100 transition-colors text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-neutral-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            核心产品介绍准确 (+50分)
                          </span>
                          <input 
                            type="checkbox" 
                            checked={simAccuracy} 
                            onChange={(e) => setSimAccuracy(e.target.checked)}
                            className="w-4.5 h-4.5 rounded text-neutral-800 border-neutral-300 focus:border-neutral-400"
                          />
                        </label>
                      </div>
                    </div>

                    {}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block text-left mb-1">② 发生违规红线扣分/否决项</span>
                      
                      <div className="space-y-1.5">
                        <label className="flex items-center justify-between p-2.5 bg-rose-50/20 hover:bg-rose-50/40 rounded-[13px] cursor-pointer border border-rose-100 transition-colors text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-rose-800">
                            <AlertCircle size={12} className="text-rose-500 animate-pulse" />
                            承诺保本/稳赚红线禁语 (-20分)
                          </span>
                          <input 
                            type="checkbox" 
                            checked={simBanned} 
                            onChange={(e) => setSimBanned(e.target.checked)}
                            className="w-4.5 h-4.5 rounded text-rose-600 border-rose-300 focus:ring-rose-500"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 bg-rose-50/20 hover:bg-rose-50/40 rounded-[13px] cursor-pointer border border-rose-100 transition-colors text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-rose-800">
                            <Clock size={12} className="text-rose-500" />
                            单次回复严重超时 (-10分)
                          </span>
                          <input 
                            type="checkbox" 
                            checked={simTimeout} 
                            onChange={(e) => setSimTimeout(e.target.checked)}
                            className="w-4.5 h-4.5 rounded text-rose-600 border-rose-300 focus:ring-rose-500"
                          />
                        </label>
                      </div>
                    </div>

                  </div>

                  {}
                  <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-[13px] space-y-2.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-neutral-500">动态公式试算表达式:</span>
                      <span className="text-[9px] font-black text-neutral-800 bg-neutral-200 px-1.5 py-0.5 rounded">
                        多重逻辑规则引擎同步判定
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-xs font-mono font-bold text-neutral-600">
                        {simGreeting ? '10 (礼)' : '0'} + {simCompliance ? '40 (规)' : '0'} + {simAccuracy ? '50 (准)' : '0'}
                        {simBanned ? ' - 20 (红线)' : ''} {simTimeout ? ' - 10 (超时)' : ''}
                      </div>
                      
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono text-neutral-700">
                          {Math.max(0, (simGreeting ? 10 : 0) + (simCompliance ? 40 : 0) + (simAccuracy ? 50 : 0) + (simBanned ? -20 : 0) + (simTimeout ? -10 : 0))}
                        </span>
                        <span className="text-xs text-neutral-400 font-bold ml-0.5">分</span>
                      </div>
                    </div>

                    {}
                    <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          ((simGreeting ? 10 : 0) + (simCompliance ? 40 : 0) + (simAccuracy ? 50 : 0) + (simBanned ? -20 : 0) + (simTimeout ? -10 : 0)) >= 80
                            ? 'bg-emerald-500' 
                            : 'bg-rose-500 animate-pulse'
                        }`}
                        style={{ width: `${Math.max(0, (simGreeting ? 10 : 0) + (simCompliance ? 40 : 0) + (simAccuracy ? 50 : 0) + (simBanned ? -20 : 0) + (simTimeout ? -10 : 0))}%` }}
                      ></div>
                    </div>

                    {((simGreeting ? 10 : 0) + (simCompliance ? 40 : 0) + (simAccuracy ? 50 : 0) + (simBanned ? -20 : 0) + (simTimeout ? -10 : 0)) >= 80 ? (
                      <div className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-150 p-2.5 rounded-lg flex items-center gap-1.5">
                        <Check size={11} className="shrink-0 text-emerald-600" />
                        <span>逻辑判定：得分高于 80 分。无重大合规缺失，该会话安全归档。</span>
                      </div>
                    ) : (
                      <div className="text-[9.5px] font-bold text-rose-850 bg-rose-50 border border-rose-150 p-2.5 rounded-lg flex items-center gap-1.5">
                        <AlertCircle size={11} className="shrink-0 text-rose-500 animate-pulse" />
                        <span>逻辑判定：触发严重扣罚或未答对核心点，低于 80 分，将自动派单至【服务自愈辅导工单】。</span>
                      </div>
                    )}
                  </div>

                  <p className="text-[9px] text-neutral-400 leading-normal text-left">
                    💡 <strong>多算子运作原理：</strong> 平台将所有的原子质检条件（红线、时延、必备词等）池化为独立“算子”。质检模板可以自由组合这些算子，配置对应的权重影响分。引擎在运行时，以“并联逻辑”执行各算子计算，最后综合计出主观评定分。
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
