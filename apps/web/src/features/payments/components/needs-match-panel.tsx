'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  EmptyState,
  Field,
  Input,
  MaskedText,
  Money,
  Select,
  useToast,
} from '@/components/ui';
import { getInvoice, listInvoices, type DemoData, type UnmatchedPayment } from '@/demo';
import { maskPayerName, previewAllocation, suggestionConfidence } from '@/demo/billing';
import { UNMATCHED_REASON_LABEL, reasonOf } from '@/demo/recon';
import { CHANNEL_LABEL, formatWhen } from '@/demo/format';
import { cn } from '@/lib/cn';

interface Props {
  data: DemoData;
  unmatched: UnmatchedPayment[];
  onMatch: (unmatchedId: string, tenantId: string, invoiceId?: string) => void;
  onSplit: (unmatchedId: string, parts: { tenantId: string; amount: number }[]) => void;
  onNotRent: (id: string) => void;
}

const MANUAL = 'manual';

export function NeedsMatchPanel({ data, unmatched, onMatch, onSplit, onNotRent }: Props) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [manualInvoice, setManualInvoice] = useState('');
  const [search, setSearch] = useState('');
  const [remember, setRemember] = useState(true);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitInvoice, setSplitInvoice] = useState('');
  const [splitFirst, setSplitFirst] = useState('');

  const selected = unmatched.find((u) => u.id === selectedId) ?? unmatched[0];
  const allOpenInvoices = useMemo(
    () =>
      listInvoices({ status: 'open' }, data).sort((a, b) => a.unitCode.localeCompare(b.unitCode)),
    [data],
  );
  const openInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? allOpenInvoices.filter((i) =>
          `${i.unitCode} ${i.tenantName} ${i.propertyName}`.toLowerCase().includes(q),
        )
      : allOpenInvoices;
  }, [allOpenInvoices, search]);

  if (!selected) {
    return (
      <EmptyState
        title="Nothing to review"
        description="Imported lines that could not be matched with confidence will appear here."
      />
    );
  }

  const picked = choice[selected.id] ?? selected.suggestions[0]?.invoiceId ?? MANUAL;
  const invoiceId = picked === MANUAL ? manualInvoice : picked;
  const invoice = invoiceId ? getInvoice(invoiceId, data) : undefined;
  const reason = reasonOf(selected);
  const alloc = invoice ? previewAllocation(invoice, selected.amount) : undefined;

  function confirm() {
    if (!selected || !invoice) return;
    onMatch(selected.id, invoice.tenantId, invoice.id);
    toast(
      remember
        ? `Assigned to ${invoice.unitCode}. Receipt sent. Alias saved for next time.`
        : `Assigned to ${invoice.unitCode}. Receipt sent.`,
      'ok',
    );
    setSelectedId(undefined);
  }

  function confirmSplit() {
    if (!selected) return;
    const first = openInvoices.find((i) => i.id === splitInvoice);
    const second = invoice;
    if (!first || !second) return;
    onSplit(selected.id, [
      { tenantId: first.tenantId, amount: firstCents },
      { tenantId: second.tenantId, amount: selected.amount - firstCents },
    ]);
    toast(
      `Split across ${first.unitCode} and ${second.unitCode}. Both are in the audit log.`,
      'ok',
    );
    setSplitOpen(false);
    setSelectedId(undefined);
  }

  const firstCents = Math.round(Number(splitFirst || 0) * 100);
  const splitValid =
    !!splitInvoice &&
    !!invoice &&
    invoice.id !== splitInvoice &&
    firstCents > 0 &&
    firstCents < selected.amount;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,340px)_1fr]">
      <section aria-label="Unmatched payments" className="flex flex-col gap-2.5">
        <p className="m-0 mb-1 text-[13px] text-muted">
          These lines came from your imported statements, but we could not tell with confidence
          which unit they belong to.
        </p>
        {unmatched.map((u) => {
          const sel = u.id === selected.id;
          return (
            <button
              key={u.id}
              type="button"
              aria-pressed={sel}
              onClick={() => setSelectedId(u.id)}
              className={cn(
                'flex min-h-11 flex-col gap-1.5 rounded-xl px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link',
                sel ? 'border-2 border-brand bg-surface' : 'border border-border bg-soft',
              )}
            >
              <span className="flex justify-between gap-2">
                <strong>{maskPayerName(u.payerName)}</strong>
                <Money minor={u.amount} className="font-bold" />
              </span>
              <span className="flex justify-between gap-2 text-xs text-muted">
                <span className="font-mono">{u.reference}</span>
                <span>{formatWhen(u.receivedAt)}</span>
              </span>
              <Badge tone={reasonOf(u) === 'ambiguous' ? 'warn' : 'neutral'} className="self-start">
                {UNMATCHED_REASON_LABEL[reasonOf(u)].split(':')[0]}
              </Badge>
              <span className="text-xs text-muted">
                Account entered:{' '}
                <strong className="text-text">
                  {u.accountEntered ? `“${u.accountEntered}”` : '(blank)'}
                </strong>
              </span>
            </button>
          );
        })}
      </section>

      <Card aria-labelledby="matchh" className="flex flex-col gap-5 p-6">
        <div>
          <h2 id="matchh" className="m-0 text-xl font-extrabold">
            Match <Money minor={selected.amount} /> from {maskPayerName(selected.payerName)}
          </h2>
          <p className="mt-1 mb-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>
              {CHANNEL_LABEL[selected.channel]}{' '}
              <span className="font-mono">{selected.reference}</span>
            </span>
            <span>· {formatWhen(selected.receivedAt)}</span>
            {selected.payerPhoneMasked ? (
              <span>· phone {selected.payerPhoneMasked}</span>
            ) : selected.payerPhone ? (
              <span>
                · phone <MaskedText kind="phone" value={selected.payerPhone} />
              </span>
            ) : null}
            <Badge tone="info">From statement import</Badge>
          </p>
          <p className="mt-2 mb-0 text-sm">
            <strong>Why it is here:</strong> {UNMATCHED_REASON_LABEL[reason]}
            {selected.confidence ? ` (best score ${Math.round(selected.confidence * 100)}%)` : ''}.
          </p>
        </div>

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2 p-0 text-sm font-bold tracking-wide text-muted uppercase">
            Suggested matches
          </legend>
          {selected.suggestions.length === 0 ? (
            <p className="m-0 text-sm text-muted">
              No suggestions. Search for the tenant below, or set this line aside as not rent.
            </p>
          ) : null}
          {selected.suggestions.map((s) => {
            const inv = getInvoice(s.invoiceId, data);
            const conf = suggestionConfidence(s);
            if (!inv) return null;
            return (
              <label
                key={s.invoiceId}
                className={cn(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-4 py-3.5',
                  picked === s.invoiceId
                    ? 'border-2 border-brand bg-brand-tint'
                    : 'border border-border bg-surface',
                )}
              >
                <input
                  type="radio"
                  name="match"
                  className="mt-1 size-5 accent-brand"
                  checked={picked === s.invoiceId}
                  onChange={() => setChoice((c) => ({ ...c, [selected.id]: s.invoiceId }))}
                />
                <span className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <strong>
                      {inv.unitCode} · {inv.propertyName} · {inv.tenantName}
                    </strong>
                    <Badge tone={conf.strong ? 'ok' : 'neutral'}>
                      {s.confidence !== undefined
                        ? `${Math.round(s.confidence * 100)}% confidence`
                        : conf.label}
                    </Badge>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {s.reason.split(' + ').map((chip) => (
                      <Badge key={chip} tone="neutral">
                        {chip}
                      </Badge>
                    ))}
                  </span>
                  <span className="text-sm">
                    Balance due <Money minor={inv.balance} className="font-bold" />
                  </span>
                </span>
              </label>
            );
          })}
          <label
            className={cn(
              'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-4 py-3.5',
              picked === MANUAL
                ? 'border-2 border-brand bg-brand-tint'
                : 'border border-border bg-surface',
            )}
          >
            <input
              type="radio"
              name="match"
              className="mt-1 size-5 accent-brand"
              checked={picked === MANUAL}
              onChange={() => setChoice((c) => ({ ...c, [selected.id]: MANUAL }))}
            />
            <span className="flex flex-1 flex-col gap-1">
              <strong>Search another unit or tenant</strong>
              <span className="text-sm text-muted">Pick any unit with an open invoice.</span>
              <Input
                aria-label="Search unit or tenant"
                type="search"
                placeholder="Search unit or tenant"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Select
                aria-label="Unit with open invoice"
                value={manualInvoice}
                onFocus={() => setChoice((c) => ({ ...c, [selected.id]: MANUAL }))}
                onChange={(e) => {
                  setManualInvoice(e.target.value);
                  setChoice((c) => ({ ...c, [selected.id]: MANUAL }));
                }}
              >
                <option value="">Choose a unit…</option>
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.unitCode} · {i.tenantName}
                  </option>
                ))}
              </Select>
            </span>
          </label>
        </fieldset>

        {invoice && alloc ? (
          <div className="rounded-xl border border-divider bg-soft p-4">
            <h3 className="m-0 mb-2 text-sm font-bold">
              How <Money minor={selected.amount} /> will be applied to {invoice.unitCode}
            </h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
              {alloc.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-3">
                  <span>{l.label}</span>
                  <span>
                    <Money minor={l.applied} prefix={false} /> of{' '}
                    <Money minor={l.of} prefix={false} />
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-divider pt-2 font-bold">
                <span>Remaining balance after this payment</span>
                <Money minor={alloc.remaining} />
              </li>
              {alloc.credit > 0 ? (
                <li className="flex justify-between gap-3 text-ok">
                  <span>Overpayment kept as credit</span>
                  <Money minor={alloc.credit} />
                </li>
              ) : null}
            </ul>
            <p className="mt-2 mb-0 text-xs text-muted">
              Oldest invoices first; penalties are paid last. You can change the order in Settings.
            </p>
          </div>
        ) : (
          <p className="m-0 rounded-card border border-dashed border-border-strong p-4 text-sm text-muted">
            Choose a unit to preview how the payment will be applied.
          </p>
        )}

        <Checkbox
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          label={
            <span>
              Remember{' '}
              {selected.accountEntered ? `“${selected.accountEntered}”` : 'this account text'} and
              this phone number for {invoice?.unitCode ?? 'this unit'} next time
            </span>
          }
        />

        <div className="flex flex-wrap gap-2.5">
          <Button size="lg" disabled={!invoice} onClick={confirm}>
            {picked === MANUAL ? 'Assign to tenant' : 'Confirm suggestion'}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setSplitOpen(true)}>
            Split across tenants
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => {
              onNotRent(selected.id);
              toast('Marked as not rent. It is in the Not rent tab and can be reversed.', 'info');
              setSelectedId(undefined);
            }}
          >
            Mark as not rent
          </Button>
        </div>
        <p className="m-0 text-xs text-muted">
          Every match is saved in the audit log with your name and the time. Matches can be reversed
          but never deleted. Kodibox never holds this money; it is already in your own account.
        </p>
      </Card>

      <Dialog
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        title="Split across tenants"
        description="Divide this line between two tenants. The amounts must add up to the payment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSplitOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!splitValid} onClick={confirmSplit}>
              Confirm split
            </Button>
          </>
        }
      >
        <p className="m-0 text-sm">
          Payment: <Money minor={selected.amount} className="font-bold" />
        </p>
        <Field label="First unit" htmlFor="split-first-unit">
          <Select
            id="split-first-unit"
            value={splitInvoice}
            onChange={(e) => setSplitInvoice(e.target.value)}
          >
            <option value="">Choose a unit…</option>
            {openInvoices.map((i) => (
              <option key={i.id} value={i.id}>
                {i.unitCode} · {i.tenantName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount for first unit (KES)" htmlFor="split-first-amt">
          <Input
            id="split-first-amt"
            inputMode="decimal"
            value={splitFirst}
            onChange={(e) => setSplitFirst(e.target.value)}
          />
        </Field>
        <Field label="Second unit" htmlFor="split-second-unit" help="Receives the remainder.">
          <Select
            id="split-second-unit"
            value={manualInvoice}
            onChange={(e) => {
              setManualInvoice(e.target.value);
              setChoice((c) => ({ ...c, [selected.id]: MANUAL }));
            }}
          >
            <option value="">Choose a unit…</option>
            {openInvoices.map((i) => (
              <option key={i.id} value={i.id}>
                {i.unitCode} · {i.tenantName}
              </option>
            ))}
          </Select>
        </Field>
        {splitValid ? (
          <p className="m-0 text-sm text-muted">
            Second unit receives <Money minor={selected.amount - firstCents} />.
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
