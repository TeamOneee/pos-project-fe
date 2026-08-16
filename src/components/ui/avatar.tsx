import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-accent-subtle',
        className
      )}
      {...props}
    />
  )
);
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<HTMLImageElement, React.ComponentPropsWithoutRef<'img'>>(
  ({ className, alt = '', ...props }, ref) => (
    <img ref={ref} alt={alt} className={cn('h-full w-full object-cover', className)} {...props} />
  )
);
AvatarImage.displayName = 'AvatarImage';

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(
  ({ className, ...props }, ref) => (
    <TextClassContext.Provider value="type-label text-accent">
      <span
        ref={ref}
        className={cn('flex h-full w-full items-center justify-center bg-accent-subtle', className)}
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
