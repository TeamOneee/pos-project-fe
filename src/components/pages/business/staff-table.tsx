/** S-08's staff table, and its stacked-card reading below tablet. */

import * as React from 'react';

import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { RowMenu, type RowMenuItem } from '@/components/ui/row-menu';
import { Text } from '@/components/ui/text';
import { StatusBadge } from '@/components/pages/catalog/catalog-badges';
import { RoleBadge } from '@/components/pages/business/role-badge';
import type { Staff } from '@/services/staff';
import type { Outlet } from '@/services/outlets';
import { cn } from '@/lib/utils';

export type StaffTableProps = {
  staff: Staff[];
  /** Outlet name per outlet id, for the Outlet column. */
  outlets: Map<string, Outlet>;
  /** Row actions per member; undefined (or empty) renders no menu for the row. */
  rowMenu?: (member: Staff) => RowMenuItem[];
  /** Below tablet the columns stack into cards. */
  stacked: boolean;
};

export function StaffTable({ staff, outlets, rowMenu, stacked }: StaffTableProps) {
  if (stacked) {
    return (
      <div className="flex flex-col gap-md">
        {staff.map((member) => (
          <div
            key={member.userId}
            className={cn(
              'flex flex-col gap-md rounded-md border border-border p-md',
              member.status === 'INACTIVE' && 'opacity-60'
            )}
          >
            <div className="flex flex-row items-center gap-md">
              <Avatar>
                <AvatarFallback>{initials(member.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Text variant="body-strong" className="block truncate">
                  {member.name}
                </Text>
                <Text variant="caption" tone="muted" className="block truncate">
                  {member.email}
                </Text>
              </div>
              {rowMenu?.(member).length ? (
                <RowMenu label={`Menu untuk ${member.name}`} items={rowMenu(member)} />
              ) : null}
            </div>

            <div className="flex flex-row items-center justify-between gap-md">
              <div className="flex flex-row items-center gap-sm">
                <RoleBadge role={member.role} />
                <StatusBadge status={member.status} />
              </div>
              <Text variant="caption" tone="muted" className="truncate">
                {outletLabel(member, outlets)}
              </Text>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-row items-center gap-md border-b border-border pb-sm">
        <Head className="min-w-0 flex-1">Nama</Head>
        <Head className="min-w-0 flex-1">Email</Head>
        <Head className="w-[104px] shrink-0">Role</Head>
        <Head className="w-[180px] shrink-0">Outlet</Head>
        <Head className="w-[92px] shrink-0">Status</Head>
        {rowMenu ? <Head className="w-touch shrink-0">Aksi</Head> : null}
      </div>

      {staff.map((member) => (
        <div
          key={member.userId}
          className={cn(
            'flex flex-row items-center gap-md border-b border-border py-md last:border-b-0',
            member.status === 'INACTIVE' && 'opacity-60'
          )}
        >
          <div className="flex min-w-0 flex-1 flex-row items-center gap-md">
            <Avatar>
              <AvatarFallback>{initials(member.name)}</AvatarFallback>
            </Avatar>
            <Text variant="body-strong" className="block min-w-0 truncate">
              {member.name}
            </Text>
          </div>

          <div className="min-w-0 flex-1">
            <Text variant="body" tone="muted" className="block truncate">
              {member.email}
            </Text>
          </div>

          <div className="w-[104px] shrink-0">
            <RoleBadge role={member.role} />
          </div>

          <div className="w-[180px] min-w-0 shrink-0">
            <Text variant="body" tone="muted" className="block truncate">
              {outletLabel(member, outlets)}
            </Text>
          </div>

          <div className="w-[92px] shrink-0">
            <StatusBadge status={member.status} />
          </div>

          {/* The cell stays even when the row has no menu — an Owner has none —
              or that row's columns slide right by the width of the column the
              others still carry. */}
          {rowMenu ? (
            <div className="w-touch shrink-0">
              {rowMenu(member).length > 0 ? (
                <RowMenu label={`Menu untuk ${member.name}`} items={rowMenu(member)} />
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** An OWNER/ADMIN sits on every outlet; a KASIR on exactly one. */
function outletLabel(member: Staff, outlets: Map<string, Outlet>): string {
  if (!member.outletId) return '—';
  return outlets.get(member.outletId)?.name ?? '—';
}

function Head({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex', className)}>
      <Text variant="caption" tone="subtle">
        {children}
      </Text>
    </div>
  );
}
