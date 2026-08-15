import * as DialogPrimitive from '@rn-primitives/dialog';
import { X } from 'lucide-react-native';
import * as React from 'react';
import { Platform, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<DialogPrimitive.OverlayRef, DialogPrimitive.OverlayProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'absolute bottom-0 left-0 right-0 top-0 z-50 items-center justify-center bg-black/50 p-lg',
        className
      )}
      {...props}
    />
  )
);
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef<
  DialogPrimitive.ContentRef,
  DialogPrimitive.ContentProps & { portalHost?: string; hideClose?: boolean }
>(({ className, children, portalHost, hideClose = false, ...props }, ref) => (
  <DialogPortal hostName={portalHost}>
    <DialogOverlay>
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'z-50 w-full max-w-[480px] gap-lg rounded-lg border border-border bg-surface-raised p-xl shadow-lg',
          className
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            accessibilityLabel="Tutup"
            className="absolute right-md top-md h-touch w-touch items-center justify-center rounded-md active:bg-subtle web:hover:bg-subtle"
          >
            <Icon as={X} size={20} className="text-fg-muted" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogOverlay>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof View>) => (
  <View className={cn('gap-xs', Platform.OS === 'web' && 'pr-touch', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof View>) => (
  <View
    className={cn('flex-col-reverse gap-md tablet:flex-row tablet:justify-end', className)}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<DialogPrimitive.TitleRef, DialogPrimitive.TitleProps>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title ref={ref} asChild>
      <Text variant="h2" className={className} {...props} />
    </DialogPrimitive.Title>
  )
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  DialogPrimitive.DescriptionRef,
  DialogPrimitive.DescriptionProps
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} asChild>
    <Text variant="body" tone="muted" className={className} {...props} />
  </DialogPrimitive.Description>
));
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
