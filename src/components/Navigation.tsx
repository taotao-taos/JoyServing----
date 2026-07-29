/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, addCollection } from '@iconify/react';
import solarIcons from '@iconify-json/solar/icons.json';
import { useApp } from '../context/AppContext';
import { RELAY_HOME_ASSETS } from '@/lib/relayHomeAssets';
import { ONBOARDING_TOAST_STEP1 } from '@/lib/onboardingCopy';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ChevronRight,
  PanelLeftClose,
  Bell,
  ChevronUp,
  User,
  LogOut,
  Calendar,
  HelpCircle,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { SUPPORT_EMAIL } from '@/src/lib/siteLinks';
import { PROFILE_USER } from '@/lib/profileUser';

addCollection(solarIcons as Parameters<typeof addCollection>[0]);

/** Solar Line：未选中 linear，选中 bold */
const NAV_ICONS = {
  employees: 'solar:ghost-linear',
  office: 'solar:sofa-2-linear',
  training: 'solar:square-academic-cap-linear',
  org: 'solar:structure-linear',
  workspace: 'solar:widget-4-linear',
  cs: 'solar:headphones-round-linear',
  qc: 'solar:shield-check-linear',
} as const;

function solarPair(icon: string, active: boolean) {
  return active ? icon.replace(/-linear$/, '-bold') : icon.replace(/-bold$/, '-linear');
}

function NavGlyph({
  icon,
  active = false,
  size = 16,
  className,
}: {
  icon: string;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Icon
      icon={solarPair(icon, active)}
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden
    />
  );
}

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, sessions, sidebarCollapsed, setSidebarCollapsed, setShowTaskCenter, showToast } = useApp();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileFooterRef = useRef<HTMLDivElement>(null);
  const [profileMenuStyle, setProfileMenuStyle] = useState<{
    left: number;
    bottom: number;
    width: number;
  } | null>(null);

  const updateProfileMenuPosition = useCallback(() => {
    const anchor = profileFooterRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const horizontalInset = sidebarCollapsed ? 4 : 16;
    setProfileMenuStyle({
      left: rect.left + horizontalInset,
      bottom: window.innerHeight - rect.top + 8,
      width: sidebarCollapsed ? 192 : Math.max(rect.width - horizontalInset * 2, 160),
    });
  }, [sidebarCollapsed]);

  useLayoutEffect(() => {
    if (!showProfileMenu) {
      setProfileMenuStyle(null);
      return;
    }
    updateProfileMenuPosition();
    window.addEventListener('resize', updateProfileMenuPosition);
    window.addEventListener('scroll', updateProfileMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateProfileMenuPosition);
      window.removeEventListener('scroll', updateProfileMenuPosition, true);
    };
  }, [showProfileMenu, updateProfileMenuPosition]);
  const queuedChatsCount = sessions.filter(s => s.status === 'queued').length;
  const isEmployeeTab = activeTab === 'market' || activeTab === 'employees';
  const isTrainingTab = activeTab === 'kb' || activeTab === 'skills' || activeTab === 'abTest';
  const isManageTab = activeTab === 'staff' || activeTab === 'roles';
  const isOfficeTab = activeTab === 'dashboard' || activeTab === 'sessions';
  const isWorkspaceTab = activeTab === 'workspace' || activeTab === 'qcWorkspace';
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceAnchorRef = useRef<HTMLDivElement>(null);
  const workspaceCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [workspaceFlyoutStyle, setWorkspaceFlyoutStyle] = useState<{
    left: number;
    bottom: number;
  } | null>(null);

  const openWorkspaceMenu = useCallback(() => {
    if (workspaceCloseTimer.current) {
      clearTimeout(workspaceCloseTimer.current);
      workspaceCloseTimer.current = null;
    }
    setWorkspaceMenuOpen(true);
  }, []);

  const scheduleCloseWorkspaceMenu = useCallback(() => {
    if (workspaceCloseTimer.current) clearTimeout(workspaceCloseTimer.current);
    workspaceCloseTimer.current = setTimeout(() => setWorkspaceMenuOpen(false), 120);
  }, []);

  const updateWorkspaceFlyoutPosition = useCallback(() => {
    const anchor = workspaceAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setWorkspaceFlyoutStyle({
      left: rect.right + 8,
      bottom: window.innerHeight - rect.bottom,
    });
  }, []);

  useLayoutEffect(() => {
    if (!workspaceMenuOpen) {
      setWorkspaceFlyoutStyle(null);
      return;
    }
    updateWorkspaceFlyoutPosition();
    window.addEventListener('resize', updateWorkspaceFlyoutPosition);
    window.addEventListener('scroll', updateWorkspaceFlyoutPosition, true);
    return () => {
      window.removeEventListener('resize', updateWorkspaceFlyoutPosition);
      window.removeEventListener('scroll', updateWorkspaceFlyoutPosition, true);
    };
  }, [workspaceMenuOpen, sidebarCollapsed, updateWorkspaceFlyoutPosition]);

  useEffect(() => {
    return () => {
      if (workspaceCloseTimer.current) clearTimeout(workspaceCloseTimer.current);
    };
  }, []);

  const navItemClass = (active: boolean, collapsed: boolean) =>
    cn(
      'flex items-center border border-transparent transition-colors duration-200 cursor-pointer',
      collapsed
        ? 'justify-center p-1.5 rounded-lg h-8 w-8 mx-auto shrink-0'
        : 'w-full justify-start gap-2 px-2 h-[38px] rounded-lg',
      active
        ? 'bg-neutral-200/90 text-neutral-900 font-semibold ring-1 ring-foreground/10'
        : 'text-neutral-500 font-medium hover:bg-neutral-100/80 hover:text-neutral-800',
    );

  const renderPrimaryNav = ({
    id,
    title,
    icon,
    tab,
    active,
  }: {
    id: string;
    title: string;
    icon: string;
    tab: string;
    active: boolean;
  }) => (
    <button
      id={id}
      type="button"
      onClick={() => setActiveTab(tab)}
      title={title}
      className={navItemClass(active, sidebarCollapsed)}
    >
      <NavGlyph
        icon={icon}
        active={active}
        className={active ? 'text-neutral-900' : 'text-neutral-400'}
      />
      {!sidebarCollapsed && (
        <span className="text-[14px] truncate">{title}</span>
      )}
    </button>
  );

  return (
    <div className="w-full h-full bg-[rgb(250,250,250)] text-sidebar-foreground flex flex-col shrink-0 select-none relative font-sans overflow-hidden">
      {!sidebarCollapsed ? (
        <div className="px-5 pt-6 pb-4 flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <img src={RELAY_HOME_ASSETS.logo} alt="JoySupport" className="h-[33px] w-auto object-contain select-none" />
          </div>
          <button 
            onClick={() => setSidebarCollapsed(true)}
            className="text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/40 cursor-pointer p-1.5 rounded-[7px] transition duration-200 translate-x-[6px]"
            title="折叠导航栏"
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
      ) : (
        <div className="px-1.5 pt-4 pb-2 flex flex-col items-center border-b border-neutral-200/30 animate-in fade-in duration-300">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            title="展开导航栏"
            className="group relative h-8 w-8 flex items-center justify-center rounded-lg transition duration-200 cursor-pointer hover:bg-neutral-200/40"
          >
            {/* 默认：仅图形 logo（裁切左侧 mark，不含文字） */}
            <span className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden transition-opacity duration-150 group-hover:opacity-0">
              <img
                src={RELAY_HOME_ASSETS.logo}
                alt="JoySupport"
                className="h-[34px] w-[34px] object-cover object-left select-none pointer-events-none"
                draggable={false}
              />
            </span>
            {/* Hover：展开侧栏图标 */}
            <span className="absolute inset-0 flex items-center justify-center text-neutral-500 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:text-neutral-800">
              <PanelLeftClose size={15} className="transform rotate-180" />
            </span>
          </button>
        </div>
      )}

      {/* Main Action Callouts: matches 扣子 "+" 新建项目 */}
      <div className={cn(sidebarCollapsed ? 'px-1.5 py-2.5 flex flex-col items-center' : 'px-4 py-3', 'transition')}>
        {sidebarCollapsed ? (
          <button
            type="button"
            onClick={() => {
              setActiveTab('market');
              showToast(ONBOARDING_TOAST_STEP1);
            }}
            title="雇佣数字员工"
            className="h-8 w-8 bg-[rgb(235,237,241)] hover:bg-[rgb(226,229,234)] rounded-lg flex items-center justify-center border border-transparent shadow-[0_2px_4px_rgba(26,32,41,0.03)] transition-all shrink-0 cursor-pointer"
          >
            <img src={RELAY_HOME_ASSETS.plus} alt="" className="h-[20px] w-[20px] object-contain select-none pointer-events-none" draggable={false} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setActiveTab('market');
              showToast(ONBOARDING_TOAST_STEP1);
            }}
            className="w-full h-[38px] bg-[rgb(235,237,241)] hover:bg-[rgb(226,229,234)] text-neutral-800 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-[14px] border border-transparent shadow-[0_2px_4px_rgba(26,32,41,0.03)] transition-all cursor-pointer"
          >
            <img src={RELAY_HOME_ASSETS.plus} alt="" className="h-[20px] w-[20px] object-contain select-none pointer-events-none" draggable={false} />
            <span className="text-neutral-800">雇佣数字员工</span>
          </button>
        )}
      </div>

      {/* Nav Menu Scroll Area */}
      <div className={`flex-1 overflow-y-auto ${sidebarCollapsed ? 'px-1.5 py-1.5 space-y-2' : 'px-3.5 py-2.5 space-y-4'} custom-scrollbar`}>
        {/* 项目 */}
        <div className="space-y-2">
          {!sidebarCollapsed && (
            <div className="px-2 py-1.5 text-[12px] font-medium text-[rgba(12,10,9,0.7)] leading-none">
              项目
            </div>
          )}

          {renderPrimaryNav({
            id: 'nav_employees',
            title: '数字员工',
            icon: NAV_ICONS.employees,
            tab: 'employees',
            active: isEmployeeTab,
          })}

          {renderPrimaryNav({
            id: 'nav_office',
            title: '办公室',
            icon: NAV_ICONS.office,
            tab: 'dashboard',
            active: isOfficeTab,
          })}

          {renderPrimaryNav({
            id: 'nav_training',
            title: '员工培训',
            icon: NAV_ICONS.training,
            tab: 'kb',
            active: isTrainingTab,
          })}
        </div>

        {/* 组织 */}
        <div className="space-y-2">
          {!sidebarCollapsed && (
            <div className="px-2 py-1.5 text-[12px] font-medium text-[rgba(12,10,9,0.7)] leading-none">
              组织
            </div>
          )}

          {renderPrimaryNav({
            id: 'nav_manage',
            title: '组织管理',
            icon: NAV_ICONS.org,
            tab: 'staff',
            active: isManageTab,
          })}
        </div>
      </div>

      {/* 底部：工作台 */}
      <div className={cn(sidebarCollapsed ? 'px-1.5 pb-1.5 space-y-2' : 'pb-2')}>
      {/* 工作台：悬停向侧栏外侧弹出客服 / 质检 */}
      <div
        ref={workspaceAnchorRef}
        className={cn(!sidebarCollapsed && 'px-3 pb-2 border-t border-neutral-200')}
        onMouseEnter={openWorkspaceMenu}
        onMouseLeave={scheduleCloseWorkspaceMenu}
      >
        {sidebarCollapsed ? (
          <button
            type="button"
            id="nav_workspace_group"
            title="工作台"
            className={cn(navItemClass(isWorkspaceTab || workspaceMenuOpen, true), 'relative')}
            onClick={() => setWorkspaceMenuOpen((v) => !v)}
          >
            <span className="relative inline-flex shrink-0">
              <NavGlyph
                icon={NAV_ICONS.workspace}
                active={isWorkspaceTab || workspaceMenuOpen}
                className={isWorkspaceTab || workspaceMenuOpen ? 'text-neutral-900' : 'text-neutral-400'}
              />
              {queuedChatsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[8px] font-bold h-3.5 min-w-3.5 px-0.5 rounded-full flex items-center justify-center leading-none border border-white">
                  {queuedChatsCount}
                </span>
              )}
            </span>
          </button>
        ) : (
          <div className="pt-2">
            <div
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-[7px] border transition-all duration-200',
                isWorkspaceTab || workspaceMenuOpen
                  ? 'border-neutral-300 bg-neutral-200/90 ring-1 ring-foreground/10'
                  : 'border-neutral-200/80 bg-white',
              )}
            >
              <div className="flex items-center gap-3 shrink-0 flex-1 min-w-0">
                <NavGlyph
                  icon={NAV_ICONS.workspace}
                  active={isWorkspaceTab || workspaceMenuOpen}
                  className={isWorkspaceTab || workspaceMenuOpen ? 'text-neutral-900' : 'text-neutral-400'}
                />
                <span
                  className={cn(
                    'text-[12.5px]',
                    isWorkspaceTab || workspaceMenuOpen
                      ? 'font-semibold text-neutral-900'
                      : 'font-medium text-neutral-500',
                  )}
                >
                  工作台
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {queuedChatsCount > 0 && (
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                    {queuedChatsCount}
                  </span>
                )}
                <ChevronRight size={13} className="text-neutral-400" />
              </div>
            </div>
          </div>
        )}

        {workspaceMenuOpen &&
          workspaceFlyoutStyle &&
          createPortal(
            <div
              className="fixed z-[301] min-w-[156px] bg-white text-neutral-800 rounded-[13px] shadow-[0_2px_10px_rgba(31,35,41,0.02)] border border-neutral-200 p-1.5 animate-in fade-in slide-in-from-left-1 duration-150"
              style={{ left: workspaceFlyoutStyle.left, bottom: workspaceFlyoutStyle.bottom }}
              onMouseEnter={openWorkspaceMenu}
              onMouseLeave={scheduleCloseWorkspaceMenu}
            >
              <button
                id="nav_workspace"
                type="button"
                onClick={() => {
                  setActiveTab('workspace');
                  setWorkspaceMenuOpen(false);
                }}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 text-[12px] transition cursor-pointer',
                  activeTab === 'workspace'
                    ? 'bg-neutral-200/90 text-neutral-900 font-semibold ring-1 ring-foreground/10'
                    : 'text-neutral-500 font-medium hover:bg-neutral-100/80 hover:text-neutral-800',
                )}
              >
                <NavGlyph
                  icon={NAV_ICONS.cs}
                  active={activeTab === 'workspace'}
                  size={14}
                  className={activeTab === 'workspace' ? 'text-neutral-900' : 'text-neutral-400'}
                />
                客服工作台
                {queuedChatsCount > 0 && (
                  <span className="ml-auto bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {queuedChatsCount}
                  </span>
                )}
              </button>
              <button
                id="nav_qc_workspace"
                type="button"
                onClick={() => {
                  setActiveTab('qcWorkspace');
                  setWorkspaceMenuOpen(false);
                }}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 text-[12px] transition cursor-pointer',
                  activeTab === 'qcWorkspace'
                    ? 'bg-neutral-200/90 text-neutral-900 font-semibold ring-1 ring-foreground/10'
                    : 'text-neutral-500 font-medium hover:bg-neutral-100/80 hover:text-neutral-800',
                )}
              >
                <NavGlyph
                  icon={NAV_ICONS.qc}
                  active={activeTab === 'qcWorkspace'}
                  size={14}
                  className={activeTab === 'qcWorkspace' ? 'text-neutral-900' : 'text-neutral-400'}
                />
                质检工作台
              </button>
            </div>,
            document.body,
          )}
      </div>
      </div>

      {/* 底部：账号区 + 通知（对齐参考稿） */}
      <div
        ref={profileFooterRef}
        className={`${sidebarCollapsed ? 'p-2 flex flex-col items-center py-3 gap-2' : 'p-3 flex items-center justify-between gap-2.5'} bg-neutral-50/70 relative`}
      >
        <button
          type="button"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          title={PROFILE_USER.name}
          className={`flex items-center ${sidebarCollapsed ? 'justify-center p-0' : 'gap-2 flex-1 min-w-0'} text-left hover:bg-neutral-200/40 p-1 rounded-[7px] transition duration-150 cursor-pointer`}
        >
          <Avatar
            className={cn(
              sidebarCollapsed ? 'h-7 w-7' : 'h-8 w-8',
              'rounded-full overflow-hidden after:hidden shrink-0',
            )}
          >
            <AvatarFallback className={PROFILE_USER.fallbackClass}>
              {PROFILE_USER.initial}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 min-w-0 text-[13px] font-semibold text-neutral-900 truncate tracking-tight">
                {PROFILE_USER.name}
              </span>
              <ChevronUp
                size={14}
                className={cn(
                  'text-neutral-500 shrink-0 transition-transform',
                  !showProfileMenu && 'rotate-180',
                )}
              />
            </>
          )}
        </button>

        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={() => showToast('暂无新通知。')}
            title="通知中心"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition cursor-pointer shrink-0"
          >
            <Bell size={16} />
          </button>
        )}

        {showProfileMenu &&
          profileMenuStyle &&
          createPortal(
            <>
              <button
                type="button"
                aria-label="关闭菜单"
                className="fixed inset-0 z-[300] cursor-default bg-transparent"
                onClick={() => setShowProfileMenu(false)}
              />
              <div
                className="fixed z-[301] bg-white text-neutral-800 rounded-[13px] shadow-[0_2px_10px_rgba(31,35,41,0.02)] border border-neutral-200 p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 text-[12px] space-y-0.5"
                style={{
                  left: profileMenuStyle.left,
                  bottom: profileMenuStyle.bottom,
                  width: profileMenuStyle.width,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    showToast('个人中心：账号资料与偏好设置（演示）。');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-neutral-100/50 flex items-center gap-2.5 font-medium text-neutral-800 transition cursor-pointer"
                >
                  <User size={14} className="text-neutral-500 shrink-0" />
                  <span>个人中心</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskCenter(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-neutral-100/50 flex items-center gap-2.5 font-medium text-neutral-800 transition cursor-pointer"
                >
                  <Calendar size={14} className="text-neutral-500 shrink-0" />
                  <span>任务中心</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (SUPPORT_EMAIL) {
                      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=帮助中心`;
                    } else {
                      showToast('帮助中心（演示）。');
                    }
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-neutral-100/50 flex items-center gap-2.5 font-medium text-neutral-800 transition cursor-pointer"
                >
                  <HelpCircle size={14} className="text-neutral-500 shrink-0" />
                  <span>帮助中心</span>
                </button>
                <div className="my-1 border-t border-neutral-200/60" />
                <button
                  type="button"
                  onClick={() => {
                    showToast('已退出登录（演示）。');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-destructive/10 flex items-center gap-2.5 text-destructive font-medium transition cursor-pointer"
                >
                  <LogOut size={14} className="shrink-0" />
                  <span>退出登录</span>
                </button>
              </div>
            </>,
            document.body,
          )}
      </div>

    </div>
  );
};
