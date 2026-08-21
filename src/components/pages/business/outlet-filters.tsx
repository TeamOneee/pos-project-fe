/** S-06's filter bar. */

import { Search, X } from 'lucide-react';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Status } from '@/api/schema';

export const ALL_STATUSES = 'ALL';

export type OutletQuery = {
  search: string;
  /** Null means both statuses. */
  status: Status | null;
};

export const EMPTY_QUERY: OutletQuery = { search: '', status: null };

/** Which empty state to show, and whether "Hapus filter" has anything to clear. */
export function isFiltered(query: OutletQuery): boolean {
  return query.search.trim() !== '' || query.status !== null;
}

export function OutletFilterBar({
  query,
  onQueryChange,
}: {
  query: OutletQuery;
  onQueryChange: (query: OutletQuery) => void;
}) {
  return (
    <div className="flex flex-col gap-md tablet:flex-row tablet:items-center">
      <div className="relative flex-1 tablet:max-w-[360px]">
        <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2">
          <Icon as={Search} size={16} className="text-fg-subtle" />
        </span>

        <Input
          type="search"
          aria-label="Cari outlet"
          placeholder="Cari outlet…"
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
    </div>
  );
}
