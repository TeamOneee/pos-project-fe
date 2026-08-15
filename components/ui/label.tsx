import * as React from 'react';

import { Text, type TextProps } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type LabelProps = Omit<TextProps, 'variant'> & {
  /** Marks the field as required, for both sighted and assistive users. */
  required?: boolean;
};

const Label = React.forwardRef<React.ElementRef<typeof Text>, LabelProps>(
  ({ className, required = false, children, ...props }, ref) => (
    <Text ref={ref} variant="label" className={cn('text-fg', className)} {...props}>
      {children}
      {required ? (
        <Text variant="label" tone="danger" accessibilityLabel="wajib diisi">
          {' *'}
        </Text>
      ) : null}
    </Text>
  )
);
Label.displayName = 'Label';

export { Label };
export type { LabelProps };
