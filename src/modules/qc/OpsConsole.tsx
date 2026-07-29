import React, { useState } from 'react';
import { Role } from './types';
import { 
  Cpu, Server, Loader2, Activity, Terminal, ShieldCheck, AlertCircle, TrendingUp, Info
} from '@/lib/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OpsConsoleProps {
  role: Role;
}

export const OpsConsole: React.FC<OpsConsoleProps> = ({ role }) => {
  const [logs, setLogs] = useState<string[]>([
    "🔄 [09:00:00] 系统启动: 质检调度总控服务初始化完成，双核(NLP + Custom JS)规则解析器挂载就绪。",
    "✔ [09:00:05] 数据流适配层: 握手成功并激活企微/飞书数据同步连接通道(WebSocket)。",
    "✔ [09:15:30] 自动调度器: 自动触发 Q3 理财专项抽检批次, 当前批次已同步处理会话124单...",
    "ℹ [09:30:10] 沙箱引擎: 执行理财期限错配自定义脚本检测, 编译耗时 12ms, 结果安全输出。",
    "⚠️ [09:45:15] 告警推送: 检测到会话 #REQ-89020 触发严重保本承诺禁用红线语, 自动派单发至初检专员，并触发推送钉钉运维机器人。",
    "✔ [10:00:00] 定时同步: 执行 W25 语音呼叫SIP话单拉取, 解析音频文件12条，同步状态正常。"
  ]);

  const [activeTab, setActiveTab] = useState<'metrics' | 'terminals'>('metrics');

  const tokenUsageData = [
    { hour: '08:00', tokens: 12000, latency: 120 },
    { hour: '09:00', tokens: 45000, latency: 135 },
    { hour: '10:00', tokens: 68000, latency: 140 },
    { hour: '11:00', tokens: 89000, latency: 128 },
    { hour: '12:00', tokens: 54000, latency: 115 },
    { hour: '13:00', tokens: 32000, latency: 110 }
  ];

  const handleRefreshSystem = () => {
    setLogs(prev => [
      ...prev,
      `🔄 [${new Date().toLocaleTimeString()}] 主动发送运维重组指令: 正在清除 LLM 算子本地编译缓存, 系统重载完成。`
    ]);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-6">
      
      {}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            <Cpu size={16} className="text-neutral-800 animate-pulse" />
            系统运维大厅及 AI 性能监控台 (System Operations Center)
          </h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            监控分布式数据同步延迟、API网关握手状况、沙箱脚本编译消耗及智能质检 LLM 算子 Token 消费图谱。
          </p>
        </div>

        {(role === 'manager' || role === 'operator') && (
          <button
            onClick={handleRefreshSystem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-800 text-white rounded-[7px] text-xs font-bold transition-all shadow-[0_2px_10px_rgba(31,35,41,0.02)]"
          >
            <Loader2 size={12} />
            重载系统适配层
          </button>
        )}
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm">
          <span className="text-[10px] text-neutral-400 font-bold block uppercase">适配层连接可用率</span>
          <div className="text-xl font-black text-neutral-800 mt-1 tracking-tight">99.98%</div>
          <span className="text-[9.5px] text-emerald-600 font-bold mt-1.5 block">✔ 企微、飞书、钉钉三网管道全部在线</span>
        </div>

        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm">
          <span className="text-[10px] text-neutral-400 font-bold block uppercase">智能算子平均解析时延</span>
          <div className="text-xl font-black text-neutral-800 mt-1 tracking-tight">128ms</div>
          <span className="text-[9.5px] text-neutral-500 font-semibold mt-1.5 block">含 Custom Code 脚本在沙箱中的编译响应</span>
        </div>

        <div className="bg-white p-4 rounded-[13px] border border-neutral-200 shadow-sm">
          <span className="text-[10px] text-neutral-400 font-bold block uppercase">今日消耗 Token 总量</span>
          <div className="text-xl font-black text-neutral-800 mt-1 tracking-tight">358,400</div>
          <span className="text-[9.5px] text-neutral-500 font-semibold mt-1.5 block">Gemini 1.5 Flash 自动全检初筛用量</span>
        </div>
      </div>

      {}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {}
        <div className="flex-1 bg-white border border-neutral-200 rounded-[13px] p-5 shadow-sm flex flex-col h-full min-h-[250px]">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">今日智能质检 NLP 算子开销与延迟</span>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`text-[9.5px] px-2.5 py-1 rounded-full font-bold transition-all ${activeTab === 'metrics' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500'}`}
              >
                时序分析
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tokenUsageData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={10} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="tokens" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {}
        <div className="w-full lg:w-110 bg-white border border-neutral-200 rounded-[13px] overflow-hidden shadow-sm flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">运维分布式监听日志流 (Terminal Out)</span>
            <span className="text-[9.5px] font-mono text-neutral-800 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full font-black animate-pulse">
              LIVE BROADCAST
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-neutral-950 font-mono text-[10.5px] text-neutral-300 space-y-3 leading-relaxed">
            {logs.map((log, i) => (
              <div 
                key={i} 
                className={`border-b border-neutral-900 pb-2 ${
                  log.startsWith('⚠️') ? 'text-rose-400 font-bold' : 
                  log.startsWith('✔') ? 'text-emerald-400' : 'text-neutral-400'
                }`}
              >
                {log}
              </div>
            ))}
          </div>

          <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-[10px] text-neutral-400 flex items-start gap-1.5 leading-relaxed shrink-0">
            <Info size={12} className="text-sky-500 mt-0.5 shrink-0" />
            <span>日志服务与分布式链路（Jaeger / Zipkin）完成打通，全渠道 API 请求生命周期均可追踪。</span>
          </div>
        </div>

      </div>

    </div>
  );
};
