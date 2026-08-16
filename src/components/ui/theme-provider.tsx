import * as React from 'react';

export type ThemeName = 'light' | 'dark';
export type ThemePreference = ThemeName | 'system';

const STORAGE_KEY = 'pos.theme';

type ThemeContextValue = {
  theme: ThemeName;
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Storage unavailable; fall through to system.
  }
  return 'system';
}

function systemTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeName) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>('system');
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setPreferenceState(readPreference());
    setHydrated(true);
  }, []);

  const theme: ThemeName = preference === 'system' ? systemTheme() : preference;

  React.useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  React.useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media || preference !== 'system') return;

    const onChange = () => applyTheme(systemTheme());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best effort.
    }
  }, []);

  const toggle = React.useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [setPreference, theme]);

  const value = React.useMemo(
    () => ({ theme, preference, hydrated, setPreference, toggle }),
    [theme, preference, hydrated, setPreference, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
