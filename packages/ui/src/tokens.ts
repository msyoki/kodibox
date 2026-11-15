/**
 * Kodibox colour tokens: the single source of truth for web (CSS variables in
 * apps/web/src/app/globals.css) and mobile (apps/mobile theme). Light values come
 * from docs/design/SCREEN_SPEC.md. Dark values keep the same deep-teal brand
 * identity on a warm near-black, and every text/background pair targets WCAG AA.
 *
 * Keep the keys identical across both palettes. If you change a value here,
 * update the matching CSS variable in globals.css (a test checks they match).
 */
export const lightColors = {
  bg: '#f6f5f1',
  surface: '#ffffff',
  border: '#e2e0d8',
  borderStrong: '#d9d6cc',
  divider: '#eeece5',
  soft: '#faf9f6',
  text: '#14201e',
  muted: '#5a635f',
  /** Primary buttons, active nav, links. White text sits on it. */
  brand: '#0e4d45',
  /** Sidebar / hero panels. */
  brandDark: '#0a3c36',
  brandSoft: '#e2eeeb',
  brandTint: '#f1f7f5',
  brandLine: '#2b6a61',
  /** Body text on brand / brandDark surfaces. */
  onBrand: '#d7e7e3',
  /** Text colour for links and brand-coloured text on bg/surface. */
  link: '#0e4d45',
  amber: '#f0b54a',
  warning: '#d9822b',
  danger: '#9b2c1a',
  dangerSoft: '#fbe7e1',
  ok: '#1c6b44',
  okSoft: '#e1f2e8',
  warn: '#8a4b08',
  warnSoft: '#fdebd3',
  info: '#1d4f91',
  infoSoft: '#e3ecf9',
  /** Text on solid ok/danger fills. */
  onFill: '#ffffff',
  /** Secondary body text, between text and muted. */
  body: '#3f4743',
  /** Area behind phone-width columns / screens. */
  backdrop: '#e9e7df',
  inputLine: '#b9cfca',
  barTrack: '#c9d9d5',
} as const;

export type ColorToken = keyof typeof lightColors;
export type Palette = Record<ColorToken, string>;

/*
 * Dark: neutral charcoal surfaces (no green cast) so the teal reads as an accent,
 * not a fog. Brand is a cleaner, brighter teal that still gives white button text
 * >= 4.5:1. Links are a crisp mint for contrast on charcoal.
 */
export const darkColors: Palette = {
  bg: '#0e1111',
  surface: '#161a1a',
  border: '#262c2c',
  borderStrong: '#323a39',
  divider: '#1d2222',
  soft: '#121616',
  text: '#ecefee',
  muted: '#9ba3a1',
  brand: '#14806f',
  brandDark: '#0c1817',
  brandSoft: '#123a34',
  brandTint: '#131f1e',
  brandLine: '#1f4b45',
  onBrand: '#c9e6df',
  link: '#5fd3bc',
  amber: '#f0b54a',
  warning: '#e8a05a',
  danger: '#f08f7a',
  dangerSoft: '#3a1d17',
  ok: '#6fcf98',
  okSoft: '#14301f',
  warn: '#f2b86f',
  warnSoft: '#33250f',
  info: '#93b8ee',
  infoSoft: '#172539',
  onFill: '#0e1111',
  body: '#c4cbc9',
  backdrop: '#090b0b',
  inputLine: '#3a4442',
  barTrack: '#24403c',
};

export const palettes = { light: lightColors as Palette, dark: darkColors } as const;
export type ThemeName = keyof typeof palettes;
/** What the user picks. `system` follows the OS setting. */
export type ThemePreference = ThemeName | 'system';

/** camelCase token -> kebab CSS variable name, e.g. borderStrong -> --color-border-strong */
export const cssVarName = (token: ColorToken): string =>
  `--color-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
