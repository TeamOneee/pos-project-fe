/**
 * The split layout behind login and register (design brief S-01).
 *
 * Accent panel on the left at desktop carrying the wordmark and tagline, form
 * column on the right. Below desktop the panel is dropped entirely rather than
 * stacked — it is decoration, and on a phone it would push the form under the
 * fold.
 */

import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const ROTATING_PHRASES = [
  'Jual hari ini. Pahami bisnismu besok.',
  'Kelola stok tanpa ribet.',
  'Laporan cerdas untuk keputusan tepat.',
];

function useRotatingPhrase(intervalMs = 3000) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % ROTATING_PHRASES.length), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return { phrase: ROTATING_PHRASES[index], index };
}

function RotatingHeadline({
  variant = 'display',
  className,
  activeIndex,
}: {
  variant?: 'display' | 'h2' | 'h1';
  className?: string;
  activeIndex: number;
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {ROTATING_PHRASES.map((p, i) => (
        <Text
          key={p}
          variant={variant}
          tone="on-accent"
          className={cn(
            'w-full transition-all duration-500',
            variant === 'display' ? 'leading-tight' : 'leading-tight',
            i === activeIndex
              ? 'relative translate-y-0 opacity-100'
              : 'absolute inset-0 translate-y-2 opacity-0 pointer-events-none'
          )}
          aria-hidden={i !== activeIndex}
        >
          {p}
        </Text>
      ))}
    </div>
  );
}

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  const { index: phraseIndex } = useRotatingPhrase();

  return (
    <div className="flex h-full flex-col bg-accent desktop:flex-row desktop:bg-canvas desktop:p-4 desktop:gap-4">
      {/* Desktop: accent panel on the left — 50% + gap + rounded */}
      <div className="hidden w-1/2 flex-col justify-between bg-accent p-3xl desktop:flex desktop:rounded-2xl">
        <Text variant="h2" tone="on-accent">
          POS
        </Text>

        <div className="flex flex-col gap-md">
          <RotatingHeadline variant="display" activeIndex={phraseIndex} />
          <Text variant="body" className="text-white/70">
            Satu aplikasi untuk kasir, stok, dan laporan seluruh outlet Anda.
          </Text>
          <div className="flex gap-1.5 pt-sm">
            {ROTATING_PHRASES.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === phraseIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                )}
              />
            ))}
          </div>
        </div>

        <Text variant="caption" className="text-white/50">
          IndoMart Retail
        </Text>
      </div>

      {/* Mobile: top 25% primary header */}
      <div className="flex h-[30%] min-h-[170px] shrink-0 flex-col justify-center bg-accent px-lg py-lg desktop:hidden">
        <Text variant="h2" tone="on-accent">
          POS
        </Text>

        <div className="flex flex-1 flex-col justify-center gap-xs py-2">
          <RotatingHeadline variant="h1" className="min-h-[56px]" activeIndex={phraseIndex} />
          <Text variant="caption" className="text-white/70">
            Satu aplikasi untuk kasir, stok, dan laporan seluruh outlet Anda.
          </Text>
          <div className="flex gap-1 pt-xs">
            {ROTATING_PHRASES.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === phraseIndex ? 'w-5 bg-white' : 'w-1 bg-white/40'
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom 75% — white sheet with rounded top on mobile, 50% card on desktop */}
      <div className="flex flex-1 flex-col overflow-y-auto rounded-t-[24px] bg-surface p-lg tablet:p-3xl desktop:w-1/2 desktop:flex-none desktop:rounded-2xl desktop:bg-surface desktop:shadow-sm">
        {/* Mobile: pills at top of bottom sheet — moved from top section to bottom */}
        <div className="mx-auto flex w-full max-w-[400px] gap-sm rounded-full bg-subtle p-1 desktop:hidden">
          <NavLink
            to="/login"
            className={({ isActive }) =>
              cn(
                'flex-1 rounded-full py-2.5 text-center text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-fg-muted hover:bg-surface hover:text-fg'
              )
            }
          >
            Masuk
          </NavLink>
          <NavLink
            to="/register"
            className={({ isActive }) =>
              cn(
                'flex-1 rounded-full py-2.5 text-center text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-fg-muted hover:bg-surface hover:text-fg'
              )
            }
          >
            Daftar
          </NavLink>
        </div>

        {/* `m-auto` rather than justify-center on the parent: a centered flex
            child taller than the viewport clips its top and cannot be scrolled
            to. Auto margins centre when the form fits and collapse to the top,
            scrollable, when it does not. */}
        <div className="m-auto flex w-full max-w-[400px] flex-col gap-xl">{children}</div>
      </div>
    </div>
  );
}
