/** The small figure strip that sits under an analytics chart. */

import { View } from 'react-native';

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

export type SummaryTile = { label: string; value: string };

export function SummaryTiles({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <View className="flex-row flex-wrap gap-md">
      {tiles.map((tile) => (
        <Card
          key={tile.label}
          className="min-w-[140px] flex-1 basis-[calc(50%-8px)] tablet:basis-0"
        >
          <CardContent className="gap-xs pt-lg">
            <Text variant="caption" tone="subtle" numberOfLines={2}>
              {tile.label}
            </Text>
            <Text variant="mono" className="type-h2" numberOfLines={1} adjustsFontSizeToFit>
              {tile.value}
            </Text>
          </CardContent>
        </Card>
      ))}
    </View>
  );
}
