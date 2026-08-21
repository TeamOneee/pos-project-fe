/** Who is signed in, and the way out — both in the top bar, both always visible. */

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
import { ROLE_LABEL, type Role } from '@/lib/permissions';

/**
 * What each role actually stands to lose, rather than one warning aimed at whoever it fits best.
 */
const SIGN_OUT_WARNING: Record<Role, string> = {
  OWNER: 'Anda perlu masuk lagi untuk melanjutkan. Perubahan yang belum disimpan akan hilang.',
  ADMIN:
    'Anda perlu masuk lagi untuk melanjutkan. Penyesuaian stok yang belum disimpan akan hilang.',
  CASHIER:
    'Keranjang yang belum dibayar akan hilang dan tidak bisa dikembalikan. Anda perlu masuk lagi untuk membuka kasir.',
};

export function AccountControls({
  /** The till's bar is tight; drop the identity text and keep the avatar. */
  compact = false,
}: {
  compact?: boolean;
}) {
  const { session, role, signOut } = useAuth();
  const [confirming, setConfirming] = React.useState(false);

  if (!session || !role) return null;

  /**
   * The identity is an email, not a name: §1.2 returns no user object from login, no `GET
   * /auth/me`, and no name in the claims.
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
            <DialogDescription>{SIGN_OUT_WARNING[role]}</DialogDescription>
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
