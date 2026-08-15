/**
 * Row 3 right — the shape of the trading day, with the API's peak hours picked
 * out in accent.
 */

import { Lightbulb } from 'lucide-react-native';
import { View } from 'react-native';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ChartFrame } from '@/features/charts/chart-frame';
import { HourlyBarChart } from '@/features/charts/hourly-bar-chart';
import type { OwnerDashboard } from '@/lib/api/domains/dashboard';

export function TimePatternCard({
  pattern,
  height,
  compact,
  className,
}: {
  pattern: OwnerDashboard['timePattern'];
  height: number;
  compact: boolean;
  className?: string;
}) {
  const points = pattern.hourlyDistribution.map((point) => ({
    hour: point.hour,
    revenue: point.revenue,
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Pola Waktu Penjualan</CardTitle>
      </CardHeader>

      <CardContent className="gap-md">
        <ChartFrame height={height}>
          {(width) => (
            <HourlyBarChart
              points={points}
              peakHours={pattern.peakHours}
              width={width}
              height={height}
              compact={compact}
            />
          )}
        </ChartFrame>

        <View className="gap-xs">
          {pattern.insights.map((insight) => (
            <View key={insight} className="flex-row items-start gap-sm">
              <Icon as={Lightbulb} size={14} className="text-warning" />
              <Text variant="caption" tone="muted" className="min-w-0 flex-1">
                {insight}
              </Text>
            </View>
          ))}

          <View className="flex-row items-start gap-sm">
            <Icon as={Lightbulb} size={14} className="text-warning" />
            <Text variant="caption" tone="muted" className="min-w-0 flex-1">
              {pattern.busiestDay} adalah hari tersibuk, {pattern.quietestDay} paling sepi.
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
