/**
 * The mobile bottom tab bar. Five items maximum, per the design brief.
 *
 * A role with more than five nav items gets its first four plus "Lainnya",
 * which opens the remainder in a sheet — the brief's hamburger, in the place
 * thumbs actually reach. The Owner is the only role this affects; Admin has
 * exactly five and the Cashier has two.
 */

import { Link, usePathname } from 'expo-router';
import { Menu } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { activeHref, navFor, type NavItem } from '@/components/shell/nav-config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Role } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

const MAX_TABS = 5;

export function BottomTabs({ role }: { role: Role }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [overflowOpen, setOverflowOpen] = React.useState(false);

  const items = navFor(role).flatMap((section) => section.items);
  const active = activeHref(items, pathname);

  const needsOverflow = items.length > MAX_TABS;
  const visible = needsOverflow ? items.slice(0, MAX_TABS - 1) : items;
  const overflow = needsOverflow ? items.slice(MAX_TABS - 1) : [];

  // An item hidden behind "Lainnya" still has to look selected when it is.
  const overflowActive = overflow.some((item) => item.href === active);

  return (
    <>
      <View
        className="flex-row border-t border-border bg-surface"
        style={{ paddingBottom: insets.bottom }}
      >
        {visible.map((item) => (
          <TabLink key={item.href} item={item} active={active === item.href} />
        ))}

        {needsOverflow && (
          <Pressable
            role="button"
            accessibilityLabel="Menu lainnya"
            accessibilityState={{ selected: overflowActive, expanded: overflowOpen }}
            onPress={() => setOverflowOpen(true)}
            className="min-h-touch flex-1 items-center justify-center gap-xs py-sm active:bg-subtle"
          >
            <Icon as={Menu} size={20} className={overflowActive ? 'text-accent' : 'text-fg-muted'} />
            <Text variant="caption" tone={overflowActive ? 'accent' : 'muted'} numberOfLines={1}>
              Lainnya
            </Text>
          </Pressable>
        )}
      </View>

      <Dialog open={overflowOpen} onOpenChange={setOverflowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu lainnya</DialogTitle>
          </DialogHeader>

          <View className="gap-xs">
            {overflow.map((item) => (
              <Link key={item.href} href={item.href} asChild>
                <Pressable
                  role="link"
                  onPress={() => setOverflowOpen(false)}
                  accessibilityState={{ selected: active === item.href }}
                  className={cn(
                    'min-h-touch flex-row items-center gap-md rounded-md px-md py-sm',
                    active === item.href ? 'bg-accent-subtle' : 'active:bg-subtle'
                  )}
                >
                  <Icon
                    as={item.icon}
                    size={18}
                    className={active === item.href ? 'text-accent' : 'text-fg-muted'}
                  />
                  <Text tone={active === item.href ? 'accent' : 'default'}>{item.label}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} asChild>
      <Pressable
        role="link"
        accessibilityState={{ selected: active }}
        className="min-h-touch flex-1 items-center justify-center gap-xs py-sm active:bg-subtle"
      >
        <Icon as={item.icon} size={20} className={active ? 'text-accent' : 'text-fg-muted'} />
        <Text variant="caption" tone={active ? 'accent' : 'muted'} numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    </Link>
  );
}
