import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Every size clears the 44×44 minimum touch target from CLAUDE.md rule 6.
 * `pos` is the oversized variant for POS tiles and cart steppers.
 */
const buttonVariants = cva(
  'flex-row items-center justify-center gap-sm rounded-md web:transition-colors web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-accent web:focus-visible:ring-offset-2 web:focus-visible:ring-offset-canvas',
  {
    variants: {
      variant: {
        primary: 'bg-accent active:bg-accent-hover web:hover:bg-accent-hover',
        secondary: 'bg-subtle active:bg-border web:hover:bg-border',
        outline: 'border border-border-strong bg-surface active:bg-subtle web:hover:bg-subtle',
        ghost: 'active:bg-subtle web:hover:bg-subtle',
        danger: 'bg-danger active:opacity-90 web:hover:opacity-90',
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
        true: 'opacity-50 web:cursor-not-allowed',
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

type ButtonProps = Omit<PressableProps, 'disabled'> &
  Omit<VariantProps<typeof buttonVariants>, 'disabled'> & {
    disabled?: boolean;
    /** Shows a pending state; a mutation must never leave a frozen button. */
    loading?: boolean;
  };

const Button = React.forwardRef<View, ButtonProps>(
  ({ className, variant, size, disabled, loading = false, children, ...props }, ref) => {
    const isDisabled = disabled === true || loading;

    return (
      <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
        <Pressable
          ref={ref}
          role="button"
          accessibilityState={{ disabled: isDisabled, busy: loading }}
          disabled={isDisabled}
          className={cn(buttonVariants({ variant, size, disabled: isDisabled }), className)}
          {...props}
        >
          {children}
        </Pressable>
      </TextClassContext.Provider>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
