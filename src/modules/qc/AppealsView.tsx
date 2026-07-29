import React from 'react';
import { Role } from './types';
import { Scale, CheckCircle2, Clock } from '@/lib/icons';

export const AppealsView: React.FC<{ role: Role }> = ({ role }) => {
  const isGlobal = role === 'manager' || role === 'operator' || role === 're_inspector';

  return (
    <div className="bg-white border border-neutral-200 rounded-[13px] shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
      <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
        <div>
          <h3 className="text-[13px] font-bold text-neutral-900 flex items-center gap-2">
            <Scale size={16} className="text-neutral-800" />
            申诉中心
          </h3>
          <p className="text-[10px] text-neutral-500 mt-1 font-medium">处理客服提交的质检扣分申诉。</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <Scale size={48} className="text-neutral-200 mb-4" />
        <h3 className="text-sm font-bold text-neutral-800 mb-1">暂无待处理申诉</h3>
        <p className="text-xs text-neutral-500 max-w-sm">
          {isGlobal 
            ? '当前没有客服提交新的质检申诉。所有历史申诉已处理完毕。' 
            : '您当前没有任何待处理的申诉记录。如果对扣分有异议，可在会话详情中发起申诉。'}
        </p>
        {!isGlobal && (
          <button className="mt-6 px-4 py-2 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors shadow-xxs bg-white">
            查看历史申诉
          </button>
        )}
      </div>
    </div>
  );
};
