/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { DemoGuide } from './components/DemoGuide';
import { MarketPage } from './components/MarketPage';
import { EmployeeManagePage } from './components/EmployeeManagePage';
import { KnowledgeBasePage } from './components/KnowledgeBasePage';
import { SkillPage } from './components/SkillPage';
import { ABTestingPage } from './components/ABTestingPage';
import { StaffManagePage } from './components/StaffManagePage';
import { RoleManagePage } from './components/RoleManagePage';
import { WorkspacePage } from './components/WorkspacePage';
import { QcWorkspacePage } from './components/QcWorkspacePage';
import { CustomerExperiencePage } from './components/CustomerExperiencePage';
import { DashboardPage } from './components/DashboardPage';
import { SessionRecordsPage } from './components/SessionRecordsPage';
import { AppToaster } from '@/components/ui/sonner';
import { TaskCenterHost } from './components/TaskCenterHost';
import { ResizableSplitPane } from './components/common/ResizableSplitPane';
import { ToastPreviewPanel } from './components/common/ToastPreviewPanel';
import { NavIconCatalog } from './components/NavIconCatalog';

const AppContent: React.FC = () => {
  const {
    activeTab,
    activeOnboardingAgentId,
    setActiveOnboardingAgentId,
    hiredAgents,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useApp();

  useEffect(() => {
    if (activeOnboardingAgentId && !hiredAgents.some((a) => a.id === activeOnboardingAgentId)) {
      setActiveOnboardingAgentId(null);
    }
  }, [activeOnboardingAgentId, hiredAgents, setActiveOnboardingAgentId]);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'market':
        return <MarketPage />;
      case 'employees':
        return <EmployeeManagePage />;
      case 'kb':
        return <KnowledgeBasePage />;
      case 'skills':
        return <SkillPage />;
      case 'abTest':
        return <ABTestingPage />;
      case 'staff':
        return <StaffManagePage />;
      case 'roles':
        return <RoleManagePage />;
      case 'workspace':
        return <WorkspacePage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'sessions':
        return <SessionRecordsPage />;
      default:
        return <MarketPage />;
    }
  };

  if (activeTab === 'workspace') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white font-sans antialiased text-neutral-800">
        <WorkspacePage />
      </div>
    );
  }

  if (activeTab === 'qcWorkspace') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white font-sans antialiased text-neutral-800">
        <QcWorkspacePage />
      </div>
    );
  }

  if (activeTab === 'customerExperience') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white font-sans antialiased text-neutral-800">
        <CustomerExperiencePage />
      </div>
    );
  }

  if (activeOnboardingAgentId) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white font-sans antialiased text-neutral-800">
        <EmployeeManagePage />
        <DemoGuide />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans antialiased text-neutral-800">
      <ResizableSplitPane
        storageKey="js_app_shell_split"
        defaultLeftPx={232}
        minLeftPx={168}
        minRightPx={360}
        collapsed={sidebarCollapsed}
        collapsedLeftPx={52}
        collapseThresholdPx={168}
        onCollapsedChange={setSidebarCollapsed}
        className="w-full h-full"
        left={<Navigation />}
        right={
          <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative bg-white">
            {renderActivePage()}
            <DemoGuide />
          </div>
        }
      />
    </div>
  );
};

const ToastPreviewHost: React.FC = () => {
  const { showToast } = useApp();
  const toastPreview = new URLSearchParams(window.location.search).get('toastPreview') === '1';
  if (!toastPreview) return null;
  return <ToastPreviewPanel showToast={showToast} />;
};

const NavIconCatalogHost: React.FC = () => {
  const [open, setOpen] = useState(() => window.location.hash === '#nav-icons');

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === '#nav-icons');
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  if (!open) return null;
  return (
    <NavIconCatalog
      onClose={() => {
        const { pathname, search } = window.location;
        window.history.replaceState(null, '', `${pathname}${search}`);
        setOpen(false);
      }}
    />
  );
};

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AppProvider>
        <AppContent />
        <TaskCenterHost />
        <ToastPreviewHost />
        <NavIconCatalogHost />
        <AppToaster duration={2500} />
      </AppProvider>
    </ThemeProvider>
  );
}
