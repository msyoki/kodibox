import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { z } from 'zod';
import * as schema from './schema';

export type Schema = typeof schema;
export type Database = PostgresJsDatabase<Schema>;
/** Transaction handle passed to withOrg callbacks. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

const uuidSchema = z.uuid();

/** `userId` sets app.current_user_id (the acting user) for definer functions and users policies. */
export interface WithOrgOptions {
  userId?: string;
}

export interface DbClient {
  readonly sql: postgres.Sql;
  readonly orm: Database;
  withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>, opts?: WithOrgOptions): Promise<T>;
  close(): Promise<void>;
}

export function createDbClient(url: string, options: { max?: number } = {}): DbClient {
  const client = postgres(url, { max: options.max ?? 10, onnotice: () => undefined });
  const orm = drizzle(client, { schema });

  async function withOrg<T>(
    orgId: string,
    fn: (tx: Tx) => Promise<T>,
    opts: WithOrgOptions = {},
  ): Promise<T> {
    const parsed = uuidSchema.safeParse(orgId);
    if (!parsed.success) throw new Error('withOrg: invalid organization id');
    let userId: string | undefined;
    if (opts.userId !== undefined) {
      const u = uuidSchema.safeParse(opts.userId);
      if (!u.success) throw new Error('withOrg: invalid user id');
      userId = u.data;
    }
    return orm.transaction(async (tx) => {
      // set_config(..., true) == SET LOCAL: scoped to this transaction, safe under pooling.
      // The value is a bound parameter; never string-concatenate it.
      await tx.execute(sql`select set_config('app.current_org_id', ${parsed.data}, true)`);
      if (userId) await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
      return fn(tx);
    });
  }

  return { sql: client, orm, withOrg, close: () => client.end({ timeout: 5 }) };
}
