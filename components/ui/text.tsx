import * as Slot from '@rn-primitives/slot';
import type { SlottableTextProps, TextRef } from '@rn-primitives/types';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Text as RNText } from 'react-native';

import { TABULAR_NUMS } from '@/lib/typography';
import { cn } from '@/lib/utils';

/**
 * Text carries the type scale from CLAUDE.md. Screens pick a `variant` rather
 * than restating sizes, so the scale stays in one place.
 *
 * Money is always `variant="mono"`: Inter with tabular figures, so digits keep
 * a fixed width and columns of rupiah line up.
 */
const textVariants = cva('text-fg', {
  variants: {
    variant: {
      display: 'type-display',
      h1: 'type-h1',
      h2: 'type-h2',
      h3: 'type-h3',
      body: 'type-body',
      'body-strong': 'type-body-strong',
      label: 'type-label',
      caption: 'type-caption',
      mono: 'type-mono tabular-nums',
    },
    tone: {
      default: 'text-fg',
      muted: 'text-fg-muted',
      subtle: 'text-fg-subtle',
      accent: 'text-accent',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
      info: 'text-info',
      'on-accent': 'text-white',
    },
  },
  defaultVariants: {
    variant: 'body',
    tone: 'default',
  },
});

/**
 * Lets a parent (Button, Badge, ...) set the text style for any Text beneath it
 * without every call site repeating the classes.
 */
const TextClassContext = React.createContext<string | undefined>(undefined);

type TextProps = SlottableTextProps & VariantProps<typeof textVariants>;

const Text = React.forwardRef<TextRef, TextProps>(
  ({ className, variant, tone, asChild = false, style, ...props }, ref) => {
    const contextClass = React.useContext(TextClassContext);
    const Component = asChild ? Slot.Text : RNText;

    // Tabular figures cannot come from a class on native — see lib/typography.ts.
    const tabular = variant === 'mono' || contextClass?.includes('type-mono');

    return (
      <Component
        ref={ref}
        className={cn(textVariants({ variant, tone }), contextClass, className)}
        style={tabular ? [TABULAR_NUMS, style] : style}
        {...props}
      />
    );
  }
);
Text.displayName = 'Text';

export { Text, TextClassContext, textVariants };
export type { TextProps };
