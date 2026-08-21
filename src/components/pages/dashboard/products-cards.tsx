/** Row 4 — what sells and what does not. */

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Segmented } from '@/components/pages/owner/controls';
import type { ProductRank } from '@/services/dashboard';
import { formatIDR } from '@/lib/money';
import { formatCount } from '@/lib/number';

/* -------------------------------------------------------------------------- */
/* Top products                                                                */
/* -------------------------------------------------------------------------- */

const SORTS = ['REVENUE', 'QUANTITY'] as const;
type Sort = (typeof SORTS)[number];

const SORT_LABELS: Record<Sort, string> = {
  REVENUE: 'Berdasarkan Omzet',
  QUANTITY: 'Berdasarkan Kuantitas',
};

export function TopProductsCard({
  products,
  className,
}: {
  products: ProductRank[];
  className?: string;
}) {
  const [sort, setSort] = React.useState<Sort>('REVENUE');

  const rows = React.useMemo(
    () =>
      [...products].sort((a, b) =>
        sort === 'REVENUE' ? b.omzet - a.omzet : b.unitsSold - a.unitsSold
      ),
    [products, sort]
  );

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-md">
        <CardTitle>Produk Terlaris</CardTitle>
        <Segmented
          options={SORTS}
          value={sort}
          onChange={setSort}
          labels={SORT_LABELS}
          accessibilityLabel="Urutkan produk terlaris"
        />
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        {rows.length === 0 ? (
          <Text variant="body" tone="muted">
            Belum ada penjualan pada periode ini.
          </Text>
        ) : (
          rows.map((product, index) => (
            <ProductRow key={product.productId} rank={index + 1} product={product} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Underperforming                                                             */
/* -------------------------------------------------------------------------- */

export function UnderperformingCard({
  products,
  className,
}: {
  products: ProductRank[];
  className?: string;
}) {
  // Weakest first: this card is read from the top like the other one, so the worst seller has to be
  // the first row rather than the last.
  const rows = React.useMemo(() => [...products].sort((a, b) => a.omzet - b.omzet), [products]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Produk Kurang Laku</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-md">
        {rows.length === 0 ? (
          <Text variant="body" tone="muted">
            Belum ada penjualan pada periode ini.
          </Text>
        ) : (
          rows.map((product, index) => (
            <ProductRow key={product.productId} rank={index + 1} product={product} tone="warning" />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared                                                                      */
/* -------------------------------------------------------------------------- */

function ProductRow({
  rank,
  product,
  tone = 'accent',
}: {
  rank: number;
  product: ProductRank;
  tone?: 'accent' | 'warning';
}) {
  return (
    <div className="flex flex-row items-center gap-md">
      <div
        className={
          tone === 'warning'
            ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning-subtle'
            : 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle'
        }
      >
        <Text variant="caption" tone={tone === 'warning' ? 'warning' : 'accent'}>
          {rank}
        </Text>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <Text variant="body-strong" className="truncate">
          {product.name}
        </Text>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-xs">
        <Text variant="body-strong" className="tabular-nums">
          {formatIDR(product.omzet)}
        </Text>
        <Text variant="caption" tone="subtle">
          {formatCount(product.unitsSold)} terjual
        </Text>
      </div>
    </div>
  );
}
