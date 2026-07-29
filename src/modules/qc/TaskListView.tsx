import React from 'react';
import { Role } from './types';
import { Search, Clock, Bot, User } from '@/lib/icons';

export const TaskListView: React.FC<{ role: Role }> = ({ role }) => {
  const isGlobal = role === 'manager' || role === 'operator';
  const isInspector = role === 'first_inspector' || role === 're_inspector';

  return (
    <div className="bg-white border border-neutral-200 rounded-[13px] shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
      <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="搜索会话 ID..." 
            className="pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs w-64 focus:outline-none focus:border-neutral-400 transition-all text-neutral-800 placeholder-neutral-400 shadow-xxs"
          />
        </div>
        <div className="flex gap-2">
          <select className="text-xs border border-neutral-200 rounded-md bg-white px-2 py-1 text-neutral-700 outline-none shadow-xxs">
            <option>所有状态</option>
            <option>待复核</option>
            <option>已预警</option>
            <option>申诉中</option>
          </select>
          {(isGlobal || isInspector) && (
            <select className="text-xs border border-neutral-200 rounded-md bg-white px-2 py-1 text-neutral-700 outline-none shadow-xxs">
              <option>所有客服</option>
              <option>数字员工组</option>
              <option>人工坐席组</option>
            </select>
          )}
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[10px] uppercase tracking-wider text-neutral-500 font-bold">
              <th className="px-5 py-3 font-semibold">会话 ID / 时间</th>
              {(isGlobal || isInspector) && <th className="px-5 py-3 font-semibold">客服 / 坐席</th>}
              <th className="px-5 py-3 font-semibold">访客情绪</th>
              <th className="px-5 py-3 font-semibold">质检结果</th>
              <th className="px-5 py-3 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="text-xs text-neutral-700 divide-y divide-neutral-100">
            {}
            <tr className="hover:bg-neutral-50/50 transition-colors group cursor-pointer">
              <td className="px-5 py-3 align-top">
                <div className="font-mono font-medium text-neutral-900 group-hover:text-neutral-800 transition-colors">#REQ-89020</div>
                <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                  <Clock size={10} /> 45 分钟前
                </div>
              </td>
              {(isGlobal || isInspector) && (
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                    <User size={14} className="text-sky-500" /> 
                    薛程月 (客服组)
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">转人工: 是</div>
                </td>
              )}
              <td className="px-5 py-3 align-top">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>负面</span>
                </div>
              </td>
              <td className="px-5 py-3 align-top">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  疑似违规 (预警)
                </span>
                <div className="text-[10px] text-neutral-500 mt-1 max-w-xs truncate">
                  回复超时，客户表现出不耐烦。
                </div>
              </td>
              <td className="px-5 py-3 align-top text-right">
                {(isGlobal || isInspector) ? (
                  <button className="text-[11px] font-semibold text-neutral-800 hover:text-neutral-800 transition-colors">
                    开始人工复核
                  </button>
                ) : (
                  <button className="text-[11px] font-semibold text-sky-600 hover:text-blue-800 transition-colors">
                    查看并申诉
                  </button>
                )}
              </td>
            </tr>

            {}
            {(isGlobal || isInspector) && (
              <tr className="hover:bg-neutral-50/50 transition-colors group cursor-pointer">
                <td className="px-5 py-3 align-top">
                  <div className="font-mono font-medium text-neutral-900 group-hover:text-neutral-800 transition-colors">#REQ-89021</div>
                  <div className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                    <Clock size={10} /> 10 分钟前
                  </div>
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                    <Bot size={14} className="text-sky-500" /> 
                    保险员工0629-llm分流
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">转人工: 否</div>
                </td>
                <td className="px-5 py-3 align-top">
                  <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>正面</span>
                  </div>
                </td>
                <td className="px-5 py-3 align-top">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    合格
                  </span>
                  <div className="text-[10px] text-neutral-500 mt-1 max-w-xs truncate">
                    响应迅速，解答准确无误。
                  </div>
                </td>
                <td className="px-5 py-3 align-top text-right">
                  <button className="text-[11px] font-semibold text-neutral-800 hover:text-neutral-800 transition-colors">
                    查看详情
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50/30 flex items-center justify-between text-xs text-neutral-500">
        <div>{(isGlobal || isInspector) ? '显示 1 - 2 条，共 342 条任务' : '显示 1 - 1 条，共 15 条会话记录'}</div>
        <div className="flex items-center gap-1">
          <button className="px-2 py-1 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-50">上一页</button>
          <button className="px-2 py-1 border border-neutral-200 rounded hover:bg-neutral-100">下一页</button>
        </div>
      </div>
    </div>
  );
};
