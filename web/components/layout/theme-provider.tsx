'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'vestgo:theme-preference';

interface ThemeContextValue {
  theme: ThemePref;
  setTheme: (theme: ThemePref) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function resolveAndApply(pref: ThemePref) {
  const isDark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>('system');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePref | null;
    const initial: ThemePref =
      stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    setThemeState(initial);
    resolveAndApply(initial);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onSystemChange() {
      const current = (localStorage.getItem(STORAGE_KEY) as ThemePref | null) ?? 'system';
      if (current === 'system') resolveAndApply('system');
    }
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    resolveAndApply(next);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
