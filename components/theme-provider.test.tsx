import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as React from 'react';

import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Text } from '@/components/ui/text';

function ThemeReadout() {
  const { theme, preference, hydrated } = useTheme();
  return <Text>{`${theme}|${preference}|${hydrated ? 'hydrated' : 'loading'}`}</Text>;
}

/** Captures a render-time throw so the original error can be asserted on. */
class ErrorBoundary extends React.Component<
  { onError: (error: Error) => void; children: React.ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

const renderWithProvider = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('ThemeProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('defaults to following the system, resolved to light in tests', async () => {
    renderWithProvider(<ThemeReadout />);

    await waitFor(() => {
      expect(screen.getByText('light|system|hydrated')).toBeOnTheScreen();
    });
  });

  it('restores a persisted preference on boot', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');

    renderWithProvider(<ThemeReadout />);

    await waitFor(() => {
      expect(screen.getByText('dark|dark|hydrated')).toBeOnTheScreen();
    });
  });

  it('ignores a corrupted stored value rather than failing to boot', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'chartreuse');

    renderWithProvider(<ThemeReadout />);

    await waitFor(() => {
      expect(screen.getByText('light|system|hydrated')).toBeOnTheScreen();
    });
  });

  it('toggles to dark and persists the choice', async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <>
        <ThemeReadout />
        <ThemeToggle />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText('light|system|hydrated')).toBeOnTheScreen();
    });

    await user.press(screen.getByLabelText('Gelap'));

    await waitFor(() => {
      expect(screen.getByText('dark|dark|hydrated')).toBeOnTheScreen();
    });

    await waitFor(async () => {
      await expect(AsyncStorage.getItem(THEME_STORAGE_KEY)).resolves.toBe('dark');
    });
  });

  it('toggles back to light', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const user = userEvent.setup();

    renderWithProvider(
      <>
        <ThemeReadout />
        <ThemeToggle />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText('dark|dark|hydrated')).toBeOnTheScreen();
    });

    await user.press(screen.getByLabelText('Terang'));

    await waitFor(() => {
      expect(screen.getByText('light|light|hydrated')).toBeOnTheScreen();
    });
  });

  it('marks the active option for assistive tech, not by colour alone', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderWithProvider(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByLabelText('Gelap')).toBeSelected();
    });
    expect(screen.getByLabelText('Terang')).not.toBeSelected();
  });

  it('survives a storage read failure', async () => {
    const spy = jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('storage unavailable'));

    renderWithProvider(<ThemeReadout />);

    await waitFor(() => {
      expect(screen.getByText('light|system|hydrated')).toBeOnTheScreen();
    });

    spy.mockRestore();
  });

  it('throws when useTheme is called outside the provider', () => {
    // The renderer replaces a thrown render error with its own, so the real one
    // is captured through an error boundary instead.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const caught: Error[] = [];

    render(
      <ErrorBoundary onError={(error) => caught.push(error)}>
        <ThemeReadout />
      </ErrorBoundary>
    );

    expect(caught).toHaveLength(1);
    expect(caught[0]?.message).toBe('useTheme must be used inside <ThemeProvider>');

    consoleError.mockRestore();
  });
});
