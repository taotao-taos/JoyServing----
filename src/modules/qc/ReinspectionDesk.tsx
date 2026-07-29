import React, { useState } from 'react';
import { AuditTask, Role } from './types';
import { 
  Scale, MessageSquare, Info, ShieldAlert, Check, X, Clock, User, AlertCircle, HelpCircle, FileText
} from '@/lib/icons';

interface ReinspectionDeskProps {
  role: Role;
  auditTasks: AuditTask[];
  setAuditTasks: React.Dispatch<React.SetStateAction<AuditTask[]>>;
  handleReinspectAppeal: (id: string, action: 'approve' | 'reject') => void;
}

export const ReinspectionDesk: React.FC<ReinspectionDeskProps> = ({
  role,
  auditTasks,
  setAuditTasks,
  handleReinspectAppeal
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  
  const appealTasks = auditTasks.filter(t => t.status === 'appealing');
  const selectedTask = appealTasks.find(t => t.id === selectedTaskId) || appealTasks[0];

  const handleSelectTask = (task: AuditTask) => {
    setSelectedTaskId(task.id);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4">
      
      {}
      <div className="shrink-0">
        <h2 className="text-base font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
          <Scale size={16} className="text-neutral-800 animate-pulse" />
          复核专家申诉仲裁中心 (Re-inspection Desk)
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          处理坐席针对初检扣分处罚发起的争议申诉。复核裁决是闭环的终审，通过申诉可撤销扣分，驳回申诉则维持原判。
        </p>
      </div>

      {}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {}
        <div className="w-full lg:w-96 shrink-0 bg-white border border-neutral-200 rounded-[13px] overflow-hidden flex flex-col h-full shadow-sm">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 shrink-0">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">争议待决申诉流水 ({appealTasks.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {appealTasks.map(task => (
              <div
                key={task.id}
                onClick={() => handleSelectTask(task)}
                className={`p-3.5 border rounded-[13px] cursor-pointer transition-all flex flex-col gap-2.5 ${
                  selectedTask?.id === task.id
                    ? 'border-neutral-800 bg-neutral-100/20 shadow-xs'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-neutral-800">{task.sessionID}</span>
                  <span className="text-[9px] text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full font-black animate-pulse">
                    坐席申诉中
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-neutral-800">
                    <User size={13} className="text-sky-500" />
                    <span>{task.agentName}</span>
                    <span className="text-[10px] text-neutral-400 font-normal">({task.group})</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1 leading-normal line-clamp-2 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                    <span className="font-bold text-neutral-500">申诉原由:</span> {task.appealReason || "无明确说明"}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-neutral-400 font-bold mt-1">
                  <span>初评打分: <strong className="text-rose-600">{task.aiScore}分</strong></span>
                  <span>提起时间: {task.appealTime || "刚刚"}</span>
                </div>
              </div>
            ))}

            {appealTasks.length === 0 && (
              <div className="text-center py-16">
                <Scale size={40} className="mx-auto text-neutral-200 mb-2" />
                <h3 className="text-xs font-bold text-neutral-800">暂无待仲裁申诉件</h3>
                <p className="text-[10px] text-neutral-400 max-w-xs mx-auto mt-1 leading-normal">
                  所有申诉处理完毕，队列已清空。坐席如果有新的争议申诉，将实时推送至该工作台。
                </p>
              </div>
            )}
          </div>
        </div>

        {}
        <div className="flex-1 bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-sm flex flex-col h-full">
          {selectedTask ? (
            <div className="flex-1 flex flex-col overflow-hidden h-full">
              
              {}
              <div className="p-6 border-b border-neutral-200 bg-neutral-50/20 shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-rose-600 animate-pulse" />
                    申诉比对仲裁工作台 ({selectedTask.sessionID})
                  </h3>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    请仔细核对初检评定与坐席申诉陈述。复核决定将会直接调整数据库历史评分记录，并取消/维持客服处罚单。
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReinspectAppeal(selectedTask.id, 'reject')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-[7px] text-xs font-bold transition-all"
                  >
                    <X size={12} />
                    驳回申诉 (维持原判)
                  </button>
                  <button
                    onClick={() => handleReinspectAppeal(selectedTask.id, 'approve')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[7px] text-xs font-bold transition-all shadow-sm"
                  >
                    <Check size={12} />
                    支持申诉 (免罚除分)
                  </button>
                </div>
              </div>

              {}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {}
                  <div className="border border-neutral-200 rounded-[13px] p-4 bg-rose-50/20">
                    <span className="text-[10px] font-bold text-rose-700 block uppercase tracking-wider mb-2">一审初检判定结果</span>
                    <div className="text-xs space-y-2 text-neutral-700">
                      <div>
                        <span className="text-neutral-400 block">初检所得分值:</span>
                        <strong className="text-lg font-black text-rose-600">{selectedTask.aiScore} 分 (判定不合格)</strong>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">扣分罚分项目:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedTask.scoreBreakdown.bannedPenalty < 0 && (
                            <span className="bg-rose-50 border border-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded text-[9px]">
                              触发红线敏感禁词 (-20)
                            </span>
                          )}
                          {selectedTask.scoreBreakdown.timeoutPenalty < 0 && (
                            <span className="bg-amber-50 border border-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[9px]">
                              客户回复严重超时 (-10)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-2.5 bg-white border border-neutral-200 rounded-[13px] text-[10px] leading-relaxed">
                        <span className="font-black text-neutral-500 block mb-0.5">一审裁定说明:</span>
                        {selectedTask.reviewComment || "AI 初筛触发，尚未有附加说明。"}
                      </div>
                    </div>
                  </div>

                  {}
                  <div className="border border-neutral-200 rounded-[13px] p-4 bg-neutral-100/20">
                    <span className="text-[10px] font-bold text-neutral-700 block uppercase tracking-wider mb-2">坐席申诉辩护陈述</span>
                    <div className="text-xs space-y-2 text-neutral-700">
                      <div>
                        <span className="text-neutral-400 block">申诉发起客服:</span>
                        <strong className="text-xs font-black text-neutral-800 block mt-0.5">{selectedTask.agentName} ({selectedTask.group})</strong>
                      </div>
                      <div>
                        <span className="text-neutral-400 block">提起申诉时间:</span>
                        <span className="text-xs font-semibold text-neutral-600 block mt-0.5">{selectedTask.appealTime || "刚刚"}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-neutral-200 rounded-[13px] text-[10px] leading-relaxed text-neutral-900 font-medium">
                        <span className="font-black text-neutral-800 block mb-0.5">申诉陈述原由:</span>
                        “{selectedTask.appealReason || "无明确说明"}”
                      </div>
                    </div>
                  </div>

                </div>

                {}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">争议会话交互上下文详情</span>
                  <div className="border border-neutral-200 rounded-[13px] overflow-hidden">
                    <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 text-[10px] text-neutral-400 font-bold">
                      微信客服咨询流水会话
                    </div>

                    <div className="p-4 space-y-3 bg-neutral-50/10 text-xs">
                      {selectedTask.transcript.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                          <span className="text-[9px] text-neutral-400 font-bold mb-0.5">
                            {msg.role === 'user' ? '访客' : selectedTask.agentName} · {msg.time}
                          </span>
                          <div className={`p-2.5 rounded-[13px] max-w-[80%] leading-relaxed ${msg.role === 'user' ? 'bg-white text-neutral-800 border border-neutral-200' : 'bg-neutral-100 text-neutral-800'}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-50/50">
              <Scale size={48} className="text-neutral-300 mb-2" />
              <p className="text-xs text-neutral-400">选择左侧列表中的争议件开始专家复核裁决</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
