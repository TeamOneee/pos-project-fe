/**
 * S-08's filter bar.
 *
 * `GET /staff` filters on role and status only — §1.2 has no search term — so
 * those two go to the server and page there.
 *
 * The name search is client-side, which is only honest because the page asks
 * for the whole staff list at once (`size` = PAGE_SIZE_MAX) and pages it here.
 * Searching one page of a server-paged list would hide matches on the pages it
 * had not fetched, which reads as "results missing" rather than as a filter.
 * A merchant's staff is its Admins and Cashiers; if one ever exceeds the 100
 * the contract allows per page, the page says so rather than quietly filtering
 * a subset.
 */

import { Search } from 'lucide-react';

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

export const ALL_ROLES = 'ALL';
export const ALL_STATUSES = 'ALL';

export type StaffQuery = {
  /** Null means every non-owner role. */
  role: 'ADMIN' | 'CASHIER' | null;
  /** Null means both statuses. */
  status: Status | null;
  /** Free text over name and email. Empty means no search. */
  search: string;
};

export const EMPTY_QUERY: StaffQuery = { role: null, status: null, search: '' };

/** Which empty state to show, and whether "Hapus filter" has anything to clear. */
export function isFiltered(query: StaffQuery): boolean {
  return query.role !== null || query.status !== null || query.search.trim() !== '';
}

/**
 * Matches on name and on email: both are columns on the table, and an Owner
 * who can see an address on screen will type it.
 */
export function matchesStaffSearch(member: { name: string; email: string }, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  return member.name.toLowerCase().includes(needle) || member.email.toLowerCase().includes(needle);
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
      <div className="relative tablet:w-[320px]">
        <Icon
          as={Search}
          size={16}
          className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2 text-fg-subtle"
        />
        <Input
          value={query.search}
          onChange={(event) => onQueryChange({ ...query, search: event.target.value })}
          placeholder="Cari nama atau email…"
          aria-label="Cari nama atau email"
          className="w-full pl-[36px]"
        />
      </div>

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
