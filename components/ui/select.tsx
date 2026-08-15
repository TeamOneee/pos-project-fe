import * as SelectPrimitive from '@rn-primitives/select';
import { Check, ChevronDown } from 'lucide-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

type Option = SelectPrimitive.Option;

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

/**
 * The underlying primitives are Pressables, whose `children` may also be a
 * render function. These wrappers only ever take nodes, so the prop is narrowed.
 */
type SlotChildren = { children?: React.ReactNode };

const SelectTrigger = React.forwardRef<
  SelectPrimitive.TriggerRef,
  Omit<SelectPrimitive.TriggerProps, 'children'> & SlotChildren & { invalid?: boolean }
>(({ className, children, invalid = false, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'min-h-touch flex-row items-center justify-between gap-sm rounded-md border border-border bg-surface px-md py-sm',
      'web:outline-none web:focus:border-accent web:focus:ring-2 web:focus:ring-accent/20',
      invalid && 'border-danger',
      props.disabled && 'opacity-50 web:cursor-not-allowed',
      className
    )}
    {...props}
  >
    {children}
    <Icon as={ChevronDown} size={16} className="text-fg-muted" />
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<
  SelectPrimitive.ContentRef,
  SelectPrimitive.ContentProps & { portalHost?: string }
>(({ className, children, portalHost, ...props }, ref) => (
  <SelectPrimitive.Portal hostName={portalHost}>
    <SelectPrimitive.Overlay style={Platform.OS !== 'web' ? { flex: 1 } : undefined}>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          'z-50 min-w-[8rem] rounded-md border border-border bg-surface-raised p-xs shadow-md',
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-0">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Overlay>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef<SelectPrimitive.LabelRef, SelectPrimitive.LabelProps>(
  ({ className, ...props }, ref) => (
    <SelectPrimitive.Label
      ref={ref}
      className={cn('type-label px-md py-sm text-fg-muted', className)}
      {...props}
    />
  )
);
SelectLabel.displayName = 'SelectLabel';

const SelectItem = React.forwardRef<
  SelectPrimitive.ItemRef,
  Omit<SelectPrimitive.ItemProps, 'children'> & SlotChildren
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'min-h-touch flex-row items-center gap-sm rounded-sm px-md py-sm',
      'active:bg-subtle web:hover:bg-subtle web:outline-none web:focus:bg-subtle',
      props.disabled && 'opacity-50 web:pointer-events-none',
      className
    )}
    {...props}
  >
    <View className="w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Icon as={Check} size={16} className="text-accent" />
      </SelectPrimitive.ItemIndicator>
    </View>
    {/* The primitive renders the option label itself; it takes no children. */}
    <SelectPrimitive.ItemText className="type-body text-fg" />
    {children}
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef<
  SelectPrimitive.SeparatorRef,
  SelectPrimitive.SeparatorProps
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
export type { Option };
