import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** Every size clears the 44×44 minimum touch target from CLAUDE.md rule 6. */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-sm rounded-md transition-colors focus-ring select-none',
  {
    variants: {
      variant: {
        // `*-fill` rather than the base accent: white on the dark theme's accent is 4.47:1, and on
        // its hover state 2.7:1.
        primary: 'bg-accent-fill text-white active:bg-accent-fill-hover hover:bg-accent-fill-hover',
        secondary: 'bg-subtle text-fg active:bg-border hover:bg-border',
        outline:
          'border border-border-interactive bg-surface text-fg active:bg-subtle hover:bg-subtle',
        ghost: 'text-fg active:bg-subtle hover:bg-subtle',
        danger: 'bg-danger-fill text-white active:opacity-90 hover:opacity-90',
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
