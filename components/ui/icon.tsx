import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';

import { cn } from '@/lib/utils';

/**
 * Lucide icons take a `color` prop, not a style. This maps `className` onto it,
 * so icons pick up semantic colour tokens the same way text does:
 *
 *   <Icon as={Check} className="text-accent" size={16} />
 *
 * Without this, every icon would need a hex literal — which CLAUDE.md forbids
 * outside the token config.
 */
const interopCache = new WeakSet<LucideIcon>();

function enableClassName(icon: LucideIcon): LucideIcon {
  if (!interopCache.has(icon)) {
    cssInterop(icon, {
      className: {
        target: 'style',
        nativeStyleToProp: { color: true, opacity: true },
      },
    });
    interopCache.add(icon);
  }
  return icon;
}

type IconProps = LucideProps & {
  as: LucideIcon;
  className?: string;
};

function Icon({ as: IconComponent, className, size = 16, ...props }: IconProps) {
  // Registers the interop once per icon type and returns the *same* component
  // reference — cssInterop patches in place, so no component is created here.
  enableClassName(IconComponent);

  return (
    <IconComponent
      // Decorative by default: the adjacent label carries the meaning, per
      // CLAUDE.md rule 6 (status is never colour or icon alone).
      aria-hidden
      size={size}
      className={cn('text-fg', className)}
      {...props}
    />
  );
}

export { Icon, enableClassName };
export type { IconProps };
