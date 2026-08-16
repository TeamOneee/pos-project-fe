/**
 * The current breakpoint, from CLAUDE.md: mobile <768, tablet 768–1279,
 * desktop ≥1280.
 *
 * Styling should use the `tablet:` and `desktop:` Tailwind variants wherever it
 * can. This hook is for the cases where the *structure* changes rather than the
 * styling — a sidebar becoming an icon rail becoming a tab bar is three
 * different trees, not one tree with different classes.
 */

import * as React from 'react';

import { BREAKPOINTS } from '@/lib/tokens';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function readBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>(() =>
    readBreakpoint(typeof window === 'undefined' ? 0 : window.innerWidth)
  );

  React.useEffect(() => {
    const onChange = () => setBreakpoint(readBreakpoint(window.innerWidth));
    onChange();
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  }, []);

  return breakpoint;
}
