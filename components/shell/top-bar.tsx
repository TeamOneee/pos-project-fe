/**
 * The 64px top bar: page title on the left, contextual controls on the right.
 *
 * The controls are a portal host rather than a prop, so a screen can put its
 * own outlet or period selector up here without the shell knowing what those
 * are. See shell-context.tsx.
 */

import { PortalHost } from '@rn-primitives/portal';
import { View } from 'react-native';

import { TOP_BAR_ACTIONS_HOST } from '@/components/shell/shell-context';
import { Text } from '@/components/ui/text';

export function TopBar({ title }: { title: string }) {
  return (
    <View className="h-16 flex-row items-center justify-between gap-md border-b border-border bg-surface px-lg">
      <Text variant="h2" numberOfLines={1} className="min-w-0 flex-1">
        {title}
      </Text>

      <View className="flex-row items-center gap-sm">
        <PortalHost name={TOP_BAR_ACTIONS_HOST} />
      </View>
    </View>
  );
}
