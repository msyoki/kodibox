-- RLS baseline. Policies use app_current_org_id() = NULLIF(current_setting('app.current_org_id', true), '')::uuid.
-- No org set => NULL => comparisons are never true => zero rows (fail closed).

-- organizations: visible/modifiable only when id = current org. Creation: caller runs
-- withOrg(newId) and inserts the row with that id. No DELETE policy/grant.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY organizations_select ON organizations FOR SELECT TO kodibox_app
  USING (id = app_current_org_id());--> statement-breakpoint
CREATE POLICY organizations_insert ON organizations FOR INSERT TO kodibox_app
  WITH CHECK (id = app_current_org_id());--> statement-breakpoint
CREATE POLICY organizations_update ON organizations FOR UPDATE TO kodibox_app
  USING (id = app_current_org_id()) WITH CHECK (id = app_current_org_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON organizations TO kodibox_app;--> statement-breakpoint

-- memberships: org-scoped. No DELETE (revoke via status = 'revoked').
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY memberships_select ON memberships FOR SELECT TO kodibox_app
  USING (organization_id = app_current_org_id());--> statement-breakpoint
CREATE POLICY memberships_insert ON memberships FOR INSERT TO kodibox_app
  WITH CHECK (organization_id = app_current_org_id());--> statement-breakpoint
CREATE POLICY memberships_update ON memberships FOR UPDATE TO kodibox_app
  USING (organization_id = app_current_org_id()) WITH CHECK (organization_id = app_current_org_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON memberships TO kodibox_app;--> statement-breakpoint

-- users (global identity): readable/updatable only when the user has a membership in the current
-- org (the subquery is itself subject to memberships RLS). INSERT is allowed: a user row holds no
-- tenant data and is unreadable until a membership links it to an org. The login-time lookup
-- (email -> user, own memberships) will be a SECURITY DEFINER function added with auth (E-04).
ALTER TABLE users ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE users FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY users_select ON users FOR SELECT TO kodibox_app
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id));--> statement-breakpoint
CREATE POLICY users_insert ON users FOR INSERT TO kodibox_app WITH CHECK (true);--> statement-breakpoint
CREATE POLICY users_update ON users FOR UPDATE TO kodibox_app
  USING (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id))
  WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.user_id = users.id));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON users TO kodibox_app;--> statement-breakpoint

-- audit_events: append-only. App role: INSERT + SELECT only; trigger blocks UPDATE/DELETE/TRUNCATE
-- even for the table owner. Rows with NULL organization_id (platform events) are invisible to the app role.
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY audit_events_select ON audit_events FOR SELECT TO kodibox_app
  USING (organization_id = app_current_org_id());--> statement-breakpoint
CREATE POLICY audit_events_insert ON audit_events FOR INSERT TO kodibox_app
  WITH CHECK (organization_id = app_current_org_id());--> statement-breakpoint
REVOKE ALL ON audit_events FROM kodibox_app;--> statement-breakpoint
GRANT SELECT, INSERT ON audit_events TO kodibox_app;--> statement-breakpoint
CREATE FUNCTION audit_events_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only (% not allowed)', TG_OP USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint
CREATE TRIGGER audit_events_no_update_delete BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();--> statement-breakpoint
CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_immutable();
