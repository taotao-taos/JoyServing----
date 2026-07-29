import React, { useState } from 'react';
import { AuditTask, Role } from './types';
import { 
  Award, TrendingUp, AlertTriangle, Scale, Plus, Search, Calendar, ChevronRight, CheckCircle, Info, Send
} from '@/lib/icons';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { qcNotify } from './qcNotify';

interface CsrDashboardProps {
  role: Role;
  auditTasks: AuditTask[];
  setAuditTasks: React.Dispatch<React.SetStateAction<AuditTask[]>>;
}

export const CsrDashboard: React.FC<CsrDashboardProps> = ({
  role,
  auditTasks,
  setAuditTasks
}) => {
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealTaskId, setAppealTaskId] = useState("");
  const [appealReason, setAppealReason] = useState("");

  //       -  "薛程月"
  const myTasks = auditTasks.filter(t => t.agentName === '薛程月');
  
  
  const passedCount = myTasks.filter(t => t.aiScore >= 80).length;
  const avgScore = myTasks.length > 0 ? Math.round(myTasks.reduce((sum, t) => sum + t.aiScore, 0) / myTasks.length) : 95;
  const penalisedCount = myTasks.filter(t => t.scoreBreakdown.bannedPenalty < 0 || t.scoreBreakdown.timeoutPenalty < 0).length;

  
  const scoreTrendData = [
    { week: 'W21', score: 92, target: 90 },
    { week: 'W22', score: 94, target: 90 },
    { week: 'W23', score: 91, target: 90 },
    { week: 'W24', score: 85, target: 90 },
    { week: 'W25', score: avgScore, target: 90 }
  ];

  const handleOpenAppeal = (task: AuditTask) => {
    setAppealTaskId(task.id);
    setAppealReason("");
    setShowAppealModal(true);
  };

  const handleSubmitAppeal = () => {
    if (!appealReason.trim()) {
      qcNotify("请输入申诉说明理由再行提交！");
      return;
    }

    setAuditTasks(auditTasks.map(t => {
      if (t.id === appealTaskId) {
        return {
          ...t,
          status: 'appealing',
          appealReason: appealReason,
          appealTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
      }
      return t;
    }));

    qcNotify("申诉件提交成功！\n争议已推送至【复核专家申诉仲裁中心】队列，处理完毕后您将收到即时提醒。");
    setShowAppealModal(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-6">
      
      {}
      <div className="shrink-0">
        <h2 className="text-base font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
          <Award size={16} className="text-neutral-800" />
          坐席个人效能与争议申诉台 (CSR Personal Portal)
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          客服专员自助工作台。实时掌握个人的抽检质检得分健康度，分析具体丢分话术原因，并提供争议会话快速申诉入口。
        </p>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        
        {}
        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-shadow">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">我的平均质检得分</div>
          <div className="text-2xl font-black text-neutral-800 mt-1 tracking-tight">
            {avgScore} <span className="text-xs text-neutral-400 font-normal">分</span>
          </div>
          <span className="text-[9.5px] text-emerald-600 font-bold mt-1.5 block bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 inline-block">
            优于服务底线 W90 分
          </span>
        </div>

        {}
        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-shadow">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">被抽检审查会话量</div>
          <div className="text-2xl font-black text-neutral-800 mt-1 tracking-tight">
            {myTasks.length} <span className="text-xs text-neutral-400 font-normal">件</span>
          </div>
          <span className="text-[9.5px] text-neutral-500 font-semibold mt-1.5 block">
            含 AI 全量扫描及人工复核
          </span>
        </div>

        {}
        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-shadow">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">异常警告/扣分扣单</div>
          <div className="text-2xl font-black text-rose-600 mt-1 tracking-tight">
            {penalisedCount} <span className="text-xs text-rose-500 font-normal">单</span>
          </div>
          <span className="text-[9.5px] text-rose-600 font-bold mt-1.5 block bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 inline-block">
            需关注红线敏感用语
          </span>
        </div>

        {}
        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-shadow">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">申诉成功率</div>
          <div className="text-2xl font-black text-neutral-800 mt-1 tracking-tight">
            100 <span className="text-xs text-sky-500 font-normal">%</span>
          </div>
          <span className="text-[9.5px] text-neutral-500 font-semibold mt-1.5 block">
            历史共 1 宗争议申诉撤除
          </span>
        </div>

      </div>

      {}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {}
        <div className="flex-1 bg-white border border-neutral-200 rounded-[13px] p-5 shadow-sm flex flex-col h-full min-h-[250px]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">我的个人周度质检得分趋势分析</span>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full font-black">
              实时计算
            </span>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={scoreTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="csrColorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="week" stroke="#9ca3af" fontSize={10} tickLine={false} />
                <YAxis domain={[60, 100]} stroke="#9ca3af" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#csrColorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {}
        <div className="w-full lg:w-110 bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-sm flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 shrink-0">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">我的受审会话账单及扣分原因 ({myTasks.length})</span>
          </div>

          {}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {myTasks.map(task => {
              const hasPenalty = task.scoreBreakdown.bannedPenalty < 0 || task.scoreBreakdown.timeoutPenalty < 0;
              return (
                <div key={task.id} className="p-3.5 border border-neutral-200 rounded-[13px] bg-white space-y-3 hover:shadow-xxs transition-all">
                  
                  {}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-neutral-800">{task.sessionID}</span>
                    <span className={`text-[10.5px] font-black ${task.aiScore >= 80 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {task.aiScore}分
                    </span>
                  </div>

                  {}
                  <div className="text-xs text-neutral-600">
                    <div className="flex justify-between items-center text-[10px] text-neutral-400 font-semibold mb-1">
                      <span>检查时间: {task.time}</span>
                      <span>客服组: {task.group}</span>
                    </div>
                    {hasPenalty ? (
                      <div className="p-2 bg-rose-50 border border-rose-100 rounded-[13px] space-y-1 mt-2">
                        <span className="text-[9px] font-black text-rose-700 block uppercase">处罚扣分触发原因:</span>
                        <p className="text-[10px] text-rose-600 leading-normal">
                          {task.scoreBreakdown.bannedPenalty < 0 ? "对话第4回合向用户提供了非保本承诺，触发红线禁用词汇，一票否罚款扣 20 分。" : ""}
                          {task.scoreBreakdown.timeoutPenalty < 0 ? "单次回话响应客户间隔超过规定的90秒，扣 10 分罚款。" : ""}
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-[13px] text-emerald-800 text-[10px] mt-2">
                        该会话服务极其标准，未发现任何红线扣分项，判定合格。
                      </div>
                    )}
                  </div>

                  {}
                  {hasPenalty && (
                    <div className="flex items-center justify-between pt-1.5">
                      <span className="text-[9.5px] text-neutral-400">
                        申诉状态: 
                        {task.status === 'appealing' ? (
                          <strong className="text-neutral-800 ml-1">复核专家仲裁中</strong>
                        ) : task.status === 'resolved' ? (
                          <strong className="text-emerald-600 ml-1">仲裁同意撤罚</strong>
                        ) : (
                          <strong className="text-neutral-500 ml-1">待提起</strong>
                        )}
                      </span>

                      {task.status === 'pending' || task.status === 'warning' ? (
                        <button
                          onClick={() => handleOpenAppeal(task)}
                          className="flex items-center gap-1 px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-lg text-[10.5px] font-bold transition-colors"
                        >
                          <Scale size={11} />
                          提起争议申诉
                        </button>
                      ) : (
                        <span className="text-[10px] text-neutral-400 font-bold">申诉不可重复提交</span>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-800/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[13px] border border-neutral-200 shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
              <span className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                <Scale size={14} className="text-neutral-800 animate-pulse" />
                提起质检扣分争议申诉
              </span>
              <button onClick={() => setShowAppealModal(false)} className="text-neutral-400 hover:text-neutral-600">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-neutral-50 rounded-[13px] border border-neutral-200 space-y-1">
                <span className="text-[9px] text-neutral-400 font-bold block uppercase">申诉目标流水件</span>
                <span className="text-xs font-black text-neutral-800 block font-mono">{appealTaskId}</span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 block mb-1">申诉原由说明陈述 (详细客观提供辩护证据)</label>
                <textarea
                  placeholder="请输入您的申诉论据，如: 当时客户情绪极度急躁并用极端言语要挟，我是为了稳定该客户而使用的心理话术说明期限，并未故意向其推介期限错配或固定保本..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="w-full border border-neutral-200 rounded-[13px] p-3 text-xs text-neutral-700 outline-none focus:border-neutral-400 h-32"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-100 rounded-[13px] text-[10px] text-amber-700 flex items-start gap-1.5 leading-relaxed">
                <Info size={12} className="shrink-0 mt-0.5" />
                <span>理性提供申诉：复核专家将会调取该会话完整交互上下文与通话录音比对判定。如果无恶意违规，一经核实将予以抹除不合格处罚。</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-2.5">
              <button
                onClick={() => setShowAppealModal(false)}
                className="px-4 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-[7px] text-xs font-bold transition-colors shadow-xxs"
              >
                取消
              </button>
              <button
                onClick={handleSubmitAppeal}
                className="px-4 py-2 bg-neutral-800 hover:opacity-90 text-white rounded-[7px] text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Send size={12} />
                安全呈交仲裁
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
