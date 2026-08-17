/**
 * The product's identity cell, shared by the table, the grid and the stacked
 * mobile cards.
 *
 * The name doubles as the entry point to the per-outlet stock drawer (S-15b),
 * which both roles get: looking at stock is not managing it. That is why the
 * drawer is reached from the name rather than only from the row menu — the Owner
 * has no row menu.
 */

import { Text } from '@/components/ui/text';
import { InactiveCategoryBadge } from '@/components/pages/catalog/catalog-badges';
import type { Product } from '@/services/products';
import { cn } from '@/lib/utils';

/** Stands in for a product photo, which the catalogue does not carry. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function ProductThumb({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-md border border-border bg-subtle"
    >
      <Text variant="label" tone="muted">
        {initials(name)}
      </Text>
    </span>
  );
}

export function ProductIdentity({
  product,
  onOpenStock,
  /** True when the category is deactivated: the badge goes next to the name. */
  warnCategory = false,
  className,
}: {
  product: Product;
  onOpenStock: (product: Product) => void;
  warnCategory?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-xs', className)}>
      <button
        type="button"
        onClick={() => onOpenStock(product)}
        aria-label={`Lihat stok ${product.name} per outlet`}
        className="flex min-w-0 flex-row items-center gap-md rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ProductThumb name={product.name} />
        <Text variant="body-strong" className="min-w-0 truncate underline-offset-2 hover:underline">
          {product.name}
        </Text>
      </button>

      {warnCategory && <InactiveCategoryBadge />}
    </div>
  );
}
