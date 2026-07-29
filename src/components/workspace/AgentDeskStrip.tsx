/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import type { ChatSession, HiredAgent } from '../../types';
import { agentAvatarForCard } from '@/lib/agentAvatarDisplay';
import { cn } from '@/lib/utils';

interface AgentDeskStripProps {
  agents: HiredAgent[];
  sessions: ChatSession[];
  /** null 表示「全部数字员工」 */
  selectedAgentId?: string | null;
  onSelectAgent?: (agentId: string | null) => void;
}

function DeskAvatar({
  agent,
  index,
  online,
  selected,
}: {
  agent: HiredAgent;
  index: number;
  online: boolean;
  selected: boolean;
}) {
  const render = agentAvatarForCard(agent.avatar, index, agent.avatarCustomized);

  return (
    <div className="relative w-[44px] h-[44px]">
      <div
        className={cn(
          'w-full h-full rounded-[12px] overflow-hidden flex items-center justify-center text-[20px] leading-none select-none border bg-slate-50',
          selected ? 'border-sky-300' : 'border-[rgba(198,210,255,0.6)]',
        )}
      >
        {render.kind === 'image' ? (
          <img src={render.src} alt="" className="w-full h-full object-cover" draggable={false} />
        ) : (
          <span aria-hidden>{render.emoji}</span>
        )}
      </div>
      <span
        className={cn(
          'absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white',
          online ? 'bg-emerald-500' : 'bg-neutral-300',
        )}
      />
    </div>
  );
}

export const AgentDeskStrip: React.FC<AgentDeskStripProps> = ({
  agents,
  sessions,
  selectedAgentId = null,
  onSelectAgent,
}) => {
  const loadByAgent = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (s.status === 'auto' || s.status === 'manual' || s.status === 'queued') {
        map.set(s.assignedAgentId, (map.get(s.assignedAgentId) ?? 0) + 1);
      }
    }
    return map;
  }, [sessions]);

  const onlineCount = agents.filter((a) => a.status === 'online').length;
  const busyCount = agents.filter((a) => (loadByAgent.get(a.id) ?? 0) > 0 && a.status === 'online').length;
  const totalLoad = useMemo(
    () => Array.from(loadByAgent.values()).reduce((sum, n) => sum + n, 0),
    [loadByAgent],
  );
  const allSelected = selectedAgentId == null;

  if (!agents.length) return null;

  return (
    <div className="shrink-0 border-b border-neutral-200 bg-neutral-100/25 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-semibold text-neutral-800">接线席概览</span>
        <span className="text-[9px] text-neutral-500 tabular-nums">
          {onlineCount} 在线 · {busyCount} 接线中
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => onSelectAgent?.(null)}
          className={cn(
            'shrink-0 flex flex-col items-center w-[68px] rounded-lg border px-1 py-1 transition-colors cursor-pointer',
            allSelected
              ? 'border-sky-300 bg-sky-50/60'
              : 'border-neutral-200/70 bg-white/80 hover:border-neutral-200',
          )}
          title={`全部数字员工 · 共 ${agents.length} 位${totalLoad > 0 ? ` · 接待 ${totalLoad} 通` : ''}`}
        >
          <div
            className={cn(
              'w-[44px] h-[44px] rounded-[12px] border border-dashed flex items-center justify-center text-[18px] leading-none select-none',
              allSelected ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-neutral-200 bg-neutral-100/40 text-neutral-500',
            )}
          >
            👥
          </div>
          <span className="text-[8px] font-medium text-neutral-800 truncate w-full text-center leading-tight mt-0.5">
            全部
          </span>
          <span
            className={cn(
              'text-[7px] mt-0.5 px-1 rounded-full leading-none py-0.5',
              totalLoad > 0
                ? 'bg-sky-100 text-sky-700'
                : 'bg-emerald-50 text-emerald-700',
            )}
          >
            {totalLoad > 0 ? `接线 ${totalLoad}` : `${agents.length} 位`}
          </span>
        </button>

        {agents.map((agent, index) => {
          const online = agent.status === 'online';
          const load = loadByAgent.get(agent.id) ?? 0;
          const busy = online && load > 0;
          const selected = agent.id === selectedAgentId;

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent?.(agent.id)}
              className={cn(
                'shrink-0 flex flex-col items-center w-[68px] rounded-lg border px-1 py-1 transition-colors cursor-pointer',
                selected
                  ? 'border-sky-300 bg-sky-50/60'
                  : 'border-neutral-200/70 bg-white/80 hover:border-neutral-200',
              )}
              title={`${agent.name}${busy ? ` · 接待 ${load} 通` : online ? ' · 待命' : ' · 未上线'}`}
            >
              <DeskAvatar agent={agent} index={index} online={online} selected={selected} />
              <span className="text-[8px] font-medium text-neutral-800 truncate w-full text-center leading-tight mt-0.5">
                {agent.name.length > 6 ? `${agent.name.slice(0, 5)}…` : agent.name}
              </span>
              <span
                className={cn(
                  'text-[7px] mt-0.5 px-1 rounded-full leading-none py-0.5',
                  busy
                    ? 'bg-sky-100 text-sky-700'
                    : online
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-neutral-100 text-neutral-500',
                )}
              >
                {busy ? `接线 ${load}` : online ? '待命' : '休息'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
