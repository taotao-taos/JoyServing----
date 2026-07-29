import React from 'react';
import { Role } from './types';
import { CheckCircle2, MessageSquare, AlertCircle, BarChart2, Download } from '@/lib/icons';

export const DashboardView: React.FC<{ role: Role }> = ({ role }) => {
  const isGlobal = role === 'manager' || role === 'operator';
  
  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">{isGlobal ? '全局数据看板' : '个人数据看板'}</h3>
          <p className="text-[10px] text-neutral-500 mt-1">
            {isGlobal ? '实时监控全渠道客服质检情况与智能质检覆盖率。' : '查看您个人的质检成绩与被抽检任务情况。'}
          </p>
        </div>
        {(role === 'manager' || role === 'operator') && (
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors shadow-xxs bg-white">
            <Download size={14} />
            导出报表
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-shadow">
          <div className="flex items-center gap-2 text-neutral-600 mb-4">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-xs font-medium uppercase tracking-wider">{isGlobal ? '全局质检合格率' : '我的质检合格率'}</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-neutral-900 tracking-tight">{isGlobal ? '98.5' : '99.2'}<span className="text-lg text-neutral-500 ml-1">%</span></div>
            <div className="text-[10px] text-emerald-600 font-medium flex items-center mt-1">
              <span className="bg-emerald-50 px-1 py-0.5 rounded text-emerald-600">{isGlobal ? '+0.2%' : '+0.5%'}</span> 较上周
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-shadow">
          <div className="flex items-center gap-2 text-neutral-600 mb-4">
            <MessageSquare size={16} className="text-sky-500" />
            <span className="text-xs font-medium uppercase tracking-wider">{isGlobal ? '总会话/抽检量' : '我的会话总量'}</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-neutral-900 tracking-tight">{isGlobal ? '1,240' : '345'}</div>
            <div className="text-[10px] text-neutral-500 font-medium mt-1">
              {isGlobal ? '占总会话量 15% (含AI全检)' : '本周接入的访客数量'}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm flex flex-col justify-between hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-shadow">
          <div className="flex items-center gap-2 text-neutral-600 mb-4">
            <AlertCircle size={16} className="text-amber-500" />
            <span className="text-xs font-medium uppercase tracking-wider">{isGlobal ? '全局违规/预警' : '我的问题会话'}</span>
          </div>
          <div>
            <div className="text-3xl font-bold text-neutral-900 tracking-tight">{isGlobal ? '18' : '2'}</div>
            <div className="text-[10px] text-amber-600 font-medium flex items-center mt-1">
              <span className="bg-amber-50 px-1 py-0.5 rounded text-amber-600">{isGlobal ? '-3' : '0'}</span> 较上周
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm flex flex-col justify-between relative overflow-hidden hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-shadow">
          <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-100 rounded-full blur-3xl -mr-16 -mt-16 z-0"></div>
          <div className="relative z-10 flex items-center gap-2 text-neutral-600 mb-4">
            <BarChart2 size={16} className="text-neutral-800" />
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-900">{isGlobal ? 'AI 质检覆盖率' : '我的申诉通过率'}</span>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-bold text-neutral-800 tracking-tight">100<span className="text-lg ml-1">%</span></div>
            <div className="text-[10px] text-neutral-500 font-medium mt-1">
              {isGlobal ? '全量会话已通过 AI 初筛' : '本月共 1 起申诉已通过'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
