import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createKeyedPhoneHasher, hmacSha256, sha256, toHex, utf8Bytes } from './hasher';

const fill = (byte: number, n: number) => new Uint8Array(n).fill(byte);

describe('HMAC-SHA256 (RFC 4231)', () => {
  it('case 1', () => {
    expect(toHex(hmacSha256(fill(0x0b, 20), utf8Bytes('Hi There')))).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );
  });
  it('case 2', () => {
    expect(toHex(hmacSha256(utf8Bytes('Jefe'), utf8Bytes('what do ya want for nothing?')))).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });
  it('case 3', () => {
    expect(toHex(hmacSha256(fill(0xaa, 20), fill(0xdd, 50)))).toBe(
      '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe',
    );
  });
  it('case 6 (key larger than block size)', () => {
    expect(
      toHex(
        hmacSha256(
          fill(0xaa, 131),
          utf8Bytes('Test Using Larger Than Block-Size Key - Hash Key First'),
        ),
      ),
    ).toBe('60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54');
  });
  it('sha256 of empty input', () => {
    expect(toHex(sha256(new Uint8Array()))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });
});

describe('createKeyedPhoneHasher', () => {
  const key = Uint8Array.from({ length: 32 }, (_, i) => i + 1);

  it('is deterministic, prefixed with keyId and matches node HMAC', () => {
    const h = createKeyedPhoneHasher(key, 'k1');
    const out = h('+254700000001');
    expect(out).toBe(h('+254700000001'));
    expect(out).toBe(`k1:${createHmac('sha256', key).update('+254700000001').digest('hex')}`);
  });
  it('differs by input and by key', () => {
    const other = Uint8Array.from({ length: 32 }, (_, i) => i + 2);
    const a = createKeyedPhoneHasher(key, 'k1');
    expect(a('+254700000001')).not.toBe(a('+254700000002'));
    expect(a('+254700000001')).not.toBe(createKeyedPhoneHasher(other, 'k1')('+254700000001'));
  });
  it('rejects short keys and bad key ids', () => {
    expect(() => createKeyedPhoneHasher(new Uint8Array(31), 'k1')).toThrow();
    expect(() => createKeyedPhoneHasher(key, '')).toThrow();
  });
});
