/**
 * Row 4 — what sells and what does not.
 *
 * The recommendation badges are the API's enum translated for the screen. The
 * mapping lives here rather than in the mock so a value the backend adds later
 * still renders as something, rather than as a raw enum member.
 */

import * as React from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Segmented } from '@/features/owner/controls';
import type { OwnerDashboard, RankedProduct } from '@/lib/api/domains/dashboard';
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
      <CardHeader className="gap-md">
        <CardTitle>Produk Terlaris</CardTitle>
        <Segmented
          options={SORTS}
          value={sort}
          onChange={setSort}
          labels={SORT_LABELS}
          accessibilityLabel="Urutkan produk terlaris"
        />
      </CardHeader>

      <CardContent className="gap-md">
        {rows.map((product) => (
          <TopProductRow key={`${sort}-${product.productId}`} product={product} />
        ))}
      </CardContent>
    </Card>
  );
}

function TopProductRow({ product }: { product: RankedProduct }) {
  return (
    <View className="flex-row items-center gap-md">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-accent-subtle">
        <Text variant="caption" tone="accent">
          {product.rank}
        </Text>
      </View>

      <View className="min-w-0 flex-1 gap-xs">
        <Text variant="body-strong" numberOfLines={1}>
          {product.productName}
        </Text>
        <Text variant="caption" tone="subtle" numberOfLines={1}>
          {product.categoryName}
        </Text>
      </View>

      <View className="items-end gap-xs">
        <Text variant="mono" className="type-body-strong">
          {formatIDR(product.totalRevenue)}
        </Text>
        <Text variant="caption" tone="subtle">
          {formatCount(product.totalQuantitySold)} terjual
        </Text>
      </View>
    </View>
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

      <CardContent className="gap-lg">
        {products.map((product) => (
          <View key={product.productId} className="gap-sm">
            <View className="flex-row items-start justify-between gap-md">
              <View className="min-w-0 flex-1 gap-xs">
                <Text variant="body-strong" numberOfLines={1}>
                  {product.productName}
                </Text>
                <Text variant="caption" tone="subtle" numberOfLines={1}>
                  {product.categoryName}
                </Text>
              </View>

              <Badge variant="warning">
                <Text>{RECOMMENDATION_LABEL[product.recommendation] ?? 'PROMOSI'}</Text>
              </Badge>
            </View>

            <View className="flex-row flex-wrap gap-lg">
              <Figure label="Terjual" value={formatCount(product.totalQuantitySold)} />
              <Figure label="Omzet" value={formatIDR(product.totalRevenue)} />
              <Figure label="Stok" value={formatCount(product.stockLevel)} />
              <Figure
                label="Terakhir terjual"
                value={`${formatCount(product.daysWithoutSale)} hari lalu`}
                tone="warning"
              />
            </View>
          </View>
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
    <View className="gap-xs">
      <Text variant="caption" tone="subtle">
        {label}
      </Text>
      <Text
        variant="mono"
        tone={tone === 'warning' ? 'warning' : 'default'}
        className="type-caption"
      >
        {value}
      </Text>
    </View>
  );
}
