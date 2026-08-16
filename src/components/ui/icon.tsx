import type { LucideIcon, LucideProps } from 'lucide-react';

import { cn } from '@/lib/utils';

type IconProps = LucideProps & {
  as: LucideIcon;
};

/**
 * Icon accepts a className so callers set the colour through Tailwind classes
 * (text-accent, text-fg-muted, ...) rather than a color prop.
 */
function Icon({ as: Component, className, ...props }: IconProps) {
  return <Component className={cn('size-5', className)} aria-hidden="true" {...props} />;
}

export { Icon };
export type { IconProps };
