import { defineConfig } from 'drizzle-kit';

// generate only needs the schema; migrations are applied by src/scripts/migrate.ts as kodibox_migrator.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  strict: true,
  verbose: true,
});
