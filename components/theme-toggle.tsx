import { Monitor, Moon, Sun } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { useTheme, type ThemePreference } from '@/components/theme-provider';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Terang', icon: Sun },
  { value: 'dark', label: 'Gelap', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
];

/**
 * Three-way theme control. Each option carries its own label, so the active
 * state is never conveyed by colour alone (CLAUDE.md rule 6).
 */
function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Tema tampilan"
      className={cn('flex-row items-center gap-xs rounded-md bg-subtle p-xs', className)}
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => setPreference(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, checked: active }}
            accessibilityLabel={option.label}
            className={cn(
              'min-h-touch flex-row items-center gap-sm rounded-sm px-md py-sm',
              active ? 'bg-surface shadow-sm' : 'web:hover:bg-border/50'
            )}
          >
            <Icon as={option.icon} size={16} className={active ? 'text-accent' : 'text-fg-muted'} />
            <Text variant="label" tone={active ? 'default' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export { ThemeToggle };
