/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 客户体验 — 真实客户与数字员工交流的对话页。
 * 对话形态对齐培训页「能力测试」：单栏对话 + 气泡内处理过程。
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Send, X } from '@/lib/icons';
import { defaultOpeningLineForAgent } from '@/lib/agentDefaultCopy';
import { mockAgentChatReply } from '../lib/mockAgentChatReply';
import { buildAgentReplyPlan, planToThoughtSteps } from '../lib/agentReplyPlan';
import type { HiredAgent, ThoughtStep } from '../types';
import { ExecutionProcessFold } from './common/ExecutionProcessFold';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { agentAvatarForEditor } from '@/lib/agentAvatarDisplay';
import { PROFILE_USER } from '@/lib/profileUser';
import { cn } from '@/lib/utils';
import { ContentBusy } from './common/ContentBusy';
import { pickMockLatencyMs } from '@/lib/mockLatency';
import { useMockLatency } from '@/lib/useMockLatency';

type ChatMsg = {
  id: string;
  /** 员工回复关联的用户消息 id，用于挂载处理过程 */
  triggerMsgId?: string;
  sender: 'user' | 'agent';
  text: string;
  time: string;
};

type Execution = {
  runId: string;
  steps: ThoughtStep[];
  status: 'running' | 'done';
};

const CHAT_BUBBLE =
  'px-3 py-2 rounded-lg bg-white border border-neutral-200 text-xs leading-relaxed text-neutral-800';

function createHexId(length = 32): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function ExperienceAgentAvatar({
  agent,
  relayIndex,
}: {
  agent: HiredAgent;
  relayIndex: number;
}) {
  const display = agentAvatarForEditor(agent.avatar, relayIndex, agent.avatarCustomized);

  return (
    <Avatar className="h-8 w-8 shrink-0 overflow-hidden">
      {display.kind === 'image' ? (
        <>
          <AvatarImage src={display.src} alt="" />
          <AvatarFallback className="bg-neutral-100" />
        </>
      ) : (
        <AvatarFallback className="bg-neutral-800 text-white text-sm select-none">
          {display.emoji}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

export const CustomerExperiencePage: React.FC = () => {
  const {
    experienceAgentId,
    setExperienceAgentId,
    hiredAgents,
    setActiveTab,
    knowledgeBases,
    skills,
    showToast,
  } = useApp();

  const agent = hiredAgents.find((a) => a.id === experienceAgentId);
  const relayIndex = useMemo(
    () => Math.max(0, hiredAgents.findIndex((a) => a.id === experienceAgentId)),
    [hiredAgents, experienceAgentId],
  );
  const openingLine =
    agent?.openingLine || (agent ? defaultOpeningLineForAgent(agent.name) : '');

  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [executions, setExecutions] = useState<Record<string, Execution>>({});
  const [spinning, setSpinning] = useState(false);
  const paneBusy = useMockLatency(experienceAgentId, 'workspaceOpen');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (agent && agent.status !== 'online') {
      showToast('未上线员工不可预览，请先准予上岗');
      setExperienceAgentId(null);
      setActiveTab('employees');
    }
  }, [agent?.id, agent?.status, setExperienceAgentId, setActiveTab, showToast]);

  useEffect(() => {
    if (!agent) return;
    setMsgs([]);
    setExecutions({});
    setInput('');
  }, [agent?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, executions, spinning]);

  const handleBack = () => {
    setExperienceAgentId(null);
    setActiveTab('employees');
  };

  const sendMessage = () => {
    if (!agent || !input.trim() || spinning) return;

    const userText = input.trim();
    const msgId = `msg_${Date.now()}`;
    const replyId = `${msgId}_reply`;
    const runId = createHexId();
    const time = new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setMsgs((prev) => [
      ...prev,
      { id: msgId, sender: 'user', text: userText, time },
      { id: replyId, triggerMsgId: msgId, sender: 'agent', text: '', time },
    ]);
    setInput('');
    setSpinning(true);
    setExecutions((prev) => ({
      ...prev,
      [msgId]: { runId, steps: [], status: 'running' },
    }));

    const replyMs = pickMockLatencyMs('aiReply');
    const plan = buildAgentReplyPlan(
      agent,
      userText,
      '访客',
      '客户体验',
      knowledgeBases,
      skills,
    );
    const allSteps = planToThoughtSteps(plan, msgId, time);
    const processSteps = allSteps.filter((s) => s.type !== 'output');
    const agentText = mockAgentChatReply(userText, agent);
    const stepInterval = Math.max(280, Math.floor(replyMs / Math.max(processSteps.length + 1, 2)));
    let accumulated = 0;

    processSteps.forEach((step) => {
      accumulated += stepInterval;
      window.setTimeout(() => {
        setExecutions((prev) => {
          const current = prev[msgId];
          if (!current || current.status === 'done') return prev;
          return {
            ...prev,
            [msgId]: { ...current, steps: [...current.steps, step] },
          };
        });
      }, accumulated);
    });

    window.setTimeout(() => {
      const agentTime = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setExecutions((prev) => ({
        ...prev,
        [msgId]: { runId, steps: allSteps, status: 'done' },
      }));
      setMsgs((prev) =>
        prev.map((m) => (m.id === replyId ? { ...m, text: agentText, time: agentTime } : m)),
      );
      setSpinning(false);
    }, replyMs);
  };

  if (!agent) {
    return (
      <div className="h-full flex items-center justify-center bg-white text-neutral-500 text-xs/relaxed">
        <Button variant="outline" size="sm" onClick={handleBack}>
          返回我的数字员工
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 bg-paper text-neutral-800">
      <header className="shrink-0 border-b border-neutral-200 bg-white px-4 md:px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="shrink-0 gap-1.5 text-neutral-600">
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">返回</span>
          </Button>

          <div className="h-5 w-px bg-neutral-200 shrink-0" />

          <ExperienceAgentAvatar agent={agent} relayIndex={relayIndex} />

          <div className="flex-1 min-w-0">
            <h1 className="text-[14px] font-semibold text-neutral-900 tracking-tight truncate">
              {agent.name}
            </h1>
            <p className="text-[11px] text-neutral-500 truncate mt-0.5">与数字员工对话</p>
          </div>

          <Button variant="ghost" size="icon-sm" onClick={handleBack} className="shrink-0" title="关闭">
            <X size={16} />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0 bg-paper">
        <ContentBusy busy={paneBusy} size="slot" minHeight={180}>
          {/* 开场白 */}
          <div className="flex gap-2.5 items-start">
            <ExperienceAgentAvatar agent={agent} relayIndex={relayIndex} />
            <div className="space-y-2 max-w-[85%]">
              <div className={cn(CHAT_BUBBLE, 'rounded-tl-sm')}>{openingLine}</div>
            </div>
          </div>

          {msgs.map((m) => {
            const isUser = m.sender === 'user';
            const execution =
              !isUser && m.triggerMsgId ? executions[m.triggerMsgId] : undefined;
            const userQuery = m.triggerMsgId
              ? msgs.find((msg) => msg.id === m.triggerMsgId)?.text
              : undefined;
            const hasReplyText = Boolean(m.text.trim());

            return (
              <div
                key={m.id}
                className={cn(
                  'flex gap-2.5 items-start py-0.5',
                  isUser ? 'justify-end' : 'justify-start',
                )}
              >
                {!isUser && (
                  <ExperienceAgentAvatar agent={agent} relayIndex={relayIndex} />
                )}

                <div
                  className={cn(
                    'flex flex-col max-w-[85%] gap-1',
                    isUser ? 'items-end' : 'items-start',
                  )}
                >
                  {execution && (
                    <ExecutionProcessFold
                      steps={execution.steps}
                      status={execution.status}
                      userQuery={userQuery}
                      runId={execution.runId}
                      onCopyRunId={(id) => {
                        void navigator.clipboard.writeText(id).then(
                          () => showToast('runId 已复制'),
                          () => showToast('复制失败'),
                        );
                      }}
                    />
                  )}

                  {hasReplyText && (
                    <div
                      className={cn(
                        CHAT_BUBBLE,
                        isUser ? 'rounded-tr-sm' : 'rounded-tl-sm',
                      )}
                    >
                      {m.text}
                    </div>
                  )}

                  {(hasReplyText || isUser) && (
                    <span className="text-[9px] text-neutral-400 font-mono tracking-wider px-1 font-bold">
                      {m.time}
                    </span>
                  )}
                </div>

                {isUser && (
                  <Avatar className="h-8 w-8 rounded-full overflow-hidden after:hidden shrink-0 ring-2 ring-white shadow-sm">
                    <AvatarFallback className={cn(PROFILE_USER.fallbackClass, 'select-none text-[12px]')}>
                      {PROFILE_USER.initial}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </ContentBusy>
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
        <div className="flex gap-2 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !spinning && input.trim()) sendMessage();
            }}
            disabled={spinning}
            placeholder={`给「${agent.name}」发消息…`}
            className="flex-1 bg-paper border-neutral-200 text-neutral-900 placeholder:text-neutral-400 text-xs h-10 rounded-[7px] focus-visible:ring-neutral-400 focus-visible:border-neutral-500"
          />
          <Button
            size="sm"
            disabled={spinning || !input.trim()}
            onClick={sendMessage}
            className="bg-neutral-800 hover:opacity-90 text-white font-bold h-10 px-3 rounded-[7px] flex items-center justify-center transition cursor-pointer shrink-0 active:scale-95 shadow-sm"
          >
            <Send size={13} className="text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
};
