/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';
import {
  Plus,
  Search,
  Trash2,
  Send,
  Settings,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Users,
  Headphones,
} from '@/lib/icons';
import { Modal } from './common/Modal';
import { SegmentedTabBar } from './common/SegmentedTabs';
import { BTN_INK, BTN_SOFT, FIELD, LABEL, PAGE, PANEL } from '@/lib/ui';
import { TASK_CENTER_COPY } from '@/lib/platformTerminology';
import { cn } from '@/lib/utils';

type TaskAudience = 'b' | 'c';
type HistoryRange = 'all' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

type TaskHistoryEntry = {
  id: string;
  taskName: string;
  agentName: string;
  executedAt: string;
  status: 'success' | 'failed';
  duration: string;
  audience: TaskAudience;
};

const TASK_HISTORY: TaskHistoryEntry[] = [
  {
    id: 'h_001',
    taskName: '服务小结',
    agentName: '食安险商户顾问',
    executedAt: '2026-06-08 20:00:48',
    status: 'success',
    duration: '-',
    audience: 'b',
  },
  {
    id: 'h_002',
    taskName: '日终意向线索自动同步到销售大盘',
    agentName: '销售顾问',
    executedAt: '2026-06-10 22:00:15',
    status: 'success',
    duration: '18s',
    audience: 'b',
  },
  {
    id: 'h_003',
    taskName: '沉睡30天VIP会员专属运营企微自动发送',
    agentName: '企微小助手',
    executedAt: '2026-06-11 02:40:11',
    status: 'failed',
    duration: '42s',
    audience: 'c',
  },
];

const HISTORY_FILTERS: { key: HistoryRange; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'thisWeek', label: '本周' },
  { key: 'lastWeek', label: '上周' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
];

function taskAudience(task: Task): TaskAudience {
  return task.audience ?? 'b';
}

function typeTagLabel(type: string) {
  if (type.includes('定时') || type.includes('Cron')) return '定时触发';
  if (type.includes('事件')) return '事件触发';
  return type;
}

function agentTagId(agentId: string) {
  const compact = agentId.replace(/^h_/, '').slice(0, 16);
  return `agent_${compact}`;
}

export const TaskCenterPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { tasks, hiredAgents, createTask, updateTask, deleteTask, showToast } = useApp();

  const [taskTab, setTaskTab] = useState<TaskAudience>('b');
  const [search, setSearch] = useState('');
  const [listExpanded, setListExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [showCommandModal, setShowCommandModal] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [commandAgentId, setCommandAgentId] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('定时任务');
  const [formCron, setFormCron] = useState('0 9 * * * (每天 09:00)');
  const [formCommand, setFormCommand] = useState('');
  const [formAgentId, setFormAgentId] = useState('');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskAudience(t) !== taskTab) return false;
      if (search.trim() && !t.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [tasks, taskTab, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const pagedTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  const filteredHistory = useMemo(() => {
    return TASK_HISTORY.filter((h) => h.audience === taskTab);
  }, [taskTab]);

  const resetForm = () => {
    setFormName('');
    setFormType('定时任务');
    setFormCron('0 9 * * * (每天 09:00)');
    setFormCommand('');
    setFormAgentId('');
  };

  const openCreate = () => {
    resetForm();
    setEditingTask(null);
    setIsCreating(true);
  };

  const openEdit = (task: Task) => {
    setFormName(task.name);
    setFormType(task.type);
    setFormCron(task.cronExpression);
    setFormCommand(task.actionCommand);
    setFormAgentId(task.targetAgentId);
    setEditingTask(task);
    setIsCreating(true);
  };

  const executeInstantDirective = () => {
    if (!commandInput.trim() || !commandAgentId) {
      showToast('请填写指令，并选择执行的数字员工。');
      return;
    }
    const boundName = hiredAgents.find((a) => a.id === commandAgentId)?.name || '数字员工';
    showToast(`已把任务派给【${boundName}】，马上执行：${commandInput}`);
    setCommandInput('');
    setCommandAgentId('');
    setShowCommandModal(false);
  };

  const handleSaveTask = () => {
    if (!formName.trim() || !formAgentId) {
      showToast('请填写任务名称，并选择绑定的数字员工。');
      return;
    }
    if (editingTask) {
      updateTask(editingTask.id, {
        name: formName.trim(),
        type: formType,
        targetAgentId: formAgentId,
        cronExpression: formCron,
        actionCommand: formCommand || '常规分析执行任务',
      });
      showToast('任务已更新。');
    } else {
      createTask(
        formName.trim(),
        formType,
        formAgentId,
        formCron,
        formCommand || '常规分析执行任务',
        taskTab,
      );
      showToast('任务已创建并加入排程。');
    }
    setIsCreating(false);
    setEditingTask(null);
    resetForm();
  };

  const toggleTaskEnabled = (id: string, enabled: boolean) => {
    updateTask(id, { enabled: !enabled });
  };

  const discardTask = (task: Task) => {
    if (confirm(`确定终止任务「${task.name}」吗？终止后将停止执行并收入历史记录。`)) {
      deleteTask(task.id);
      showToast(TASK_CENTER_COPY.discardedToast);
    }
  };

  return (
    <div className={embedded ? 'space-y-4 text-left' : cn(PAGE, 'space-y-4 text-left')}>
      {/* 顶栏：标题 + 筛选/搜索 + 主操作 */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 id="task-center-title" className="text-base font-extrabold text-neutral-900 tracking-tight">
            任务中心
          </h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {TASK_CENTER_COPY.subtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 lg:justify-end">
          <SegmentedTabBar
            value={taskTab}
            onChange={(id) => {
              setTaskTab(id as 'b' | 'c');
              setPage(1);
            }}
            items={[
              {
                id: 'b',
                label: (
                  <>
                    <Users size={13} />
                    商家端任务
                  </>
                ),
              },
              {
                id: 'c',
                label: (
                  <>
                    <Headphones size={13} />
                    顾客端任务
                  </>
                ),
              },
            ]}
          />

          <div className="relative min-w-[160px] flex-1 sm:flex-none sm:w-44">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="搜索任务名称..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 pl-8 pr-3 text-[11px] rounded-lg border border-neutral-200/70 bg-white outline-none focus:border-neutral-400"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCommandModal(true)}
            className="h-8 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition shrink-0"
          >
            <Plus size={13} strokeWidth={2.5} />
            任务指令交互
          </button>
          <button type="button" onClick={openCreate} className={cn(BTN_INK, 'h-8 px-3 shrink-0')}>
            <Plus size={13} strokeWidth={2.5} />
            新建任务
          </button>
        </div>
      </div>

      {/* 任务列表 — 主内容区 */}
      <section className={cn(PANEL, 'shadow-[0_2px_10px_rgba(31,35,41,0.03)] overflow-hidden')}>
        <button
          type="button"
          onClick={() => setListExpanded((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-neutral-50/80 transition cursor-pointer border-b border-neutral-100"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={15} className="text-neutral-500 shrink-0" />
            <span className="text-[13px] font-bold text-neutral-900">任务列表</span>
            <span className="text-[10px] text-neutral-500 font-medium">共 {filteredTasks.length} 条</span>
          </div>
          {listExpanded ? (
            <ChevronUp size={15} className="text-neutral-400 shrink-0" />
          ) : (
            <ChevronDown size={15} className="text-neutral-400 shrink-0" />
          )}
        </button>

        {listExpanded && (
          <>
            {pagedTasks.length === 0 ? (
              <div className="py-12 text-center text-[11px] text-neutral-500">
                {TASK_CENTER_COPY.emptyList}
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {pagedTasks.map((t) => {
                  return (
                    <div
                      key={t.id}
                      className="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3 hover:bg-neutral-50/50 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleTaskEnabled(t.id, t.enabled)}
                          className={cn(
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5',
                            t.enabled ? 'bg-emerald-500' : 'bg-neutral-300',
                          )}
                          title={t.enabled ? '点击暂停' : '点击启用'}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition',
                              t.enabled ? 'translate-x-4' : 'translate-x-0',
                            )}
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="font-bold text-neutral-900 text-[13px]">{t.name}</span>
                            <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-sky-50 text-sky-700 border border-sky-100">
                              {typeTagLabel(t.type)}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-px rounded bg-sky-50 text-sky-700 border border-sky-100 truncate max-w-[140px]">
                              {agentTagId(t.targetAgentId)}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-px rounded bg-neutral-100 text-neutral-500 border border-neutral-200">
                              ID: {t.id.replace(/^t_/, '').slice(0, 12)}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-500 leading-relaxed truncate">
                            {t.cronExpression}
                            <span className="mx-2 text-neutral-300">·</span>
                            上次: {t.lastExecutedAt}
                            <span className="mx-2 text-neutral-300">·</span>
                            时长: {t.durationLabel ?? '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-12 lg:pl-0">
                        {!t.enabled && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            已暂停
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="h-8 px-2.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-bold text-neutral-700 flex items-center gap-1 cursor-pointer transition"
                        >
                          <Settings size={12} />
                          修改任务
                        </button>
                        <button
                          type="button"
                          onClick={() => discardTask(t)}
                          className="h-8 px-2.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-[11px] font-bold text-rose-600 flex items-center gap-1 cursor-pointer transition"
                        >
                          <Trash2 size={12} />
                          {TASK_CENTER_COPY.discardTask}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-4 py-2.5 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500">
              <span>共 {filteredTasks.length} 条</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded border border-neutral-200 disabled:opacity-40 cursor-pointer hover:bg-neutral-50"
                >
                  上一页
                </button>
                <span className="px-2 py-1 rounded bg-sky-600 text-white font-bold tabular-nums">{page}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded border border-neutral-200 disabled:opacity-40 cursor-pointer hover:bg-neutral-50"
                >
                  下一页
                </button>
                <span className="ml-1">{pageSize} 条/页</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 历史任务 — 次级区域 */}
      <section className={cn(PANEL, 'shadow-[0_2px_10px_rgba(31,35,41,0.03)] overflow-hidden')}>
        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100">
          <button
            type="button"
            onClick={() => setHistoryExpanded((v) => !v)}
            className="flex items-center gap-2 min-w-0 cursor-pointer text-left"
          >
            <Clock size={15} className="text-neutral-500 shrink-0" />
            <span className="text-[13px] font-bold text-neutral-900">历史任务</span>
            <span className="text-[10px] text-neutral-500 font-medium">共 {filteredHistory.length} 条</span>
            {historyExpanded ? (
              <ChevronUp size={15} className="text-neutral-400 shrink-0 ml-1" />
            ) : (
              <ChevronDown size={15} className="text-neutral-400 shrink-0 ml-1" />
            )}
          </button>

          {historyExpanded && (
            <div className="flex flex-wrap gap-1">
              {HISTORY_FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setHistoryRange(key)}
                  className={cn(
                    'px-2 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer',
                    historyRange === key
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-500 hover:bg-neutral-100',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {historyExpanded && (
          <div className="divide-y divide-neutral-100">
            {filteredHistory.length === 0 ? (
              <div className="py-8 text-center text-[11px] text-neutral-500">暂无历史记录</div>
            ) : (
              filteredHistory.map((h) => (
                <div
                  key={h.id}
                  className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] hover:bg-neutral-50/50"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-neutral-900">{h.taskName}</span>
                    <span className="text-neutral-500 mx-2">·</span>
                    <span className="text-neutral-500">{h.agentName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums text-neutral-500">
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-px rounded',
                        h.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-600',
                      )}
                    >
                      {h.status === 'success' ? '成功' : '失败'}
                    </span>
                    <span>{h.executedAt}</span>
                    <span>时长 {h.duration}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* 任务指令交互 — 按需弹窗，不占主视觉 */}
      <Modal
        open={showCommandModal}
        onClose={() => setShowCommandModal(false)}
        title="任务指令交互"
        maxWidth="max-w-lg"
        footer={
          <>
            <button type="button" onClick={() => setShowCommandModal(false)} className={BTN_SOFT}>
              取消
            </button>
            <button type="button" onClick={executeInstantDirective} className={cn(BTN_INK, 'gap-1')}>
              <Send size={13} />
              立即呼叫
            </button>
          </>
        }
      >
        <p className="text-[11px] text-neutral-500 mb-3">
          选择数字员工并下达即时指令，适用于临时排查或一次性自动化。
        </p>
        <div className="space-y-3">
          <div>
            <label className={LABEL}>目标数字员工</label>
            <select
              value={commandAgentId}
              onChange={(e) => setCommandAgentId(e.target.value)}
              className={FIELD}
            >
              <option value="">请选择数字员工</option>
              {hiredAgents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.avatar} {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>即时指令</label>
            <textarea
              placeholder="输入要立刻执行的任务指令..."
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              className={cn(FIELD, 'min-h-[88px]')}
            />
          </div>
        </div>
      </Modal>

      {/* 新建 / 修改任务 */}
      <Modal
        open={isCreating}
        onClose={() => {
          setIsCreating(false);
          setEditingTask(null);
          resetForm();
        }}
        title={editingTask ? '修改任务' : '新建任务'}
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingTask(null);
                resetForm();
              }}
              className={BTN_SOFT}
            >
              取消
            </button>
            <button type="button" onClick={handleSaveTask} className={BTN_INK}>
              {editingTask ? '保存修改' : TASK_CENTER_COPY.createTask}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={LABEL}>任务名称 *</label>
            <input
              type="text"
              placeholder="如：服务小结"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className={FIELD}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>运行类型</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)} className={FIELD}>
                <option value="定时任务">定时触发</option>
                <option value="事件触发任务">事件/指令触发</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>绑定数字员工 *</label>
              <select value={formAgentId} onChange={(e) => setFormAgentId(e.target.value)} className={FIELD}>
                <option value="">请选择</option>
                {hiredAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={LABEL}>定时规则</label>
            <input
              type="text"
              placeholder="cron: 0 0 14 * * ?"
              value={formCron}
              onChange={(e) => setFormCron(e.target.value)}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>任务指令内容</label>
            <textarea
              placeholder="描述数字员工需要执行的自动化逻辑..."
              value={formCommand}
              onChange={(e) => setFormCommand(e.target.value)}
              className={cn(FIELD, 'min-h-[72px]')}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
