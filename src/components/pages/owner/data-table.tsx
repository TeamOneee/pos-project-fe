/**
 * A small table for the analytics screens.
 *
 * Below tablet it stops being a table and becomes stacked cards, per §7.3 of
 * the brief: the first column stays the identifier, everything else becomes a
 * labelled line. A table that scrolls sideways on a phone is not a table
 * anyone reads.
 */

import * as React from 'react';

import { Text } from '@/components/ui/text';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Flex weight; defaults to 1. */
  weight?: number;
  render: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  emptyMessage?: string;
};

export function DataTable<T>({ columns, rows, keyOf, emptyMessage }: DataTableProps<T>) {
  const stacked = useBreakpoint() === 'mobile';

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-xl">
        <Text variant="body" tone="muted">
          {emptyMessage ?? 'Tidak ada data.'}
        </Text>
      </div>
    );
  }

  if (stacked) {
    const [first, ...rest] = columns;

    return (
      <div className="flex flex-col gap-md">
        {rows.map((row) => (
          <div
            key={keyOf(row)}
            className="flex flex-col gap-xs rounded-md border border-border p-md"
          >
            {first && <div>{first.render(row)}</div>}
            {rest.map((column) => (
              <div key={column.key} className="flex flex-row items-center justify-between gap-md">
                <Text variant="caption" tone="subtle">
                  {column.label}
                </Text>
                {column.render(row)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row gap-md border-b border-border pb-sm">
        {columns.map((column) => (
          <div
            key={column.key}
            style={{ flex: column.weight ?? 1 }}
            className={cn(column.align === 'right' && 'flex items-end justify-end')}
          >
            <Text variant="caption" tone="subtle">
              {column.label}
            </Text>
          </div>
        ))}
      </div>

      {rows.map((row) => (
        <div
          key={keyOf(row)}
          className="flex flex-row items-center gap-md border-b border-border py-md"
        >
          {columns.map((column) => (
            <div
              key={column.key}
              style={{ flex: column.weight ?? 1 }}
              className={cn(column.align === 'right' && 'flex items-end justify-end')}
            >
              {column.render(row)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
