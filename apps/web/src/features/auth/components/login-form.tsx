'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Logo } from '@/components/shell/logo';
import { Button, Checkbox, Field, Input } from '@/components/ui';

const VALUES = [
  {
    title: 'Never holds your money',
    text: 'Rent goes straight to your own M-Pesa paybill or bank account. Kodibox only reconciles it.',
  },
  {
    title: 'Automatic M-Pesa reconciliation',
    text: 'Every payment is matched to the right unit and invoice, with unmatched ones queued for you.',
  },
  {
    title: 'A tenant app that tenants use',
    text: 'Pay by STK push, see statements and send repair requests from their phone.',
  },
];

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function onCredentials(e: FormEvent) {
    e.preventDefault();
    setStep(2);
    setTimeout(() => refs.current[0]?.focus(), 0);
  }

  function setDigit(i: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1);
    setDigits((prev) => prev.map((d, idx) => (idx === i ? v : d)));
    if (v && i < 5) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits(Array.from({ length: 6 }, (_, i) => text[i] ?? ''));
    refs.current[Math.min(text.length, 5)]?.focus();
  }

  function onVerify(e: FormEvent) {
    e.preventDefault();
    if (digits.some((d) => d === '')) {
      setError('Enter all 6 digits of the code (demo: any 6 digits work).');
      return;
    }
    setError(null);
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-wrap bg-brand text-text">
      <aside className="flex min-w-0 flex-[1_1_380px] flex-col justify-between gap-10 px-[clamp(24px,5vw,72px)] py-12 text-white">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-2xl font-extrabold tracking-tight">Kodibox</span>
        </div>
        <div className="flex max-w-[460px] flex-col gap-7">
          <h1 className="m-0 text-[40px] leading-[1.12] font-extrabold tracking-[-1px]">
            Rent management that never touches your money.
          </h1>
          {VALUES.map((v) => (
            <div key={v.title} className="flex items-start gap-3.5">
              <span className="flex size-10 flex-none items-center justify-center rounded-xl border border-brand-line bg-brand-dark">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F0B54A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              <span className="flex flex-col gap-0.5">
                <strong className="text-[17px] font-bold">{v.title}</strong>
                <span className="text-sm leading-normal text-on-brand">{v.text}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="m-0 text-[13px] text-[#bfd8d2]">
          Data Protection Act 2019 compliant. Every money change is audited and reversible.
        </p>
      </aside>

      <main className="flex min-w-0 flex-[1.6_1_560px] items-center justify-center px-[clamp(16px,3vw,48px)] py-8">
        <div className="w-full max-w-[460px] rounded-panel bg-surface p-9 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
          {step === 1 ? (
            <form
              onSubmit={onCredentials}
              className="flex flex-col gap-[18px]"
              aria-labelledby="s1"
            >
              <div>
                <span className="text-xs font-bold tracking-wider text-brand uppercase">
                  Step 1 of 2
                </span>
                <h2 id="s1" className="m-0 mt-1 text-2xl font-extrabold tracking-tight">
                  Sign in
                </h2>
                <p className="m-0 mt-1.5 text-sm text-muted">Welcome back to Mwangi Properties.</p>
              </div>
              <Field label="Email or phone number" htmlFor="login-id">
                <Input
                  id="login-id"
                  name="id"
                  type="text"
                  defaultValue="wanjiru@mwangiproperties.co.ke"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field label="Password" htmlFor="login-password">
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  defaultValue="demo-password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <a href="#forgot" className="-mt-2 text-sm font-semibold">
                Forgot password?
              </a>
              <Button type="submit" size="lg">
                Continue
              </Button>
              <p className="m-0 text-sm text-muted">
                New to Kodibox?{' '}
                <a href="/onboarding" className="font-bold">
                  Create account
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={onVerify} className="flex flex-col gap-[18px]" aria-labelledby="s2h">
              <div>
                <span className="text-xs font-bold tracking-wider text-brand uppercase">
                  Step 2 of 2 &middot; Two-factor
                </span>
                <h2 id="s2h" className="m-0 mt-1 text-2xl font-extrabold tracking-tight">
                  Verify it is you
                </h2>
                <p className="m-0 mt-1.5 text-sm leading-normal text-muted">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
              <fieldset className="m-0 flex gap-2 border-0 p-0">
                <legend className="sr-only">6-digit code</legend>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    aria-label={`Digit ${i + 1}`}
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    onPaste={onPaste}
                    className="box-border min-h-14 w-full min-w-0 flex-1 rounded-control border border-[#b9cfca] bg-surface text-center font-mono text-[22px] font-medium focus-visible:outline-2 focus-visible:outline-brand"
                  />
                ))}
              </fieldset>
              {error ? (
                <p role="alert" className="m-0 text-sm font-medium text-danger">
                  {error}
                </p>
              ) : null}
              <Checkbox label="Trust this device for 30 days" defaultChecked />
              <Button type="submit" size="lg">
                Sign in
              </Button>
              <div className="flex flex-col gap-1.5 text-sm">
                <a href="#recovery" className="font-semibold">
                  Use a recovery code instead
                </a>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-11 w-fit cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-brand underline"
                >
                  Back to step 1
                </button>
              </div>
              <p className="m-0 text-[13px] leading-normal text-muted">
                Two-factor sign-in is required for owners and managers. Code refreshes every 30
                seconds.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
