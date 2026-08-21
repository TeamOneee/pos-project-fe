/**
 * The mobile footer tab bar. Five items maximum, per the design brief.
 *
 * A role with more than five nav items gets its first four plus "Lainnya",
 * which opens the remainder in a dialog. The Owner is the only role this
 * affects.
 */

import { LogOut, Menu } from 'lucide-react';
import * as React from 'react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { activeHref, navFor, type NavItem } from '@/components/layouts/nav-config';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { Role } from '@/lib/permissions';
import { cn } from '@/lib/utils';

const MAX_TABS = 5;

export function FooterTabs({ role, pathname }: { role: Role; pathname: string }) {
  const [overflowOpen, setOverflowOpen] = React.useState(false);
  const { signOut } = useAuth();

  const items = navFor(role).flatMap((section) => section.items);
  const active = activeHref(items, pathname);

  // Always reserve the last slot for "Lainnya" so logout is reachable even
  // when the role has <=5 items (ADMIN/CASHIER). Keeps total tabs <=5.
  const needsOverflow = items.length >= MAX_TABS;
  const visible = needsOverflow ? items.slice(0, MAX_TABS - 1) : items;
  const overflow = needsOverflow ? items.slice(MAX_TABS - 1) : [];

  // An item hidden behind "Lainnya" still has to look selected when it is.
  const overflowActive = overflow.some((item) => item.href === active);

  return (
    <>
      <nav className="flex shrink-0 flex-row items-center border-t border-border bg-surface rounded-t-[20px] px-sm py-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        {visible.map((item) => (
          <TabLink key={item.href} item={item} active={active === item.href} />
        ))}

        <button
          aria-label="Menu lainnya"
          aria-expanded={overflowOpen}
          onClick={() => setOverflowOpen(true)}
          className="flex min-h-touch flex-1 items-center justify-center py-xs"
        >
          <span
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
              overflowActive
                ? 'bg-accent text-white'
                : 'bg-transparent text-fg-muted hover:bg-subtle'
            )}
          >
            <Icon as={Menu} size={20} className={overflowActive ? 'text-white' : 'text-fg-muted'} />
          </span>
        </button>
      </nav>

      <Dialog open={overflowOpen} onOpenChange={setOverflowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu lainnya</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-xs">
            {overflow.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.exact}
                onClick={() => setOverflowOpen(false)}
                className={cn(
                  'flex min-h-touch flex-row items-center gap-md rounded-md px-md py-sm transition-colors hover:bg-subtle',
                  active === item.href && 'bg-accent-subtle'
                )}
              >
                <Icon
                  as={item.icon}
                  size={18}
                  className={active === item.href ? 'text-accent' : 'text-fg-muted'}
                />
                <Text tone={active === item.href ? 'accent' : 'default'}>{item.label}</Text>
              </NavLink>
            ))}

            <Separator className="my-sm" />

            <button
              onClick={() => {
                setOverflowOpen(false);
                signOut();
              }}
              className="flex min-h-touch w-full flex-row items-center gap-md rounded-md px-md py-sm text-left transition-colors hover:bg-subtle"
            >
              <Icon as={LogOut} size={18} className="text-danger" />
              <Text tone="danger">Keluar</Text>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <NavLink
      to={item.href}
      end={item.exact}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      title={item.label}
      className="flex min-h-touch flex-1 items-center justify-center py-xs"
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
          active ? 'bg-accent text-white shadow-sm' : 'bg-transparent text-fg-muted hover:bg-subtle'
        )}
      >
        <Icon as={item.icon} size={20} className={active ? 'text-white' : 'text-fg-muted'} />
      </span>
    </NavLink>
  );
}
