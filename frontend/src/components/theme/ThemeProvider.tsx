'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'relay-theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default matches the server-rendered markup (no "light" class) - the
  // inline blocking script in layout.tsx has already applied the class
  // from localStorage before this component mounts, so we just read it
  // back rather than risk a mismatch with a second source of truth.
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    setThemeState(document.documentElement.classList.contains('light') ? 'light' : 'dark');
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable (private browsing, etc.) - theme just
      // won't persist across reloads.
    }
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

// Inline script string, injected as the very first element in <body> so it
// runs synchronously before paint/hydration and there's no flash of the
// wrong theme. Kept here so the provider and the script that seeds its
// initial DOM state stay next to each other.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`;
