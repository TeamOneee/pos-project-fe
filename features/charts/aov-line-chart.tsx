/**
 * Average order value over a handful of periods.
 *
 * Deliberately plain: four or five points, one line, no fill. The headline
 * figure above the chart is what gets read; this only has to show the shape.
 */

import {
  VictoryAxis,
  VictoryChart,
  VictoryLine,
  VictoryScatter,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory-native';

import { GRID_OPACITY, useChartColors } from '@/features/charts/chart-colors';
import { formatIDRCompactUnit, type Rupiah } from '@/lib/money';

export type AovPoint = { label: string; aov: Rupiah };

type AovLineChartProps = {
  points: AovPoint[];
  width: number;
  height: number;
};

export function AovLineChart({ points, width, height }: AovLineChartProps) {
  const colors = useChartColors();
  const data = points.map((point, index) => ({
    x: index + 1,
    y: point.aov,
    tooltip: `${point.label}\nRp ${formatIDRCompactUnit(point.aov)}`,
  }));

  return (
    <VictoryChart
      width={width}
      height={height}
      padding={{ top: 16, right: 16, bottom: 32, left: 64 }}
      domainPadding={{ x: 16, y: 16 }}
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
        tickValues={points.map((_, index) => index + 1)}
        tickFormat={(value: number) => points[value - 1]?.label ?? ''}
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

      <VictoryLine
        data={data}
        interpolation="monotoneX"
        style={{ data: { stroke: colors.revenue, strokeWidth: 2 } }}
      />
      <VictoryScatter data={data} size={3} style={{ data: { fill: colors.revenue } }} />
    </VictoryChart>
  );
}
