/** The small figure strip that sits under an analytics chart. */

import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

export type SummaryTile = { label: string; value: string };

export function SummaryTiles({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <div className="flex flex-row flex-wrap gap-md">
      {tiles.map((tile) => (
        <Card key={tile.label} className="min-w-[140px] flex-1 basis-full tablet:basis-0">
          <CardContent className="flex flex-col gap-xs pt-lg">
            <Text variant="caption" tone="subtle">
              {tile.label}
            </Text>
            <Text variant="h2" className="block truncate tabular-nums">
              {tile.value}
            </Text>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
