import * as React from 'react';
import { useCallback, useContext, createContext } from 'react';
import { showAppToast } from '@/lib/appToast';

const AppToastContext = createContext<(message: string) => void>(() => {});

/** 编辑器画布等独立模块复用 Sonner Toast */
export function AppToastProvider({ children }: { children: React.ReactNode }) {
  const show = useCallback((message: string) => {
    showAppToast(message, 'info');
  }, []);

  return <AppToastContext.Provider value={show}>{children}</AppToastContext.Provider>;
}

export function useAppToast() {
  return useContext(AppToastContext);
}
