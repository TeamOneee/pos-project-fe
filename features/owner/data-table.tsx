/**
 * A small table for the analytics screens.
 *
 * Below tablet it stops being a table and becomes stacked cards, per §7.3 of
 * the brief: the first column stays the identifier, everything else becomes a
 * labelled line. A table that scrolls sideways on a phone is not a table
 * anyone reads.
 */

import * as React from 'react';
import { View } from 'react-native';

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
      <View className="items-center py-xl">
        <Text variant="body" tone="muted">
          {emptyMessage ?? 'Tidak ada data.'}
        </Text>
      </View>
    );
  }

  if (stacked) {
    const [first, ...rest] = columns;

    return (
      <View className="gap-md">
        {rows.map((row) => (
          <View key={keyOf(row)} className="gap-xs rounded-md border border-border p-md">
            {first && <View>{first.render(row)}</View>}
            {rest.map((column) => (
              <View key={column.key} className="flex-row items-center justify-between gap-md">
                <Text variant="caption" tone="subtle">
                  {column.label}
                </Text>
                {column.render(row)}
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row gap-md border-b border-border pb-sm">
        {columns.map((column) => (
          <View
            key={column.key}
            style={{ flex: column.weight ?? 1 }}
            className={cn(column.align === 'right' && 'items-end')}
          >
            <Text variant="caption" tone="subtle">
              {column.label}
            </Text>
          </View>
        ))}
      </View>

      {rows.map((row) => (
        <View
          key={keyOf(row)}
          className="flex-row items-center gap-md border-b border-border py-md"
        >
          {columns.map((column) => (
            <View
              key={column.key}
              style={{ flex: column.weight ?? 1 }}
              className={cn(column.align === 'right' && 'items-end')}
            >
              {column.render(row)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
