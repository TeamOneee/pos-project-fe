/**
 * Revenue by hour of the day.
 *
 * Peak hours are painted in accent and everything else in border-strong, so
 * the shape of the trading day is readable before any label is. The peak set
 * comes from the API rather than being derived here — the backend decides what
 * counts as a peak.
 */

import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory-native';

import { GRID_OPACITY, useChartColors } from '@/features/charts/chart-colors';
import { formatIDRCompactUnit, type Rupiah } from '@/lib/money';

export type HourPoint = { hour: number; revenue: Rupiah };

type HourlyBarChartProps = {
  points: HourPoint[];
  peakHours: number[];
  width: number;
  height: number;
  compact?: boolean;
};

export function HourlyBarChart({
  points,
  peakHours,
  width,
  height,
  compact = false,
}: HourlyBarChartProps) {
  const colors = useChartColors();
  const peaks = new Set(peakHours);

  const data = points.map((point) => ({
    x: point.hour,
    y: point.revenue,
    fill: peaks.has(point.hour) ? colors.barHighlight : colors.bar,
    tooltip: `${String(point.hour).padStart(2, '0')}.00\nRp ${formatIDRCompactUnit(point.revenue)}`,
  }));

  // Every other hour at narrow widths, or the labels overlap.
  const tickValues = points
    .map((point) => point.hour)
    .filter((_, index) => (compact ? index % 2 === 0 : true));

  return (
    <VictoryChart
      width={width}
      height={height}
      padding={{ top: 16, right: 16, bottom: 32, left: 64 }}
      domainPadding={{ x: compact ? 8 : 16 }}
      containerComponent={
        <VictoryVoronoiContainer
          voronoiDimension="x"
          labels={({ datum }: { datum: { tooltip?: string } }) => datum.tooltip ?? ''}
          labelComponent={
            <VictoryTooltip
              cornerRadius={6}
              flyoutStyle={{ fill: colors.surface, stroke: colors.grid }}
              style={{ fill: colors.text, fontSize: 12 }}
            />
          }
        />
      }
    >
      <VictoryAxis
        tickValues={tickValues}
        tickFormat={(value: number) => String(value).padStart(2, '0')}
        style={{
          axis: { stroke: 'transparent' },
          tickLabels: { fill: colors.axis, fontSize: 12, padding: 6 },
          ticks: { stroke: 'transparent' },
          grid: { stroke: 'transparent' },
        }}
      />

      <VictoryAxis
        dependentAxis
        tickFormat={(value: number) => formatIDRCompactUnit(Math.round(value))}
        style={{
          axis: { stroke: 'transparent' },
          tickLabels: { fill: colors.axis, fontSize: 12, padding: 6 },
          ticks: { stroke: 'transparent' },
          grid: { stroke: colors.grid, strokeOpacity: GRID_OPACITY },
        }}
      />

      <VictoryBar
        data={data}
        cornerRadius={{ top: 2 }}
        barRatio={0.8}
        style={{ data: { fill: ({ datum }) => datum?.fill ?? colors.bar } }}
      />
    </VictoryChart>
  );
}
