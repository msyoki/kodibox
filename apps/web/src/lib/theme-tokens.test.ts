import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cssVarName, darkColors, lightColors, type ColorToken } from '@kodibox/ui';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.resolve(here, '../app/globals.css'), 'utf8');

/** Pull `--name: value;` declarations out of the first block that starts with `selector`. */
function declarations(selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  expect(start, `block ${selector} not found`).toBeGreaterThanOrEqual(0);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start));
  const map = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    map.set(m[1] as string, (m[2] as string).trim().toLowerCase());
  }
  return map;
}

const tokens = Object.keys(lightColors) as ColorToken[];

describe('globals.css matches @kodibox/ui tokens', () => {
  it('@theme holds every light token', () => {
    const theme = declarations('@theme');
    for (const t of tokens) {
      expect(theme.get(cssVarName(t)), cssVarName(t)).toBe(lightColors[t]);
    }
  });

  it('[data-theme=dark] overrides every token with the dark value', () => {
    const dark = declarations(":root[data-theme='dark']");
    for (const t of tokens) {
      expect(dark.get(cssVarName(t)), cssVarName(t)).toBe(darkColors[t]);
    }
  });

  it('both palettes have identical keys', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });
});
