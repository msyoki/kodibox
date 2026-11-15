import type { ThemePreference } from '@kodibox/ui';

/** Cookie holding the user's choice: light, dark or system. Not personal data. */
export const THEME_COOKIE = 'kb-theme';

export function parseThemePreference(value: string | undefined | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/**
 * Runs in <head> before first paint. Only does work when the preference is `system`
 * (explicit light/dark is already rendered by the server). Keeps data-theme in sync
 * with the OS setting while the page is open.
 */
export const THEME_INIT_SCRIPT =
  "(function(){try{var d=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');" +
  "function a(){if(d.dataset.themePref!=='system')return;var t=m.matches?'dark':'light';" +
  "d.dataset.theme=t;d.style.colorScheme=t}a();m.addEventListener('change',a)}catch(e){}})();";
