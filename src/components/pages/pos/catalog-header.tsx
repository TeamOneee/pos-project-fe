/**
 * The sticky sub-header above the product grid: search, then category chips.
 *
 * The search input is 48px rather than the usual 44px minimum — it is the most
 * frequently hit target on the busiest screen in the product.
 */

import { Search } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { PosCategory } from '@/lib/pos-catalog';
import { cn } from '@/lib/utils';

type CatalogHeaderProps = {
  query: string;
  onQueryChange: (query: string) => void;
  categories: PosCategory[];
  /** Null is the "Semua" chip, which is active by default. */
  activeCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  /** Focus returns here after a completed sale (S-19). */
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function CatalogHeader({
  query,
  onQueryChange,
  categories,
  activeCategoryId,
  onCategoryChange,
  inputRef,
}: CatalogHeaderProps) {
  return (
    <div className="flex shrink-0 flex-col gap-md border-b border-border bg-canvas p-lg">
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Cari produk atau SKU…"
          aria-label="Cari produk atau SKU"
          autoCorrect="off"
          autoCapitalize="none"
          className="h-12 pl-[44px] type-body"
        />
        <span className="pointer-events-none absolute left-md">
          <Icon as={Search} size={20} className="text-fg-subtle" />
        </span>
      </div>

      <div className="flex flex-row gap-sm overflow-x-auto pb-xs">
        <CategoryChip
          label="Semua"
          active={activeCategoryId === null}
          onPress={() => onCategoryChange(null)}
        />
        {categories.map((category) => (
          <CategoryChip
            key={category.categoryId}
            label={category.name}
            active={activeCategoryId === category.categoryId}
            onPress={() => onCategoryChange(category.categoryId)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onPress}
      className={cn(
        'min-h-touch shrink-0 justify-center rounded-full px-lg focus-ring',
        active ? 'bg-accent' : 'border border-border bg-surface hover:bg-subtle'
      )}
    >
      <Text variant="label" tone={active ? 'on-accent' : 'muted'}>
        {label}
      </Text>
    </button>
  );
}
