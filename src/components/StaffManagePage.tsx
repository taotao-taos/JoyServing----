/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Plus, Trash2, KeyRound, Contact, ChevronDown, Check, UserCheck } from '@/lib/icons';
import { SegmentedTabs } from './common/SegmentedTabs';
import { PageHeader } from './common/PageHeader';
import { Modal } from './common/Modal';
import { PAGE, PANEL, BTN_INK, BTN_SOFT, FIELD, LABEL, SEARCH_FIELD } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';
import type { HiredAgent } from '../types';
import { ONBOARDING_TOAST_COMPLETE } from '@/lib/onboardingCopy';
import { ORG_COPY } from '@/lib/platformTerminology';

const MGMT_TABS = [
  { tab: 'staff', label: '员工分配' },
  { tab: 'roles', label: '角色权限' },
];

function formatBoundAgentsLabel(ids: string[], agents: HiredAgent[]): string {
  if (ids.length === 0) return '未绑定 (人工接管)';
  return ids
    .map((id) => agents.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => `${a!.avatar} ${a!.name}`)
    .join('、');
}

function AgentMultiSelect({
  value,
  onChange,
  agents,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  agents: HiredAgent[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div ref={rootRef} className="relative max-w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-white border border-neutral-200 text-neutral-700 text-[11px] rounded-[7px] h-8 px-2 focus:outline-none focus:border-neutral-400 font-semibold cursor-pointer transition hover:border-neutral-300 flex items-center gap-1.5 text-left"
      >
        <span className="flex-1 truncate">{formatBoundAgentsLabel(value, agents)}</span>
        <ChevronDown size={12} className={`text-neutral-400 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-56 max-h-52 overflow-y-auto bg-white border border-neutral-200 rounded-[13px] shadow-[0_12px_32px_rgba(31,35,41,0.12)] p-1.5">
          {agents.length === 0 ? (
            <p className="px-2 py-2 text-[11px] text-neutral-400">暂无已雇佣的数字员工</p>
          ) : (
            agents.map((agent) => {
              const selected = value.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggle(agent.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition text-left ${
                    selected ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                      selected ? 'bg-neutral-800 border-neutral-900 text-white' : 'border-neutral-300 bg-white'
                    }`}
                  >
                    {selected && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className="truncate">{agent.avatar} {agent.name}</span>
                </button>
              );
            })
          )}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full mt-1 px-2 py-1.5 rounded-lg text-[10px] font-bold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 transition text-left"
            >
              清除全部绑定
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export const StaffManagePage: React.FC = () => {
  const { staff, roles, createStaff, deleteStaff, updateStaff, hiredAgents, showToast, demoStep, setDemoStep } = useApp();
  const [search, setSearch] = useState('');
  const tableBusy = useMockLatency('staff-table', 'pageList');

  // Modal states
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const [workId, setWorkId] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('r_agent');
  const [maxSlots, setMaxSlots] = useState(5);
  const [boundAgentIds, setBoundAgentIds] = useState<string[]>([]);
  const [isBulkBinding, setIsBulkBinding] = useState(false);
  const [bulkAgentId, setBulkAgentId] = useState('');
  const [bulkStaffIds, setBulkStaffIds] = useState<string[]>([]);

  const onlineAgents = hiredAgents.filter((a) => a.status === 'online');

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.workId.toLowerCase().includes(search.toLowerCase())
  );

  const handleBoundAgentsChange = (staffId: string, ids: string[]) => {
    updateStaff(staffId, { boundAgentIds: ids.length ? ids : undefined });

    if (demoStep === 'A4' && ids.length > 0) {
      setDemoStep(null);
      showToast(ONBOARDING_TOAST_COMPLETE);
    }
  };

  const handleCreate = () => {
    if (!name.trim() || !account.trim() || !workId.trim()) {
      showToast('请填好坐席的姓名、账号和工号。');
      return;
    }
    createStaff(name, account, workId, email || `${account}@joyserving.com`, roleId, maxSlots, boundAgentIds);
    if (demoStep === 'A4' && boundAgentIds.length > 0) {
      setDemoStep(null);
      showToast(ONBOARDING_TOAST_COMPLETE);
    }
    setIsCreating(false);
    setName('');
    setAccount('');
    setWorkId('');
    setEmail('');
    setRoleId('r_agent');
    setMaxSlots(5);
    setBoundAgentIds([]);
  };

  const handleResetPassword = (staffName: string) => {
    showToast(`已向【${staffName}】的邮箱发送新密码。`);
  };

  const openBulkBindModal = () => {
    const newestOnline = onlineAgents[0];
    setBulkAgentId(newestOnline?.id ?? '');
    setBulkStaffIds(staff.map((s) => s.id));
    setIsBulkBinding(true);
  };

  const toggleBulkStaff = (id: string) => {
    setBulkStaffIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkBind = () => {
    if (!bulkAgentId) {
      showToast('请先选择要绑定的数字员工。');
      return;
    }
    if (bulkStaffIds.length === 0) {
      showToast(ORG_COPY.selectStaffRequired);
      return;
    }

    const agent = hiredAgents.find((a) => a.id === bulkAgentId);
    let updatedCount = 0;

    bulkStaffIds.forEach((staffId) => {
      const member = staff.find((s) => s.id === staffId);
      if (!member) return;
      const current = member.boundAgentIds ?? [];
      if (current.includes(bulkAgentId)) return;
      updateStaff(staffId, { boundAgentIds: [...current, bulkAgentId] });
      updatedCount += 1;
    });

    if (updatedCount === 0) {
      showToast('所选坐席已全部绑定该数字员工，无需重复操作。');
    } else if (demoStep === 'A4') {
      setDemoStep(null);
      showToast(ONBOARDING_TOAST_COMPLETE);
    } else {
      showToast(ORG_COPY.bulkBindSuccess(agent?.name ?? '数字员工', updatedCount));
    }

    setIsBulkBinding(false);
  };

  return (
    <div className={PAGE}>
      <SegmentedTabs items={MGMT_TABS} />

      <PageHeader
        icon={<Contact size={24} />}
        title="员工分配"
      >
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="搜索真实员工/工号..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(SEARCH_FIELD, 'pl-9 pr-4')}
          />
        </div>

        <button onClick={openBulkBindModal} className={BTN_SOFT} disabled={onlineAgents.length === 0}>
          <UserCheck size={14} />
          <span>批量绑定</span>
        </button>

        <button onClick={() => setIsCreating(true)} className={BTN_INK}>
          <Plus size={14} />
          <span>{ORG_COPY.addStaff}</span>
        </button>
      </PageHeader>

      {/* Staff Table */}
      <div className={`${PANEL} overflow-hidden`}>
        <table className="w-full text-left border-collapse text-xs text-neutral-700">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-200 text-[10px] text-neutral-400 font-extrabold uppercase tracking-wider">
              <th className="px-4 py-2.5">坐席信息</th>
              <th className="px-4 py-2.5">登录账号</th>
              <th className="px-4 py-2.5">坐席工号</th>
              <th className="px-4 py-2.5">注册邮箱</th>
              <th className="px-4 py-2.5">系统授权角色</th>
              <th className="px-4 py-2.5">绑定协同数字员工</th>
              <th className="px-4 py-2.5 text-center">最大接入上限 (Slots)</th>
              <th className="px-4 py-2.5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {tableBusy ? (
              <tr>
                <td colSpan={8} className="p-0">
                  <ContentBusy busy size="panel" minHeight={200} />
                </td>
              </tr>
            ) : (
            filtered.map(s => {
              const roleObj = roles.find(r => r.id === s.roleId);
              const isMe = s.id === 'hs_001';

              return (
                <tr key={s.id} className="hover:bg-neutral-50 transition duration-150">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center justify-center font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-neutral-900 block">{s.name}</span>
                        {isMe && <span className="text-[9px] bg-ink text-white font-black px-1.5 py-0.5 rounded">当前登录</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono font-medium text-neutral-600">{s.account}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-neutral-700">{s.workId}</td>
                  <td className="px-4 py-2.5 text-neutral-500">{s.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="bg-neutral-100 text-neutral-700 px-2.5 py-0.5 rounded-md border border-neutral-200 font-medium">
                      {roleObj ? roleObj.name : '坐席级别'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <AgentMultiSelect
                      value={s.boundAgentIds ?? []}
                      onChange={(ids) => handleBoundAgentsChange(s.id, ids)}
                      agents={hiredAgents}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="font-mono font-black text-neutral-900 bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 rounded-md text-[11px]">
                      {s.maxSlots} 人
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-1.5">
                    <button
                      onClick={() => handleResetPassword(s.name)}
                      className="text-neutral-500 hover:text-neutral-900 p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded-lg border border-neutral-200 inline-flex items-center justify-center transition"
                      title="重置密码"
                    >
                      <KeyRound size={12} />
                    </button>
                    {!isMe && (
                      <button
                        onClick={() => {
                          if (confirm(`删除真人客服【${s.name}】将作废其工号与接待权限，确定吗？`)) {
                            deleteStaff(s.id);
                          }
                        }}
                        className="text-neutral-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition"
                        title="注销员工"
                      >
                        <Trash2 size={12} className="inline" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE HUMAN STAFF MODAL */}
      <Modal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title="注册全新物理客服席位"
        footer={
          <>
            <button onClick={() => setIsCreating(false)} className={BTN_SOFT}>取消</button>
            <button onClick={handleCreate} className={BTN_INK}>一键注册工号</button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className={LABEL}>客服真实姓名 *</label>
            <input type="text" placeholder="如：蒋敏敏" value={name} onChange={e => setName(e.target.value)} className={FIELD} />
          </div>

          <div>
            <label className={LABEL}>员工登录账号 *</label>
            <input type="text" placeholder="如：agent_minmin" value={account} onChange={e => setAccount(e.target.value)} className={FIELD} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>分配工号 *</label>
              <input type="text" placeholder="如：STAFF_022" value={workId} onChange={e => setWorkId(e.target.value)} className={FIELD} />
            </div>

            <div>
              <label className={LABEL}>系统角色</label>
              <select value={roleId} onChange={e => setRoleId(e.target.value)} className={FIELD}>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL}>最大并行接待进线上限 (人)</label>
            <input type="number" min="2" max="50" value={maxSlots} onChange={e => setMaxSlots(Number(e.target.value))} className={FIELD} />
          </div>

          <div>
            <label className={LABEL}>初始绑定数字员工 (可选，可多选)</label>
            <AgentMultiSelect
              value={boundAgentIds}
              onChange={setBoundAgentIds}
              agents={hiredAgents}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={isBulkBinding}
        onClose={() => setIsBulkBinding(false)}
        icon={<UserCheck size={18} />}
        title="批量绑定数字员工"
        maxWidth="max-w-md"
        footer={
          <>
            <button onClick={() => setIsBulkBinding(false)} className={BTN_SOFT}>取消</button>
            <button onClick={handleBulkBind} className={BTN_INK}>确认批量绑定</button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            {ORG_COPY.bulkBindHint}
          </p>

          <div>
            <label className={LABEL}>选择数字员工 *</label>
            {onlineAgents.length === 0 ? (
              <p className="text-[11px] text-neutral-400 mt-1">暂无已上岗的数字员工，请先完成雇佣与考核。</p>
            ) : (
              <select
                value={bulkAgentId}
                onChange={(e) => setBulkAgentId(e.target.value)}
                className={FIELD}
              >
                {onlineAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.avatar} {agent.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={LABEL}>{ORG_COPY.selectStaff}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBulkStaffIds(staff.map((s) => s.id))}
                  className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 transition"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setBulkStaffIds([])}
                  className="text-[10px] font-bold text-neutral-500 hover:text-neutral-900 transition"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-lg divide-y divide-neutral-100">
              {staff.map((s) => {
                const selected = bulkStaffIds.includes(s.id);
                const alreadyBound = (s.boundAgentIds ?? []).includes(bulkAgentId);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleBulkStaff(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition ${
                      selected ? 'bg-neutral-50' : 'hover:bg-neutral-50/70'
                    }`}
                  >
                    <span
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                        selected ? 'bg-neutral-800 border-neutral-900 text-white' : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {selected && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] font-bold text-neutral-900 truncate">{s.name}</span>
                      <span className="block text-[10px] text-neutral-400 font-mono">{s.workId}</span>
                    </span>
                    {alreadyBound && bulkAgentId && (
                      <span className="text-[9px] font-bold text-emerald-600 shrink-0">已绑定</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
