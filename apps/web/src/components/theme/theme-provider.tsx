'use client';

import type { ThemePreference } from '@kodibox/ui';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { THEME_COOKIE } from '@/lib/theme';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyPreference(p: ThemePreference) {
  const root = document.documentElement;
  const resolved =
    p === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : p;
  root.dataset.themePref = p;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export function ThemeProvider({
  initial,
  children,
}: {
  initial: ThemePreference;
  children: ReactNode;
}) {
  const [preference, setPref] = useState<ThemePreference>(initial);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    applyPreference(p);
    // One year; read by the root layout so the first paint is already themed.
    document.cookie = `${THEME_COOKIE}=${p}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
