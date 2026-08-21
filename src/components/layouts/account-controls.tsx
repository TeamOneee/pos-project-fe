/**
 * Who is signed in, and the way out — both in the top bar, both always visible.
 *
 * This used to be a chip at the foot of the sidebar that opened a menu, and it
 * had a hole in it: the desktop sidebar collapses, and when it did the chip went
 * with it. The header carried only a title and the screen's own controls, so a
 * collapsed sidebar left the app with no way to sign out at all. Moving the pair
 * into the header fixes that by construction — the header is on every screen at
 * every breakpoint that has one, and it does not fold away.
 *
 * "Keluar" is a button rather than a menu item because a person looking for the
 * way out should be able to see it, not remember where it was filed.
 *
 * It does ask first. Signing out clears the token and the entire query cache,
 * and the cart is not persisted, so a mis-click next to the outlet filter would
 * cost a cashier the basket they were halfway through. The old menu bought that
 * safety accidentally, by being two clicks; the dialog buys it deliberately,
 * without hiding anything.
 *
 * Below tablet there is no header — the mobile tab bar carries its own "Keluar"
 * inside the overflow sheet.
 */

import { LogOut } from 'lucide-react';
import * as React from 'react';

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
import { ROLE_LABEL } from '@/lib/permissions';

export function AccountControls({
  /** The till's bar is tight; drop the identity text and keep the avatar. */
  compact = false,
}: {
  compact?: boolean;
}) {
  const { session, role, signOut } = useAuth();
  const [confirming, setConfirming] = React.useState(false);

  if (!session || !role) return null;

  /*
   * The identity is an email, not a name: §1.2 returns no user object from
   * login, no `GET /auth/me`, and no name in the claims. After a cold reload
   * even the email is gone and the role is all that is left to show.
   */
  const identity = session.email || ROLE_LABEL[role];

  return (
    <div className="flex shrink-0 flex-row items-center gap-sm">
      <div
        className="flex flex-row items-center gap-sm"
        title={`${identity} · ${ROLE_LABEL[role]}`}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <Text>{initials(identity)}</Text>
          </AvatarFallback>
        </Avatar>

        {/* The email needs room to be worth showing, so it waits for desktop. */}
        {!compact && (
          <span className="hidden min-w-0 flex-col desktop:flex">
            <Text variant="caption" className="block max-w-[180px] truncate">
              {identity}
            </Text>
            <Text variant="caption" tone="subtle">
              {ROLE_LABEL[role]}
            </Text>
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
        aria-label={`Keluar dari akun ${identity}`}
      >
        <Icon as={LogOut} size={16} className="text-danger" />
        {!compact && <Text tone="danger">Keluar</Text>}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent hideClose className="tablet:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Keluar dari akun?</DialogTitle>
            <DialogDescription>
              Anda perlu masuk lagi untuk melanjutkan. Transaksi yang belum disimpan akan hilang.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              <Text>Batal</Text>
            </Button>
            <Button variant="danger" onClick={signOut}>
              <Text>Keluar</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
