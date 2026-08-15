import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory-native';

import { GRID_OPACITY, useChartColors } from '@/features/charts/chart-colors';
import { formatIDR, formatIDRCompactUnit, type Rupiah } from '@/lib/money';
import { formatCount } from '@/lib/number';

export type ProductBarPoint = {
  label: string;
  revenue: Rupiah;
  quantity: number;
};

export function ProductPerformanceChart({
  points,
  metric,
  width,
  height,
}: {
  points: ProductBarPoint[];
  metric: 'REVENUE' | 'QUANTITY';
  width: number;
  height: number;
}) {
  const colors = useChartColors();
  const data = points.slice(0, 8).map((point, index) => ({
    x: index + 1,
    y: metric === 'REVENUE' ? point.revenue : point.quantity,
    tooltip:
      metric === 'REVENUE'
        ? `${point.label}\n${formatIDR(point.revenue)}`
        : `${point.label}\n${formatCount(point.quantity)} terjual`,
  }));

  return (
    <VictoryChart
      width={width}
      height={height}
      padding={{ top: 16, right: 16, bottom: 48, left: 64 }}
      domainPadding={{ x: 20 }}
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
        tickValues={data.map((point) => point.x)}
        tickFormat={(value: number) => truncate(points[value - 1]?.label ?? '')}
        style={{
          axis: { stroke: 'transparent' },
          tickLabels: { fill: colors.axis, fontSize: 12, padding: 8, angle: -20 },
          ticks: { stroke: 'transparent' },
          grid: { stroke: 'transparent' },
        }}
      />
      <VictoryAxis
        dependentAxis
        tickFormat={(value: number) =>
          metric === 'REVENUE'
            ? formatIDRCompactUnit(Math.round(value))
            : formatCount(Math.round(value))
        }
        style={{
          axis: { stroke: 'transparent' },
          tickLabels: { fill: colors.axis, fontSize: 12, padding: 6 },
          ticks: { stroke: 'transparent' },
          grid: { stroke: colors.grid, strokeOpacity: GRID_OPACITY },
        }}
      />
      <VictoryBar
        data={data}
        cornerRadius={{ top: 3 }}
        barRatio={0.7}
        style={{ data: { fill: colors.revenue } }}
      />
    </VictoryChart>
  );
}

function truncate(value: string): string {
  return value.length > 10 ? `${value.slice(0, 9)}…` : value;
}
