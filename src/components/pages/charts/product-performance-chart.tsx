/** Product performance bars, always the top 8 by the selected metric. */

import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { GRID_OPACITY, useChartColors } from '@/lib/chart-colors';
import { ChartTip, type ChartTipRow } from '@/components/pages/charts/chart-tooltip';
import { formatCount } from '@/lib/number';
import { formatIDR, formatIDRCompactUnit, type Rupiah } from '@/lib/money';

export type PerformanceMetric = 'REVENUE' | 'QUANTITY';

export type PerformancePoint = {
  label: string;
  fullLabel: string;
  revenue: Rupiah;
  quantity: number;
};

type ProductPerformanceChartProps = {
  points: PerformancePoint[];
  metric: PerformanceMetric;
  width: number;
  height: number;
};

type TipEntry = {
  payload?: { fullLabel?: string; revenue?: number; quantity?: number };
};

type TipProps = { active?: boolean; payload?: TipEntry[] };

function PerformanceTip({ active, payload }: TipProps) {
  const colors = useChartColors();

  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const product = entry.payload?.fullLabel ?? '';
  const rows: ChartTipRow[] = [];
  if (entry.payload?.revenue !== undefined) {
    rows.push({
      color: colors.barHighlight,
      label: 'Omzet',
      value: formatIDR(entry.payload.revenue),
    });
  }
  if (entry.payload?.quantity !== undefined) {
    rows.push({ color: colors.bar, label: 'Terjual', value: formatCount(entry.payload.quantity) });
  }

  return <ChartTip title={product} rows={rows} />;
}

function truncateLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 13)}\u2026` : label;
}

export function ProductPerformanceChart({
  points,
  metric,
  width,
  height,
}: ProductPerformanceChartProps) {
  const colors = useChartColors();

  const data = points.slice(0, 8).map((point) => ({
    label: truncateLabel(point.label),
    fullLabel: point.label,
    revenue: point.revenue,
    quantity: point.quantity,
    fill: colors.bar,
  }));

  return (
    <BarChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      <CartesianGrid vertical={false} stroke={colors.grid} strokeOpacity={GRID_OPACITY} />
      <XAxis
        dataKey="label"
        interval={0}
        angle={-20}
        textAnchor="end"
        tickLine={false}
        axisLine={false}
        tick={{ fill: colors.axis, fontSize: 11 }}
        height={48}
      />
      <YAxis
        tickFormatter={(value: number) =>
          metric === 'REVENUE' ? formatIDRCompactUnit(value) : formatCount(value)
        }
        tickLine={false}
        axisLine={false}
        tick={{ fill: colors.axis, fontSize: 12 }}
        width={64}
      />
      <Tooltip content={<PerformanceTip />} cursor={{ fill: colors.grid, fillOpacity: 0.08 }} />
      <Bar dataKey={metric === 'REVENUE' ? 'revenue' : 'quantity'} radius={[2, 2, 0, 0]}>
        {data.map((entry, index) => (
          <Cell key={entry.fullLabel} fill={entry.fill} opacity={index === 0 ? 1 : 0.9} />
        ))}
      </Bar>
    </BarChart>
  );
}
