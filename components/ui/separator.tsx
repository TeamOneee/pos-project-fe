import * as SeparatorPrimitive from '@rn-primitives/separator';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Separator = React.forwardRef<SeparatorPrimitive.RootRef, SeparatorPrimitive.RootProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      orientation={orientation}
      decorative={decorative}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export { Separator };
