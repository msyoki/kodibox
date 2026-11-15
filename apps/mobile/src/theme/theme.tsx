import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  lightColors,
  palettes,
  type Palette,
  type ThemeName,
  type ThemePreference,
} from '@kodibox/ui';

const STORAGE_KEY = 'kodibox.theme-preference';
const PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

interface Theme {
  /** What the user picked (system follows the OS). */
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** The palette actually in use. */
  name: ThemeName;
  isDark: boolean;
  colors: Palette;
  /** Text on a solid brand surface (white in both palettes). */
  onBrand: string;
  /** Titles, amounts and primary text on brand / brandDark fills (white in both palettes). */
  onBrandStrong: string;
}

const ThemeContext = createContext<Theme | null>(null);

/** Colours come only from @kodibox/ui. The preference is stored on the device (not sensitive data). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (alive && v && (PREFERENCES as readonly string[]).includes(v)) {
          setPreferenceState(v as ThemePreference);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => undefined);
  }, []);

  const value = useMemo<Theme>(() => {
    const name: ThemeName =
      preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      preference,
      setPreference,
      name,
      isDark: name === 'dark',
      colors: palettes[name],
      onBrand: lightColors.surface,
      onBrandStrong: lightColors.surface,
    };
  }, [preference, system, setPreference]);

  const c = value.colors;
  const navTheme = useMemo(
    () => ({
      ...(value.isDark ? DarkTheme : DefaultTheme),
      colors: {
        primary: c.brand,
        background: c.bg,
        card: c.surface,
        text: c.text,
        border: c.border,
        notification: c.danger,
      },
    }),
    [value.isDark, c],
  );

  // Hold the first frame until the saved preference is read, so the app never flashes the wrong palette.
  if (!loaded) return null;
  return (
    <ThemeContext.Provider value={value}>
      <NavThemeProvider value={navTheme}>
        {/* Headers sit on the page background, so icons follow the theme. The Welcome hero overrides this. */}
        <StatusBar style={value.isDark ? 'light' : 'dark'} />
        {children}
      </NavThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** Build a StyleSheet from the active palette. Pass a module-level factory. */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}

export type { Palette, ThemePreference };
