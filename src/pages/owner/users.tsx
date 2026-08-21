/**
 * S-08 · Staf.
 *
 * Owner only, for reading and writing alike (§1.2) — the route demands `staff`
 * manage, so every control below exists unconditionally and the mutation hooks
 * behind them carry the same guard. The Owner's own row has no menu: the
 * endpoint 403s on it, and a row of actions that cannot work reads as noise.
 */

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { PaginationFooter } from '@/components/ui/pagination-footer';
import type { RowMenuItem } from '@/components/ui/row-menu';
import { DeactivateDialog, HISTORY_PRESERVED } from '@/components/pages/catalog/deactivate-dialog';
import { StaffDialog } from '@/components/pages/business/staff-dialog';
import { ResetPasswordDialog } from '@/components/pages/business/reset-password-dialog';
import { StaffTable } from '@/components/pages/business/staff-table';
import {
  EMPTY_QUERY,
  isFiltered,
  matchesStaffSearch,
  StaffFilterBar,
  type StaffQuery,
} from '@/components/pages/business/staff-filters';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useDeactivateStaff, useStaff } from '@/hooks/use-staff';
import { useOutlets } from '@/hooks/use-outlets';
import type { Staff } from '@/services/staff';
import { PAGE_SIZE_MAX } from '@/api/schema';

/** The brief's pagination footer counts in tens. */
const PAGE_LIMIT = 10;

export default function UsersPage() {
  const stacked = useBreakpoint() === 'mobile';
  const { toast } = useToast();

  const [query, setQuery] = React.useState<StaffQuery>(EMPTY_QUERY);
  const [page, setPage] = React.useState(1);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Staff | null>(null);
  const [resetting, setResetting] = React.useState<Staff | null>(null);
  const [deactivating, setDeactivating] = React.useState<Staff | null>(null);

  // §1.2 filters on role and status, so those go to the server. There is no
  // search parameter, so the whole (already role/status-filtered) list is
  // fetched in one page and the name search runs here — searching a single
  // server page would silently miss matches on the pages it had not fetched.
  const staff = useStaff({
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    page: 0,
    size: PAGE_SIZE_MAX,
  });

  // The Outlet column needs names, and the dialog needs the active list, so the
  // page carries one wide outlets query — `GET /staff` returns `outlet_id`, never
  // a name (§1.2), and the Owner may read it (§2.2).
  const outlets = useOutlets({ size: PAGE_SIZE_MAX });
  const outletMap = React.useMemo(
    () => new Map((outlets.data?.items ?? []).map((outlet) => [outlet.outletId, outlet])),
    [outlets.data]
  );

  const deactivate = useDeactivateStaff();

  // A filter change invalidates the page number: page 4 of a narrower list is
  // usually empty, which looks like "no results" for the wrong reason.
  const filterKey = `${query.role ?? ''}|${query.status ?? ''}|${query.search.trim()}`;
  React.useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const loaded = React.useMemo(() => staff.data?.items ?? [], [staff.data]);

  const matched = React.useMemo(
    () => loaded.filter((member) => matchesStaffSearch(member, query.search)),
    [loaded, query.search]
  );

  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_LIMIT));
  const rows = matched.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  /*
   * The contract caps a page at 100 (§0), so a merchant with more staff than
   * that has rows this screen never fetched. Saying so is better than a search
   * that quietly covers part of the list.
   */
  const truncated = (staff.data?.total ?? 0) > loaded.length;

  const openEditor = (member: Staff | null) => {
    setEditing(member);
    setEditorOpen(true);
  };

  const rowMenu = (member: Staff): RowMenuItem[] => {
    // The Owner cannot be edited, reset or deactivated through this endpoint.
    if (member.role === 'OWNER') return [];

    const items: RowMenuItem[] = [
      { label: 'Edit', onSelect: () => openEditor(member) },
      { label: 'Reset Password', onSelect: () => setResetting(member) },
    ];
    if (member.status === 'ACTIVE') {
      items.push({
        label: 'Nonaktifkan',
        tone: 'danger',
        onSelect: () => setDeactivating(member),
      });
    }
    return items;
  };

  const confirmDeactivate = () => {
    if (!deactivating) return;
    const name = deactivating.name;

    deactivate.mutate(deactivating.userId, {
      onSuccess: () => {
        toast({
          variant: 'success',
          title: 'Staf dinonaktifkan',
          description: `${name} tidak bisa masuk sampai diaktifkan kembali.`,
        });
        setDeactivating(null);
      },
    });
  };

  const total = matched.length;

  return (
    <div className="flex flex-col gap-lg p-lg desktop:mx-auto desktop:w-full desktop:max-w-[1280px]">
      <div className="flex flex-col gap-md tablet:flex-row tablet:items-start tablet:justify-between">
        <div className="flex flex-col gap-xs">
          <Text variant="h1">Staf</Text>
          <Text variant="body" tone="muted">
            Kelola akun Admin dan Kasir merchant Anda.
          </Text>
        </div>

        <Button className="shrink-0" onClick={() => openEditor(null)}>
          <Text>+ Tambah Staf</Text>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-lg pt-lg">
          <StaffFilterBar query={query} onQueryChange={setQuery} />

          {staff.isPending ? (
            <ListSkeleton />
          ) : staff.isError ? (
            <div className="flex items-center justify-center py-3xl">
              <Text variant="body" tone="danger">
                Gagal memuat daftar staf.
              </Text>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              filtered={isFiltered(query)}
              onClearFilters={() => setQuery(EMPTY_QUERY)}
              onCreate={() => openEditor(null)}
            />
          ) : (
            <>
              <StaffTable staff={rows} outlets={outletMap} rowMenu={rowMenu} stacked={stacked} />

              {truncated && (
                <Text variant="caption" tone="warning">
                  {`Menampilkan ${loaded.length} staf pertama; pencarian belum mencakup sisanya.`}
                </Text>
              )}

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

      <StaffDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        staff={editing}
        outlets={outlets.data?.items ?? []}
      />

      <ResetPasswordDialog
        member={resetting}
        open={resetting !== null}
        onOpenChange={(open) => {
          if (!open) setResetting(null);
        }}
      />

      <DeactivateDialog
        open={deactivating !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivating(null);
        }}
        title={`Nonaktifkan ${deactivating?.name ?? 'staf ini'}?`}
        preserved={`${HISTORY_PRESERVED} Akun bisa diaktifkan kembali dari layar ini.`}
        pending={deactivate.isPending}
        error={deactivate.error}
        onConfirm={confirmDeactivate}
      >
        <Text variant="body">
          {`Akun ${deactivating?.name ?? 'ini'} tidak bisa masuk, dan token yang dimilikinya berhenti berlaku pada permintaan berikutnya.`}
        </Text>
      </DeactivateDialog>
    </div>
  );
}

function EmptyState({
  filtered,
  onClearFilters,
  onCreate,
}: {
  filtered: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  if (filtered) {
    return (
      <div className="flex flex-col items-center gap-md py-3xl">
        <Text variant="body" tone="muted">
          Tidak ada staf yang cocok dengan filter ini.
        </Text>
        <Button variant="ghost" onClick={onClearFilters}>
          <Text>Hapus filter</Text>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-md py-3xl">
      <Text variant="h3">Belum ada staf</Text>
      <Text variant="body" tone="muted">
        Tambahkan Admin atau Kasir untuk membantu menjalankan bisnis Anda.
      </Text>
      <Button onClick={onCreate}>
        <Text>+ Tambah Staf</Text>
      </Button>
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
