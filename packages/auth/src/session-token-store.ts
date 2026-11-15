import { createHash } from 'node:crypto';

/**
 * Hash session tokens at rest (SECURITY/DATA_MODEL: "sessions store hashed tokens").
 * Better Auth keeps the RAW token in the signed cookie and looks sessions up by it; this adapter
 * wrapper stores sha256(token) in `sessions.token` instead, so a database or backup leak cannot be
 * replayed as live sessions. Callers still see the raw token wherever they supplied it (create,
 * lookup by token, update by token), so cookies keep working. Bulk reads by other keys (e.g.
 * listing a user's sessions) return the hashed value, which is useless as a credential.
 */
export const hashSessionToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex');

/* eslint-disable @typescript-eslint/no-explicit-any -- Better Auth's adapter type is intentionally generic */
type Where = { field: string; value: unknown; operator?: string }[];

const isSession = (model: string) => model === 'session' || model === 'sessions';

function mapWhere(where: Where | undefined): { where: Where | undefined; raw?: string } {
  if (!where) return { where };
  let raw: string | undefined;
  const mapped = where.map((w) => {
    if (w.field !== 'token') return w;
    const hash = (v: unknown) => (typeof v === 'string' ? hashSessionToken(v) : v);
    if (Array.isArray(w.value)) return { ...w, value: w.value.map(hash) };
    if (typeof w.value === 'string' && (w.operator === undefined || w.operator === 'eq'))
      raw = w.value;
    return { ...w, value: hash(w.value) };
  });
  return { where: mapped, raw };
}

/**
 * Shown instead of a stored hash whenever the caller did not supply the raw token. A hash must never
 * flow back into Better Auth (it would be hashed AGAIN and match nothing, e.g. revoke-by-token) nor
 * be usable as a credential.
 */
export const HASHED_TOKEN_SENTINEL = '[hashed]';

const restore = (row: any, raw: string | undefined) =>
  row && typeof row === 'object' && 'token' in row
    ? { ...row, token: raw ?? HASHED_TOKEN_SENTINEL }
    : row;

function wrap(a: any): any {
  return {
    ...a,
    create: async (p: any) => {
      if (!isSession(p.model) || typeof p.data?.token !== 'string') return a.create(p);
      const raw: string = p.data.token;
      const row = await a.create({ ...p, data: { ...p.data, token: hashSessionToken(raw) } });
      return restore(row, raw);
    },
    findOne: async (p: any) => {
      if (!isSession(p.model)) return a.findOne(p);
      const m = mapWhere(p.where);
      return restore(await a.findOne({ ...p, where: m.where }), m.raw);
    },
    findMany: async (p: any) => {
      if (!isSession(p.model)) return a.findMany(p);
      const m = mapWhere(p.where);
      const rows = await a.findMany({ ...p, where: m.where });
      return rows.map((r: any) => restore(r, m.raw));
    },
    count: (p: any) =>
      isSession(p.model) ? a.count({ ...p, where: mapWhere(p.where).where }) : a.count(p),
    update: async (p: any) => {
      if (!isSession(p.model)) return a.update(p);
      const m = mapWhere(p.where);
      return restore(await a.update({ ...p, where: m.where }), m.raw);
    },
    updateMany: (p: any) =>
      isSession(p.model) ? a.updateMany({ ...p, where: mapWhere(p.where).where }) : a.updateMany(p),
    delete: (p: any) =>
      isSession(p.model) ? a.delete({ ...p, where: mapWhere(p.where).where }) : a.delete(p),
    deleteMany: (p: any) =>
      isSession(p.model) ? a.deleteMany({ ...p, where: mapWhere(p.where).where }) : a.deleteMany(p),
    transaction: (cb: (tx: any) => Promise<any>) => a.transaction((tx: any) => cb(wrap(tx))),
  };
}

/** Wraps a Better Auth database adapter factory so session tokens are hashed at rest. */
export function withHashedSessionTokens<F extends (options: any) => any>(factory: F): F {
  return ((options: any) => wrap(factory(options))) as F;
}
