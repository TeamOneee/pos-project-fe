/**
 * Form-level error banner (design brief §7.2): an icon and one plain sentence,
 * never a bare coloured border.
 */

import { CircleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function FormBanner({ message }: { message: string }) {
  return (
    <View
      role="alert"
      accessibilityLiveRegion="polite"
      className="flex-row items-start gap-md rounded-md bg-danger-subtle p-md"
    >
      <Icon as={CircleAlert} size={18} className="text-danger" />
      <Text variant="body" tone="danger" className="min-w-0 flex-1">
        {message}
      </Text>
    </View>
  );
}
