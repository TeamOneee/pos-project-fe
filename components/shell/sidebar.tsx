/**
 * The 248px desktop sidebar.
 *
 * Nothing here decides what to show — `navFor(role)` does, and it has already
 * been filtered through the role matrix. Adding a section means editing
 * nav-config.ts, never this file.
 */

import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { activeHref, navFor, type NavItem } from '@/components/shell/nav-config';
import { UserChip } from '@/components/shell/user-chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Role } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

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
    <View className="h-full w-[248px] shrink-0 border-r border-border bg-surface">
      <View className="gap-xs px-lg py-lg">
        <Text variant="h3" numberOfLines={1}>
          {merchantName ?? 'POS'}
        </Text>
        <Text variant="caption" tone="subtle">
          Merchant
        </Text>
      </View>

      <View className="flex-1 gap-lg px-md">
        {sections.map((section, index) => (
          <View key={section.title ?? `section-${index}`} className="gap-xs">
            {section.title && (
              <Text variant="caption" tone="subtle" className="px-md uppercase">
                {section.title}
              </Text>
            )}
            {section.items.map((item) => (
              <SidebarLink key={item.href} item={item} active={active === item.href} />
            ))}
          </View>
        ))}
      </View>

      <View className="border-t border-border p-md">
        <UserChip />
      </View>
    </View>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    // asChild so the className lands on a Pressable this file authored.
    // Styling expo-router's Link directly is not reliable — NativeWind's
    // transform applies where the JSX is written, and Link's is not here.
    <Link href={item.href} asChild>
      <Pressable
        role="link"
        accessibilityState={{ selected: active }}
        className={cn(
          'min-h-touch flex-row items-center gap-md rounded-md px-md py-sm',
          active ? 'bg-accent-subtle' : 'active:bg-subtle web:hover:bg-subtle'
        )}
      >
        <Icon as={item.icon} size={18} className={active ? 'text-accent' : 'text-fg-muted'} />
        <Text
          variant={active ? 'body-strong' : 'body'}
          tone={active ? 'accent' : 'muted'}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Pressable>
    </Link>
  );
}
