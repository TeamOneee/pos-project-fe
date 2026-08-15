import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import * as React from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { navigationTheme } from '@/lib/nav-theme';
import type { ThemeName } from '@/lib/tokens';

const STORAGE_KEY = 'pos.theme-preference';

/** What the user chose. "system" follows the OS and is the default. */
export type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  /** The user's stored choice. */
  preference: ThemePreference;
  /** The theme actually in effect once "system" is resolved. */
  theme: ThemeName;
  setPreference: (preference: ThemePreference) => void;
  /** Flips between light and dark, leaving "system" behind. */
  toggle: () => void;
  /** False until the stored preference has been read back. */
  hydrated: boolean;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useNativeWindColorScheme();
  const systemScheme = useSystemColorScheme();

  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [hydrated, setHydrated] = React.useState(false);

  const theme: ThemeName =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  // Read the stored preference once, before the first paint the user notices.
  React.useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {
        // A theme preference is not worth failing a boot over — fall back to system.
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Push the resolved theme into NativeWind, which owns the `dark:` variant on
  // native and toggles the `dark` class on web.
  React.useEffect(() => {
    setColorScheme(preference === 'system' ? 'system' : preference);
  }, [preference, setColorScheme]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Persisting failed; the in-memory choice still applies for this session.
    });
  }, []);

  const toggle = React.useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setPreference]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ preference, theme, setPreference, toggle, hydrated }),
    [preference, theme, setPreference, toggle, hydrated]
  );

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme(theme)}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}

export { STORAGE_KEY as THEME_STORAGE_KEY, ThemeProvider, useTheme };
