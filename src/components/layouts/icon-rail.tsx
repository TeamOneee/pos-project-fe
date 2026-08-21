/**
 * The 72px tablet icon rail.
 *
 * Same nav, same source of truth, no labels. Each icon carries a tooltip for
 * pointer users and an aria-label for everyone else.
 */

import { NavLink } from 'react-router-dom';

import { activeHref, navFor, type NavItem } from '@/components/layouts/nav-config';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Role } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export function IconRail({ role, pathname }: { role: Role; pathname: string }) {
  const items = navFor(role).flatMap((section) => section.items);
  const active = activeHref(items, pathname);

  return (
    <aside className="hidden h-full w-[72px] shrink-0 flex-col items-center border-r border-border bg-surface py-lg tablet:flex desktop:hidden">
      <div className="flex flex-1 flex-col items-center gap-xs">
        {items.map((item) => (
          <RailLink key={item.href} item={item} active={active === item.href} />
        ))}
      </div>
    </aside>
  );
}

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <NavLink
          to={item.href}
          end={item.exact}
          aria-label={item.label}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex h-touch w-touch items-center justify-center rounded-md transition-colors',
            active ? 'bg-accent' : 'hover:bg-accent/15'
          )}
        >
          <Icon
            as={item.icon}
            size={20}
            className={cn(
              'transition-colors',
              active ? 'text-white' : 'text-fg-muted hover:text-accent-text'
            )}
          />
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right">
        <Text>{item.label}</Text>
      </TooltipContent>
    </Tooltip>
  );
}
