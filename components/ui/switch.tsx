import * as SwitchPrimitive from '@rn-primitives/switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * The track is 44×24 — already at the minimum touch width from CLAUDE.md
 * rule 6 — with hitSlop covering the remaining vertical room.
 */
const Switch = React.forwardRef<SwitchPrimitive.RootRef, SwitchPrimitive.RootProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'h-6 w-11 shrink-0 justify-center rounded-full border-2 border-transparent px-0.5',
        'web:transition-colors web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-accent web:focus-visible:ring-offset-2',
        props.checked ? 'bg-accent' : 'bg-border-strong',
        props.disabled && 'opacity-50 web:cursor-not-allowed',
        className
      )}
      hitSlop={10}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'h-5 w-5 rounded-full bg-white shadow web:transition-transform',
          props.checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </SwitchPrimitive.Root>
  )
);
Switch.displayName = 'Switch';

export { Switch };
