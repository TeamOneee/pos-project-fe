/**
 * Gives a chart its width.
 *
 * Victory needs pixel dimensions, and a percentage will not do. This measures
 * the space it is given and renders the chart only once that is known, so a
 * chart never flashes at the wrong size on first paint or after a rotation.
 */

import * as React from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

type ChartFrameProps = {
  height: number;
  /** Called with the measured width; render the chart inside. */
  children: (width: number) => React.ReactNode;
};

export function ChartFrame({ height, children }: ChartFrameProps) {
  const [width, setWidth] = React.useState(0);

  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    // Ignore sub-pixel churn; re-rendering a chart is not cheap.
    setWidth((current) => (Math.abs(current - next) > 1 ? next : current));
  }, []);

  return (
    <View onLayout={onLayout} style={{ height }} className="w-full">
      {width > 0 ? children(width) : null}
    </View>
  );
}

/** Chart heights: full at desktop and tablet, 200px on mobile per the brief. */
export const CHART_HEIGHT = { mobile: 200, default: 260, large: 400 } as const;
