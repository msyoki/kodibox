'use client';

import { useState } from 'react';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/components/ui';
import type { TenantRow } from '@/demo';
import type { SubmittedCash } from './approvals-panel';

interface Props {
  open: boolean;
  onClose: () => void;
  tenants: TenantRow[];
  onSubmit: (entry: Omit<SubmittedCash, 'id'>) => void;
}

export function RecordCashDialog({ open, onClose, tenants, onSubmit }: Props) {
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();

  function submit() {
    const tenant = tenants.find((t) => t.id === tenantId);
    const cents = Math.round(Number(amount) * 100);
    if (!tenant) return setError('Choose a tenant.');
    if (!Number.isFinite(cents) || cents <= 0)
      return setError('Enter an amount greater than zero.');
    onSubmit({
      tenantName: tenant.name,
      unitCode: tenant.unitCode,
      amount: cents,
      note: note.trim(),
    });
    setTenantId('');
    setAmount('');
    setNote('');
    setError(undefined);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record cash payment"
      description="Cash is never counted until a second person approves it (maker-checker)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Submit for approval</Button>
        </>
      }
    >
      <Field label="Tenant" htmlFor="cash-tenant">
        <Select id="cash-tenant" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
          <option value="">Choose a tenant…</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.unitCode} · {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Amount received (KES)" htmlFor="cash-amount" error={error}>
        <Input
          id="cash-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field
        label="Receipt number or note"
        htmlFor="cash-note"
        help="Attach the receipt photo in the mobile app."
      >
        <Textarea id="cash-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Dialog>
  );
}
