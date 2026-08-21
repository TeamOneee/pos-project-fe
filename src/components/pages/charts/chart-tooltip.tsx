/**
 * Presentational tooltip shell shared by every chart. Charts pass their own rows; the shell owns
 * nothing except placement and the resolved palette, so tooltips stay visually identical across the
 * four chart kinds.
 */

import { useChartColors } from '@/lib/chart-colors';

export type ChartTipRow = { color: string; label: string; value: string };

type ChartTipProps = {
  title?: string;
  rows: ChartTipRow[];
};

export function ChartTip({ title, rows }: ChartTipProps) {
  const colors = useChartColors();

  return (
    <div
      className="rounded-md p-sm shadow-lg"
      style={{ backgroundColor: colors.surface, border: `1px solid ${colors.grid}` }}
    >
      {title ? (
        <div className="mb-xs text-xs font-medium" style={{ color: colors.text }}>
          {title}
        </div>
      ) : null}
      <div className="flex flex-col gap-xs">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-sm">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="text-xs" style={{ color: colors.axis }}>
              {row.label}
            </span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: colors.text }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
