import React, { useState } from 'react';
import { QualityCampaign, DataSource, QualityTemplate, Role } from './types';
import { qcNotify } from './qcNotify';
import {
  Layers, Plus, Play, Pause, Search, Calendar, Sliders, CheckSquare, Sparkles, TrendingUp, HelpCircle, Check, ArrowRight, Activity, Eye
} from '@/lib/icons';

interface CampaignsViewProps {
  role: Role;
  campaigns: QualityCampaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<QualityCampaign[]>>;
  dataSources: DataSource[];
  templates: QualityTemplate[];
  showAddCampaignModal: boolean;
  setShowAddCampaignModal: (show: boolean) => void;
  newCampaign: any;
  setNewCampaign: any;
  handleAddCampaign: () => void;
  toggleCampaignStatus: (id: string) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  role,
  campaigns,
  setCampaigns,
  dataSources,
  templates,
  showAddCampaignModal,
  setShowAddCampaignModal,
  newCampaign,
  setNewCampaign,
  handleAddCampaign,
  toggleCampaignStatus
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'paused' | 'completed'>('all');

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.scope.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && c.status === statusFilter;
  });

  const getSourceFriendlyName = (id: string) => {
    return dataSources.find(s => s.id === id)?.name || "企业微信数据流";
  };

  const getTemplateFriendlyName = (id: string) => {
    return templates.find(t => t.id === id)?.name || "高端理财合规规则";
  };

  const handleManualTriggerBatch = (id: string) => {
    qcNotify(`🚀 批次一键重跑指令发送成功！\n系统将拉取该任务在当前范围下的增量数据重新注入 AI 初筛沙箱，并通知初检专员处理。`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-6">
      
      {}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-base font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <Layers size={16} className="text-neutral-800 animate-pulse" />
            抽检计划与质检任务调度站 (N Audit Campaigns)
          </h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            通过建立抽检任务来制定质检批次。您可以关联任意接入的数据源，绑定质检规则库，配置抽样率，系统便会流式运行，将不合格件推送至协同审核大厅。
          </p>
        </div>

        {(role === 'manager' || role === 'operator') && (
          <button
            onClick={() => setShowAddCampaignModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:opacity-90 text-white rounded-[7px] text-xs font-bold shadow-[0_2px_10px_rgba(31,35,41,0.02)] transition-colors"
          >
            <Plus size={14} />
            创建全新抽检批次
          </button>
        )}
      </div>

      {}
      <div className="bg-white p-4 border border-neutral-200 rounded-[13px] shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
        <div className="relative w-full sm:w-80">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="搜索批次任务名称、覆盖组..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-neutral-200 rounded-[7px] text-xs placeholder-neutral-400 focus:outline-none focus:border-neutral-400 bg-white"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'running', 'paused', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all ${
                statusFilter === tab 
                  ? 'bg-neutral-800 text-white' 
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {tab === 'all' ? '全部批次' : 
               tab === 'running' ? '运行中' : 
               tab === 'paused' ? '暂停挂起' : '已归档完成'}
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {filteredCampaigns.map(cmp => (
          <div key={cmp.id} className="bg-white border border-neutral-200 rounded-[13px] p-5 hover:shadow-[0_4px_12px_rgba(31,35,41,0.08)] transition-all space-y-4">
            
            {}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border tracking-wider ${
                    cmp.status === 'running' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' :
                    cmp.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-neutral-50 text-neutral-600 border-neutral-200'
                  }`}>
                    {cmp.status === 'running' ? '运行中 - 流式扫描' : cmp.status === 'paused' ? '暂停扫描' : '已归档结束'}
                  </span>
                  
                  <span className="text-[10px] text-neutral-400 font-mono font-bold">创建时间: {cmp.createdAt}</span>
                </div>

                <h3 className="text-sm font-extrabold text-neutral-900 mt-2 tracking-tight">{cmp.name}</h3>
              </div>

              {}
              {(role === 'manager' || role === 'operator') && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleManualTriggerBatch(cmp.id)}
                    className="p-1.5 border border-neutral-200 rounded-[13px] text-xs text-neutral-600 hover:bg-neutral-50 font-bold transition-all"
                  >
                    增量重跑检测
                  </button>
                  <button
                    onClick={() => toggleCampaignStatus(cmp.id)}
                    className={`p-1.5 rounded-[13px] text-xs font-bold transition-all flex items-center gap-1 border ${
                      cmp.status === 'running'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {cmp.status === 'running' ? <Pause size={12} /> : <Play size={12} />}
                    {cmp.status === 'running' ? '挂起暂停' : '启动流式检测'}
                  </button>
                </div>
              )}
            </div>

            {}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-neutral-50 rounded-[13px] border border-neutral-200">
              <div>
                <span className="text-[9px] text-neutral-400 font-bold block uppercase">关联接入数据源管道</span>
                <span className="text-xs font-bold text-neutral-800 block truncate mt-0.5">{getSourceFriendlyName(cmp.dataSourceId)}</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-400 font-bold block uppercase">评估校验规则模板</span>
                <span className="text-xs font-bold text-neutral-800 block truncate mt-0.5">{getTemplateFriendlyName(cmp.templateId)}</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-400 font-bold block uppercase">抽样抽检设定范围</span>
                <span className="text-xs font-bold text-neutral-800 block truncate mt-0.5">{cmp.scope}</span>
              </div>
            </div>

            {}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
              {}
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-neutral-500">检测处理进度:</span>
                  <span className="text-neutral-800 font-mono">{cmp.inspectedVolume} / {cmp.totalVolume} 会话 ({cmp.progress}%)</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
                  <div 
                    className="h-full bg-neutral-800 rounded-full transition-all duration-500" 
                    style={{ width: `${cmp.progress}%` }}
                  ></div>
                </div>
              </div>

              {}
              <div className="flex gap-4 shrink-0 text-center md:text-right">
                <div className="bg-rose-50/50 border border-rose-100 px-3 py-2 rounded-[7px] text-center min-w-[70px]">
                  <span className="text-[9px] text-rose-500 block font-bold">违规扣分预警</span>
                  <span className="text-xs font-black text-rose-600">{cmp.warningCount} 件</span>
                </div>
                <div className="bg-neutral-100/50 border border-neutral-200 px-3 py-2 rounded-[7px] text-center min-w-[70px]">
                  <span className="text-[9px] text-sky-500 block font-bold">AI 平均得分</span>
                  <span className="text-xs font-black text-neutral-800">{cmp.averageScore} 分</span>
                </div>
              </div>
            </div>

          </div>
        ))}

        {filteredCampaigns.length === 0 && (
          <div className="text-center py-16 bg-white border rounded-[13px]">
            <Layers size={48} className="mx-auto text-neutral-200" />
            <h3 className="text-sm font-bold text-neutral-800 mt-2">暂无匹配的抽检任务批次</h3>
            <p className="text-xs text-neutral-400 mt-1">请重新调整上方筛选状态或点击右上角创建全新质检扫描计划</p>
          </div>
        )}
      </div>

      {}
      {showAddCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-800/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-[13px] border border-neutral-200 shadow-2xl w-full max-w-lg overflow-hidden animate-zoom-in">
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
              <span className="text-xs font-black text-neutral-900">制定全新流式抽检计划批次</span>
              <button onClick={() => setShowAddCampaignModal(false)} className="text-neutral-400 hover:text-neutral-600">
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-neutral-400 block mb-1">抽检计划显示名称</label>
                <input
                  type="text"
                  placeholder="如: Q3季度理财业务专项全量初筛检测流"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-800 focus:border-neutral-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">指定匹配数据管道</label>
                  <select
                    value={newCampaign.dataSourceId}
                    onChange={(e) => setNewCampaign({ ...newCampaign, dataSourceId: e.target.value })}
                    className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-700 bg-white outline-none"
                  >
                    <option value="">-- 请选择关联数据源 --</option>
                    {dataSources.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">指定匹配规则模板</label>
                  <select
                    value={newCampaign.templateId}
                    onChange={(e) => setNewCampaign({ ...newCampaign, templateId: e.target.value })}
                    className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-700 bg-white outline-none"
                  >
                    <option value="">-- 请选择关联规则 --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">抽样分配比例范围</label>
                  <select
                    value={newCampaign.scope}
                    onChange={(e) => setNewCampaign({ ...newCampaign, scope: e.target.value })}
                    className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-700 bg-white outline-none"
                  >
                    <option value="100%全量初筛">100%全量初筛 (AI覆盖)</option>
                    <option value="理财组 10% 随机抽样">理财组 10% 随机抽样</option>
                    <option value="保险业务 20% 定期扫描">保险业务 20% 定期扫描</option>
                    <option value="高危敏感会话 100% 全检">高危敏感会话 100% 全检</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">计划处理单量上限 (Volume Limit)</label>
                  <input
                    type="number"
                    value={newCampaign.totalVolume}
                    onChange={(e) => setNewCampaign({ ...newCampaign, totalVolume: e.target.value })}
                    className="w-full border border-neutral-200 rounded-[13px] px-3 py-2 text-xs font-bold text-neutral-800 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-[13px] text-[10px] text-neutral-700 flex items-start gap-1.5 leading-relaxed">
                <Sparkles size={12} className="shrink-0 mt-0.5" />
                <span>任务发布后，数据管道中最新抓取出的会话将立即触发 AI 规则初检评分算子，极具效率，彻底抛弃原有粗糙的固定采样瓶颈，满足 N 级别高吞吐并发分析。</span>
              </div>
            </div>

            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-2.5">
              <button
                onClick={() => setShowAddCampaignModal(false)}
                className="px-4 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-[7px] text-xs font-bold transition-colors shadow-xxs"
              >
                取消
              </button>
              <button
                onClick={handleAddCampaign}
                className="px-4 py-2 bg-neutral-800 hover:opacity-90 text-white rounded-[7px] text-xs font-bold transition-colors shadow-sm"
              >
                启动扫描任务并分流
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
