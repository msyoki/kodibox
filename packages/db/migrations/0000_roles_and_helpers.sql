-- Roles: normally created by `pnpm db:bootstrap` (with LOGIN + password, run once by an admin).
-- This block is a safety net for environments where a privileged role runs the migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kodibox_migrator') THEN
    CREATE ROLE kodibox_migrator NOLOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kodibox_app') THEN
    CREATE ROLE kodibox_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO kodibox_app;--> statement-breakpoint
-- UUIDv7 (RFC 9562): 48-bit unix ms timestamp + random; PG16 has no native generator.
-- Built-ins are schema-qualified so a hostile search_path cannot shadow them.
CREATE FUNCTION uuidv7() RETURNS uuid
LANGUAGE sql VOLATILE PARALLEL SAFE AS $$
  SELECT pg_catalog.encode(
    pg_catalog.set_bit(
      pg_catalog.set_bit(
        overlay(pg_catalog.uuid_send(pg_catalog.gen_random_uuid())
                placing substring(pg_catalog.int8send(pg_catalog.floor(extract(epoch FROM pg_catalog.clock_timestamp()) * 1000)::pg_catalog.int8) FROM 3)
                FROM 1 FOR 6),
        52, 1),
      53, 1),
    'hex')::pg_catalog.uuid;
$$;--> statement-breakpoint
-- Current org from the transaction-local GUC. NULLIF: after a SET LOCAL transaction ends the
-- GUC reads as '' (not NULL) on that connection, and ''::uuid would raise. Unset => NULL => no rows.
-- The GUCs are written ONLY by packages/db/src/client.ts (enforced by scripts/check-guc-usage.mjs).
CREATE FUNCTION app_current_org_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(pg_catalog.current_setting('app.current_org_id', true), '')::pg_catalog.uuid;
$$;--> statement-breakpoint
-- Acting user from the transaction-local GUC (set by withOrg when a userId option is supplied).
CREATE FUNCTION app_current_user_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(pg_catalog.current_setting('app.current_user_id', true), '')::pg_catalog.uuid;
$$;--> statement-breakpoint
-- Shared updated_at maintenance for every table that has an updated_at column.
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_current_org_id() TO kodibox_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_current_user_id() TO kodibox_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION uuidv7() TO kodibox_app;
