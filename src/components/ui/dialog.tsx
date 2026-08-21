import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

/**
 * Whether this dialog is rendering a close button in its top-right corner.
 *
 * The header keeps a touch target's worth of space clear on that side so a long
 * title does not run under the ✕. That reservation is only correct when the ✕ is
 * actually there: on a `hideClose` dialog it is 44px of dead space that pulls a
 * centred header off-centre. The decision belongs to DialogContent, which owns
 * the button, so it is passed down rather than guessed at.
 */
const DialogHasCloseContext = React.createContext(true);

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // No padding below tablet: the panel is a full-screen sheet there, and a
      // gutter would leave a strip of dimmed page around it for no reason.
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
     * Repositions the panel inside the overlay. A right-hand drawer is the same
     * modal with the same focus trap, only pinned to an edge, so it overrides
     * the centring here rather than reimplementing the primitive.
     */
    overlayClassName?: string;
  }
>(({ className, children, hideClose = false, overlayClassName, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName}>
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          /*
           * Below tablet every modal is a full-screen sheet: the whole viewport,
           * no radius, no border, and its own scroll. A centred 480px card on a
           * 360px phone is a card with 12px of gutter and a cramped form in it.
           * From tablet up the same component is the card it always was — the
           * `max-w-*` a caller passes only applies there.
           */
          'z-50 flex h-full w-full flex-col gap-lg overflow-y-auto rounded-none border-0 bg-surface-raised p-lg shadow-lg',
          'tablet:h-auto tablet:max-h-[90vh] tablet:max-w-[480px] tablet:rounded-lg tablet:border tablet:border-border tablet:p-xl',
          className
        )}
        {...props}
      >
        <DialogHasCloseContext.Provider value={!hideClose}>
          {children}
        </DialogHasCloseContext.Provider>
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label="Tutup"
            className="absolute right-md top-md flex h-touch w-touch items-center justify-center rounded-md transition-colors hover:bg-subtle"
          >
            <Icon as={X} size={20} className="text-fg-muted" />
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

/**
 * Sticky on a full-screen sheet, static in a card.
 *
 * On a phone the form scrolls under the actions, so "Simpan" is reachable
 * without scrolling to the bottom of a long body — and `mt-auto` pins it to the
 * end of the sheet when the body is short. The negative margins let the bar span
 * the sheet's full width while the panel keeps its padding.
 */
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
