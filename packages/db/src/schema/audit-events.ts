import { sql } from 'drizzle-orm';
import { index, inet, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Append-only. The app role has INSERT + SELECT only, and a trigger rejects UPDATE/DELETE
 * for everyone. prev_hash/hash are the hash chain columns; hashing logic lands in E-06.
 * `before`/`after` must already be redacted of PII by the writer.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    organizationId: uuid('organization_id').references(() => organizations.id),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    prevHash: text('prev_hash'),
    hash: text('hash'),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_events_org_entity_idx').on(
      t.organizationId,
      t.entityType,
      t.entityId,
      t.at.desc(),
    ),
  ],
);
