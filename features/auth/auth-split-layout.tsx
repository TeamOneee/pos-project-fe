/**
 * The split layout behind login and register (design brief S-01).
 *
 * Accent panel on the left at desktop carrying the wordmark and tagline, form
 * column on the right. Below tablet the panel is dropped entirely rather than
 * stacked — it is decoration, and on a phone it would push the form under the
 * fold.
 */

import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 flex-row bg-canvas" edges={['top', 'bottom']}>
      <View className="hidden justify-between bg-accent p-3xl desktop:flex desktop:w-[40%]">
        <Text variant="h2" tone="on-accent">
          POS
        </Text>

        <View className="gap-md">
          <Text variant="display" tone="on-accent">
            Jual hari ini. Pahami bisnismu besok.
          </Text>
          <Text variant="body" className="text-white/70">
            Satu aplikasi untuk kasir, stok, dan laporan seluruh outlet Anda.
          </Text>
        </View>

        <Text variant="caption" className="text-white/50">
          IndoMart Retail
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow items-center justify-center p-lg tablet:p-3xl"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[400px] gap-xl">{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}
