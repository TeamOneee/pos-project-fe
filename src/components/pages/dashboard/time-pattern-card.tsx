/**
 * Row 3 right — the shape of the trading day, with the API's peak hours picked
 * out in accent.
 */

import { Lightbulb } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ChartFrame } from '@/components/pages/charts/chart-frame';
import { HourlyBarChart } from '@/components/pages/charts/hourly-bar-chart';
import type { OwnerDashboard } from '@/services/dashboard';

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

      <CardContent className="flex flex-col gap-md">
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

        <div className="flex flex-col gap-xs">
          {pattern.insights.map((insight) => (
            <div key={insight} className="flex flex-row items-start gap-sm">
              <Icon as={Lightbulb} size={14} className="mt-px shrink-0 text-warning" />
              <Text variant="caption" tone="muted" className="min-w-0 flex-1">
                {insight}
              </Text>
            </div>
          ))}

          <div className="flex flex-row items-start gap-sm">
            <Icon as={Lightbulb} size={14} className="mt-px shrink-0 text-warning" />
            <Text variant="caption" tone="muted" className="min-w-0 flex-1">
              {pattern.busiestDay} adalah hari tersibuk, {pattern.quietestDay} paling sepi.
            </Text>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
