import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme, type ThemePreference } from '@/components/ui/theme-provider';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
];

/**
 * Three-way theme control. Each option carries its own label, so the active state is never conveyed
 * by colour alone (CLAUDE.md rule 6).
 */
function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  // The "Sistem" option is hidden while system-following is disabled (light is the starting theme).
  const options = OPTIONS.filter((option) => option.value !== 'system');

  return (
    <div
      role="radiogroup"
      aria-label="Tema tampilan"
      className={cn('flex flex-row items-center gap-xs rounded-md bg-subtle p-xs', className)}
    >
      {options.map((option) => {
        const active = preference === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            onClick={() => setPreference(option.value)}
            className={cn(
              'flex min-h-touch flex-row items-center gap-sm rounded-sm px-md py-sm transition-colors',
              active ? 'bg-surface shadow-sm' : 'hover:bg-border/50'
            )}
          >
            <Icon as={option.icon} size={16} className={active ? 'text-accent' : 'text-fg-muted'} />
            <Text variant="label" tone={active ? 'default' : 'muted'}>
              {option.label}
            </Text>
          </button>
        );
      })}
    </div>
  );
}

export { ThemeToggle };
