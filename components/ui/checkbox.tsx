import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import { Check } from 'lucide-react-native';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/**
 * The visual box is 20×20, but the pressable is padded out to the 44×44
 * minimum touch target from CLAUDE.md rule 6.
 */
const Checkbox = React.forwardRef<CheckboxPrimitive.RootRef, CheckboxPrimitive.RootProps>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface',
        'web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-accent web:focus-visible:ring-offset-2',
        props.checked && 'border-accent bg-accent',
        props.disabled && 'opacity-50 web:cursor-not-allowed',
        className
      )}
      hitSlop={12}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="h-full w-full items-center justify-center">
        <Icon as={Check} size={14} strokeWidth={3} className="text-white" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
