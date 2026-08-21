import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & { invalid?: boolean }
>(({ className, children, invalid = false, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      // One line at a time: the resting border hides under the ring, and an
      // invalid trigger recolours the ring rather than keeping a second border.
      'flex min-h-touch flex-row items-center justify-between gap-sm rounded-md border border-border-interactive bg-surface px-md py-sm transition-colors focus:border-transparent',
      invalid ? 'border-danger focus-ring-danger' : 'focus-ring-always',
      props.disabled && 'cursor-not-allowed opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon>
      <Icon as={ChevronDown} size={16} className="text-fg-muted" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      // Radix defaults to `item-aligned`, which lifts the menu so the selected
      // row lands on top of the trigger — covering the field's own label and
      // whatever sits above it. Popper drops it below the trigger instead, the
      // same as the row menu.
      position="popper"
      sideOffset={4}
      className={cn(
        // Matching the trigger's width keeps the menu squared with the field.
        // The viewport scrolls itself, so the height cap belongs here, on a
        // flex column, or a long list overflows instead of scrolling.
        'z-50 flex max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] min-w-[8rem] flex-col overflow-hidden rounded-md border border-border-interactive bg-surface-raised p-xs shadow-md',
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('type-label px-md py-sm text-fg-muted', className)}
    {...props}
  />
));
SelectLabel.displayName = 'SelectLabel';

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex min-h-touch cursor-pointer select-none flex-row items-center gap-sm rounded-sm px-md py-sm',
      'transition-colors outline-none hover:bg-subtle focus:bg-subtle data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="flex w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Icon as={Check} size={16} className="text-accent" />
      </SelectPrimitive.ItemIndicator>
    </span>
    {/* The label must live inside ItemText — that is what SelectValue copies
        into the trigger. A sibling node renders in the list but never in the
        trigger, leaving the selected value looking blank. */}
    <SelectPrimitive.ItemText className="type-body text-fg">{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('my-xs h-px bg-border', className)}
    {...props}
  />
));
SelectSeparator.displayName = 'SelectSeparator';

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
