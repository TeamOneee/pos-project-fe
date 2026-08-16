/**
 * Measures its own width so a chart can be sized explicitly (recharts has no
 * awareness of layout) and only mounts the chart once a real width exists —
 * this avoids the "width or height must be a number" recharts warning.
 *
 * Height is always supplied explicitly so charts are a fixed height regardless
 * of content; see `CHART_HEIGHT` below.
 */

import * as React from 'react';

type ChartFrameProps = {
  height: number;
  children: (width: number) => React.ReactNode;
};

export function ChartFrame({ height, children }: ChartFrameProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () =>
      setWidth((current) => {
        const next = Math.round(element.getBoundingClientRect().width);
        return Math.abs(current - next) > 1 ? next : current;
      });

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full" style={{ height }}>
      {width > 0 ? children(width) : null}
    </div>
  );
}

export const CHART_HEIGHT = { mobile: 200, default: 260, large: 400 } as const;
