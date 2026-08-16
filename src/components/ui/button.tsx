import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Every size clears the 44×44 minimum touch target from CLAUDE.md rule 6.
 * `pos` is the oversized variant for POS tiles and cart steppers.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-sm rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas select-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white active:bg-accent-hover hover:bg-accent-hover',
        secondary: 'bg-subtle text-fg active:bg-border hover:bg-border',
        outline: 'border border-border-strong bg-surface text-fg active:bg-subtle hover:bg-subtle',
        ghost: 'text-fg active:bg-subtle hover:bg-subtle',
        danger: 'bg-danger text-white active:opacity-90 hover:opacity-90',
      },
      size: {
        sm: 'min-h-touch px-md py-sm',
        md: 'min-h-touch px-lg py-md',
        lg: 'min-h-[52px] px-xl py-lg',
        // POS tiles and cart steppers are deliberately larger.
        pos: 'min-h-[64px] min-w-[64px] px-lg py-lg',
        icon: 'h-touch w-touch',
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed pointer-events-none',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      disabled: false,
    },
  }
);

/** Label styling per variant, handed down so callers write <Text> with no classes. */
const buttonTextVariants = cva('type-body-strong text-center', {
  variants: {
    variant: {
      primary: 'text-white',
      secondary: 'text-fg',
      outline: 'text-fg',
      ghost: 'text-fg',
      danger: 'text-white',
    },
    size: {
      sm: 'type-label',
      md: 'type-body-strong',
      lg: 'type-h3',
      pos: 'type-body-strong',
      icon: 'type-body-strong',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type ButtonProps = Omit<React.ComponentPropsWithoutRef<'button'>, 'disabled'> &
  Omit<VariantProps<typeof buttonVariants>, 'disabled'> & {
    disabled?: boolean;
    /** Shows a pending state; a mutation must never leave a frozen button. */
    loading?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, disabled, loading = false, children, ...props }, ref) => {
    const isDisabled = disabled === true || loading;

    return (
      <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
        <button
          ref={ref}
          disabled={isDisabled}
          aria-busy={loading || undefined}
          className={cn(buttonVariants({ variant, size, disabled: isDisabled }), className)}
          {...props}
        >
          {children}
        </button>
      </TextClassContext.Provider>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
