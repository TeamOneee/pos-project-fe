/**
 * Trails a value by a delay.
 *
 * For search boxes whose query is server-side: the input stays fully responsive
 * because it owns its own state, while the request only follows once typing
 * pauses. Without this, `GET /products?search=` fires once per keystroke and the
 * results flicker between pages of a moving target.
 */

import * as React from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
