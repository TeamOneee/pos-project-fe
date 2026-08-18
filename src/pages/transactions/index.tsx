/**
 * S-21 · Riwayat Transaksi, with S-22 hanging off the same route.
 *
 * `/transactions/:id` renders this screen too, so a transaction is a URL that can
 * be shared and reopened: on desktop and tablet the list stays behind a 480px
 * drawer, on mobile the detail replaces the list as a full page. Closing it is a
 * navigation, which is what makes the browser's back button do the obvious thing.
 *
 * Access is Owner and Cashier. Admin is 403'd by the route guard, not by anything
 * here — §5.2 states plainly that ADMIN has no access to transactions.
 *
 * A Cashier's scope is not a filter they can change: no outlet select is rendered
 * and, more to the point, `useTransactions` rewrites the outlet on every request
 * (lib/transaction-scope). The server additionally forces `operator_user_id` for
 * a cashier (OD-003), so a cashier sees only their own sales.
 *
 * Two filters the previous contract had are gone, because §5.2 has no parameter
 * for either: **cashier**, and any form of partial search. The number field is
 * now a lookup against `GET /transactions/search`, which is an exact match.
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
import { TransactionTable } from '@/components/pages/transactions/transaction-table';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useOutlet, useOutlets } from '@/hooks/use-outlets';
import { useTransactionSearch, useTransactions } from '@/hooks/use-transactions';
import type { TransactionFilters, TransactionSummary } from '@/services/transactions';
import { dataScope } from '@/lib/permissions';
import { searchTerm, summariseTransactions } from '@/lib/transaction-scope';

/** §0 pages from zero; the footer counts from one, so the two differ by one. */
const PAGE_SIZE = 10;

/**
 * How many matching rows the summary tiles are computed over.
 *
 * §6.2's aggregates are Owner-only and answer for a period, not for a filtered
 * list, so the strip sums one wide request instead. §0 caps `size` at 100, and
 * the strip says when the real set was larger than what it summed.
 */
const WINDOW_SIZE = 100;

export default function TransactionsPage() {
  const { role, outletId } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const mobile = useBreakpoint() === 'mobile';

  const ownOutletOnly = role !== null && dataScope(role) === 'own-outlet';
  const openId = params.id ?? null;

  const [query, setQuery] = React.useState<TransactionQuery>(EMPTY_TRANSACTION_QUERY);
  const [page, setPage] = React.useState(1);

  const search = useDebouncedValue(searchTerm(query.search), 300);
  const searching = search !== '';

  /**
   * Server-side filters. §5.2 takes ISO-8601 datetimes, so the two date inputs
   * are widened to cover their whole day; the outlet is only ever asked for by
   * an Owner, and the query layer overwrites it for a Cashier regardless.
   */
  const serverFilters: TransactionFilters = {
    ...(query.startDate ? { date_from: `${query.startDate}T00:00:00` } : {}),
    ...(query.endDate ? { date_to: `${query.endDate}T23:59:59` } : {}),
    ...(!ownOutletOnly && query.outletId ? { outlet_id: query.outletId } : {}),
  };

  // `page` is zero-based on the wire and one-based in the footer.
  const listQuery = useTransactions({ ...serverFilters, page: page - 1, size: PAGE_SIZE });
  const windowQuery = useTransactions({ ...serverFilters, page: 0, size: WINDOW_SIZE });
  const lookup = useTransactionSearch(searching ? search : undefined);

  const outlets = useOutlets({ status: 'ACTIVE' });
  const ownOutlet = useOutlet(ownOutletOnly ? (outletId ?? undefined) : undefined);

  const filterKey = `${search}|${query.startDate}|${query.endDate}|${query.outletId ?? ''}`;
  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const windowRows = React.useMemo(() => windowQuery.data?.items ?? [], [windowQuery.data]);

  /** Outlet id → name; the list rows carry only the id (§5.4). */
  const outletNames = React.useMemo(
    () =>
      Object.fromEntries(
        (outlets.data?.items ?? []).map((outlet) => [outlet.outletId, outlet.name])
      ),
    [outlets.data]
  );

  /**
   * An exact lookup returns one sale or a 404, so it replaces the list entirely
   * rather than filtering it. A 404 here is "no such number", not an error.
   */
  const visible = React.useMemo<TransactionSummary[]>(() => {
    if (!searching) return listQuery.data?.items ?? [];
    return lookup.data ? [toSummary(lookup.data)] : [];
  }, [searching, lookup.data, listQuery.data]);

  const total = searching ? visible.length : (listQuery.data?.total ?? 0);
  const totalPages = searching ? 1 : (listQuery.data?.totalPages ?? 1);

  const summary = React.useMemo(
    () =>
      summariseTransactions(
        searching ? visible : windowRows,
        searching ? visible.length : (windowQuery.data?.total ?? 0),
        WINDOW_SIZE
      ),
    [searching, visible, windowRows, windowQuery.data]
  );

  const pending = searching ? lookup.isPending : listQuery.isPending;
  // A 404 from the lookup is an empty result, not a failure.
  const failed = searching ? false : listQuery.isError;
  const filtered = isTransactionFiltered(query);

  const openTransaction = (transaction: TransactionSummary) =>
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
        <ScopeSubtitle outletName={ownOutlet?.name ?? ''} />
      ) : (
        <Text variant="body" tone="muted">
          Riwayat transaksi seluruh outlet.
        </Text>
      )}

      <SummaryStrip summary={summary} windowSize={WINDOW_SIZE} loading={windowQuery.isPending} />

      <Card>
        <CardContent className="flex flex-col gap-lg pt-lg">
          <TransactionFilterBar
            query={query}
            onQueryChange={setQuery}
            outlets={(outlets.data?.items ?? []).map((outlet) => ({
              id: outlet.outletId,
              name: outlet.name,
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
          ) : visible.length === 0 ? (
            <EmptyState
              filtered={filtered}
              onClearFilters={() => setQuery(EMPTY_TRANSACTION_QUERY)}
              cashier={ownOutletOnly}
            />
          ) : (
            <>
              <TransactionTable
                rows={visible}
                onOpen={openTransaction}
                outletNames={outletNames}
                hideOutlet={ownOutletOnly}
              />

              <PaginationFooter
                page={page}
                limit={PAGE_SIZE}
                total={total}
                shown={visible.length}
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

/** The search endpoint answers with a full detail; the table wants a row. */
function toSummary(detail: {
  transactionId: string;
  transactionNumber: string;
  outletId: string;
  operator: { name: string };
  total: number;
  status: 'COMPLETED';
  createdAt: string;
}): TransactionSummary {
  return {
    transactionId: detail.transactionId,
    transactionNumber: detail.transactionNumber,
    outletId: detail.outletId,
    operatorName: detail.operator.name,
    total: detail.total,
    status: detail.status,
    createdAt: detail.createdAt,
  };
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
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}
