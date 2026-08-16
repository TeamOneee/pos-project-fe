/**
 * Average order value over the period. Kept as a single line: no fill, no
 * second axis, dots only at data points so the direction is what the eye
 * follows.
 */

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { GRID_OPACITY, useChartColors } from '@/lib/chart-colors';
import { ChartTip, type ChartTipRow } from '@/components/pages/charts/chart-tooltip';
import { formatIDR, formatIDRCompactUnit, type Rupiah } from '@/lib/money';

export type AovPoint = { label: string; aov: Rupiah };

type AovLineChartProps = {
  points: AovPoint[];
  width: number;
  height: number;
  compact?: boolean;
};

type TipEntry = { dataKey?: string | number; value?: number | string };

type TipProps = { active?: boolean; payload?: TipEntry[]; label?: string | number };

function AovTip({ active, payload, label }: TipProps) {
  const colors = useChartColors();

  if (!active || !payload || payload.length === 0) return null;

  const entry = payload.find((item) => item.dataKey === 'aov');
  const rows: ChartTipRow[] = [];
  if (entry?.value !== undefined) {
    rows.push({ color: colors.revenue, label: 'AOV', value: formatIDR(Number(entry.value)) });
  }

  return <ChartTip title={label === undefined ? undefined : String(label)} rows={rows} />;
}

export function AovLineChart({ points, width, height, compact = false }: AovLineChartProps) {
  const colors = useChartColors();

  const step = compact ? Math.max(1, Math.ceil(points.length / 4)) : 1;
  const tickValues = points
    .map((point, index) => (index % step === 0 ? point.label : null))
    .filter((label): label is string => label !== null);

  return (
    <LineChart
      width={width}
      height={height}
      data={points}
      margin={{ top: 16, right: 8, bottom: 0, left: 8 }}
    >
      <CartesianGrid vertical={false} stroke={colors.grid} strokeOpacity={GRID_OPACITY} />
      <XAxis
        dataKey="label"
        ticks={tickValues}
        interval={0}
        tickLine={false}
        axisLine={false}
        tick={{ fill: colors.axis, fontSize: 12 }}
        height={32}
      />
      <YAxis
        tickFormatter={(value: number) => formatIDRCompactUnit(value)}
        tickLine={false}
        axisLine={false}
        tick={{ fill: colors.axis, fontSize: 12 }}
        width={64}
      />
      <Tooltip content={<AovTip />} cursor={{ stroke: colors.grid }} />
      <Line
        dataKey="aov"
        type="monotone"
        stroke={colors.revenue}
        strokeWidth={2}
        dot={{ r: compact ? 2 : 3, fill: colors.revenue, strokeWidth: 0 }}
        activeDot={{ r: 4 }}
      />
    </LineChart>
  );
}
