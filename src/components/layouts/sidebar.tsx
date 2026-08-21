/** The 248px desktop sidebar. */

import { LogOut } from 'lucide-react';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { activeHref, navFor, type NavItem } from '@/components/layouts/nav-config';
import { useAuth } from '@/components/pages/auth/auth-provider';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ROLE_LABEL, type Role } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const SIGN_OUT_WARNING: Record<Role, string> = {
  OWNER: 'Anda perlu masuk lagi untuk melanjutkan. Perubahan yang belum disimpan akan hilang.',
  ADMIN:
    'Anda perlu masuk lagi untuk melanjutkan. Penyesuaian stok yang belum disimpan akan hilang.',
  CASHIER:
    'Keranjang yang belum dibayar akan hilang dan tidak bisa dikembalikan. Anda perlu masuk lagi untuk membuka kasir.',
};

type SidebarProps = {
  role: Role;
  pathname: string;
  /** Shown at the top; falls back to the product name when unavailable. */
  merchantName: string | null;
};

export function Sidebar({ role, pathname, merchantName }: SidebarProps) {
  const sections = navFor(role);
  const active = activeHref(
    sections.flatMap((section) => section.items),
    pathname
  );

  return (
    <aside className="hidden h-full w-[248px] shrink-0 flex-col border-r border-border bg-surface desktop:flex">
      <div className="flex flex-col gap-xs px-lg py-lg">
        <Text variant="h3" className="truncate">
          {merchantName ?? 'POS'}
        </Text>
        <Text variant="caption" tone="subtle">
          Merchant
        </Text>
      </div>

      <nav className="scrollbar-none flex flex-1 flex-col gap-lg overflow-y-auto px-md">
        {sections.map((section, index) => (
          <div key={section.title ?? `section-${index}`} className="flex flex-col gap-xs">
            {section.title && (
              <Text variant="caption" tone="subtle" className="px-md uppercase">
                {section.title}
              </Text>
            )}
            {section.items.map((item) => (
              <SidebarLink key={item.href} item={item} active={active === item.href} />
            ))}
          </div>
        ))}
      </nav>

      <SidebarAccount />
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <NavLink
      to={item.href}
      end={item.exact}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-touch flex-row items-center gap-md rounded-md px-md py-sm transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/15'
      )}
    >
      <Icon
        as={item.icon}
        size={18}
        className={cn(
          'transition-colors',
          active ? 'text-white' : 'text-fg-muted hover:text-accent-text'
        )}
      />
      <Text
        variant={active ? 'body-strong' : 'body'}
        tone={active ? 'on-accent' : 'muted'}
        className={cn('truncate transition-colors', !active && 'hover:text-accent-text')}
      >
        {item.label}
      </Text>
    </NavLink>
  );
}

function SidebarAccount() {
  const { session, role, signOut } = useAuth();
  const [showLogout, setShowLogout] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  if (!session || !role) return null;

  const identity = session.email || ROLE_LABEL[role];

  // When expanded, only the logout button is visible — spec: default profile, tap -> only Keluar.
  if (showLogout) {
    return (
      <>
        <div className="border-t border-border p-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            aria-label={`Keluar dari akun ${identity}`}
            className="w-full justify-start"
          >
            <Icon as={LogOut} size={16} className="text-danger" />
            <Text tone="danger">Keluar</Text>
          </Button>
          <button
            type="button"
            onClick={() => setShowLogout(false)}
            className="mt-xs w-full rounded-md px-sm py-xs text-left text-xs text-fg-muted hover:bg-accent/10"
          >
            Kembali ke profil
          </button>
        </div>

        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent hideClose className="tablet:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Keluar dari akun?</DialogTitle>
              <DialogDescription>{SIGN_OUT_WARNING[role]}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                <Text>Batal</Text>
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirming(false);
                  setShowLogout(false);
                  signOut();
                }}
              >
                <Text>Keluar</Text>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="border-t border-border p-md">
      <button
        type="button"
        onClick={() => setShowLogout(true)}
        aria-label={`Profil ${identity}, tekan untuk keluar`}
        aria-expanded={showLogout}
        className="flex w-full flex-row items-center gap-sm rounded-md p-sm text-left transition-colors hover:bg-accent/10 focus-ring"
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback>
            <Text>{initials(identity)}</Text>
          </AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-col">
          <Text variant="caption" className="block max-w-[150px] truncate">
            {identity}
          </Text>
          <Text variant="caption" tone="subtle">
            {ROLE_LABEL[role]}
          </Text>
        </span>
      </button>
    </div>
  );
}
