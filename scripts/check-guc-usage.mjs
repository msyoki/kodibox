// Fails if RLS context GUCs are written (or named) outside packages/db/src/client.ts and migrations.
// Org context may only be switched by withOrg; this keeps `set_config` / `app.current_*_id` out of
// feature code. Run by `pnpm lint` (packages/db lint script).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const BANNED = /app\.current_org_id|app\.current_user_id|set_config/;
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  'dist',
  'coverage',
  '.git',
  '.claude',
  'migrations',
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
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name));
    } else if (EXT.test(entry.name)) {
      const rel = relative(root, join(dir, entry.name)).split(sep).join('/');
      if (!ALLOWED.has(rel) && BANNED.test(readFileSync(join(dir, entry.name), 'utf8'))) {
        offenders.push(rel);
      }
    }
  }
}
walk(root);

if (offenders.length > 0) {
  console.error(
    'RLS context GUCs (app.current_org_id / app.current_user_id / set_config) may only appear in ' +
      'packages/db/src/client.ts and migrations. Offending files:\n  ' +
      offenders.join('\n  '),
  );
  process.exit(1);
}
console.log('check-guc-usage: ok');
