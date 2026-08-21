import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Status badge. CLAUDE.md rule 6: status is never signalled by colour alone, so a Badge always
 * carries a text label — the colour only reinforces it.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-xs self-start rounded-full border px-md py-xs',
  {
    variants: {
      variant: {
        neutral: 'border-border bg-subtle',
        accent: 'border-accent/25 bg-accent-subtle',
        success: 'border-success/30 bg-success-subtle',
        warning: 'border-warning/30 bg-warning-subtle',
        danger: 'border-danger/30 bg-danger-subtle',
        info: 'border-info/25 bg-info/10',
        outline: 'border-border-strong bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

/** 13px on a subtle tint: text contrast, so the `*-text` tokens. */
const badgeTextVariants = cva('type-label', {
  variants: {
    variant: {
      neutral: 'text-fg-muted',
      accent: 'text-accent-text',
      success: 'text-success-text',
      warning: 'text-warning-text',
      danger: 'text-danger-text',
      info: 'text-info-text',
      outline: 'text-fg-muted',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

type BadgeProps = React.ComponentPropsWithoutRef<'span'> & VariantProps<typeof badgeVariants>;

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, children, ...props }, ref) => (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
        {children}
      </span>
    </TextClassContext.Provider>
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
