import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { View, type ViewProps } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Status badge. CLAUDE.md rule 6: status is never signalled by colour alone,
 * so a Badge always carries a text label — the colour only reinforces it.
 */
const badgeVariants = cva('flex-row items-center gap-xs self-start rounded-full px-md py-xs', {
  variants: {
    variant: {
      neutral: 'bg-subtle',
      accent: 'bg-accent-subtle',
      success: 'bg-success-subtle',
      warning: 'bg-warning-subtle',
      danger: 'bg-danger-subtle',
      outline: 'border border-border-strong bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

const badgeTextVariants = cva('type-label', {
  variants: {
    variant: {
      neutral: 'text-fg-muted',
      accent: 'text-accent',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
      outline: 'text-fg-muted',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

type BadgeProps = ViewProps & VariantProps<typeof badgeVariants>;

const Badge = React.forwardRef<View, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <View ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
        {children}
      </View>
    </TextClassContext.Provider>
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
