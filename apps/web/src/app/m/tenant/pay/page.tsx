'use client';

import { useState } from 'react';
import { Badge, Button, Field, Input, Money, Textarea, useToast } from '@/components/ui';
import { BackHeader } from '@/components/tenant-app/bits';
import { DEMO_TENANT_ID } from '@/demo';
import { MAX_SMS_CHARS } from '@/features/payments/reconcile-adapter';
import { getInstruction, payeeNamesOf, previewSms, tenantPaidDelta } from '@/demo/recon';
import { useDemoStore } from '@/demo/store';
import { BALANCE, LANDLORD_NAME, TENANT_ACCOUNT } from '@/demo/tenant-app';
import { formatWhen } from '@/demo/format';
import { kes } from '@/lib/money';

type Mode = 'how' | 'sms' | 'slip' | 'sent';

function CopyRow({ label, value }: { label: string; value: string }) {
  const { toast } = useToast();
  return (
    <div className="flex items-center justify-between gap-3 border-t border-divider py-2.5 first:border-t-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-xs text-muted">{label}</span>
        <strong className="truncate font-mono text-[15px]">{value}</strong>
      </span>
      <Button
        variant="secondary"
        size="sm"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value).catch(() => undefined);
          toast(`${label} copied`, 'ok');
        }}
      >
        Copy
      </Button>
    </div>
  );
}

export default function TenantPayPage() {
  const { data, actions } = useDemoStore();
  const tenant = data.tenants.find((t) => t.id === DEMO_TENANT_ID);
  const instr = getInstruction(data, tenant?.propertyId);
  const owed = Math.max(0, BALANCE - tenantPaidDelta(data, DEMO_TENANT_ID));
  const myClaims = data.claims.filter((c) => c.tenantId === DEMO_TENANT_ID);

  const [mode, setMode] = useState<Mode>('how');
  const [sms, setSms] = useState('');
  const [touched, setTouched] = useState(false);
  const [slipName, setSlipName] = useState('');
  const [slipAmount, setSlipAmount] = useState('');
  const [slipCode, setSlipCode] = useState('');
  const [slipError, setSlipError] = useState('');

  const parsed = sms.trim() ? previewSms(sms, payeeNamesOf(data)) : null;
  const tooLong = sms.length > MAX_SMS_CHARS;

  if (mode === 'sent') {
    return (
      <div className="flex flex-1 flex-col">
        <BackHeader href="/m/tenant" label="Back to home" title="How to pay" />
        <div role="status" className="flex flex-col items-center gap-4 p-6 text-center">
          <h2 className="m-0 text-xl font-extrabold">Thanks, we have your proof</h2>
          <Badge tone="warn">Pending verification</Badge>
          <p className="m-0 text-sm text-muted">
            Your landlord confirms it against their statement. Your balance updates once it is
            verified. You do not need to send it again.
          </p>
          <Button onClick={() => setMode('how')}>Back to how to pay</Button>
        </div>
      </div>
    );
  }

  if (mode === 'sms' || mode === 'slip') {
    return (
      <div className="flex flex-1 flex-col">
        <BackHeader href="/m/tenant/pay" label="Back to how to pay" title="I have paid" />
        <div className="flex flex-col gap-4 p-4">
          <div role="group" aria-label="Proof type" className="grid grid-cols-2 gap-2">
            {(
              [
                ['sms', 'Paste M-Pesa SMS'],
                ['slip', 'Upload slip'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={
                  mode === id
                    ? 'min-h-11 rounded-control border border-brand bg-brand-soft text-sm font-bold text-link focus-visible:outline-2 focus-visible:outline-link'
                    : 'min-h-11 rounded-control border border-border-strong bg-surface text-sm font-bold text-muted focus-visible:outline-2 focus-visible:outline-link'
                }
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'sms' ? (
            <>
              <Field
                label="M-Pesa confirmation message"
                htmlFor="sms"
                error={
                  tooLong
                    ? 'That message is too long to be an M-Pesa SMS.'
                    : touched && !sms.trim()
                      ? 'Paste the message you received from M-Pesa.'
                      : parsed && !parsed.ok
                        ? parsed.message
                        : undefined
                }
              >
                <Textarea
                  id="sms"
                  value={sms}
                  placeholder="QFT4AB12CD Confirmed. Ksh16,700.00 sent to ..."
                  onChange={(e) => setSms(e.target.value)}
                  onBlur={() => setTouched(true)}
                />
              </Field>
              {parsed?.ok && !tooLong ? (
                <dl
                  aria-label="What we read"
                  className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-card border border-border bg-surface p-3 text-sm"
                >
                  <dt className="text-muted">Code</dt>
                  <dd className="m-0 font-mono font-semibold">{parsed.code}</dd>
                  <dt className="text-muted">Amount</dt>
                  <dd className="m-0 font-semibold">
                    <Money minor={parsed.amount} />
                  </dd>
                  <dt className="text-muted">Date</dt>
                  <dd className="m-0 font-semibold">{formatWhen(parsed.paidAt)}</dd>
                  {parsed.accountRef ? (
                    <>
                      <dt className="text-muted">Account</dt>
                      <dd className="m-0 font-mono font-semibold">{parsed.accountRef}</dd>
                    </>
                  ) : null}
                </dl>
              ) : null}
              {parsed?.ok && parsed.payeeMismatch ? (
                <p
                  role="alert"
                  className="m-0 rounded-card border border-warn bg-warn-soft p-3 text-sm"
                >
                  This message says you paid {parsed.payee ?? 'a different name'}, which is not your
                  landlord&apos;s payee name. Check the details before sending. Your landlord will
                  review it.
                </p>
              ) : null}
              <Button
                size="lg"
                disabled={!parsed?.ok || tooLong}
                onClick={() => {
                  actions.submitClaim({ kind: 'sms', tenantId: DEMO_TENANT_ID, sms });
                  setSms('');
                  setMode('sent');
                }}
              >
                Send proof of payment
              </Button>
            </>
          ) : (
            <>
              <Field label="Photo or PDF of the slip" htmlFor="slip">
                <Input
                  id="slip"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSlipName(e.target.files?.[0]?.name ?? '')}
                />
              </Field>
              <Field label="Amount paid (KES)" htmlFor="slip-amt" error={slipError}>
                <Input
                  id="slip-amt"
                  inputMode="numeric"
                  value={slipAmount}
                  onChange={(e) => setSlipAmount(e.target.value)}
                />
              </Field>
              <Field label="Reference or code (optional)" htmlFor="slip-code">
                <Input
                  id="slip-code"
                  value={slipCode}
                  onChange={(e) => setSlipCode(e.target.value)}
                />
              </Field>
              <Button
                size="lg"
                onClick={() => {
                  const shillings = Number(slipAmount.replace(/[^0-9]/g, ''));
                  if (!slipName) return setSlipError('Choose the slip to upload.');
                  if (!shillings) return setSlipError('Enter the amount on the slip.');
                  setSlipError('');
                  actions.submitClaim({
                    kind: 'slip',
                    tenantId: DEMO_TENANT_ID,
                    slipName,
                    amount: kes(shillings),
                    ...(slipCode ? { code: slipCode } : {}),
                  });
                  setMode('sent');
                }}
              >
                Send proof of payment
              </Button>
              <p className="m-0 text-xs text-muted">Demo: the file is not uploaded anywhere.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader href="/m/tenant" label="Back to home" title="How to pay" />
      <div className="flex flex-col gap-4 p-4">
        {owed === 0 ? (
          <p className="m-0 rounded-card border border-border bg-surface p-3 text-sm text-muted">
            You have nothing to pay right now. Instructions are below for next time.
          </p>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-[18px]">
            <p className="m-0 text-[13px] text-muted">Amount due</p>
            <p className="m-0 font-mono text-3xl font-medium tracking-tight">
              <Money minor={owed} />
            </p>
          </div>
        )}

        <section
          aria-label="Payment details"
          className="rounded-2xl border border-border bg-surface px-[18px]"
        >
          <p className="mt-3 mb-1 text-[13px] text-muted">Pay to {LANDLORD_NAME}</p>
          {instr.mpesaKind === 'paybill' ? (
            <>
              <CopyRow label="M-Pesa Paybill" value={instr.mpesaNumber} />
              <CopyRow label="Account number (your unit)" value={TENANT_ACCOUNT} />
            </>
          ) : null}
          {instr.mpesaKind === 'till' ? (
            <CopyRow label="M-Pesa Till" value={instr.mpesaNumber} />
          ) : null}
          {instr.bankName && instr.bankAccount ? (
            <>
              <CopyRow label={`${instr.bankName} account`} value={instr.bankAccount} />
              {instr.bankBranch ? (
                <p className="m-0 pb-2 text-xs text-muted">Branch: {instr.bankBranch}</p>
              ) : null}
              <CopyRow label="Bank reference (your unit)" value={TENANT_ACCOUNT} />
            </>
          ) : null}
        </section>
        <p className="m-0 text-xs text-muted">
          Always type your exact account number so your payment is matched. Your money goes directly
          to your landlord. Kodibox never holds it.
        </p>

        <Button size="lg" onClick={() => setMode('sms')}>
          I&apos;ve paid
        </Button>

        {myClaims.length > 0 ? (
          <section aria-label="Your proofs of payment" className="flex flex-col gap-2">
            <h2 className="m-0 text-sm font-extrabold">Your proofs of payment</h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {myClaims.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-3 text-sm"
                >
                  <span className="font-mono text-xs">{c.code ?? 'Slip'}</span>
                  {c.amount !== undefined ? <Money minor={c.amount} prefix={false} /> : null}
                  <Badge
                    tone={
                      c.status === 'pending' ? 'warn' : c.status === 'rejected' ? 'danger' : 'ok'
                    }
                  >
                    {c.status === 'pending'
                      ? 'Pending verification'
                      : c.status === 'verified'
                        ? 'Verified'
                        : c.status === 'approved'
                          ? 'Approved'
                          : 'Not accepted'}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
