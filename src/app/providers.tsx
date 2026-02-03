'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect } from 'react';
import { useThemeStore } from '@/lib/store';
import { AutosuggestProvider } from '@/lib/autosuggest-context';

function ThemeSync({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useThemeStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Global error handlers to capture unexpected client-side errors (helps debug SyntaxError)
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      console.error('[GlobalError] error event:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[GlobalError] unhandledrejection event:', {
        reason: (event.reason as any)?.toString?.() || event.reason,
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection as any);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection as any);
    };
  }, []);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ThemeSync>
          <AutosuggestProvider>{children}</AutosuggestProvider>
        </ThemeSync>
      </ThemeProvider>
    </SessionProvider>
  );
}
