import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe('production source hygiene', () => {
  it('no non-test source imports @kodibox/core/testing', () => {
    const offenders = walk(join(__dirname))
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.(ts|tsx)$/.test(f))
      .filter((f) => readFileSync(f, 'utf8').includes('@kodibox/core/testing'));
    expect(offenders).toEqual([]);
  });
});
