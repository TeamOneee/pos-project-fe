/**
 * The sidebar footer: who is signed in, and the way out.
 *
 * Initials rather than a photo — there is no avatar upload in this product.
 * The role sits in a badge next to the name, never as a colour alone.
 */

import { PortalHost, Portal } from '@rn-primitives/portal';
import { LogOut, User as UserIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/components/auth/auth-provider';
import { Avatar, AvatarFallback, initials } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { ROLE_LABEL } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

const MENU_BACKDROP_HOST = 'user-menu-backdrop';

type UserChipProps = {
  /** The icon rail shows the avatar alone; the sidebar shows the full chip. */
  compact?: boolean;
  /**
   * Where the menu opens. The sidebar sits at the bottom of the screen so its
   * menu goes up; the POS top bar is at the top, so its menu goes down.
   */
  placement?: 'above' | 'below';
};

export function UserChip({ compact = false, placement = 'above' }: UserChipProps) {
  const { user, role, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  if (!user || !role) return null;

  return (
    <View className="relative">
      {open && (
        <>
          {/* Full-screen catcher so a press anywhere else closes the menu. */}
          <Portal name="user-menu-backdrop" hostName={MENU_BACKDROP_HOST}>
            <Pressable
              accessibilityLabel="Tutup menu"
              className="absolute bottom-0 left-0 right-0 top-0"
              onPress={() => setOpen(false)}
            />
          </Portal>

          <View
            role="menu"
            className={cn(
              'absolute z-50 min-w-[200px] overflow-hidden rounded-md border border-border bg-surface-raised shadow-lg',
              placement === 'above' ? 'bottom-full mb-sm' : 'top-full mt-sm',
              compact ? 'left-0' : 'left-0 right-0'
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
          </View>
        </>
      )}

      <Pressable
        role="button"
        accessibilityLabel={`${user.name}, ${ROLE_LABEL[role]}. Buka menu akun`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        className={cn(
          'min-h-touch flex-row items-center gap-md rounded-md p-sm active:bg-subtle web:hover:bg-subtle',
          compact && 'justify-center'
        )}
      >
        <Avatar alt={user.name} className="h-9 w-9">
          <AvatarFallback>
            <Text>{initials(user.name)}</Text>
          </AvatarFallback>
        </Avatar>

        {!compact && (
          <View className="min-w-0 flex-1 gap-xs">
            <Text variant="body-strong" numberOfLines={1}>
              {user.name}
            </Text>
            <Badge variant="accent">
              <Text>{ROLE_LABEL[role]}</Text>
            </Badge>
          </View>
        )}
      </Pressable>

      <PortalHost name={MENU_BACKDROP_HOST} />
    </View>
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
    <Pressable
      role="menuitem"
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-md px-md py-sm active:bg-subtle web:hover:bg-subtle"
    >
      <Icon as={icon} size={18} className={tone === 'danger' ? 'text-danger' : 'text-fg-muted'} />
      <Text variant="body" tone={tone === 'danger' ? 'danger' : 'default'}>
        {label}
      </Text>
    </Pressable>
  );
}
