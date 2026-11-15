CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factors" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"failed_verification_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_number_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factors" ADD CONSTRAINT "two_factors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "two_factors_user_idx" ON "two_factors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number");
-- ===== E-04 auth: dedicated kodibox_auth role, RLS, grants (same migration as the tables) =====
-- Policy choice: Better Auth needs GLOBAL access to users (look up by email/phone before any org
-- context exists) and to credential tables (password hashes, TOTP secrets, session tokens). Giving
-- that to kodibox_app would let any org-scoped SQL bug exfiltrate secrets, so the auth server uses a
-- separate login role, kodibox_auth (AUTH_DATABASE_URL), and:
--   * accounts, sessions, verifications, two_factors: ENABLE+FORCE RLS, policies and grants ONLY for
--     kodibox_auth. kodibox_app has no grant at all (permission denied), so it can never read
--     another user's password hash, TOTP secret, backup codes or session token.
--   * users: kodibox_auth gets SELECT/INSERT/UPDATE (never DELETE) via its own permissive policies;
--     kodibox_app keeps the baseline membership-scoped SELECT and display_name-only UPDATE.
--   * memberships: kodibox_auth gets read-only access across orgs so the auth layer can decide
--     whether TOTP is mandatory (owner/manager/accountant in ANY org). No writes.
--   * audit_events: kodibox_auth may INSERT only rows with organization_id IS NULL (platform-level
--     auth events: sign-in, sign-out, 2FA changes, failed-attempt counters). No SELECT.
-- A compromised app role therefore sees no credentials; a compromised auth role cannot touch org
-- data (properties, ledger, ...) because it has no grants on those tables.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kodibox_auth') THEN
    CREATE ROLE kodibox_auth NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO kodibox_auth;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION uuidv7() TO kodibox_auth;--> statement-breakpoint

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE verifications FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE two_factors ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE two_factors FORCE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY accounts_auth_all ON accounts FOR ALL TO kodibox_auth USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY sessions_auth_all ON sessions FOR ALL TO kodibox_auth USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY verifications_auth_all ON verifications FOR ALL TO kodibox_auth USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY two_factors_auth_all ON two_factors FOR ALL TO kodibox_auth USING (true) WITH CHECK (true);--> statement-breakpoint

REVOKE ALL ON accounts, sessions, verifications, two_factors FROM PUBLIC, kodibox_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts, sessions, verifications, two_factors TO kodibox_auth;--> statement-breakpoint

CREATE POLICY users_auth_select ON users FOR SELECT TO kodibox_auth USING (true);--> statement-breakpoint
CREATE POLICY users_auth_insert ON users FOR INSERT TO kodibox_auth WITH CHECK (true);--> statement-breakpoint
CREATE POLICY users_auth_update ON users FOR UPDATE TO kodibox_auth USING (true) WITH CHECK (true);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON users TO kodibox_auth;--> statement-breakpoint

CREATE POLICY memberships_auth_select ON memberships FOR SELECT TO kodibox_auth USING (true);--> statement-breakpoint
GRANT SELECT ON memberships TO kodibox_auth;--> statement-breakpoint

CREATE POLICY audit_events_auth_insert ON audit_events FOR INSERT TO kodibox_auth WITH CHECK (organization_id IS NULL);--> statement-breakpoint
GRANT INSERT ON audit_events TO kodibox_auth;--> statement-breakpoint

-- phone numbers are E.164 (Kenya mobile shown; other countries allowed): enforce shape in the DB too.
ALTER TABLE users ADD CONSTRAINT users_phone_e164_chk CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9][0-9]{7,14}$');

-- Least privilege: the app role may read only non-sensitive identity columns of users
-- (phone_number, email_verified, two_factor_enabled, image stay with the auth role).
-- Drizzle queries from app code must select explicit columns.
REVOKE SELECT ON users FROM kodibox_app;--> statement-breakpoint
GRANT SELECT (id, email, display_name, created_at, updated_at) ON users TO kodibox_app;
