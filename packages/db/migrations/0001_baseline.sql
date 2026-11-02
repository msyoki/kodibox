CREATE TYPE "public"."membership_role" AS ENUM('owner', 'manager', 'accountant', 'caretaker', 'tenant', 'landlord_viewer');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'revoked');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_org_role_uq" UNIQUE("user_id","organization_id","role")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"organization_id" uuid,
	"actor_user_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"ip" "inet",
	"user_agent" text,
	"request_id" text,
	"prev_hash" text,
	"hash" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_org_role_idx" ON "memberships" USING btree ("organization_id","role");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_events_org_entity_idx" ON "audit_events" USING btree ("organization_id","entity_type","entity_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_org_at_idx" ON "audit_events" USING btree ("organization_id","at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_user_id");
--> statement-breakpoint
-- ===== RLS, policies, grants, triggers, definer functions (same migration as the tables) =====
-- Policies use app_current_org_id() / app_current_user_id(). No context => NULL => zero rows.
-- The owner (kodibox_migrator) is also subject to FORCE RLS: it only gets the narrow, org-scoped
-- policies below that the SECURITY DEFINER functions need (plus the global users table, which only
-- the definer functions and the dev seed touch).
-- The app role can NOT insert organizations/users/memberships nor update memberships: every such
-- change goes through a checked SECURITY DEFINER function (create_organization, create_or_get_user_for_invite,
-- add_membership, change_membership_role, revoke_membership, accept_invite).

-- organizations: visible/updatable only when id = current org. Creation only via create_organization().
-- No DELETE policy/grant.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY organizations_select ON organizations FOR SELECT TO kodibox_app
  USING (id = app_current_org_id());--> statement-breakpoint
CREATE POLICY organizations_update ON organizations FOR UPDATE TO kodibox_app
  USING (id = app_current_org_id()) WITH CHECK (id = app_current_org_id());--> statement-breakpoint
CREATE POLICY organizations_definer_select ON organizations FOR SELECT TO kodibox_migrator
  USING (id = app_current_org_id());--> statement-breakpoint
CREATE POLICY organizations_definer_insert ON organizations FOR INSERT TO kodibox_migrator
  WITH CHECK (id = app_current_org_id());--> statement-breakpoint
GRANT SELECT, UPDATE ON organizations TO kodibox_app;--> statement-breakpoint

-- memberships: org-scoped SELECT only for the app role. No INSERT/UPDATE/DELETE grants.
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY memberships_select ON memberships FOR SELECT TO kodibox_app
  USING (organization_id = app_current_org_id());--> statement-breakpoint
CREATE POLICY memberships_definer_select ON memberships FOR SELECT TO kodibox_migrator
  USING (organization_id = app_current_org_id());--> statement-breakpoint
CREATE POLICY memberships_definer_insert ON memberships FOR INSERT TO kodibox_migrator
  WITH CHECK (organization_id = app_current_org_id());--> statement-breakpoint
CREATE POLICY memberships_definer_update ON memberships FOR UPDATE TO kodibox_migrator
  USING (organization_id = app_current_org_id()) WITH CHECK (organization_id = app_current_org_id());--> statement-breakpoint
REVOKE ALL ON memberships FROM kodibox_app;--> statement-breakpoint
GRANT SELECT ON memberships TO kodibox_app;--> statement-breakpoint

-- users (global identity). The app role can SELECT users who hold an ACTIVE membership in the
-- current org (the subquery is itself subject to memberships RLS), and may change ONLY its own
-- display_name. No INSERT, no UPDATE of email or anything else: rows are created through
-- create_or_get_user_for_invite(). The kodibox_migrator policies exist for the definer function
-- and the dev-only seed.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE users FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY users_select ON users FOR SELECT TO kodibox_app
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id AND m.status = 'active'));--> statement-breakpoint
CREATE POLICY users_update ON users FOR UPDATE TO kodibox_app
  USING (id = app_current_user_id()
         AND EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id AND m.status = 'active'))
  WITH CHECK (id = app_current_user_id()
         AND EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id AND m.status = 'active'));--> statement-breakpoint
CREATE POLICY users_definer_select ON users FOR SELECT TO kodibox_migrator USING (true);--> statement-breakpoint
CREATE POLICY users_definer_insert ON users FOR INSERT TO kodibox_migrator WITH CHECK (true);--> statement-breakpoint
GRANT SELECT ON users TO kodibox_app;--> statement-breakpoint
GRANT UPDATE (display_name) ON users TO kodibox_app;--> statement-breakpoint

-- audit_events: append-only. App role: INSERT + SELECT only; trigger blocks UPDATE/DELETE/TRUNCATE.
-- Rows with NULL organization_id (platform events) are invisible to the app role.
-- Owner-level trigger disabling and the NOT NULL hash chain are handled in E-06.
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY audit_events_select ON audit_events FOR SELECT TO kodibox_app
  USING (organization_id = app_current_org_id());--> statement-breakpoint
CREATE POLICY audit_events_insert ON audit_events FOR INSERT TO kodibox_app
  WITH CHECK (organization_id = app_current_org_id());--> statement-breakpoint
REVOKE ALL ON audit_events FROM kodibox_app;--> statement-breakpoint
GRANT SELECT, INSERT ON audit_events TO kodibox_app;--> statement-breakpoint
CREATE FUNCTION audit_events_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only (% not allowed)', TG_OP USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_events_no_update_delete BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();--> statement-breakpoint
CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_immutable();--> statement-breakpoint
-- Actor binding: when an acting user is set (app.current_user_id), actor_user_id must equal it
-- (it is filled in when null). Without an acting user the column is unconstrained (system events).
CREATE FUNCTION audit_events_bind_actor() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
  v_actor uuid := public.app_current_user_id();
BEGIN
  IF v_actor IS NOT NULL THEN
    IF NEW.actor_user_id IS NULL THEN
      NEW.actor_user_id := v_actor;
    ELSIF NEW.actor_user_id <> v_actor THEN
      RAISE EXCEPTION 'audit actor does not match the acting user' USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_events_bind_actor BEFORE INSERT ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_bind_actor();--> statement-breakpoint

-- Defence in depth: nothing but the definer functions (current_user = migrator) may activate a
-- membership (invited/revoked -> active). The app role has no UPDATE grant anyway.
CREATE FUNCTION memberships_guard_status() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' AND current_user = 'kodibox_app' THEN
    RAISE EXCEPTION 'memberships cannot be activated by the application role' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER memberships_guard_status BEFORE UPDATE OF status ON memberships
  FOR EACH ROW EXECUTE FUNCTION memberships_guard_status();--> statement-breakpoint

-- updated_at maintenance
CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER memberships_set_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- ===== SECURITY DEFINER functions (owned by the migrator, fixed search_path, EXECUTE to kodibox_app only) =====
-- Internal helper: the acting user's strongest active owner/manager role in an org, or NULL.
-- Not granted to the app role; only called from the definer functions below.
CREATE FUNCTION membership_actor_role(p_org uuid) RETURNS membership_role
LANGUAGE sql STABLE SET search_path = pg_catalog, public, pg_temp AS $$
  SELECT m.role FROM public.memberships m
   WHERE m.organization_id = p_org AND m.user_id = public.app_current_user_id()
     AND m.status = 'active' AND m.role IN ('owner', 'manager')
   ORDER BY (m.role = 'owner') DESC LIMIT 1;
$$;--> statement-breakpoint

-- create_organization: atomically creates an org and an ACTIVE owner membership for the acting user
-- (app.current_user_id must be set; the user must exist). The caller's org context is irrelevant
-- (pass any placeholder uuid to withOrg) and is restored before returning. Returns the new org id.
CREATE FUNCTION create_organization(p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_user uuid := public.app_current_user_id();
  v_prev text := pg_catalog.current_setting('app.current_org_id', true);
  v_id uuid := public.uuidv7();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'acting user required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_name IS NULL OR pg_catalog.btrim(p_name) = '' OR pg_catalog.length(p_name) > 200 THEN
    RAISE EXCEPTION 'invalid organization name' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  PERFORM pg_catalog.set_config('app.current_org_id', v_id::text, true);
  INSERT INTO public.organizations (id, name) VALUES (v_id, pg_catalog.btrim(p_name));
  INSERT INTO public.memberships (organization_id, user_id, role, status)
    VALUES (v_id, v_user, 'owner', 'active');
  PERFORM pg_catalog.set_config('app.current_org_id', COALESCE(v_prev, ''), true);
  RETURN v_id;
END;
$$;--> statement-breakpoint

-- create_or_get_user_for_invite: returns the user id for an email, creating the row if needed.
-- Caller must be an active owner/manager of the current org. Only an opaque id is returned and
-- nothing is readable until an ACTIVE membership exists.
-- E-04 MUST verify ownership of the email (e.g. a verified-email token) before binding any
-- credentials/sessions to a user id obtained here, and must treat pre-existing rows as unverified
-- (reset display_name on email verification). UUIDv7 ids leak creation time, so the returned id is
-- not an oracle-free signal of whether the user pre-existed.
CREATE FUNCTION create_or_get_user_for_invite(p_email text, p_display_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_org uuid := public.app_current_org_id();
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_id uuid;
BEGIN
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'organization context required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_email IS NULL OR v_email = '' OR pg_catalog.length(v_email) > 254 OR v_email !~ '^[^@\s]+@[^@\s]+$'
     OR p_display_name IS NULL OR pg_catalog.btrim(p_display_name) = '' THEN
    RAISE EXCEPTION 'invalid email or display name' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF public.membership_actor_role(v_org) IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public.users (email, display_name) VALUES (v_email, pg_catalog.btrim(p_display_name))
    ON CONFLICT (email) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT u.id INTO v_id FROM public.users u WHERE u.email = v_email;
  END IF;
  RETURN v_id;
END;
$$;--> statement-breakpoint

-- add_membership: p_org_id must equal the current org. Caller must be an active owner/manager there
-- (only an owner may grant 'owner'). New rows start as 'invited' (see accept_invite). Idempotent
-- per (user, org, role).
CREATE FUNCTION add_membership(p_org_id uuid, p_user_id uuid, p_role membership_role) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_caller_role public.membership_role;
  v_id uuid;
BEGIN
  IF p_org_id IS NULL OR p_user_id IS NULL OR p_role IS NULL
     OR p_org_id IS DISTINCT FROM public.app_current_org_id() THEN
    RAISE EXCEPTION 'organization context mismatch' USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_caller_role := public.membership_actor_role(p_org_id);
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_role = 'owner' AND v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'only an owner can grant owner' USING ERRCODE = 'insufficient_privilege';
  END IF;
  INSERT INTO public.memberships (organization_id, user_id, role, status)
    VALUES (p_org_id, p_user_id, p_role, 'invited')
    ON CONFLICT (user_id, organization_id, role) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT m.id INTO v_id FROM public.memberships m
      WHERE m.user_id = p_user_id AND m.organization_id = p_org_id AND m.role = p_role;
  END IF;
  RETURN v_id;
END;
$$;--> statement-breakpoint

-- change_membership_role: caller must be an active owner/manager of the current org. Only an owner
-- may grant owner or touch an owner membership (managers cannot). The last active owner cannot be demoted.
CREATE FUNCTION change_membership_role(p_membership_id uuid, p_role membership_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_org uuid := public.app_current_org_id();
  v_caller_role public.membership_role;
  v_target public.memberships%ROWTYPE;
BEGIN
  IF v_org IS NULL OR p_membership_id IS NULL OR p_role IS NULL THEN
    RAISE EXCEPTION 'organization context required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_caller_role := public.membership_actor_role(v_org);
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- lock all active owners of the org so concurrent demotions cannot both pass the last-owner check
  PERFORM 1 FROM public.memberships m
    WHERE m.organization_id = v_org AND m.role = 'owner' AND m.status = 'active' FOR UPDATE;
  SELECT * INTO v_target FROM public.memberships m
    WHERE m.id = p_membership_id AND m.organization_id = v_org FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF (v_target.role = 'owner' OR p_role = 'owner') AND v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'only an owner can grant or change owner' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_target.role = 'owner' AND p_role <> 'owner' AND v_target.status = 'active'
     AND NOT EXISTS (SELECT 1 FROM public.memberships m
                      WHERE m.organization_id = v_org AND m.role = 'owner' AND m.status = 'active'
                        AND m.id <> v_target.id) THEN
    RAISE EXCEPTION 'cannot demote the last owner' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.memberships SET role = p_role WHERE id = v_target.id;
END;
$$;--> statement-breakpoint

-- revoke_membership: same caller rules as change_membership_role; the last active owner cannot be revoked.
CREATE FUNCTION revoke_membership(p_membership_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_org uuid := public.app_current_org_id();
  v_caller_role public.membership_role;
  v_target public.memberships%ROWTYPE;
BEGIN
  IF v_org IS NULL OR p_membership_id IS NULL THEN
    RAISE EXCEPTION 'organization context required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_caller_role := public.membership_actor_role(v_org);
  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM 1 FROM public.memberships m
    WHERE m.organization_id = v_org AND m.role = 'owner' AND m.status = 'active' FOR UPDATE;
  SELECT * INTO v_target FROM public.memberships m
    WHERE m.id = p_membership_id AND m.organization_id = v_org FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership not found' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_target.role = 'owner' AND v_caller_role <> 'owner' THEN
    RAISE EXCEPTION 'only an owner can revoke an owner' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF v_target.role = 'owner' AND v_target.status = 'active'
     AND NOT EXISTS (SELECT 1 FROM public.memberships m
                      WHERE m.organization_id = v_org AND m.role = 'owner' AND m.status = 'active'
                        AND m.id <> v_target.id) THEN
    RAISE EXCEPTION 'cannot revoke the last owner' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.memberships SET status = 'revoked' WHERE id = v_target.id;
END;
$$;--> statement-breakpoint

-- accept_invite: only the invited user (app.current_user_id = membership.user_id) can move
-- invited -> active, in the current org. E-04 must verify email ownership before calling this.
CREATE FUNCTION accept_invite(p_membership_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_org uuid := public.app_current_org_id();
  v_user uuid := public.app_current_user_id();
  v_id uuid;
BEGIN
  IF v_org IS NULL OR v_user IS NULL OR p_membership_id IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT m.id INTO v_id FROM public.memberships m
    WHERE m.id = p_membership_id AND m.organization_id = v_org AND m.user_id = v_user
      AND m.status = 'invited' FOR UPDATE;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.memberships SET status = 'active' WHERE id = v_id;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION membership_actor_role(uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION create_organization(text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION create_or_get_user_for_invite(text, text) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION add_membership(uuid, uuid, membership_role) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION change_membership_role(uuid, membership_role) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION revoke_membership(uuid) FROM PUBLIC;--> statement-breakpoint
REVOKE ALL ON FUNCTION accept_invite(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION create_organization(text) TO kodibox_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION create_or_get_user_for_invite(text, text) TO kodibox_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION add_membership(uuid, uuid, membership_role) TO kodibox_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION change_membership_role(uuid, membership_role) TO kodibox_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION revoke_membership(uuid) TO kodibox_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION accept_invite(uuid) TO kodibox_app;
