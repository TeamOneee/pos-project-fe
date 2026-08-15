// React Native Testing Library v13 registers its Jest matchers on import —
// no extend-expect entry point, and no @testing-library/jest-native.

import { StyleSheet as CssInteropStyleSheet } from 'react-native-css-interop';

// Jest never runs the Metro/PostCSS pipeline, so NativeWind's runtime starts
// with no compiled CSS and therefore no `darkMode` flag — which makes
// setColorScheme() throw. Register the flag the way the build normally would,
// keeping it in step with `darkMode: 'class'` in tailwind.config.js.
CssInteropStyleSheet.registerCompiled({ $compiled: true, flags: { darkMode: 'class' } });

// AsyncStorage has no native module under Jest; the official mock stands in.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Reanimated's mock covers the Skeleton pulse and toast transitions.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Fonts are already loaded as far as tests are concerned; nothing should block
// on a splash screen.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
  isLoaded: () => true,
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
