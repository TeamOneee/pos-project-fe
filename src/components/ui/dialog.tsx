import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

/** Whether this dialog is rendering a close button in its top-right corner. */
const DialogHasCloseContext = React.createContext(true);

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // No padding below tablet: the panel is a full-screen sheet there, and a gutter would leave a
      // strip of dimmed page around it for no reason.
      'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 tablet:p-lg',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideClose?: boolean;
    /**
     * Repositions the panel inside the overlay. A right-hand drawer is the same modal with the same
     * focus trap, only pinned to an edge, so it overrides the centring here rather than
     * reimplementing the primitive.
     */
    overlayClassName?: string;
  }
>(({ className, children, hideClose = false, overlayClassName, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName}>
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          /**
           * Below tablet every modal is a full-screen sheet: the whole viewport, no radius, no
           * border, and its own scroll.
           */
          // `relative` anchors the close button below. Without it the ✕ resolves against the
          // overlay — which is `fixed inset-0`, so the viewport — and a centred panel gets its
          // close button parked in the corner of the screen instead of its own.
          'relative z-50 flex h-full w-full flex-col gap-lg overflow-y-auto rounded-none border-0 bg-surface-raised p-lg shadow-lg',
          'tablet:h-auto tablet:max-h-[90vh] tablet:max-w-[480px] tablet:rounded-lg tablet:border tablet:border-border tablet:p-xl',
          className
        )}
        {...props}
      >
        <DialogHasCloseContext.Provider value={!hideClose}>
          {children}
        </DialogHasCloseContext.Provider>
        {/*
          A 44px target that does not look like a 44px button: the hit area stays
          full size for a thumb, while the ink is a 32px circle that only fills in
          on hover. A square slab of grey in the corner competes with the panel's
          own content, which is the thing being read.
        */}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label="Tutup"
            className="group absolute right-md top-md flex h-touch w-touch items-center justify-center rounded-full text-fg-muted outline-none transition-colors hover:text-fg focus-ring"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-subtle group-active:bg-border">
              <Icon as={X} size={18} />
            </span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogOverlay>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) => {
  // Room for the ✕, but only when there is one — see DialogHasCloseContext.
  const hasClose = React.useContext(DialogHasCloseContext);
  return (
    <div className={cn('flex flex-col gap-xs', hasClose && 'pr-touch', className)} {...props} />
  );
};
DialogHeader.displayName = 'DialogHeader';

/** Sticky on a full-screen sheet, static in a card. */
const DialogFooter = ({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) => (
  <div
    className={cn(
      'sticky bottom-0 z-10 -mx-lg mt-auto flex flex-col-reverse gap-md border-t border-border bg-surface-raised px-lg py-md',
      'tablet:static tablet:mx-0 tablet:mt-0 tablet:flex-row tablet:justify-end tablet:border-0 tablet:p-0',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('type-h2 text-fg', className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('type-body text-fg-muted', className)}
    {...props}
  />
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
