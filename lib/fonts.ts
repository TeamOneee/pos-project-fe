import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';

/**
 * Inter, in the four weights the type scale uses (400/500/600, plus 700 for
 * emphasis). expo-font loads real TTFs on iOS and Android and injects an
 * @font-face on web, so all three platforms render the same faces.
 *
 * Tabular figures come from Inter's `tnum` feature, reached through the
 * `tabular-nums` class on the `mono` type preset — that is what keeps columns
 * of rupiah aligned (CLAUDE.md § Design tokens).
 */
export const INTER_FONTS = {
  Inter: Inter_400Regular,
  'Inter-Regular': Inter_400Regular,
  'Inter-Medium': Inter_500Medium,
  'Inter-SemiBold': Inter_600SemiBold,
  'Inter-Bold': Inter_700Bold,
} as const;

/** Returns [loaded, error]; the root layout holds the splash until loaded. */
export function useInterFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts(INTER_FONTS);
  return [loaded, error];
}
