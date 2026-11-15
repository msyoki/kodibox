import { hash, verify } from '@node-rs/argon2';

/** SECURITY.md 6.1: argon2id, m=64 MiB, t=3, p=1 (tune to ~250 ms on the target hardware). */
export const ARGON2_PARAMS = {
  algorithm: 2, // Algorithm.Argon2id (const enum, not importable under verbatimModuleSyntax)
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_PARAMS);
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(data.hash, data.password);
  } catch {
    return false;
  }
}
