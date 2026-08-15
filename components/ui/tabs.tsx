import * as TabsPrimitive from '@rn-primitives/tabs';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<TabsPrimitive.ListRef, TabsPrimitive.ListProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn('flex-row items-center gap-xs self-start rounded-md bg-subtle p-xs', className)}
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<TabsPrimitive.TriggerRef, TabsPrimitive.TriggerProps>(
  ({ className, ...props }, ref) => {
    const { value } = TabsPrimitive.useRootContext();
    const active = value === props.value;

    return (
      <TextClassContext.Provider
        value={cn('type-body-strong', active ? 'text-fg' : 'text-fg-muted')}
      >
        <TabsPrimitive.Trigger
          ref={ref}
          className={cn(
            'min-h-touch flex-row items-center justify-center gap-sm rounded-sm px-lg py-sm',
            'web:transition-colors web:outline-none web:focus-visible:ring-2 web:focus-visible:ring-accent',
            active ? 'bg-surface shadow-sm' : 'web:hover:bg-border/50',
            props.disabled && 'opacity-50 web:cursor-not-allowed',
            className
          )}
          {...props}
        />
      </TextClassContext.Provider>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<TabsPrimitive.ContentRef, TabsPrimitive.ContentProps>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content ref={ref} className={cn('web:outline-none', className)} {...props} />
  )
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsContent, TabsList, TabsTrigger };
