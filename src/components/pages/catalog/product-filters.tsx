/**
 * S-11's filter bar.
 *
 * Search, category and status all narrow the query server-side — `GET /products`
 * takes all three — so the filter state is also the query key, and changing any
 * of them resets to page 1. The view toggle is the one control here that is
 * purely local: it changes how the same page is drawn, nothing about what was
 * asked for.
 */

import { LayoutGrid, Search, Table2, X } from 'lucide-react';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/services/categories';
import type { Status } from '@/api/schema';
import { cn } from '@/lib/utils';

/** Table by default: the catalog is a list of facts, not a picture gallery. */
export type ProductView = 'table' | 'grid';

export const ALL_CATEGORIES = 'ALL';
export const ALL_STATUSES = 'ALL';

export type ProductQuery = {
  search: string;
  /** Null means every category. */
  categoryId: string | null;
  /** Null means both statuses. */
  status: Status | null;
};

export const EMPTY_QUERY: ProductQuery = { search: '', categoryId: null, status: null };

/** Which empty state to show, and whether "Hapus filter" has anything to clear. */
export function isFiltered(query: ProductQuery): boolean {
  return query.search.trim() !== '' || query.categoryId !== null || query.status !== null;
}

export function ProductFilterBar({
  query,
  onQueryChange,
  categories,
  view,
  onViewChange,
}: {
  query: ProductQuery;
  onQueryChange: (query: ProductQuery) => void;
  categories: Category[];
  view: ProductView;
  onViewChange: (view: ProductView) => void;
}) {
  return (
    <div className="flex flex-col gap-md tablet:flex-row tablet:items-center">
      <div className="relative flex-1 tablet:max-w-[360px]">
        <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2">
          <Icon as={Search} size={16} className="text-fg-subtle" />
        </span>

        <Input
          type="search"
          aria-label="Cari produk"
          placeholder="Cari nama atau SKU…"
          value={query.search}
          onChange={(event) => onQueryChange({ ...query, search: event.target.value })}
          className="w-full pl-[40px] pr-touch"
        />

        {query.search !== '' && (
          <button
            type="button"
            aria-label="Hapus pencarian"
            onClick={() => onQueryChange({ ...query, search: '' })}
            className="absolute right-xs top-1/2 flex h-touch w-touch -translate-y-1/2 items-center justify-center rounded-md outline-none hover:bg-subtle focus-ring"
          >
            <Icon as={X} size={16} className="text-fg-muted" />
          </button>
        )}
      </div>

      <Select
        value={query.categoryId ?? ALL_CATEGORIES}
        onValueChange={(next) =>
          onQueryChange({ ...query, categoryId: next === ALL_CATEGORIES ? null : next })
        }
      >
        <SelectTrigger aria-label="Filter kategori" className="min-w-[180px]">
          <SelectValue className="type-body text-fg" placeholder="Semua Kategori" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>Semua Kategori</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.categoryId} value={category.categoryId}>
              {/* An inactive category still filters — its products are still here. */}
              {category.isActive ? category.name : `${category.name} (nonaktif)`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={query.status ?? ALL_STATUSES}
        onValueChange={(next) =>
          onQueryChange({ ...query, status: next === ALL_STATUSES ? null : (next as Status) })
        }
      >
        <SelectTrigger aria-label="Filter status" className="min-w-[160px]">
          <SelectValue className="type-body text-fg" placeholder="Semua Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>Semua Status</SelectItem>
          <SelectItem value="ACTIVE">Aktif</SelectItem>
          <SelectItem value="INACTIVE">Nonaktif</SelectItem>
        </SelectContent>
      </Select>

      <div
        role="radiogroup"
        aria-label="Tampilan"
        className="flex flex-row gap-xs rounded-md bg-subtle p-xs tablet:ml-auto"
      >
        <ViewButton
          view="table"
          current={view}
          onSelect={onViewChange}
          label="Tampilan tabel"
          icon={Table2}
        />
        <ViewButton
          view="grid"
          current={view}
          onSelect={onViewChange}
          label="Tampilan grid"
          icon={LayoutGrid}
        />
      </div>
    </div>
  );
}

function ViewButton({
  view,
  current,
  onSelect,
  label,
  icon,
}: {
  view: ProductView;
  current: ProductView;
  onSelect: (view: ProductView) => void;
  label: string;
  icon: typeof Table2;
}) {
  const active = view === current;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={() => onSelect(view)}
      className={cn(
        'flex h-touch w-touch items-center justify-center rounded-sm outline-none transition-colors focus-ring',
        active ? 'bg-surface shadow-sm' : 'hover:bg-border'
      )}
    >
      <Icon as={icon} size={18} className={active ? 'text-fg' : 'text-fg-muted'} />
    </button>
  );
}
