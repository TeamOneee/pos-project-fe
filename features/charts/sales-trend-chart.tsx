/**
 * Revenue and transaction count on one pair of axes.
 *
 * Revenue is the subject: a solid accent line over an 8% fill. Transaction
 * count is context, so it is thinner, dashed, and scaled onto the same plot
 * area against its own right-hand axis — the two measure different things and
 * sharing a scale would make one of them unreadable.
 */

import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryScatter,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory-native';

import { AREA_OPACITY, GRID_OPACITY, useChartColors } from '@/features/charts/chart-colors';
import { formatIDRCompactUnit, type Rupiah } from '@/lib/money';
import { formatCount } from '@/lib/number';

export type TrendPoint = { label: string; revenue: Rupiah; transactions: number };

type SalesTrendChartProps = {
  points: TrendPoint[];
  width: number;
  height: number;
  /** Fewer ticks on a narrow chart, or the labels collide. */
  compact?: boolean;
};

export function SalesTrendChart({ points, width, height, compact = false }: SalesTrendChartProps) {
  const colors = useChartColors();

  const revenueMax = Math.max(...points.map((point) => point.revenue), 1);
  const countMax = Math.max(...points.map((point) => point.transactions), 1);

  // The count series is projected onto the revenue scale so both can share one
  // plot area; the right axis relabels it back to counts.
  const scaleCount = (value: number) => (value / countMax) * revenueMax;

  const revenueData = points.map((point, index) => ({
    x: index + 1,
    y: point.revenue,
    tooltip: `${point.label}\nOmzet ${formatIDRCompactUnit(point.revenue)}`,
  }));
  const countData = points.map((point, index) => ({
    x: index + 1,
    y: scaleCount(point.transactions),
    tooltip: `${point.label}\n${formatCount(point.transactions)} transaksi`,
  }));

  const tickStep = compact ? Math.ceil(points.length / 4) : 1;
  const tickValues = points
    .map((_, index) => index + 1)
    .filter((_, index) => index % tickStep === 0);

  return (
    <VictoryChart
      width={width}
      height={height}
      padding={{ top: 16, right: 56, bottom: 32, left: 64 }}
      domainPadding={{ x: 12, y: 12 }}
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
        tickFormat={(value: number) => points[value - 1]?.label ?? ''}
        style={axisStyle(colors)}
      />

      <VictoryAxis
        dependentAxis
        tickFormat={(value: number) => formatIDRCompactUnit(Math.round(value))}
        style={{ ...axisStyle(colors), grid: { stroke: colors.grid, strokeOpacity: GRID_OPACITY } }}
      />

      {/* Right-hand axis relabels the projected series back to real counts. */}
      <VictoryAxis
        dependentAxis
        orientation="right"
        tickFormat={(value: number) => formatCount(Math.round((value / revenueMax) * countMax))}
        style={axisStyle(colors)}
      />

      <VictoryArea
        data={revenueData}
        interpolation="monotoneX"
        style={{ data: { fill: colors.revenue, fillOpacity: AREA_OPACITY, stroke: 'none' } }}
      />

      <VictoryLine
        data={revenueData}
        interpolation="monotoneX"
        style={{ data: { stroke: colors.revenue, strokeWidth: 2 } }}
      />

      <VictoryLine
        data={countData}
        interpolation="monotoneX"
        style={{
          data: { stroke: colors.transactions, strokeWidth: 1.5, strokeDasharray: '4,4' },
        }}
      />

      {/* Points give a press target on touch, where there is no hover. */}
      <VictoryScatter
        data={revenueData}
        size={compact ? 2 : 3}
        style={{ data: { fill: colors.revenue } }}
      />
    </VictoryChart>
  );
}

function axisStyle(colors: ReturnType<typeof useChartColors>) {
  return {
    axis: { stroke: 'transparent' },
    tickLabels: { fill: colors.axis, fontSize: 12, padding: 6 },
    ticks: { stroke: 'transparent' },
    grid: { stroke: 'transparent' },
  };
}
