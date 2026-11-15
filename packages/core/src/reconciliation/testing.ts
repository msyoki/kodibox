import type { KeyedPhoneHasher } from './types';

/**
 * TEST AND DEMO ONLY. A deterministic, non-cryptographic, unkeyed stand-in so fixtures and demo
 * apps can run the parsers. Production must use the server-side keyed HMAC hasher.
 */
export const createTestPhoneHasher = (): KeyedPhoneHasher => {
  // process may be absent or minimal (React Native): guard every access.
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  if (env?.NODE_ENV === 'production') {
    throw new Error('createTestPhoneHasher must not be used in production.');
  }
  const fn = (e164: string): string => {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < e164.length; i++) {
      const c = e164.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
    }
    return `test1:${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  };
  return fn as KeyedPhoneHasher;
};
