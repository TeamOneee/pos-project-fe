/**
 * Revenue by hour of day. Peak hours are singled out in accent so the busy
 * window reads before the shape does. Every other bar falls back to the quiet
 * border colour so it sits back and doesn't compete with the peaks.
 */

import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { GRID_OPACITY, useChartColors } from '@/lib/chart-colors';
import { ChartTip, type ChartTipRow } from '@/components/pages/charts/chart-tooltip';
import { formatIDR, formatIDRCompactUnit, type Rupiah } from '@/lib/money';

export type HourPoint = { hour: number; revenue: Rupiah };

type HourlyBarChartProps = {
  points: HourPoint[];
  peakHours: number[];
  width: number;
  height: number;
  compact?: boolean;
};

type TipEntry = {
  payload?: { hour?: number; revenue?: number; fullLabel?: string };
  value?: number | string;
};

type TipProps = { active?: boolean; payload?: TipEntry[] };

function HourlyTip({ active, payload }: TipProps) {
  const colors = useChartColors();

  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  const hour = entry.payload?.hour;
  const revenue = entry.payload?.revenue;

  const rows: ChartTipRow[] = [];
  if (hour !== undefined) {
    rows.push({ color: colors.barHighlight, label: 'Jam', value: `${hour}.00` });
  }
  if (revenue !== undefined) {
    rows.push({ color: colors.bar, label: 'Omzet', value: formatIDR(revenue) });
  }

  return <ChartTip rows={rows} />;
}

export function HourlyBarChart({
  points,
  peakHours,
  width,
  height,
  compact = false,
}: HourlyBarChartProps) {
  const colors = useChartColors();
  const peakSet = new Set(peakHours);

  const data = points.map((point) => ({
    hour: point.hour,
    revenue: point.revenue,
    fill: peakSet.has(point.hour) ? colors.barHighlight : colors.bar,
  }));

  // Compact charts draw every other hour so labels don't crowd.
  const tickValues = points
    .map((point, index) => (compact ? (index % 2 === 0 ? point.hour : null) : point.hour))
    .filter((hour): hour is number => hour !== null);

  return (
    <BarChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
    >
      <CartesianGrid vertical={false} stroke={colors.grid} strokeOpacity={GRID_OPACITY} />
      <XAxis
        dataKey="hour"
        ticks={tickValues}
        interval={0}
        tickFormatter={(hour: number) => String(hour).padStart(2, '0')}
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
      <Tooltip content={<HourlyTip />} cursor={{ fill: colors.grid, fillOpacity: 0.08 }} />
      <Bar dataKey="revenue" radius={[2, 2, 0, 0]}>
        {data.map((entry) => (
          <Cell key={entry.hour} fill={entry.fill} />
        ))}
      </Bar>
    </BarChart>
  );
}
