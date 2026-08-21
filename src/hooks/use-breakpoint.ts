/** The current breakpoint, from CLAUDE.md: mobile <768, tablet 768–1279, desktop ≥1280. */

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
