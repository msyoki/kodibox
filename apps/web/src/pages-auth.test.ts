import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = join(__dirname, 'app');
const ROOTS = ['(app)', 'm', 'portal'];
const PUBLIC = new Set([join('m', 'login', 'page.tsx')]);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe('every authenticated page enforces the session itself', () => {
  const pages = ROOTS.flatMap((r) => walk(join(APP, r)))
    .filter((f) => f.endsWith('page.tsx'))
    .map((f) => f.slice(APP.length + 1))
    .filter((f) => !PUBLIC.has(f));

  it('finds the pages', () => expect(pages.length).toBeGreaterThan(30));

  it.each(pages)(
    '%s is a server page that calls requireSession() itself (no layout-only gating)',
    (rel) => {
      const src = readFileSync(join(APP, rel), 'utf8');
      expect(src).not.toMatch(/^s*['"]use client['"]/);
      expect(src).toMatch(/await requireSession()/);
    },
  );
});
