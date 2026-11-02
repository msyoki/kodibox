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
CREATE FUNCTION uuidv7() RETURNS uuid
LANGUAGE sql VOLATILE PARALLEL SAFE AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(uuid_send(gen_random_uuid())
                placing substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
                FROM 1 FOR 6),
        52, 1),
      53, 1),
    'hex')::uuid;
$$;--> statement-breakpoint
-- Current org from the transaction-local GUC. NULLIF: after a SET LOCAL transaction ends the
-- GUC reads as '' (not NULL) on that connection, and ''::uuid would raise. Unset => NULL => no rows.
CREATE FUNCTION app_current_org_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid;
$$;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_current_org_id() TO kodibox_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION uuidv7() TO kodibox_app;
