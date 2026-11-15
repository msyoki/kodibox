'use client';

import { useState } from 'react';
import { Button, Card, CardHeader, Field, Input, Select, useToast } from '@/components/ui';
import { listProperties } from '@/demo';
import { getInstruction, instructionLine, reminderSms } from '@/demo/recon';
import { useDemoStore } from '@/demo/store';
import type { ImportReminder, PaymentInstruction } from '@/demo/types';

const REMINDERS: { id: ImportReminder; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
];

export function PaymentInstructionsView() {
  const { data, actions } = useDemoStore();
  const { toast } = useToast();
  const properties = listProperties(data);
  const [scope, setScope] = useState('org');
  const [draft, setDraft] = useState<PaymentInstruction>(() => getInstruction(data));

  function chooseScope(next: string) {
    setScope(next);
    const existing = data.paymentInstructions.find((p) => p.scope === next);
    setDraft(existing ?? { ...getInstruction(data), id: `pi_${next}`, scope: next });
  }
  const set = <K extends keyof PaymentInstruction>(k: K, v: PaymentInstruction[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const unit = data.units.find((u) => u.tenantId && (scope === 'org' || u.propertyId === scope));
  const code = unit?.code ?? 'B-12';
  const line = instructionLine(draft, code);

  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="pi">
        <CardHeader title="Payment instructions" id="pi" />
        <p className="mt-0 text-sm text-muted">
          Tell tenants where to pay. Rent goes straight to your own paybill, till or bank account.
          Kodibox never collects or holds it; you import statements and Kodibox matches them.
        </p>
        <div className="grid max-w-xl gap-4">
          <Field label="Applies to" htmlFor="pi-scope">
            <Select id="pi-scope" value={scope} onChange={(e) => chooseScope(e.target.value)}>
              <option value="org">All properties (default)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} only
                </option>
              ))}
            </Select>
          </Field>
          <Field label="M-Pesa" htmlFor="pi-kind">
            <Select
              id="pi-kind"
              value={draft.mpesaKind}
              onChange={(e) => set('mpesaKind', e.target.value as PaymentInstruction['mpesaKind'])}
            >
              <option value="paybill">Paybill (tenants type an account reference)</option>
              <option value="till">Till (Buy Goods)</option>
              <option value="none">No M-Pesa</option>
            </Select>
          </Field>
          {draft.mpesaKind !== 'none' ? (
            <Field
              label={draft.mpesaKind === 'paybill' ? 'Paybill number' : 'Till number'}
              htmlFor="pi-num"
              help={
                draft.mpesaKind === 'paybill'
                  ? 'Account reference rule: the tenant types their unit code (for example B-12).'
                  : 'Tills have no account field, so matching relies on payer phone and amount.'
              }
            >
              <Input
                id="pi-num"
                inputMode="numeric"
                value={draft.mpesaNumber}
                onChange={(e) => set('mpesaNumber', e.target.value)}
              />
            </Field>
          ) : null}
          <Field
            label="Payee name on M-Pesa messages"
            htmlFor="pi-payee"
            help="Used to flag proofs of payment made to someone else."
          >
            <Input
              id="pi-payee"
              value={draft.payeeName}
              onChange={(e) => set('payeeName', e.target.value)}
            />
          </Field>
          <Field label="Bank name" htmlFor="pi-bank">
            <Input
              id="pi-bank"
              value={draft.bankName}
              onChange={(e) => set('bankName', e.target.value)}
            />
          </Field>
          <Field label="Bank account" htmlFor="pi-acc">
            <Input
              id="pi-acc"
              inputMode="numeric"
              value={draft.bankAccount}
              onChange={(e) => set('bankAccount', e.target.value)}
            />
          </Field>
          <Field label="Branch" htmlFor="pi-branch">
            <Input
              id="pi-branch"
              value={draft.bankBranch}
              onChange={(e) => set('bankBranch', e.target.value)}
            />
          </Field>
          <div>
            <Button
              onClick={() => {
                actions.savePaymentInstruction(draft);
                toast('Payment instructions saved. Saved in the audit log.', 'ok');
              }}
            >
              Save instructions
            </Button>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="pi-prev">
        <CardHeader title="How it appears" id="pi-prev" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-control border border-divider bg-soft p-4 text-sm">
            <div className="mb-1 text-xs font-bold text-muted">On the invoice ({code})</div>
            <p className="m-0">How to pay: {line}.</p>
          </div>
          <div className="rounded-control border border-divider bg-soft p-4 text-sm">
            <div className="mb-1 text-xs font-bold text-muted">In a payment reminder SMS</div>
            <p className="m-0">{reminderSms(draft, code, 'Peter Otieno', 'KES 16,700')}</p>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="pi-rem">
        <CardHeader title="Statement import reminders" id="pi-rem" />
        <p className="mt-0 text-sm text-muted">
          Kodibox reminds you to download and import your latest statement so payments are matched
          while they are fresh.
        </p>
        <div role="radiogroup" aria-label="Reminder frequency" className="flex flex-wrap gap-2">
          {REMINDERS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={data.importReminder === r.id}
              onClick={() => {
                actions.setImportReminder(r.id);
                toast(`Import reminders: ${r.label.toLowerCase()}.`, 'ok');
              }}
              className={
                data.importReminder === r.id
                  ? 'min-h-11 rounded-control border-2 border-brand bg-brand-tint px-5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-link'
                  : 'min-h-11 rounded-control border border-border-strong bg-surface px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-link'
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
