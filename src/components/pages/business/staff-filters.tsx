/**
 * S-08's filter bar.
 *
 * `GET /staff` filters on role and status only — §1.2 has no search term and no
 * outlet filter — so both controls go into the query key and the list pages on
 * the server. The brief's search box and outlet picker are not here because
 * they would have to be faked client-side over one page of a paginated list,
 * which reads as "results missing" rather than a filter.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Status } from '@/api/schema';

export const ALL_ROLES = 'ALL';
export const ALL_STATUSES = 'ALL';

export type StaffQuery = {
  /** Null means every non-owner role. */
  role: 'ADMIN' | 'CASHIER' | null;
  /** Null means both statuses. */
  status: Status | null;
};

export const EMPTY_QUERY: StaffQuery = { role: null, status: null };

/** Which empty state to show, and whether "Hapus filter" has anything to clear. */
export function isFiltered(query: StaffQuery): boolean {
  return query.role !== null || query.status !== null;
}

export function StaffFilterBar({
  query,
  onQueryChange,
}: {
  query: StaffQuery;
  onQueryChange: (query: StaffQuery) => void;
}) {
  return (
    <div className="flex flex-col gap-md tablet:flex-row tablet:items-center">
      <Select
        value={query.role ?? ALL_ROLES}
        onValueChange={(next) =>
          onQueryChange({
            ...query,
            role: next === ALL_ROLES ? null : (next as 'ADMIN' | 'CASHIER'),
          })
        }
      >
        <SelectTrigger aria-label="Filter peran" className="min-w-[160px]">
          <SelectValue className="type-body text-fg" placeholder="Semua Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_ROLES}>Semua Role</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="CASHIER">Kasir</SelectItem>
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
    </div>
  );
}
