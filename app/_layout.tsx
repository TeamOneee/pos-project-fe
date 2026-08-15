import '@/global.css';
// Installs the transport that matches EXPO_PUBLIC_API_MODE. Must be imported
// before the first query runs.
import '@/lib/api';

import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/components/auth/auth-provider';
import { SessionExpiredDialog } from '@/components/auth/session-expired-dialog';
import { ShellProvider } from '@/components/shell/shell-context';
import { ThemeProvider, useTheme } from '@/components/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { useInterFonts } from '@/lib/fonts';
import { createQueryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash may already be hidden during fast refresh; not worth failing on.
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useInterFonts();
  const [queryClient] = React.useState(createQueryClient);

  // Hold the splash until Inter is available, so text never reflows from a
  // fallback face to Inter in front of the user.
  const ready = fontsLoaded || fontError !== null;

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ToastProvider>
              {/* Auth sits under the query client because the session is a
                  query, and above everything that reads a role. */}
              <AuthProvider>
                <ShellProvider>
                  <RootChrome />
                </ShellProvider>
              </AuthProvider>
            </ToastProvider>
          </GestureHandlerRootView>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/**
 * Lives inside ThemeProvider so the status bar and stack chrome follow the
 * resolved theme, and so the splash hides only once the theme is known.
 */
function RootChrome() {
  const { theme, hydrated } = useTheme();

  React.useEffect(() => {
    if (hydrated) {
      SplashScreen.hideAsync().catch(() => {
        // Already hidden.
      });
    }
  }, [hydrated]);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>

      {/* Raised by any 401 on a session that was working. Outside the router so
          it survives whatever route is mounted underneath. */}
      <SessionExpiredDialog />

      {/* Native portal target for dialogs, selects and tooltips. */}
      <PortalHost />
    </>
  );
}
