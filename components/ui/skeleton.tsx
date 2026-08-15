import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from '@/lib/utils';

/**
 * The loading state every list screen owes its user (CLAUDE.md § Conventions:
 * loading / populated / empty / no-results).
 *
 * The pulse is an animated opacity — one of the few things Tailwind genuinely
 * cannot express on native, so it stays a driven style value.
 */
type SkeletonProps = ViewProps & {
  /** Disable the animation, e.g. in tests or under reduced-motion. */
  animated?: boolean;
};

function Skeleton({ className, animated = true, ...props }: SkeletonProps) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    if (!animated) return;

    opacity.value = withRepeat(
      withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [animated, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Memuat"
      style={animated ? animatedStyle : undefined}
      className={cn('rounded-md bg-subtle', className)}
      {...props}
    />
  );
}

/** Convenience: a block of repeated skeleton rows for list screens. */
function SkeletonList({
  count = 5,
  className,
  itemClassName,
}: {
  count?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <View className={cn('gap-md', className)}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={cn('h-16 w-full', itemClassName)} />
      ))}
    </View>
  );
}

export { Skeleton, SkeletonList };
export type { SkeletonProps };
