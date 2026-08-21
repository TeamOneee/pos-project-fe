/** Root providers: query client, theme, toast, auth, shell, router. */

import '@/api';

import { QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/components/pages/auth/auth-provider';
import { SessionExpiredDialog } from '@/components/pages/auth/session-expired-dialog';
import { ShellProvider } from '@/components/layouts/shell-context';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Router } from '@/routes/router';
import { createQueryClient } from '@/lib/query-client';

import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    // Gunakan requestAnimationFrame agar dieksekusi setelah render React selesai
    requestAnimationFrame(() => {
      // Scroll window utama (jika ada scroll global)
      window.scrollTo(0, 0);
      // Scroll semua container yang memiliki class overflow-y-auto (seperti di AppShell dan
      // AuthLayout)
      document.querySelectorAll('.overflow-y-auto').forEach((el) => {
        el.scrollTo(0, 0);
      });
    });
  }, [pathname]);

  return null;
}

export default function App() {
  const [queryClient] = React.useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <TooltipProvider>
            {/* Auth sits under the query client because the session is a query,
                and above everything that reads a role. */}
            <AuthProvider>
              <ShellProvider>
                <BrowserRouter>
                  <ScrollToTop />
                  <Router />
                  {/* Raised by any 401 on a session that was working. */}
                  <SessionExpiredDialog />
                </BrowserRouter>
              </ShellProvider>
            </AuthProvider>
          </TooltipProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
