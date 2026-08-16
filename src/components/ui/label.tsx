import * as React from 'react';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type LabelProps = React.ComponentPropsWithoutRef<'label'> & {
  /** Marks the field as required, for both sighted and assistive users. */
  required?: boolean;
};

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required = false, children, ...props }, ref) => (
    <label ref={ref} className={cn('type-label text-fg', className)} {...props}>
      {children}
      {required ? (
        <Text variant="label" tone="danger" aria-label="wajib diisi">
          {' *'}
        </Text>
      ) : null}
    </label>
  )
);
Label.displayName = 'Label';

export { Label };
export type { LabelProps };
