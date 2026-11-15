import { describe, expect, it } from 'vitest';
import { MemoryOtpSink, maskPhoneForLog, otpMessageBody } from './messaging';

describe('otp sink', () => {
  it('prints a masked number only in development', async () => {
    const lines: string[] = [];
    await new MemoryOtpSink({ nodeEnv: 'production', write: (l) => lines.push(l) }).sendOtp({
      phoneE164: '+254712345678',
      code: '123456',
      messageClass: 'otp',
    });
    expect(lines).toEqual([]);
    await new MemoryOtpSink({ nodeEnv: 'development', write: (l) => lines.push(l) }).sendOtp({
      phoneE164: '+254712345678',
      code: '123456',
      messageClass: 'otp',
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('+2547****5678');
    expect(lines[0]).not.toContain('254712345678');
  });
  it('masks', () => expect(maskPhoneForLog('+254712345678')).toBe('+2547****5678'));
});

describe('otp message', () => {
  it('uses the fixed template and nothing else', () => {
    expect(otpMessageBody('123456')).toBe('Kodibox code 123456. Valid 5 min. Do not share.');
    expect(() => otpMessageBody('12; DROP')).toThrow();
    expect(otpMessageBody('654321')).not.toMatch(/https?:|www[.]|offer|discount|STOP/i);
  });
  it('records class and sender id', async () => {
    const sink = new MemoryOtpSink({ nodeEnv: 'test' });
    await sink.sendOtp({
      phoneE164: '+254712345678',
      code: '111111',
      senderId: 'KODIBOX',
      messageClass: 'otp',
    });
    expect(sink.sent[0]).toMatchObject({
      senderId: 'KODIBOX',
      messageClass: 'otp',
      body: expect.stringContaining('111111'),
    });
  });
});
