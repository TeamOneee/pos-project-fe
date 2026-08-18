/**
 * Row 3 right — the shape of the trading day, with the busiest hours picked out
 * in accent.
 *
 * §6.2 reports `points[{ hour_of_day, omzet, transaction_count }]` and nothing
 * else: no peak-hour list, no prose insights, no busiest/quietest **day** —
 * this endpoint buckets by hour of day, not by weekday, so there was never a
 * day to name. The peaks below are therefore derived from the points on screen,
 * and the sentence about the busiest weekday is gone rather than invented.
 */

import { Lightbulb } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ChartFigure } from '@/components/pages/charts/chart-figure';
import { ChartFrame } from '@/components/pages/charts/chart-frame';
import { HourlyBarChart } from '@/components/pages/charts/hourly-bar-chart';
import type { TimePattern } from '@/services/dashboard';
import { formatIDR } from '@/lib/money';

/** How many hours count as "peak" — enough to see a shape, few enough to mean it. */
const PEAK_COUNT = 3;

export function TimePatternCard({
  pattern,
  height,
  compact,
  className,
}: {
  pattern: TimePattern;
  height: number;
  compact: boolean;
  className?: string;
}) {
  const points = pattern.points.map((point) => ({
    hour: point.hourOfDay,
    revenue: point.omzet,
  }));

  const peakHours = peaksOf(points);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Pola Waktu Penjualan</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        <ChartFigure
          summary={`Omzet per jam sepanjang hari. Jam tersibuk: ${
            peakHours.length > 0 ? peakHours.map((hour) => `${hour}.00`).join(', ') : 'belum ada'
          }.`}
          rowHeader="Jam"
          rowLabels={points.map((point) => `${point.hour}.00`)}
          series={[{ label: 'Omzet', values: points.map((point) => formatIDR(point.revenue)) }]}
        >
          <ChartFrame height={height}>
            {(width) => (
              <HourlyBarChart
                points={points}
                peakHours={peakHours}
                width={width}
                height={height}
                compact={compact}
              />
            )}
          </ChartFrame>
        </ChartFigure>

        {peakHours.length > 0 && (
          <div className="flex flex-row items-start gap-sm">
            <Icon as={Lightbulb} size={14} className="mt-px shrink-0 text-warning" />
            <Text variant="caption" tone="muted" className="min-w-0 flex-1">
              {`Omzet tertinggi terjadi pada jam ${peakHours
                .map((hour) => `${hour}.00`)
                .join(', ')}.`}
            </Text>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** The busiest hours by revenue, back in clock order so the chart reads left to right. */
function peaksOf(points: { hour: number; revenue: number }[]): number[] {
  return [...points]
    .filter((point) => point.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, PEAK_COUNT)
    .map((point) => point.hour)
    .sort((a, b) => a - b);
}
