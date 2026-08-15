import * as AvatarPrimitive from '@rn-primitives/avatar';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const AvatarPrimitiveRoot = AvatarPrimitive.Root;

const Avatar = React.forwardRef<AvatarPrimitive.RootRef, AvatarPrimitive.RootProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitiveRoot
      ref={ref}
      className={cn('h-10 w-10 shrink-0 overflow-hidden rounded-full bg-accent-subtle', className)}
      {...props}
    />
  )
);
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<AvatarPrimitive.ImageRef, AvatarPrimitive.ImageProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Image ref={ref} className={cn('h-full w-full', className)} {...props} />
  )
);
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<AvatarPrimitive.FallbackRef, AvatarPrimitive.FallbackProps>(
  ({ className, ...props }, ref) => (
    <TextClassContext.Provider value="type-label text-accent">
      <AvatarPrimitive.Fallback
        ref={ref}
        className={cn('h-full w-full items-center justify-center bg-accent-subtle', className)}
        {...props}
      />
    </TextClassContext.Provider>
  )
);
AvatarFallback.displayName = 'AvatarFallback';

/** "Budi Santoso" -> "BS". Two letters max, uppercase. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export { Avatar, AvatarFallback, AvatarImage };
