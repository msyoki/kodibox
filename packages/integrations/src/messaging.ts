/**
 * Outbound auth messaging ports. No real provider yet (Africa's Talking SMS / Resend email land with
 * the notifications task). Implementations MUST NOT log full phone numbers, emails, codes or links.
 */
/**
 * Message classes keep consent rules apart (kenya-compliance): 'otp' is a transactional security
 * message and must never carry promotional text; marketing needs opt-in and an opt-out (STOP) and
 * goes through a different sender.
 */
export type MessageClass = 'otp' | 'transactional' | 'marketing';

/** The ONLY text an OTP SMS may contain. No links, no brand promotion, no extra content. */
export function otpMessageBody(code: string): string {
  if (!/^[0-9]{4,8}$/.test(code)) throw new Error('invalid otp code');
  return `Kodibox code ${code}. Valid 5 min. Do not share.`;
}

export interface OtpMessage {
  phoneE164: string;
  code: string;
  /** Registered alphanumeric sender id (AT_SENDER_ID); provider default when omitted. */
  senderId?: string | undefined;
  messageClass: 'otp';
}

export interface OtpSender {
  /** Deliver a one-time code to an E.164 number. Resolves when handed to the provider. */
  sendOtp(input: OtpMessage): Promise<void>;
}

export interface AuthEmailSender {
  /** `kind` selects the template; `link` carries a single-use token and must never be logged. */
  sendAuthEmail(input: {
    to: string;
    kind: 'verify_email' | 'reset_password';
    link: string;
  }): Promise<void>;
}

export function maskPhoneForLog(e164: string): string {
  return e164.length < 8 ? '****' : `${e164.slice(0, 5)}****${e164.slice(-4)}`;
}

export function maskEmailForLog(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

export interface DevSinkOptions {
  /** Defaults to process.env.NODE_ENV. Console output happens ONLY when this is 'development'. */
  nodeEnv?: string | undefined;
  /** Where dev output goes. Defaults to console.info. */
  write?: ((line: string) => void) | undefined;
}

/** Test/dev sink that keeps the last messages in memory (tests read them to complete OTP flows). */
export class MemoryOtpSink implements OtpSender {
  readonly sent: (OtpMessage & { body: string })[] = [];
  constructor(private readonly opts: DevSinkOptions = {}) {}
  sendOtp(input: OtpMessage): Promise<void> {
    this.sent.push({ ...input, body: otpMessageBody(input.code) });
    if ((this.opts.nodeEnv ?? process.env.NODE_ENV) === 'development') {
      (this.opts.write ?? console.info)(
        `[dev otp] to ${maskPhoneForLog(input.phoneE164)} code ${input.code}`,
      );
    }
    return Promise.resolve();
  }
  lastCodeFor(phoneE164: string): string | undefined {
    return [...this.sent].reverse().find((m) => m.phoneE164 === phoneE164)?.code;
  }
}

export class MemoryEmailSink implements AuthEmailSender {
  readonly sent: { to: string; kind: string; link: string }[] = [];
  constructor(private readonly opts: DevSinkOptions = {}) {}
  sendAuthEmail(input: {
    to: string;
    kind: 'verify_email' | 'reset_password';
    link: string;
  }): Promise<void> {
    this.sent.push(input);
    if ((this.opts.nodeEnv ?? process.env.NODE_ENV) === 'development') {
      (this.opts.write ?? console.info)(
        `[dev email] ${input.kind} to ${maskEmailForLog(input.to)} link ${input.link}`,
      );
    }
    return Promise.resolve();
  }
}

/**
 * Refuses to deliver anything: used in production until a real provider is wired, so OTPs are never
 * silently dropped into a dev sink and nothing is logged.
 */
export class UnconfiguredSender implements OtpSender, AuthEmailSender {
  sendOtp(): Promise<void> {
    return Promise.reject(new Error('No SMS provider configured'));
  }
  sendAuthEmail(): Promise<void> {
    return Promise.reject(new Error('No email provider configured'));
  }
}
