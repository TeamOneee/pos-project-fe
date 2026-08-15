/**
 * The 72px tablet icon rail.
 *
 * Same nav, same source of truth, no labels. Each icon carries an
 * accessibilityLabel as well as a tooltip — tooltips need a pointer, and this
 * breakpoint is mostly touch.
 */

import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { activeHref, navFor, type NavItem } from '@/components/shell/nav-config';
import { UserChip } from '@/components/shell/user-chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Role } from '@/lib/auth/permissions';
import { cn } from '@/lib/utils';

export function IconRail({ role, pathname }: { role: Role; pathname: string }) {
  const items = navFor(role).flatMap((section) => section.items);
  const active = activeHref(items, pathname);

  return (
    <View className="h-full w-[72px] shrink-0 items-center border-r border-border bg-surface py-lg">
      <View className="flex-1 items-center gap-xs">
        {items.map((item) => (
          <RailLink key={item.href} item={item} active={active === item.href} />
        ))}
      </View>

      <View className="w-full items-center border-t border-border pt-md">
        <UserChip compact />
      </View>
    </View>
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Link href={item.href as never} asChild>
          <Pressable
            role="link"
            // The label is the only thing naming this icon on touch, where
            // there is no hover to reveal the tooltip.
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            className={cn(
              'h-touch w-touch items-center justify-center rounded-md',
              active ? 'bg-accent-subtle' : 'active:bg-subtle web:hover:bg-subtle'
            )}
          >
            <Icon as={item.icon} size={20} className={active ? 'text-accent' : 'text-fg-muted'} />
          </Pressable>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">
        <Text>{item.label}</Text>
      </TooltipContent>
    </Tooltip>
  );
}
