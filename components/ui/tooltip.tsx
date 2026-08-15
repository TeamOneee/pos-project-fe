import * as TooltipPrimitive from '@rn-primitives/tooltip';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/**
 * Tooltips are a desktop affordance and must never be the only carrier of
 * information — touch users cannot hover. Anything essential goes in a label.
 */
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  TooltipPrimitive.ContentRef,
  TooltipPrimitive.ContentProps & { portalHost?: string }
>(({ className, portalHost, sideOffset = 8, ...props }, ref) => (
  <TooltipPrimitive.Portal hostName={portalHost}>
    <TooltipPrimitive.Overlay style={{ position: 'absolute', inset: 0 }}>
      {/* bg-fg / text-canvas inverts correctly in both themes. */}
      <TextClassContext.Provider value="type-caption text-canvas">
        <TooltipPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn('z-50 overflow-hidden rounded-sm bg-fg px-md py-sm shadow-md', className)}
          {...props}
        />
      </TextClassContext.Provider>
    </TooltipPrimitive.Overlay>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipContent, TooltipTrigger };
