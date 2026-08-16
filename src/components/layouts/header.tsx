/**
 * The 64px header: page title on the left, contextual controls on the right.
 *
 * The controls slot is filled by screens through the shell context.
 */

import { Text } from '@/components/ui/text';

export function Header({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between gap-md border-b border-border bg-surface px-lg">
      <Text variant="h2" className="min-w-0 flex-1 truncate">
        {title}
      </Text>

      <div className="flex items-center gap-sm">{actions}</div>
    </header>
  );
}
