import { sql } from 'drizzle-orm';
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Global identity (no organization_id). This is also Better Auth's `user` model (E-04): the auth
 * server maps `name` -> display_name, so there is one user concept, not two.
 * RLS: the app role sees only users with an ACTIVE membership; the dedicated kodibox_auth role
 * (auth server only) can read/insert/update any user. See migration 0002_auth.
 *
 * `phone_number` is E.164 (+2547XXXXXXXX). TODO(E-06): move to envelope encryption + blind index
 * (phone_hash); it is plaintext in this column until the encryption helper exists. Never log it.
 * National ID / KRA PIN are NOT stored here.
 */
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  phoneNumber: text('phone_number').unique(),
  phoneNumberVerified: boolean('phone_number_verified').notNull().default(false),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
