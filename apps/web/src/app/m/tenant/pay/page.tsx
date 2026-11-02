'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Field, Input, MaskedText, Money, useToast } from '@/components/ui';
import { BackHeader } from '@/components/tenant-app/bits';
import { useTenantLocal } from '@/components/tenant-app/local-state';
import { DEMO_TENANT_ID } from '@/demo';
import { useDemoStore } from '@/demo/store';
import {
  BALANCE,
  LANDLORD_NAME,
  PAYBILL_PLACEHOLDER,
  RENT_ONLY,
  TENANT_ACCOUNT,
} from '@/demo/tenant-app';
import { kes } from '@/lib/money';

const KE_PHONE = /^(?:\+?254|0)[17]\d{8}$/;

export default function TenantPayPage() {
  const { data } = useDemoStore();
  const { paid, recordPayment } = useTenantLocal();
  const { toast } = useToast();
  const owed = Math.max(0, BALANCE - paid);
  const tenant = data.tenants.find((t) => t.id === DEMO_TENANT_ID);

  const [amountText, setAmountText] = useState(String(owed / 100));
  const [otherPhone, setOtherPhone] = useState(false);
  const [phoneText, setPhoneText] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; phone?: string }>({});
  const [sentAmount, setSentAmount] = useState<number | null>(null);

  const rentOnly = Math.min(RENT_ONLY, owed);

  function send() {
    const shillings = Number(amountText.replace(/[^0-9]/g, ''));
    const minor = kes(shillings);
    const next: typeof errors = {};
    if (!shillings || shillings < 10) next.amount = 'Enter at least KES 10.';
    else if (minor > owed) next.amount = 'That is more than you owe. Enter the balance or less.';
    if (otherPhone && !KE_PHONE.test(phoneText.replace(/\s/g, '')))
      next.phone = 'Enter a Kenyan number such as 0712 345 678.';
    setErrors(next);
    if (next.amount || next.phone) return;
    setSentAmount(minor);
    toast('M-Pesa prompt sent', 'info');
  }

  if (sentAmount !== null) {
    return (
      <div className="flex flex-1 flex-col">
        <BackHeader href="/m/tenant" label="Back to home" title="Pay rent" />
        <div role="status" className="flex flex-col items-center gap-4 p-6 text-center">
          <div
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-2xl"
          >
            ☎
          </div>
          <h2 className="m-0 text-xl font-extrabold">Check your phone</h2>
          <p className="m-0 text-sm text-muted">
            Enter your M-Pesa PIN on{' '}
            {otherPhone ? (
              'the number you entered'
            ) : tenant ? (
              <MaskedText kind="phone" value={tenant.phone} />
            ) : (
              'your phone'
            )}{' '}
            to pay{' '}
            <strong className="text-text">
              <Money minor={sentAmount} />
            </strong>{' '}
            to {LANDLORD_NAME}.
          </p>
          <ol className="m-0 flex w-full list-none flex-col gap-2 rounded-card border border-border bg-surface p-4 text-left text-sm">
            <li>✓ Prompt sent</li>
            <li className="text-muted">… Waiting for your PIN</li>
            <li className="text-muted">○ Receipt by SMS</li>
          </ol>
          <div className="flex w-full flex-col gap-2">
            <Link
              href="/m/tenant/receipt"
              onClick={() => recordPayment(sentAmount)}
              className="inline-flex min-h-12 items-center justify-center rounded-control bg-brand px-5 text-[15px] font-bold text-white no-underline hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Paid? View receipt
            </Link>
            <Button variant="ghost" onClick={() => setSentAmount(null)}>
              Didn’t get it? Send again
            </Button>
          </div>
          <p className="m-0 text-xs text-muted">Demo: no real prompt is sent.</p>
        </div>
      </div>
    );
  }

  if (owed === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <BackHeader href="/m/tenant" label="Back to home" title="Pay rent" />
        <p className="p-6 text-center text-sm text-muted">You have nothing to pay right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackHeader href="/m/tenant" label="Back to home" title="Pay rent" />
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col rounded-card border border-border bg-surface p-3 text-sm">
          <span className="text-muted">Paying to</span>
          <strong>{LANDLORD_NAME}</strong>
          <span className="font-mono text-xs text-muted">
            Paybill {PAYBILL_PLACEHOLDER} · Account {TENANT_ACCOUNT}
          </span>
        </div>

        <Field label="Amount (KES)" htmlFor="amt" error={errors.amount}>
          <Input
            id="amt"
            inputMode="numeric"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            aria-invalid={errors.amount ? true : undefined}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAmountText(String(owed / 100))}>
            Full balance <Money minor={owed} prefix={false} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAmountText(String(rentOnly / 100))}
          >
            Rent only <Money minor={rentOnly} prefix={false} />
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">M-Pesa phone number</span>
          {otherPhone ? (
            <Field label="Other M-Pesa number" htmlFor="ph" error={errors.phone}>
              <Input
                id="ph"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="07XX XXX XXX"
                value={phoneText}
                onChange={(e) => setPhoneText(e.target.value)}
                aria-invalid={errors.phone ? true : undefined}
              />
            </Field>
          ) : (
            <div className="flex min-h-11 items-center rounded-control border border-border-strong bg-soft px-3 text-[15px]">
              {tenant ? <MaskedText kind="phone" value={tenant.phone} /> : null}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setOtherPhone((v) => !v);
              setErrors((e) => ({ ...e, phone: undefined }));
            }}
            className="flex min-h-11 items-center self-start text-sm font-bold text-brand underline"
          >
            {otherPhone ? 'Use my number on file' : 'Use a different number'}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={send}>
            Send M-Pesa prompt
          </Button>
          <p className="m-0 text-center text-xs text-muted">
            Your money goes directly to your landlord’s paybill. Kodibox never holds it.
          </p>
        </div>
      </div>
    </div>
  );
}
