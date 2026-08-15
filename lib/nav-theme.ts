import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { color, type ThemeName } from '@/lib/tokens';

/**
 * Expo Router paints native headers, card backgrounds and the transition scrim
 * itself, outside NativeWind's reach. It needs resolved colour values, which
 * come from the same token source as everything else.
 *
 * As of SDK 56 Expo Router vendors its own navigation core, so these types come
 * from `expo-router` rather than `@react-navigation/native`.
 */
export function navigationTheme(scheme: ThemeName): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: scheme === 'dark',
    colors: {
      ...base.colors,
      primary: color('accent', scheme),
      background: color('canvas', scheme),
      card: color('surface', scheme),
      text: color('fg', scheme),
      border: color('border', scheme),
      notification: color('danger', scheme),
    },
  };
}
