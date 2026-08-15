/**
 * The top bar's two slots: a page title and a place for contextual controls.
 *
 * The title defaults to the active nav item's label, so most screens set
 * nothing. A screen whose heading is not its nav label — a transaction detail,
 * say — overrides it with `useTopBarTitle`.
 *
 * Controls go through a portal rather than context state. An outlet selector is
 * a React element; putting elements in state and updating them from an effect
 * means either a stale slot or a render loop, and a portal has neither problem.
 */

import { Portal } from '@rn-primitives/portal';
import * as React from 'react';

export const TOP_BAR_ACTIONS_HOST = 'top-bar-actions';

type ShellContextValue = {
  titleOverride: string | null;
  setTitleOverride: (title: string | null) => void;
};

const ShellContext = React.createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [titleOverride, setTitleOverride] = React.useState<string | null>(null);

  const value = React.useMemo(() => ({ titleOverride, setTitleOverride }), [titleOverride]);

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

/** Sets the top bar title for as long as the screen is mounted. */
export function useTopBarTitle(title: string): void {
  const { setTitleOverride } = useShell();

  React.useEffect(() => {
    setTitleOverride(title);
    return () => setTitleOverride(null);
  }, [title, setTitleOverride]);
}

/**
 * Renders its children into the top bar's control slot.
 *
 *   <TopBarActions name="dashboard-filters">
 *     <PeriodSelect />
 *   </TopBarActions>
 */
export function TopBarActions({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <Portal name={name} hostName={TOP_BAR_ACTIONS_HOST}>
      {children}
    </Portal>
  );
}
