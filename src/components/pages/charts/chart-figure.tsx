/** The text alternative every chart in this app ships with. */

import * as React from 'react';

import { Text } from '@/components/ui/text';

export type ChartSeries = {
  /** Column header, e.g. "Omzet". */
  label: string;
  /** One formatted value per row, in row order. */
  values: string[];
};

export function ChartFigure({
  /** Announced by assistive tech in place of the SVG. */
  summary,
  /** Row labels — usually the x axis. */
  rowLabels,
  rowHeader = 'Periode',
  series,
  tableLabel = 'Lihat data sebagai tabel',
  children,
}: {
  summary: string;
  rowLabels: string[];
  rowHeader?: string;
  series: ChartSeries[];
  tableLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="m-0 flex flex-col gap-sm">
      {/* The chart itself: one image with one description. */}
      <div role="img" aria-label={summary}>
        {children}
      </div>

      {rowLabels.length > 0 && (
        <details className="group">
          <summary className="flex min-h-touch cursor-pointer list-none items-center rounded-md px-sm focus-ring">
            <Text variant="caption" tone="accent">
              {tableLabel}
            </Text>
          </summary>

          <div className="mt-sm overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">{summary}</caption>
              <thead>
                <tr>
                  <th scope="col" className="border-b border-border py-sm pr-md">
                    <Text variant="caption" tone="muted">
                      {rowHeader}
                    </Text>
                  </th>
                  {series.map((column) => (
                    <th
                      key={column.label}
                      scope="col"
                      className="border-b border-border py-sm pr-md"
                    >
                      <Text variant="caption" tone="muted">
                        {column.label}
                      </Text>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowLabels.map((label, index) => (
                  <tr key={`${label}-${index}`}>
                    <th scope="row" className="border-b border-border py-sm pr-md font-normal">
                      <Text variant="caption">{label}</Text>
                    </th>
                    {series.map((column) => (
                      <td key={column.label} className="border-b border-border py-sm pr-md">
                        <Text variant="mono">{column.values[index] ?? '—'}</Text>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </figure>
  );
}
