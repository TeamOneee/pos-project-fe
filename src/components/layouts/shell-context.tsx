/** The top bar's two slots: a page title and a place for contextual controls. */

import * as React from 'react';

type ShellContextValue = {
  titleOverride: string | null;
  setTitleOverride: (title: string | null) => void;
  topBarActions: React.ReactNode;
  setTopBarActions: (actions: React.ReactNode) => void;
  /** The desktop sidebar is collapsed (hidden); the header toggle restores it. */
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [titleOverride, setTitleOverride] = React.useState<string | null>(null);
  const [topBarActions, setTopBarActions] = React.useState<React.ReactNode>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const value = React.useMemo(
    () => ({
      titleOverride,
      setTitleOverride,
      topBarActions,
      setTopBarActions,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [titleOverride, topBarActions, sidebarCollapsed]
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

function useShell(): ShellContextValue {
  const context = React.useContext(ShellContext);
  if (!context) throw new Error('useShell must be used inside ShellProvider');
  return context;
}

export function useTopBarTitleOverride(): string | null {
  return useShell().titleOverride;
}

export function useTopBarActionsValue(): React.ReactNode {
  return useShell().topBarActions;
}

/** Sets the top bar title for as long as the screen is mounted. */
export function useTopBarTitle(title: string): void {
  const { setTitleOverride } = useShell();

  React.useEffect(() => {
    setTitleOverride(title);
    return () => setTitleOverride(null);
  }, [title, setTitleOverride]);
}

/** Renders contextual controls in the top bar for as long as the screen is mounted. */
export function useTopBarActions(actions: React.ReactNode | null): void {
  const { setTopBarActions } = useShell();

  React.useEffect(() => {
    setTopBarActions(actions);
    return () => setTopBarActions(null);
  }, [actions, setTopBarActions]);
}

/** Whether the desktop sidebar is currently collapsed. */
export function useSidebarCollapsed(): boolean {
  return useShell().sidebarCollapsed;
}

/** Collapse or expand the desktop sidebar. */
export function useSetSidebarCollapsed(): (collapsed: boolean) => void {
  return useShell().setSidebarCollapsed;
}
