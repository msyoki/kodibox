/**
 * Ephemeral random bytes for demo-only keys. Prefers Web Crypto (Node, browsers); Hermes has no
 * global crypto, so it falls back to expo-crypto (bundled in Expo Go). Loaded lazily so unit tests
 * running in Node never import the native module.
 */
export const randomBytes = (n: number): Uint8Array => {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) return c.getRandomValues(new Uint8Array(n));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getRandomBytes } = require('expo-crypto') as {
    getRandomBytes: (n: number) => Uint8Array;
  };
  return getRandomBytes(n);
};
