import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Tooltips are a desktop affordance and must never be the only carrier of
 * information — touch users cannot hover. Anything essential goes in a label.
 */
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <TextClassContext.Provider value="type-caption text-canvas">
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn('z-50 overflow-hidden rounded-sm bg-fg px-md py-sm shadow-md', className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  </TextClassContext.Provider>
));
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
