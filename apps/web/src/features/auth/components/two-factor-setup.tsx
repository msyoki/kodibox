'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useState, type FormEvent } from 'react';
import { Button, Checkbox, Field, Input } from '@/components/ui';
import { authClient } from '../client';
import { AuthShell } from './auth-shell';
import { CodeBoxes, EMPTY_CODE } from './code-boxes';

const eyebrow = 'text-xs font-bold tracking-wider text-link uppercase';
const heading = 'm-0 mt-1 text-2xl font-extrabold tracking-tight';

/** Forced TOTP enrolment for owner/manager/accountant: password, scan, first code, recovery codes. */
export function TwoFactorSetup({ next }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'password' | 'scan' | 'codes'>('password');
  const [password, setPassword] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [digits, setDigits] = useState<string[]>(EMPTY_CODE);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.twoFactor.enable({ password, method: 'totp' });
    setBusy(false);
    if (res.error || res.data?.method !== 'totp') {
      setError('That password is not correct, or setup is unavailable. Try again.');
      return;
    }
    setPassword('');
    const uri = res.data.totpURI;
    setSecret(new URL(uri).searchParams.get('secret') ?? '');
    setQr(await QRCode.toDataURL(uri, { margin: 1, width: 192 }));
    setCodes(res.data.backupCodes);
    setStep('scan');
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (digits.some((d) => d === '')) {
      setError('Enter all 6 digits of the code.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await authClient.twoFactor.verifyTotp({ code: digits.join('') });
    setBusy(false);
    if (res.error) {
      setError('That code is not valid. Check the time on your phone and try again.');
      return;
    }
    setStep('codes');
  }

  function finish() {
    router.push(`/login/continue${next ? `?next=${encodeURIComponent(next)}` : ''}`);
    router.refresh();
  }

  const errorLine = error ? (
    <p role="alert" className="m-0 text-sm font-medium text-danger">
      {error}
    </p>
  ) : null;

  return (
    <AuthShell>
      {step === 'password' ? (
        <form onSubmit={(e) => void start(e)} className="flex flex-col gap-[18px]">
          <div>
            <span className={eyebrow}>Required for your role</span>
            <h2 className={heading}>Set up two-factor</h2>
            <p className="m-0 mt-1.5 text-sm leading-normal text-muted">
              Owners, managers and accountants must use an authenticator app. Confirm your password
              to begin.
            </p>
          </div>
          <Field label="Password" htmlFor="setup-password">
            <Input
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {errorLine}
          <Button type="submit" size="lg" disabled={busy}>
            Continue
          </Button>
        </form>
      ) : null}

      {step === 'scan' ? (
        <form onSubmit={(e) => void verify(e)} className="flex flex-col gap-[18px]">
          <div>
            <span className={eyebrow}>Scan and confirm</span>
            <h2 className={heading}>Add Kodibox to your app</h2>
            <p className="m-0 mt-1.5 text-sm leading-normal text-muted">
              Scan this code with Google Authenticator, Authy or a similar app, then enter the
              6-digit code it shows.
            </p>
          </div>
          {qr ? (
            <Image
              src={qr}
              alt="QR code for your authenticator app"
              width={192}
              height={192}
              unoptimized
              className="mx-auto rounded-control border border-border"
            />
          ) : null}
          <p className="m-0 text-center text-xs text-muted">
            Cannot scan? Enter this key manually:{' '}
            <code className="font-mono break-all text-text">{secret}</code>
          </p>
          <CodeBoxes digits={digits} onChange={setDigits} />
          {errorLine}
          <Button type="submit" size="lg" disabled={busy}>
            Verify
          </Button>
        </form>
      ) : null}

      {step === 'codes' ? (
        <div className="flex flex-col gap-[18px]">
          <div>
            <span className={eyebrow}>Two-factor is on</span>
            <h2 className={heading}>Save your recovery codes</h2>
            <p className="m-0 mt-1.5 text-sm leading-normal text-muted">
              Each code works once if you lose your phone. Store them somewhere safe. They are shown
              only now.
            </p>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-2 rounded-control border border-border bg-soft p-3 font-mono text-sm">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <Checkbox
            label="I have saved my recovery codes"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
          />
          <Button size="lg" disabled={!saved} onClick={finish}>
            Continue to Kodibox
          </Button>
        </div>
      ) : null}
    </AuthShell>
  );
}
