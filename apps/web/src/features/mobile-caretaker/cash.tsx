'use client';

import { useMemo, useState } from 'react';
import { Badge, Button, Card, Field, Input, Money, Select, useToast } from '@/components/ui';
import { PhotoButton, ScreenHeader, Section } from '@/components/mobile-ui/screen';
import { formatWhen } from '@/demo/format';
import { kes } from '@/lib/money';
import { listCaretakerCash, listCashTenantOptions } from '@/demo/mobile';
import { useDemoStore } from '@/demo/store';

interface LocalEntry {
  id: string;
  label: string;
  book: string;
  date: string;
  amount: number;
}

const STATUS = {
  awaiting_approval: { label: 'Pending', tone: 'warn' },
  matched: { label: 'Approved', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'danger' },
} as const;

export function CaretakerCash() {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const options = useMemo(() => listCashTenantOptions(data), [data]);
  const mine = useMemo(() => listCaretakerCash(data), [data]);
  const [tenantId, setTenantId] = useState(options[0]?.tenantId ?? '');
  const [amount, setAmount] = useState('');
  const [book, setBook] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [local, setLocal] = useState<LocalEntry[]>([]);

  const submit = () => {
    const e: Record<string, string> = {};
    const n = Number(amount.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) e.amount = 'Enter the amount received.';
    if (!book.trim()) e.book = 'Enter the receipt book number.';
    if (!photo) e.photo = 'Add a photo of the paper receipt.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    const opt = options.find((o) => o.tenantId === tenantId);
    setLocal((l) => [
      {
        id: `${l.length + 1}`,
        label: opt?.label ?? '',
        book: book.trim(),
        date: '2 Nov',
        amount: kes(n),
      },
      ...l,
    ]);
    toast('Sent to manager for approval', 'ok');
    setAmount('');
    setBook('');
    setNote('');
    setPhoto(false);
  };

  return (
    <>
      <ScreenHeader eyebrow="Baraka Flats" title="Record cash payment" />
      <Section title="New cash entry" id="new">
        <Card className="flex flex-col gap-3">
          <Field label="Tenant and unit" htmlFor="cash-tenant">
            <Select id="cash-tenant" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
              {options.map((o) => (
                <option key={o.tenantId} value={o.tenantId}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (KES)" htmlFor="cash-amount" error={errors.amount}>
            <Input
              id="cash-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="14,000"
            />
          </Field>
          <Field label="Receipt book no." htmlFor="cash-book" error={errors.book}>
            <Input
              id="cash-book"
              value={book}
              onChange={(e) => setBook(e.target.value)}
              placeholder="RB-004521"
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <PhotoButton
              added={photo}
              onToggle={() => setPhoto((p) => !p)}
              label="Photo of paper receipt (required)"
            />
            {errors.photo ? (
              <span role="alert" className="text-xs font-medium text-danger">
                {errors.photo}
              </span>
            ) : null}
          </div>
          <Field label="Note (optional)" htmlFor="cash-note">
            <Input id="cash-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <p role="note" className="m-0 text-xs text-muted">
            Goes to the manager for approval before it counts. You cannot approve your own entry.
          </p>
          <Button size="lg" onClick={submit}>
            Submit for approval
          </Button>
        </Card>
      </Section>
      <Section title="My entries" id="mine">
        <Card className="p-0">
          <ul className="m-0 list-none divide-y divide-divider p-0">
            {local.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <strong className="block">{l.label}</strong>
                  <span className="text-xs text-muted">
                    {l.book} · {l.date}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <Money minor={l.amount} prefix={false} />
                  <Badge tone="warn">Pending</Badge>
                </span>
              </li>
            ))}
            {mine.map((p) => {
              const s = STATUS[p.status];
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <strong className="block">
                      {p.unitCode} · {p.tenantName}
                    </strong>
                    <span className="text-xs text-muted">
                      {p.reference} · {formatWhen(p.receivedAt)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <Money minor={p.amount} prefix={false} />
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>
    </>
  );
}
