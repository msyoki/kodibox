// Fails if RLS context GUCs are written (or named) outside packages/db/src/client.ts and the
// db migrations. Org context may only be switched by withOrg; this keeps `set_config` /
// `app.current_*_id` out of feature code. Run by root `pnpm lint` (lint:guards), uncached, so
// changes anywhere in the repo are scanned.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const BANNED = /app\.current_org_id|app\.current_user_id|set_config/;
const SKIP_DIR_NAMES = new Set(['node_modules', '.next', '.turbo', 'dist', 'coverage', '.git']);
// Exact repo-relative paths only (a dir merely named "migrations" elsewhere is still scanned).
const SKIP_PATHS = new Set([
  'packages/db/migrations',
  '.claude/worktrees', // other git checkouts, scanned in their own repo
]);
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs|sql)$/;
const ALLOWED = new Set([
  'packages/db/src/client.ts',
  'scripts/check-guc-usage.mjs',
  // RLS integration tests probe the GUC state directly.
  'packages/db/src/__tests__/rls.integration.test.ts',
]);

const offenders = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(root, full).split(sep).join('/');
    if (entry.isDirectory()) {
      if (!SKIP_DIR_NAMES.has(entry.name) && !SKIP_PATHS.has(rel)) walk(full);
    } else if (EXT.test(entry.name)) {
      if (!ALLOWED.has(rel) && BANNED.test(readFileSync(full, 'utf8'))) offenders.push(rel);
    }
  }
}
walk(root);

if (offenders.length > 0) {
  console.error(
    'RLS context GUCs (app.current_org_id / app.current_user_id / set_config) may only appear in ' +
      'packages/db/src/client.ts and packages/db/migrations. Offending files:\n  ' +
      offenders.join('\n  '),
  );
  process.exit(1);
}
console.log('check-guc-usage: ok');
