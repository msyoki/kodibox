import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

export const MEMBERSHIP_ROLES = [
  'owner',
  'manager',
  'accountant',
  'caretaker',
  'tenant',
  'landlord_viewer',
] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const membershipRole = pgEnum('membership_role', MEMBERSHIP_ROLES);
export const membershipStatus = pgEnum('membership_status', ['invited', 'active', 'revoked']);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: membershipRole('role').notNull(),
    status: membershipStatus('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('memberships_user_org_role_uq').on(t.userId, t.organizationId, t.role),
    index('memberships_org_role_idx').on(t.organizationId, t.role),
    index('memberships_user_idx').on(t.userId),
  ],
);
