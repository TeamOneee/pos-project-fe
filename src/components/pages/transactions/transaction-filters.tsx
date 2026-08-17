/**
 * S-21's filter bar.
 *
 * The outlet select is not rendered at all for a Cashier — not disabled, not
 * preset — because their scope is not a choice they are making. Their subtitle
 * names the outlet instead, and the query layer pins it (lib/transaction-scope).
 *
 * Dates are native date inputs: a picker on every platform, a YYYY-MM-DD value
 * the API takes verbatim, and no dependency.
 */

import { Search, X } from 'lucide-react';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';

export const ALL = 'ALL';

export type TransactionQuery = {
  /** Transaction number, matched case-insensitively. */
  search: string;
  /** YYYY-MM-DD, or empty for "no bound". */
  startDate: string;
  endDate: string;
  /** Null means every outlet. Ignored entirely for a Cashier. */
  outletId: string | null;
  cashierId: string | null;
};

export const EMPTY_TRANSACTION_QUERY: TransactionQuery = {
  search: '',
  startDate: '',
  endDate: '',
  outletId: null,
  cashierId: null,
};

export function isTransactionFiltered(query: TransactionQuery): boolean {
  return (
    query.search.trim() !== '' ||
    query.startDate !== '' ||
    query.endDate !== '' ||
    query.outletId !== null ||
    query.cashierId !== null
  );
}

type Option = { id: string; name: string };

export function TransactionFilterBar({
  query,
  onQueryChange,
  outlets,
  cashiers,
  /** False for a Cashier: the outlet and cashier selects are omitted. */
  showScopeFilters,
}: {
  query: TransactionQuery;
  onQueryChange: (query: TransactionQuery) => void;
  outlets: Option[];
  cashiers: Option[];
  showScopeFilters: boolean;
}) {
  return (
    <div className="flex flex-col gap-md tablet:flex-row tablet:flex-wrap tablet:items-end">
      <div className="flex flex-col gap-xs">
        <Label htmlFor="transaction-search">No. Transaksi</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-md top-1/2 -translate-y-1/2">
            <Icon as={Search} size={16} className="text-fg-subtle" />
          </span>
          <Input
            id="transaction-search"
            type="search"
            aria-label="Cari nomor transaksi"
            placeholder="TRX-20260813-001"
            value={query.search}
            onChange={(event) => onQueryChange({ ...query, search: event.target.value })}
            className="w-full pl-[40px] pr-touch tablet:w-[260px]"
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
      </div>

      <DateField
        id="transaction-start"
        label="Dari Tanggal"
        value={query.startDate}
        onChange={(startDate) => onQueryChange({ ...query, startDate })}
      />
      <DateField
        id="transaction-end"
        label="Sampai Tanggal"
        value={query.endDate}
        onChange={(endDate) => onQueryChange({ ...query, endDate })}
      />

      {/* Owner only. A Cashier has no outlet choice to make. */}
      {showScopeFilters && (
        <>
          <SelectField
            id="transaction-outlet"
            label="Outlet"
            placeholder="Semua Outlet"
            options={outlets}
            value={query.outletId}
            onChange={(outletId) => onQueryChange({ ...query, outletId })}
          />
          <SelectField
            id="transaction-cashier"
            label="Kasir"
            placeholder="Semua Kasir"
            options={cashiers}
            value={query.cashierId}
            onChange={(cashierId) => onQueryChange({ ...query, cashierId })}
          />
        </>
      )}
    </div>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="tablet:w-[170px]"
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
        <SelectTrigger id={id} aria-label={label} className="min-w-[180px]">
          <SelectValue className="type-body text-fg" placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Shown under the title for a Cashier, in place of the outlet filter. */
export function ScopeSubtitle({ outletName }: { outletName: string }) {
  return (
    <Text variant="body" tone="muted">
      {outletName ? `Transaksi di ${outletName}.` : 'Transaksi di outlet Anda.'}
    </Text>
  );
}
