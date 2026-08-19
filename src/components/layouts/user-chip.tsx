/**
 * The sidebar footer: who is signed in, and the way out.
 *
 * Initials rather than a photo — there is no avatar upload in this product.
 * The role sits in a badge next to the identity, never as a colour alone.
 *
 * The identity is an **email**, not a name, and that is a contract limit rather
 * than a design choice: §1.2 returns no user object from login, offers no
 * `GET /auth/me`, and puts no name in the JWT claims. The email is what the
 * person typed to get in, kept locally beside the token. After a cold reload
 * even that is gone, and the chip falls back to the role alone.
 */

import { LogOut, User as UserIcon } from 'lucide-react';
import * as React from 'react';

import { useAuth } from '@/components/pages/auth/auth-provider';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { ROLE_LABEL } from '@/lib/permissions';
import { cn } from '@/lib/utils';

type UserChipProps = {
  /** The icon rail shows the avatar alone; the sidebar shows the full chip. */
  compact?: boolean;
  /**
   * Where the menu opens. The sidebar sits at the bottom of the screen so its
   * menu goes up; the POS header is at the top, so its menu goes down.
   */
  placement?: 'above' | 'below';
  /**
   * Which edge of the trigger the compact menu anchors to. A chip at the left
   * edge (icon rail) opens toward the screen with `start`; a chip at the right
   * edge (POS header, mobile header) must open left with `end`, or the menu
   * would spill past the viewport edge.
   */
  align?: 'start' | 'end';
};

export function UserChip({ compact = false, placement = 'above', align = 'start' }: UserChipProps) {
  const { session, role, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  if (!session || !role) return null;

  // Empty after a reload that restored the token but not the email hint.
  const identity = session.email || ROLE_LABEL[role];

  return (
    <div className="relative">
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute z-50 min-w-[200px] overflow-hidden rounded-md border border-border bg-surface-raised shadow-lg',
            placement === 'above' ? 'bottom-full mb-sm' : 'top-full mt-sm',
            compact ? (align === 'end' ? 'right-0' : 'left-0') : 'left-0 right-0'
          )}
        >
          <MenuItem icon={UserIcon} label="Profil" onPress={() => setOpen(false)} />
          <Separator />
          <MenuItem
            icon={LogOut}
            label="Keluar"
            tone="danger"
            onPress={() => {
              setOpen(false);
              signOut();
            }}
          />
        </div>
      )}

      <button
        aria-label={`${identity}, ${ROLE_LABEL[role]}. Buka menu akun`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex min-h-touch w-full flex-row items-center gap-md rounded-md p-sm transition-colors hover:bg-subtle',
          compact && 'justify-center'
        )}
      >
        <Avatar className="h-9 w-9">
          <AvatarFallback>
            <Text>{initials(identity)}</Text>
          </AvatarFallback>
        </Avatar>

        {!compact && (
          <span className="flex min-w-0 flex-1 flex-col items-start gap-xs">
            <Text variant="body-strong" className="truncate">
              {identity}
            </Text>
            <Badge variant="accent">
              <Text>{ROLE_LABEL[role]}</Text>
            </Badge>
          </span>
        )}
      </button>

      {/* Click-away catcher */}
      {open && (
        <button
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
          tabIndex={-1}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  tone = 'default',
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  label: string;
  tone?: 'default' | 'danger';
  onPress: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onPress}
      className="flex min-h-touch w-full flex-row items-center gap-md px-md py-sm transition-colors hover:bg-subtle"
    >
      <Icon as={icon} size={18} className={tone === 'danger' ? 'text-danger' : 'text-fg-muted'} />
      <Text variant="body" tone={tone === 'danger' ? 'danger' : 'default'}>
        {label}
      </Text>
    </button>
  );
}
