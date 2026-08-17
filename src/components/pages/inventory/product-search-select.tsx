/**
 * A searchable product picker for the transfer and bulk-update modals.
 *
 * A plain select is wrong here: a merchant with a few hundred SKUs cannot scan
 * a dropdown, and both modals are opened with a product already in mind. So it
 * is a search field over the active catalogue, matching name or SKU, with the
 * chosen product shown as a summary the user can clear.
 *
 * The catalogue is fetched once and filtered in memory rather than issuing a
 * request per keystroke — the list is small enough, and the results have to
 * keep up with typing.
 */

import { Search, X } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useProducts } from '@/hooks/use-products';
import type { Product } from '@/services/products';
import { cn } from '@/lib/utils';

/** One page is plenty for a UMKM catalogue, and keeps the filter in memory. */
const CATALOGUE_LIMIT = 200;

export type PickedProduct = { productId: string; name: string; sku: string };

export function ProductSearchSelect({
  value,
  onChange,
  disabled = false,
  invalid = false,
  /** Products already chosen elsewhere, hidden from the results. */
  excludeIds = [],
  placeholder = 'Cari produk atau SKU…',
  autoFocus = false,
}: {
  value: PickedProduct | null;
  onChange: (product: PickedProduct | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  excludeIds?: readonly string[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = React.useState('');
  const products = useProducts({ status: 'ACTIVE', limit: CATALOGUE_LIMIT });

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = products.data?.items ?? [];
    const excluded = new Set(excludeIds);

    return items
      .filter((product) => !excluded.has(product.productId))
      .filter(
        (product) =>
          !needle ||
          product.name.toLowerCase().includes(needle) ||
          product.sku.toLowerCase().includes(needle)
      )
      .slice(0, 8);
  }, [products.data, query, excludeIds]);

  if (value) {
    return (
      <div className="flex flex-row items-center justify-between gap-md rounded-md border border-border bg-subtle px-md py-sm">
        <div className="flex min-w-0 flex-col">
          <Text variant="body-strong" className="truncate">
            {value.name}
          </Text>
          {value.sku ? (
            <Text variant="caption" tone="muted">
              {value.sku}
            </Text>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Ganti produk"
          disabled={disabled}
          onClick={() => {
            setQuery('');
            onChange(null);
          }}
          className="flex h-touch w-touch shrink-0 items-center justify-center rounded-md outline-none hover:bg-border focus-ring disabled:opacity-50"
        >
          <Icon as={X} size={16} className="text-fg-muted" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="relative">
        <Icon
          as={Search}
          size={16}
          className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-fg-subtle"
        />
        <Input
          value={query}
          autoFocus={autoFocus}
          disabled={disabled}
          invalid={invalid}
          placeholder={placeholder}
          aria-label="Cari produk"
          onChange={(event) => setQuery(event.target.value)}
          className="w-full pl-[36px]"
        />
      </div>

      <div className="max-h-[200px] overflow-y-auto rounded-md border border-border">
        {products.isPending ? (
          <Row muted>Memuat produk…</Row>
        ) : matches.length === 0 ? (
          <Row muted>{query ? 'Produk tidak ditemukan.' : 'Belum ada produk aktif.'}</Row>
        ) : (
          matches.map((product) => (
            <button
              key={product.productId}
              type="button"
              onClick={() => onChange(toPicked(product))}
              className={cn(
                'flex w-full min-h-touch flex-row items-center justify-between gap-md px-md py-sm text-left',
                'outline-none transition-colors hover:bg-subtle focus-visible:bg-subtle'
              )}
            >
              <Text variant="body" className="min-w-0 truncate">
                {product.name}
              </Text>
              <Text variant="caption" tone="subtle">
                {product.sku}
              </Text>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function toPicked(product: Product): PickedProduct {
  return { productId: product.productId, name: product.name, sku: product.sku };
}

function Row({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className="px-md py-md">
      <Text variant="body" tone={muted ? 'muted' : 'default'}>
        {children}
      </Text>
    </div>
  );
}
