/**
 * The current breakpoint, from CLAUDE.md: mobile <768, tablet 768–1279,
 * desktop ≥1280.
 *
 * Styling should use the `tablet:` and `desktop:` Tailwind variants wherever it
 * can. This hook is for the cases where the *structure* changes rather than the
 * styling — a sidebar becoming an icon rail becoming a tab bar is three
 * different trees, not one tree with different classes.
 */

import { useWindowDimensions } from 'react-native';

import { BREAKPOINTS } from '@/lib/tokens';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();

  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}
