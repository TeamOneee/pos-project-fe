/**
 * Row 4 — what sells and what does not.
 *
 * The recommendation badges are the API's enum translated for the screen. The
 * mapping lives here rather than in the mock so a value the backend adds later
 * still renders as something, rather than as a raw enum member.
 */

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Segmented } from '@/components/pages/owner/controls';
import type { OwnerDashboard, RankedProduct } from '@/services/dashboard';
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
  products: OwnerDashboard['topProducts'];
  className?: string;
}) {
  const [sort, setSort] = React.useState<Sort>('REVENUE');
  const rows = sort === 'REVENUE' ? products.byRevenue : products.byQuantity;

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
        {rows.map((product) => (
          <TopProductRow key={`${sort}-${product.productId}`} product={product} />
        ))}
      </CardContent>
    </Card>
  );
}

function TopProductRow({ product }: { product: RankedProduct }) {
  return (
    <div className="flex flex-row items-center gap-md">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle">
        <Text variant="caption" tone="accent">
          {product.rank}
        </Text>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-xs">
        <Text variant="body-strong" className="truncate">
          {product.productName}
        </Text>
        <Text variant="caption" tone="subtle" className="truncate">
          {product.categoryName}
        </Text>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-xs">
        <Text variant="body-strong" className="tabular-nums">
          {formatIDR(product.totalRevenue)}
        </Text>
        <Text variant="caption" tone="subtle">
          {formatCount(product.totalQuantitySold)} terjual
        </Text>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Underperforming                                                             */
/* -------------------------------------------------------------------------- */

/** The API's enum, in the words the brief puts on the badge. */
const RECOMMENDATION_LABEL: Record<string, string> = {
  PROMOTION: 'PROMOSI',
  DISCOUNT: 'TURUNKAN HARGA',
  TRANSFER: 'PINDAH OUTLET',
  BUNDLE: 'PROMOSI',
  DISCONTINUE: 'TURUNKAN HARGA',
};

export function UnderperformingCard({
  products,
  className,
}: {
  products: OwnerDashboard['underperformingProducts'];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Produk Kurang Laku</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-lg">
        {products.map((product) => (
          <div key={product.productId} className="flex flex-col gap-sm">
            <div className="flex flex-row items-start justify-between gap-md">
              <div className="flex min-w-0 flex-1 flex-col gap-xs">
                <Text variant="body-strong" className="truncate">
                  {product.productName}
                </Text>
                <Text variant="caption" tone="subtle" className="truncate">
                  {product.categoryName}
                </Text>
              </div>

              <Badge variant="warning">
                <Text>{RECOMMENDATION_LABEL[product.recommendation] ?? 'PROMOSI'}</Text>
              </Badge>
            </div>

            <div className="flex flex-row flex-wrap gap-lg">
              <Figure label="Terjual" value={formatCount(product.totalQuantitySold)} />
              <Figure label="Omzet" value={formatIDR(product.totalRevenue)} />
              <Figure label="Stok" value={formatCount(product.stockLevel)} />
              <Figure
                label="Terakhir terjual"
                value={`${formatCount(product.daysWithoutSale)} hari lalu`}
                tone="warning"
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Figure({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="flex flex-col gap-xs">
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text
        variant="caption"
        tone={tone === 'warning' ? 'warning' : 'default'}
        className="tabular-nums"
      >
        {value}
      </Text>
    </div>
  );
}
