import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

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
    /*
     * Tones map to the `*-text` tokens, not the base status colours: text has to
     * clear 4.5:1 and the base colours are tuned for fills. `subtle` is the one
     * tone that cannot reach it (2.88:1 on canvas), so it is deliberately not
     * available for text — callers that want quiet text use `muted` (5.68:1).
     * See lib/contrast.test.ts.
     */
    tone: {
      default: 'text-fg',
      muted: 'text-fg-muted',
      subtle: 'text-fg-muted',
      accent: 'text-accent-text',
      success: 'text-success-text',
      warning: 'text-warning-text',
      danger: 'text-danger-text',
      info: 'text-info-text',
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

type TextProps = React.ComponentPropsWithoutRef<'span'> &
  VariantProps<typeof textVariants> & { asChild?: boolean };

const Text = React.forwardRef<HTMLSpanElement, TextProps>(
  ({ className, variant, tone, asChild = false, ...props }, ref) => {
    const contextClass = React.useContext(TextClassContext);
    const classes = cn(textVariants({ variant, tone }), contextClass, className);

    if (asChild) {
      return (
        <TextClassContext.Provider value={classes}>
          {React.Children.only(props.children as React.ReactElement)}
        </TextClassContext.Provider>
      );
    }

    return <span ref={ref} className={classes} {...props} />;
  }
);
Text.displayName = 'Text';

export { Text, TextClassContext, textVariants };
export type { TextProps };
