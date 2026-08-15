import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeToggle } from '@/components/theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/date';
import { formatIDR, parseMoney } from '@/lib/money';
import { formatPercentDelta } from '@/lib/number';

/**
 * Scaffold landing screen: a live check that the token layer, the type scale,
 * dark mode and the money/date/number formatters all render correctly on every
 * platform. Replaced by the real routes as the app is built out.
 */
export default function ScaffoldScreen() {
  const { toast } = useToast();

  // Straight off the wire: a decimal string, parsed once to integer rupiah.
  const revenue = parseMoney('15750000.00');

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="gap-2xl p-lg tablet:p-3xl desktop:mx-auto desktop:w-full desktop:max-w-[1200px]">
        <View className="gap-md tablet:flex-row tablet:items-center tablet:justify-between">
          <View className="gap-xs">
            <Text variant="display">POS</Text>
            <Text variant="body" tone="muted">
              Kerangka aplikasi siap. Tema, token, dan format angka sudah aktif.
            </Text>
          </View>
          <ThemeToggle />
        </View>

        <Card>
          <CardHeader>
            <CardTitle>Pendapatan hari ini</CardTitle>
            <CardDescription>Diperbarui {formatDateTime(new Date())}</CardDescription>
          </CardHeader>
          <CardContent className="gap-md">
            {/* Money is mono, tabular, and never shows a decimal. */}
            <Text variant="display" className="type-mono tabular-nums">
              {formatIDR(revenue)}
            </Text>
            <View className="flex-row items-center gap-sm">
              <Badge variant="success">
                <Text>Naik {formatPercentDelta(12.5)}</Text>
              </Badge>
              <Text variant="caption" tone="subtle">
                dibanding kemarin
              </Text>
            </View>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skala tipografi</CardTitle>
          </CardHeader>
          <CardContent className="gap-sm">
            <Text variant="h1">Heading 1 — 24/32</Text>
            <Text variant="h2">Heading 2 — 18/26</Text>
            <Text variant="h3">Heading 3 — 15/22</Text>
            <Text variant="body">Body — 14/20</Text>
            <Text variant="body-strong">Body strong — 14/20</Text>
            <Text variant="label">Label — 13/18</Text>
            <Text variant="caption" tone="muted">
              Caption — 12/16
            </Text>
            <Separator className="my-sm" />
            {/* Tabular figures: these two rows must align digit for digit. */}
            <Text variant="mono">{formatIDR(15750000)}</Text>
            <Text variant="mono">{formatIDR(1111111)}</Text>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Setiap status punya label, bukan warna saja.</CardDescription>
          </CardHeader>
          <CardContent className="flex-row flex-wrap gap-sm">
            <Badge variant="success">
              <Text>Aktif</Text>
            </Badge>
            <Badge variant="warning">
              <Text>Stok menipis</Text>
            </Badge>
            <Badge variant="danger">
              <Text>Habis</Text>
            </Badge>
            <Badge variant="neutral">
              <Text>Nonaktif</Text>
            </Badge>
          </CardContent>
        </Card>

        <View className="gap-md tablet:flex-row">
          <Button
            className="tablet:flex-1"
            onPress={() =>
              toast({
                title: 'Tersimpan',
                description: 'Perubahan berhasil disimpan.',
                variant: 'success',
              })
            }
          >
            <Text>Uji notifikasi</Text>
          </Button>
          <Button variant="outline" className="tablet:flex-1">
            <Text>Tombol sekunder</Text>
          </Button>
        </View>

        <View className="gap-sm">
          <Text variant="label" tone="muted">
            Status memuat
          </Text>
          <Skeleton className="h-16 w-full" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
