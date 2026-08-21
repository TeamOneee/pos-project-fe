/** The `⋯` menu at the end of a table row. */

import { MoreHorizontal } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type RowMenuItem = {
  label: string;
  onSelect: () => void;
  /** Destructive actions read in danger colour *and* say what they do. */
  tone?: 'default' | 'danger';
};

export function RowMenu({
  items,
  /** Names the row, e.g. "Menu untuk Coca-Cola 1.5L". */
  label,
  className,
}: {
  items: RowMenuItem[];
  label: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const container = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={container} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-touch w-touch items-center justify-center rounded-md outline-none transition-colors hover:bg-subtle focus-ring"
      >
        <Icon as={MoreHorizontal} size={18} className="text-fg-muted" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-40 mt-xs flex min-w-[240px] flex-col rounded-md border border-border bg-surface-raised p-xs shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className="flex min-h-touch flex-row items-center rounded-sm px-md text-left outline-none transition-colors hover:bg-subtle focus-visible:bg-subtle"
            >
              <Text variant="body" tone={item.tone === 'danger' ? 'danger' : 'default'}>
                {item.label}
              </Text>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
