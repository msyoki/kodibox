'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Field, Input } from '@/components/ui';
import { authClient } from '../client';
import { AuthShell } from './auth-shell';
import { CodeBoxes, EMPTY_CODE } from './code-boxes';

type Mode = 'credentials' | 'totp' | 'recovery' | 'phone' | 'phone-otp';

const GENERIC = 'Invalid credentials or code. Check your details and try again.';
const LIMITED = 'Too many attempts. Please wait a while and try again.';
const messageFor = (status?: number) => (status === 429 ? LIMITED : GENERIC);
const KE_PHONE = /^(?:\+?254|0)[17]\d{8}$/;

const eyebrow = 'text-xs font-bold tracking-wider text-link uppercase';
const heading = 'm-0 mt-1 text-2xl font-extrabold tracking-tight';
const linkButton =
  'min-h-11 w-fit cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-semibold text-link underline';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('credentials');
  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [recovery, setRecovery] = useState('');
  const [trust, setTrust] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function done() {
    const qs = next ? `?next=${encodeURIComponent(next)}` : '';
    router.push(`/login/continue${qs}`);
    router.refresh();
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function onCredentials(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const id = identifier.trim();
      const res = id.includes('@')
        ? await authClient.signIn.email({ email: id, password })
        : await authClient.signIn.phoneNumber({ phoneNumber: id, password });
      if (res.error) {
        setError(messageFor(res.error.status));
        return;
      }
      setPassword('');
      if ((res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
        setDigits(EMPTY_CODE);
        setMode('totp');
        return;
      }
      done();
    });
  }

  function onVerifyTotp(e: FormEvent) {
    e.preventDefault();
    if (digits.some((d) => d === '')) {
      setError('Enter all 6 digits of the code.');
      return;
    }
    void run(async () => {
      const res = await authClient.twoFactor.verifyTotp({
        code: digits.join(''),
        trustDevice: trust,
      });
      if (res.error) setError(messageFor(res.error.status));
      else done();
    });
  }

  function onVerifyRecovery(e: FormEvent) {
    e.preventDefault();
    void run(async () => {
      const res = await authClient.twoFactor.verifyBackupCode({ code: recovery.trim() });
      if (res.error) setError(messageFor(res.error.status));
      else done();
    });
  }

  function onSendPhoneCode(e: FormEvent) {
    e.preventDefault();
    if (!KE_PHONE.test(phone.replace(/\s/g, ''))) {
      setError('Enter a Kenyan mobile number such as 0712 345 678.');
      return;
    }
    void run(async () => {
      // Same response whether or not the number is registered.
      const res = await authClient.phoneNumber.sendOtp({ phoneNumber: phone.replace(/\s/g, '') });
      if (res.error) {
        setError(messageFor(res.error.status));
        return;
      }
      setDigits(EMPTY_CODE);
      setMode('phone-otp');
    });
  }

  function onVerifyPhone(e: FormEvent) {
    e.preventDefault();
    if (digits.some((d) => d === '')) {
      setError('Enter all 6 digits of the code.');
      return;
    }
    void run(async () => {
      const res = await authClient.phoneNumber.verify({
        phoneNumber: phone.replace(/\s/g, ''),
        code: digits.join(''),
      });
      if (res.error) setError(messageFor(res.error.status));
      else done();
    });
  }

  const errorLine = error ? (
    <p role="alert" className="m-0 text-sm font-medium text-danger">
      {error}
    </p>
  ) : null;

  function go(m: Mode) {
    setError(null);
    setDigits(EMPTY_CODE);
    setMode(m);
  }

  return (
    <AuthShell>
      {mode === 'credentials' ? (
        <form onSubmit={onCredentials} className="flex flex-col gap-[18px]" aria-labelledby="s1">
          <div>
            <span className={eyebrow}>Step 1 of 2</span>
            <h2 id="s1" className={heading}>
              Sign in
            </h2>
            <p className="m-0 mt-1.5 text-sm text-muted">Welcome back to Kodibox.</p>
          </div>
          <Field label="Email or phone number" htmlFor="login-id">
            <Input
              id="login-id"
              name="id"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {errorLine}
          <p className="-mt-2 m-0 text-sm text-muted">
            Forgot your password? Ask your manager or Kodibox support to help you recover access.
          </p>
          <Button type="submit" size="lg" disabled={busy}>
            Continue
          </Button>
          <button type="button" onClick={() => go('phone')} className={linkButton}>
            Tenant or caretaker? Sign in with a phone code
          </button>
          <p className="m-0 text-sm text-muted">
            New to Kodibox?{' '}
            <a href="/onboarding" className="font-bold">
              Create account
            </a>
          </p>
        </form>
      ) : null}

      {mode === 'totp' ? (
        <form onSubmit={onVerifyTotp} className="flex flex-col gap-[18px]" aria-labelledby="s2h">
          <div>
            <span className={eyebrow}>Step 2 of 2 &middot; Two-factor</span>
            <h2 id="s2h" className={heading}>
              Verify it is you
            </h2>
            <p className="m-0 mt-1.5 text-sm leading-normal text-muted">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
          <CodeBoxes digits={digits} onChange={setDigits} />
          {errorLine}
          <Checkbox
            label="Trust this device for 12 hours"
            checked={trust}
            onChange={(e) => setTrust(e.target.checked)}
          />
          <Button type="submit" size="lg" disabled={busy}>
            Sign in
          </Button>
          <div className="flex flex-col gap-1.5 text-sm">
            <button type="button" onClick={() => go('recovery')} className={linkButton}>
              Use a recovery code instead
            </button>
            <button type="button" onClick={() => go('credentials')} className={linkButton}>
              Back to step 1
            </button>
          </div>
          <p className="m-0 text-[13px] leading-normal text-muted">
            Two-factor sign-in is required for owners, managers and accountants. Code refreshes
            every 30 seconds.
          </p>
        </form>
      ) : null}

      {mode === 'recovery' ? (
        <form onSubmit={onVerifyRecovery} className="flex flex-col gap-[18px]">
          <div>
            <span className={eyebrow}>Step 2 of 2 &middot; Recovery code</span>
            <h2 className={heading}>Use a recovery code</h2>
            <p className="m-0 mt-1.5 text-sm leading-normal text-muted">
              Each recovery code works once. Generate new ones after you sign in.
            </p>
          </div>
          <Field label="Recovery code" htmlFor="recovery-code">
            <Input
              id="recovery-code"
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          {errorLine}
          <Button type="submit" size="lg" disabled={busy}>
            Sign in
          </Button>
          <button type="button" onClick={() => go('totp')} className={linkButton}>
            Use my authenticator app
          </button>
        </form>
      ) : null}

      {mode === 'phone' ? (
        <form onSubmit={onSendPhoneCode} className="flex flex-col gap-[18px]">
          <div>
            <span className={eyebrow}>Phone sign-in</span>
            <h2 className={heading}>Get a code by SMS</h2>
            <p className="m-0 mt-1.5 text-sm leading-normal text-muted">
              For tenants and caretakers. Use the number your landlord has on file. Owners and
              managers sign in with a password and an authenticator app.
            </p>
          </div>
          <Field label="Phone number" htmlFor="phone-number">
            <Input
              id="phone-number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="07XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>
          {errorLine}
          <Button type="submit" size="lg" disabled={busy}>
            Send code
          </Button>
          <button type="button" onClick={() => go('credentials')} className={linkButton}>
            Back to password sign-in
          </button>
        </form>
      ) : null}

      {mode === 'phone-otp' ? (
        <form onSubmit={onVerifyPhone} className="flex flex-col gap-[18px]">
          <div>
            <span className={eyebrow}>Phone sign-in</span>
            <h2 className={heading}>Enter your code</h2>
            <p className="m-0 mt-1.5 text-sm leading-normal text-muted">
              If this number is registered, a 6-digit code is on its way. It expires in 5 minutes.
            </p>
          </div>
          <CodeBoxes digits={digits} onChange={setDigits} />
          {errorLine}
          <Button type="submit" size="lg" disabled={busy}>
            Verify and sign in
          </Button>
          <button type="button" onClick={() => go('phone')} className={linkButton}>
            Use a different number
          </button>
        </form>
      ) : null}
    </AuthShell>
  );
}
