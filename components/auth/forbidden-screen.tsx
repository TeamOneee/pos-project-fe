/**
 * The 403 screen (design brief §7.2).
 *
 * A full page, not a toast or an empty table: the user asked for a route they
 * cannot have, and the honest answer is a dead end with a way back. The way
 * back is the role's own landing route, which is guaranteed to be reachable.
 */

import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { landingRoute, ROLE_LABEL, type Role } from '@/lib/auth/permissions';

export function ForbiddenScreen({ role }: { role: Role }) {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-canvas p-xl">
      <View className="w-full max-w-[400px] items-center gap-lg">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-danger-subtle">
          <Icon as={Lock} size={28} className="text-danger" />
        </View>

        <View className="gap-xs">
          <Text variant="h1" className="text-center">
            Akses ditolak
          </Text>
          <Text variant="body" tone="muted" className="text-center">
            Anda tidak memiliki akses ke halaman ini.
          </Text>
        </View>

        {/* Naming the role makes it obvious this is a permission boundary
            rather than a broken link. */}
        <Text variant="caption" tone="subtle" className="text-center">
          Anda masuk sebagai {ROLE_LABEL[role]}.
        </Text>

        <Button className="w-full" onPress={() => router.replace(landingRoute(role) as never)}>
          <Text>Kembali ke halaman utama</Text>
        </Button>
      </View>
    </View>
  );
}
