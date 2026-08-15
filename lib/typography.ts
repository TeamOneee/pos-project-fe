import type { TextStyle } from 'react-native';

/**
 * Tabular (fixed-width) figures, so columns of rupiah line up digit for digit.
 *
 * This is one of the few style values Tailwind genuinely cannot express here:
 * react-native-css-interop maps `font-variant-caps` but not
 * `font-variant-numeric`, so the `tabular-nums` class reaches web only. React
 * Native needs the `fontVariant` style directly — and react-native-web maps it
 * back to `font-variant-numeric`, so one style serves all three platforms.
 *
 * Used by the `mono` Text variant and by numeric Inputs. Nothing else should
 * need it; money and figures go through those two.
 */
export const TABULAR_NUMS: TextStyle = { fontVariant: ['tabular-nums'] };
