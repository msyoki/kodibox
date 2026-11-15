'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Switch, useToast } from '@/components/ui';

const KE_PHONE = /^(?:\+?254|0)[17]\d{8}$/;

function maskTyped(raw: string): string {
  const d = raw.replace(/\D/g, '');
  return d.length < 7 ? '••••' : `${d.slice(0, 4)} ••• ${d.slice(-3)}`;
}

export default function AppLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState<string>();
  const [fingerprint, setFingerprint] = useState(true);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function sendCode() {
    if (!KE_PHONE.test(phone.replace(/\s/g, ''))) {
      setPhoneError('Enter a Kenyan mobile number such as 0712 345 678.');
      return;
    }
    setPhoneError(undefined);
    setStep('otp');
    toast('Code sent by SMS (demo: any 6 digits work)', 'info');
  }

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, '').slice(-1);
    setDigits((prev) => prev.map((x, j) => (j === i ? d : x)));
    setOtpError(undefined);
    if (d && i < 5) refs.current[i + 1]?.focus();
  }

  function verify() {
    if (digits.some((d) => !d)) {
      setOtpError('Enter all 6 digits of the code.');
      return;
    }
    toast(fingerprint ? 'Signed in. Fingerprint enabled.' : 'Signed in', 'ok');
    router.push('/m/tenant');
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-2 pt-8">
        <div
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-card bg-brand text-xl font-extrabold text-white"
        >
          K
        </div>
        <h1 className="m-0 text-2xl font-extrabold">Welcome to Kodibox</h1>
        <p className="m-0 text-sm text-muted">
          Pay rent, see receipts and talk to your landlord. Sign in with the phone number your
          landlord has on file.
        </p>
      </header>

      {step === 'phone' ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            sendCode();
          }}
        >
          <Field label="Phone number" htmlFor="phone" error={phoneError}>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="07XX XXX XXX"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneError(undefined);
              }}
              aria-invalid={phoneError ? true : undefined}
            />
          </Field>
          <p className="m-0 text-xs text-muted">
            We will send a 6-digit code by SMS. Standard SMS rates may apply. Reply STOP to any
            Kodibox message to opt out of non-essential SMS.
          </p>
          <Button type="submit" size="lg">
            Send code
          </Button>
          <button
            type="button"
            onClick={() => toast('Privacy notice opens in the full app (demo)', 'info')}
            className="min-h-11 text-sm font-bold text-link underline"
          >
            Read our privacy notice
          </button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>
              <span className="text-muted">Code sent to </span>
              <strong className="font-mono">{maskTyped(phone)}</strong>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setStep('phone')}>
              Change
            </Button>
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-sm font-semibold">
              Enter the 6-digit code sent by SMS
            </legend>
            <div className="flex gap-2">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  aria-label={`Digit ${i + 1}`}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                  }}
                  className="min-h-12 w-full min-w-0 rounded-control border border-border-strong bg-surface text-center font-mono text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-link"
                />
              ))}
            </div>
            {otpError ? (
              <span role="alert" className="mt-1.5 block text-xs font-medium text-danger">
                {otpError}
              </span>
            ) : null}
          </fieldset>
          <p className="m-0 text-sm text-muted">
            Didn’t get it?{' '}
            <button
              type="button"
              onClick={() => toast('New code sent (demo)', 'info')}
              className="min-h-11 font-bold text-link underline"
            >
              Resend code
            </button>
          </p>
          <div className="rounded-card border border-border bg-surface px-3">
            <Switch
              label="Use fingerprint next time"
              checked={fingerprint}
              onChange={(e) => setFingerprint(e.target.checked)}
              className="w-full justify-between flex-row-reverse"
            />
          </div>
          <Button type="submit" size="lg">
            Verify and sign in
          </Button>
          <button
            type="button"
            onClick={() => toast('Privacy notice opens in the full app (demo)', 'info')}
            className="min-h-11 text-sm font-bold text-link underline"
          >
            Read our privacy notice
          </button>
        </form>
      )}
    </div>
  );
}
