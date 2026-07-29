/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Check, Save, Plus, UserCheck } from '@/lib/icons';
import { SegmentedTabs } from './common/SegmentedTabs';
import { PageHeader } from './common/PageHeader';
import { Modal } from './common/Modal';
import { PAGE, PANEL, BTN_INK, BTN_SOFT, FIELD, LABEL } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { ContentBusy } from './common/ContentBusy';
import { useMockLatency } from '@/lib/useMockLatency';

const MGMT_TABS = [
  { tab: 'staff', label: '员工分配' },
  { tab: 'roles', label: '角色权限' },
];

export const RoleManagePage: React.FC = () => {
  const { roles, updateRolePermissions, createRole, activeRoleId, setActiveRoleId, showToast } = useApp();
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const permBusy = useMockLatency(activeRoleId || 'role-none', 'panelSwitch');

  const selectedRole = roles.find((r) => r.id === activeRoleId) || roles[0];

  const permissionsList = [
    { key: 'workspace', label: '客服工作台', desc: '进入工作台，手动或自动承接客户会话。' },
    { key: 'market', label: '招聘数字员工', desc: '浏览市场并雇佣新的数字员工。' },
    { key: 'agents', label: '管理数字员工', desc: '为数字员工配备技能、员工知识，并准予上岗。' },
    { key: 'kb', label: '员工培训 · 员工知识', desc: '创建、删除知识库并上传资料。' },
    { key: 'skills', label: '员工培训 · 员工技能', desc: '新增或下架数字员工可调用的技能。' },
    { key: 'abTest', label: '员工培训 · 员工比拼', desc: '对比两名数字员工的表现并跑测试。' },
    { key: 'staff', label: '组织管理 · 员工分配', desc: '管理值班同事与接待上限。' },
    { key: 'roles', label: '组织管理 · 角色权限', desc: '编辑角色能用哪些功能。' },
    { key: 'dashboard', label: '办公室 · 员工业绩', desc: '查看运营核心指标与人机协同数据。' },
    { key: 'sessions', label: '办公室 · 接待记录', desc: '查看会话明细并复盘接待过程。' },
  ];

  const handleToggle = (key: string, currentVal: boolean) => {
    if (!selectedRole) return;
    updateRolePermissions(selectedRole.id, key, !currentVal);
  };

  const handleSave = () => {
    if (!selectedRole) return;
    showToast(`已保存，【${selectedRole.name}】的权限即刻生效。`);
  };

  const handleCreateRole = () => {
    const name = newRoleName.trim();
    if (!name) {
      showToast('请输入角色名称。');
      return;
    }
    if (roles.some((r) => r.name === name)) {
      showToast('该角色名称已存在。');
      return;
    }
    createRole(name);
    setNewRoleName('');
    setIsCreatingRole(false);
    showToast(`角色「${name}」已创建，请配置权限后保存。`);
  };

  return (
    <div className={PAGE}>
      <SegmentedTabs items={MGMT_TABS} />

      <PageHeader icon={<ShieldCheck size={22} />} title="角色权限" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[480px]">
        {/* Left Column: Role Selection */}
        <div className={`${PANEL} md:col-span-4 p-4 flex flex-col min-h-0`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">角色</span>
            <button
              type="button"
              onClick={() => setIsCreatingRole(true)}
              className={cn(BTN_INK, 'text-[10px] px-2 shrink-0')}
            >
              <Plus size={12} strokeWidth={2.5} />
              新增角色
            </button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
            {roles.map((r) => {
              const isSelected = r.id === activeRoleId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setActiveRoleId(r.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-[13px] border text-left transition text-xs font-bold cursor-pointer',
                    isSelected
                      ? 'bg-ink text-white border-ink shadow-sm'
                      : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserCheck size={16} className={cn('shrink-0', isSelected ? 'text-white' : 'text-neutral-400')} />
                    <span className="truncate">{r.name}</span>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0',
                      isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-600',
                    )}
                  >
                    {r.userCount} 人
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permission Matrix Checklist */}
        <div className={`${PANEL} md:col-span-8 p-5 flex flex-col justify-between`}>
          {selectedRole ? (
            <div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                <div>
                  <h3 className="font-extrabold text-neutral-900 text-sm">{selectedRole.name} 的权限</h3>
                </div>

                <button type="button" onClick={handleSave} className={BTN_INK}>
                  <Save size={13} />
                  <span>保存</span>
                </button>
              </div>

              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
                <ContentBusy busy={permBusy} size="slot" minHeight={200}>
                {permissionsList.map((perm) => {
                  const isChecked = selectedRole.permissions[perm.key] || false;

                  return (
                    <div
                      key={perm.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggle(perm.key, isChecked)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggle(perm.key, isChecked);
                        }
                      }}
                      className="flex items-start gap-3 p-3 rounded-[13px] border border-neutral-100 bg-white hover:bg-neutral-100/60 transition cursor-pointer"
                    >
                      <div className="pt-0.5">
                        <div
                          className={cn(
                            'h-4.5 w-4.5 rounded-[7px] border flex items-center justify-center transition-all',
                            isChecked
                              ? 'bg-ink border-ink text-white'
                              : 'border-neutral-300 bg-white hover:border-neutral-400',
                          )}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>

                      <div className="text-xs min-w-0">
                        <span className="font-extrabold text-neutral-900 block">{perm.label}</span>
                        <span className="text-[10px] text-neutral-500 mt-0.5 block">{perm.desc}</span>
                      </div>
                    </div>
                  );
                })}
                </ContentBusy>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
              请先新增或选择一个角色
            </div>
          )}
        </div>
      </div>

      <Modal
        open={isCreatingRole}
        onClose={() => {
          setIsCreatingRole(false);
          setNewRoleName('');
        }}
        icon={<ShieldCheck size={16} />}
        title="新增角色"
        maxWidth="max-w-sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsCreatingRole(false);
                setNewRoleName('');
              }}
              className={BTN_SOFT}
            >
              取消
            </button>
            <button type="button" onClick={handleCreateRole} className={BTN_INK}>
              创建
            </button>
          </>
        }
      >
        <div>
          <label className={LABEL}>角色名称 *</label>
          <input
            type="text"
            placeholder="如：质检专员、夜班主管"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            className={FIELD}
            maxLength={20}
          />
          <p className="text-[10px] text-neutral-500 mt-2">
            新建角色默认仅开通「客服工作台」，其余权限可在右侧勾选。
          </p>
        </div>
      </Modal>
    </div>
  );
};
