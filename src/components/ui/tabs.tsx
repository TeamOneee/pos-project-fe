import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex items-center gap-xs self-start rounded-md bg-subtle p-xs', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  return (
    <TextClassContext.Provider
      value={cn(
        'type-body-strong',
        'data-[state=active]:text-fg data-[state=inactive]:text-fg-muted'
      )}
    >
      <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
          'inline-flex min-h-touch items-center justify-center gap-sm rounded-sm px-lg py-sm',
          'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'data-[state=active]:bg-surface data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-border/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
});
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn('outline-none', className)} {...props} />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsContent, TabsList, TabsTrigger };
