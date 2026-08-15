/**
 * Stand-in for a screen that has not been built yet.
 *
 * Deliberately says so rather than showing an empty table, so nobody mistakes
 * an unbuilt screen for a screen with no data. Each of these is replaced by its
 * real spec (S-04 … S-22) as the screens land.
 */

import { Construction } from 'lucide-react-native';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

type ScreenPlaceholderProps = {
  title: string;
  /** The spec this screen will implement, e.g. "S-11". */
  spec: string;
  description: string;
  /** Shown when the role can look but not touch. */
  readOnly?: boolean;
};

export function ScreenPlaceholder({
  title,
  spec,
  description,
  readOnly = false,
}: ScreenPlaceholderProps) {
  return (
    <View className="flex-1 items-center justify-center bg-canvas p-xl">
      <View className="w-full max-w-[420px] items-center gap-md">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-subtle">
          <Icon as={Construction} size={24} className="text-fg-subtle" />
        </View>

        <Text variant="h2" className="text-center">
          {title}
        </Text>

        <Text variant="body" tone="muted" className="text-center">
          {description}
        </Text>

        <View className="flex-row gap-sm">
          <Badge variant="neutral">
            <Text>{spec}</Text>
          </Badge>
          {readOnly && (
            <Badge variant="accent">
              <Text>Hanya baca</Text>
            </Badge>
          )}
        </View>
      </View>
    </View>
  );
}
