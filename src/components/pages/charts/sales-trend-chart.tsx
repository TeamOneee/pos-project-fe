/**
 * Sales trend over the period: revenue as a filled area under a solid line on
 * the left axis, transaction count as a dashed line projected on the right
 * axis. Projection keeps the two series from sharing scale; the dashed style
 * is how the reader tells count from money at a glance.
 *
 * To compact charts only every Nth x tick is drawn so labels never collide.
 */

import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import { AREA_OPACITY, GRID_OPACITY, useChartColors } from '@/lib/chart-colors';
import { ChartTip, type ChartTipRow } from '@/components/pages/charts/chart-tooltip';
import { formatCount } from '@/lib/number';
import { formatIDR, formatIDRCompactUnit, type Rupiah } from '@/lib/money';

export type TrendPoint = { label: string; revenue: Rupiah; transactions: number };

type SalesTrendChartProps = {
  points: TrendPoint[];
  width: number;
  height: number;
  compact?: boolean;
};

type TipEntry = {
  dataKey?: string | number;
  value?: number | string;
};

type TipProps = { active?: boolean; payload?: TipEntry[]; label?: string | number };

function SalesTrendTip({ active, payload, label }: TipProps) {
  const colors = useChartColors();

  if (!active || !payload || payload.length === 0) return null;

  const revenue = payload.find((entry) => entry.dataKey === 'revenue');
  const count = payload.find((entry) => entry.dataKey === 'transactions');

  const rows: ChartTipRow[] = [];
  if (revenue?.value !== undefined) {
    rows.push({ color: colors.revenue, label: 'Omzet', value: formatIDR(Number(revenue.value)) });
  }
  if (count?.value !== undefined) {
    rows.push({
      color: colors.transactions,
      label: 'Transaksi',
      value: formatCount(Number(count.value)),
    });
  }

  return <ChartTip title={label === undefined ? undefined : String(label)} rows={rows} />;
}

export function SalesTrendChart({ points, width, height, compact = false }: SalesTrendChartProps) {
  const colors = useChartColors();

  // Skip labels when compact so the ticks stay legible; skip twice the rate
  // if there are so many points that even the quarter still crowds.
  const step = compact ? Math.max(1, Math.ceil(points.length / 4)) : 1;
  const tickValues = points
    .map((point, index) => (index % step === 0 ? point.label : null))
    .filter((label): label is string => label !== null);

  const countMax = Math.max(...points.map((point) => point.transactions), 1);

  return (
    <ComposedChart
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
        yAxisId="revenue"
        tickFormatter={(value: number) => formatIDRCompactUnit(value)}
        tickLine={false}
        axisLine={false}
        tick={{ fill: colors.axis, fontSize: 12 }}
        width={64}
      />
      <YAxis
        yAxisId="count"
        orientation="right"
        domain={[0, countMax]}
        tickFormatter={(value: number) => formatCount(value)}
        tickLine={false}
        axisLine={false}
        tick={{ fill: colors.axis, fontSize: 12 }}
        width={48}
      />
      <Tooltip content={<SalesTrendTip />} cursor={{ stroke: colors.grid }} />
      <Area
        yAxisId="revenue"
        dataKey="revenue"
        type="monotone"
        stroke="none"
        fill={colors.revenue}
        fillOpacity={AREA_OPACITY}
      />
      <Line
        yAxisId="revenue"
        dataKey="revenue"
        type="monotone"
        stroke={colors.revenue}
        strokeWidth={2}
        dot={{ r: compact ? 2 : 3, fill: colors.revenue, strokeWidth: 0 }}
        activeDot={{ r: 4 }}
      />
      <Line
        yAxisId="count"
        dataKey="transactions"
        type="monotone"
        stroke={colors.transactions}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        dot={false}
      />
    </ComposedChart>
  );
}
