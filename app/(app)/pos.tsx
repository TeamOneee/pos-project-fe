/**
 * S-16 · Cashier POS.
 *
 * Chromeless at every breakpoint — no sidebar, no icon rail, no bottom tabs.
 * It is the screen the product exists for, it needs the whole viewport, and it
 * carries its own top bar. AppShell knows this route by name.
 *
 * The product grid and cart panel land with the POS slice; what is here now is
 * the frame they sit in, so the layout and the navigation out of it are real.
 */

import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/components/auth/auth-provider';
import { UserChip } from '@/components/shell/user-chip';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { ScreenPlaceholder } from '@/features/placeholder/screen-placeholder';
import { useOutlet } from '@/hooks/use-outlets';

export default function PosScreen() {
  const { outletId } = useAuth();

  // The cashier needs their outlet's name for the top bar. The contract scopes
  // GET /outlets/{id} to the Owner, so this can fail against a real backend —
  // the badge simply does not render when it does. Worth a backend ticket:
  // a cashier has no endpoint that reliably names their own outlet.
  const outlet = useOutlet(outletId ?? undefined);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <View className="h-16 flex-row items-center justify-between gap-md border-b border-border bg-surface px-lg">
        <View className="min-w-0 flex-row items-center gap-md">
          <Text variant="body-strong" numberOfLines={1}>
            Kasir
          </Text>
          {outlet.data && (
            <Badge variant="neutral">
              <Text numberOfLines={1}>{outlet.data.name}</Text>
            </Badge>
          )}
        </View>

        <View className="flex-row items-center gap-md">
          <Link href="/transactions" asChild>
            <Pressable role="link" className="min-h-touch justify-center px-md active:opacity-70">
              <Text variant="body-strong" tone="accent">
                Riwayat
              </Text>
            </Pressable>
          </Link>
          <UserChip compact placement="below" />
        </View>
      </View>

      <ScreenPlaceholder
        title="Layar Kasir"
        spec="S-16"
        description="Pencarian produk, grid produk per kategori, dan keranjang dengan checkout."
      />
    </SafeAreaView>
  );
}
