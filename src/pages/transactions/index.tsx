/**
 * S-21 · Riwayat Transaksi, with S-22 hanging off the same route.
 *
 * `/transactions/:id` renders this screen too, so a transaction is a URL that can
 * be shared and reopened: on desktop and tablet the list stays behind a 480px
 * drawer, on mobile the detail replaces the list as a full page. Closing it is a
 * navigation, which is what makes the browser's back button do the obvious thing.
 *
 * Access is Owner and Cashier. Admin is 403'd by the route guard, not by anything
 * here — transactions are closed to them in the role matrix.
 *
 * A Cashier's scope is not a filter they can change: no outlet select is rendered
 * and, more to the point, `useTransactions` rewrites the outlet on every request
 * (lib/transaction-scope). They see every sale at their outlet, not just their
 * own — that is what an end-of-shift check needs.
 */

import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PaginationFooter } from '@/components/ui/pagination-footer';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/components/pages/auth/auth-provider';
import { TransactionDetailPanel } from '@/components/pages/transactions/transaction-detail-panel';
import { DETAIL_TITLE } from '@/components/pages/transactions/transaction-detail';
import {
  EMPTY_TRANSACTION_QUERY,
  isTransactionFiltered,
  ScopeSubtitle,
  TransactionFilterBar,
  type TransactionQuery,
} from '@/components/pages/transactions/transaction-filters';
import { SummaryStrip } from '@/components/pages/transactions/summary-strip';
import {
  TransactionTable,
  type TransactionRow,
} from '@/components/pages/transactions/transaction-table';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useOutlet, useOutlets } from '@/hooks/use-outlets';
import { useTransactions } from '@/hooks/use-transactions';
import { useUsers } from '@/hooks/use-users';
import type { Transaction, TransactionFilters } from '@/services/transactions';
import { dataScope } from '@/lib/permissions';
import { matchesTransactionNumber, pageOf, summariseTransactions } from '@/lib/transaction-scope';

const PAGE_LIMIT = 10;

/**
 * How many matching rows the summary and the number search work over.
 *
 * The contract offers neither an aggregate endpoint nor a `search=` parameter for
 * transactions, so both are computed from one wider request. The strip says when
 * the set was larger than this.
 */
const WINDOW_LIMIT = 500;

export default function TransactionsPage() {
  const { role, outletId } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const mobile = useBreakpoint() === 'mobile';

  const ownOutletOnly = role !== null && dataScope(role) === 'own-outlet';
  const openId = params.id ?? null;

  const [query, setQuery] = React.useState<TransactionQuery>(EMPTY_TRANSACTION_QUERY);
  const [page, setPage] = React.useState(1);

  const search = useDebouncedValue(query.search.trim(), 300);

  // Server-side filters. The outlet is only ever asked for by an Owner; for a
  // Cashier the query layer overwrites it regardless of what is passed.
  const serverFilters: TransactionFilters = {
    ...(query.startDate ? { start_date: query.startDate } : {}),
    ...(query.endDate ? { end_date: query.endDate } : {}),
    ...(query.cashierId ? { cashier_id: query.cashierId } : {}),
    ...(!ownOutletOnly && query.outletId ? { outlet_id: query.outletId } : {}),
  };

  const listQuery = useTransactions({ ...serverFilters, page, limit: PAGE_LIMIT });
  // One wider request behind the summary tiles and the number search.
  const windowQuery = useTransactions({ ...serverFilters, page: 1, limit: WINDOW_LIMIT });

  const outlets = useOutlets({ status: 'ACTIVE' });
  // GET /users is Owner-only, and a Cashier has no cashier filter to populate.
  const staff = useUsers({ role: 'CASHIER' }, { enabled: !ownOutletOnly });
  const ownOutlet = useOutlet(ownOutletOnly ? (outletId ?? undefined) : undefined);

  const filterKey = `${search}|${query.startDate}|${query.endDate}|${query.outletId ?? ''}|${query.cashierId ?? ''}`;
  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  // Memoised so the two derivations below do not recompute on every render just
  // because `?? []` minted a new array.
  const windowRows = React.useMemo(() => windowQuery.data?.items ?? [], [windowQuery.data]);
  const searching = search !== '';

  /** Searching narrows the window client-side; otherwise the server pages. */
  const matches = React.useMemo(
    () => (searching ? windowRows.filter((row) => matchesTransactionNumber(row, search)) : []),
    [searching, windowRows, search]
  );

  const visible: Transaction[] = searching
    ? pageOf(matches, page, PAGE_LIMIT)
    : (listQuery.data?.items ?? []);

  const total = searching ? matches.length : (listQuery.data?.total ?? 0);
  const totalPages = searching
    ? Math.max(1, Math.ceil(matches.length / PAGE_LIMIT))
    : (listQuery.data?.totalPages ?? 1);

  const summary = React.useMemo(
    () =>
      summariseTransactions(
        searching ? matches : windowRows,
        searching ? matches.length : (windowQuery.data?.total ?? 0),
        WINDOW_LIMIT
      ),
    [searching, matches, windowRows, windowQuery.data]
  );

  const rows: TransactionRow[] = visible.map((transaction) => ({
    transaction,
    itemCount: transaction.itemCount,
  }));

  const pending = searching ? windowQuery.isPending : listQuery.isPending;
  const failed = searching ? windowQuery.isError : listQuery.isError;
  const filtered = isTransactionFiltered(query);

  const openTransaction = (transaction: Transaction) =>
    navigate(`/transactions/${transaction.transactionId}`);
  const closeTransaction = () => navigate('/transactions');

  // Mobile: the detail is the screen, not a layer over it.
  if (mobile && openId) {
    return (
      <div className="flex flex-col gap-lg p-lg">
        <div className="flex flex-row items-center justify-between gap-md">
          <Text variant="h2">{DETAIL_TITLE}</Text>
          <Button variant="ghost" onClick={closeTransaction}>
            <Text>Kembali</Text>
          </Button>
        </div>
        <TransactionDetailPanel transactionId={openId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      {ownOutletOnly ? (
        <ScopeSubtitle outletName={ownOutlet.data?.name ?? ''} />
      ) : (
        <Text variant="body" tone="muted">
          Riwayat transaksi seluruh outlet.
        </Text>
      )}

      <SummaryStrip summary={summary} windowSize={WINDOW_LIMIT} loading={windowQuery.isPending} />

      <Card>
        <CardContent className="flex flex-col gap-lg pt-lg">
          <TransactionFilterBar
            query={query}
            onQueryChange={setQuery}
            outlets={(outlets.data ?? []).map((outlet) => ({
              id: outlet.outletId,
              name: outlet.name,
            }))}
            cashiers={(staff.data ?? []).map((member) => ({
              id: member.userId,
              name: member.name,
            }))}
            showScopeFilters={!ownOutletOnly}
          />

          {pending ? (
            <ListSkeleton />
          ) : failed ? (
            <div className="flex items-center justify-center py-3xl">
              <Text variant="body" tone="danger">
                Gagal memuat riwayat transaksi.
              </Text>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              filtered={filtered}
              onClearFilters={() => setQuery(EMPTY_TRANSACTION_QUERY)}
              cashier={ownOutletOnly}
            />
          ) : (
            <>
              <TransactionTable rows={rows} onOpen={openTransaction} hideOutlet={ownOutletOnly} />

              <PaginationFooter
                page={page}
                limit={PAGE_LIMIT}
                total={total}
                shown={rows.length}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Desktop and tablet: a 480px right drawer over the list. */}
      <Dialog open={openId !== null} onOpenChange={(open) => !open && closeTransaction()}>
        <DialogContent
          overlayClassName="items-stretch justify-end p-0"
          className="h-full max-w-[480px] gap-lg overflow-y-auto rounded-none border-y-0 border-r-0 p-xl"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{DETAIL_TITLE}</DialogTitle>
          {openId && <TransactionDetailPanel transactionId={openId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({
  filtered,
  onClearFilters,
  cashier,
}: {
  filtered: boolean;
  onClearFilters: () => void;
  cashier: boolean;
}) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-md py-3xl">
        <Text variant="body" tone="muted">
          Tidak ada transaksi yang cocok dengan filter ini.
        </Text>
        <Button variant="ghost" onClick={onClearFilters}>
          <Text>Hapus filter</Text>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-md py-3xl">
      <Text variant="h3">Belum ada transaksi</Text>
      <Text variant="body" tone="muted" className="text-center">
        {cashier
          ? 'Transaksi yang Anda proses di kasir akan muncul di sini.'
          : 'Transaksi dari seluruh outlet akan muncul di sini setelah penjualan pertama.'}
      </Text>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-md">
      {[0, 1, 2, 3, 4].map((index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
