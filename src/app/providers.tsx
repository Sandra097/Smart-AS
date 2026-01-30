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
