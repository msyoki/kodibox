'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Money, useToast } from '@/components/ui';
import { Eyebrow } from '@/components/tenant-app/bits';
import { DEMO_TENANT_ID } from '@/demo';
import { ORIGIN_LABEL, latestNewPayment, originOf, tenantPaidDelta } from '@/demo/recon';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';
import {
  BALANCE,
  DUE_LABEL,
  PROPERTY_LABEL,
  STATEMENT_MONTHS,
  getLedger,
  type StatementMonth,
} from '@/demo/tenant-app';

export default function TenantStatementPage() {
  const { data } = useDemoStore();
  const paid = tenantPaidDelta(data, DEMO_TENANT_ID);
  const latest = latestNewPayment(data, DEMO_TENANT_ID);
  const pending = data.claims.filter(
    (c) => c.tenantId === DEMO_TENANT_ID && c.status === 'pending',
  );
  const { toast } = useToast();
  const [month, setMonth] = useState<StatementMonth>('nov');
  const balance = Math.max(0, BALANCE - paid);
  const base = getLedger(month);
  const rows =
    month === 'nov' && paid > 0
      ? [
          {
            title: `Payment · ${latest ? ORIGIN_LABEL[originOf(latest)] : 'Statement import'}`,
            sub: `${latest?.reference ?? 'Payment'} · 2 Nov`,
            delta: -paid,
            balance,
          },
          ...base,
        ]
      : base;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-3.5 p-4">
        <header>
          <Eyebrow>{PROPERTY_LABEL}</Eyebrow>
          <h1 className="m-0 text-[22px] font-extrabold">Payments</h1>
        </header>

        <section
          aria-labelledby="bal"
          className="flex items-center justify-between gap-3 rounded-[18px] bg-brand px-5 py-4 text-white"
        >
          <div>
            <p id="bal" className="m-0 text-[13px] text-on-brand">
              Current balance{balance > 0 ? ` · due ${DUE_LABEL.replace('November', 'Nov')}` : ''}
            </p>
            <p className="m-0 mt-0.5 font-mono text-[28px] font-medium tracking-[-1px]">
              <Money minor={balance} />
            </p>
          </div>
          {balance > 0 ? (
            <Link
              href="/m/tenant/pay"
              className="flex min-h-11 items-center justify-center rounded-xl bg-amber px-4 text-sm font-extrabold text-on-amber no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Pay
            </Link>
          ) : null}
        </section>

        {pending.length > 0 ? (
          <p role="status" className="m-0 rounded-card border border-border bg-surface p-3 text-sm">
            <strong>Pending verification:</strong> {pending.length} proof
            {pending.length > 1 ? 's' : ''} of payment. Your balance changes once your landlord
            confirms {pending.length > 1 ? 'them' : 'it'}.
          </p>
        ) : null}

        <div role="group" aria-label="Filter by month" className="flex gap-2">
          {STATEMENT_MONTHS.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={month === m.key}
              onClick={() => setMonth(m.key)}
              className={cn(
                'min-h-11 flex-1 rounded-full border px-2 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link',
                month === m.key
                  ? 'border-brand bg-brand-soft text-link'
                  : 'border-border-strong bg-surface text-muted',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <section
          aria-label="Statement"
          className="overflow-x-auto rounded-card border border-border bg-surface"
        >
          <div className="grid min-w-[300px] grid-cols-[1fr_auto_auto] gap-x-3 border-b border-divider bg-soft px-3.5 py-2 text-[11px] font-bold tracking-wide text-muted uppercase">
            <span>Entry</span>
            <span className="w-[78px] text-right">Amount</span>
            <span className="w-[66px] text-right">Balance</span>
          </div>
          <ul className="m-0 list-none p-0">
            {rows.map((r) => (
              <li
                key={`${r.title}-${r.sub}`}
                className="grid min-w-[300px] grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t border-divider px-3.5 py-2.5 first:border-t-0"
              >
                <span className="flex flex-col">
                  <strong className="text-sm">{r.title}</strong>
                  <span className="font-mono text-[11px] text-muted">{r.sub}</span>
                </span>
                <span className={cn('w-[78px] text-right text-sm', r.delta < 0 && 'text-ok')}>
                  <Money minor={r.delta} prefix={false} />
                </span>
                <Money
                  minor={r.balance}
                  prefix={false}
                  className="w-[66px] text-right text-xs text-muted"
                />
              </li>
            ))}
          </ul>
        </section>

        <p className="m-0 text-xs text-muted">
          Invoices add to what you owe. Payments reduce it. Corrections show as new lines and
          nothing is deleted.
        </p>
      </div>
      <div className="px-4 pb-4">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => toast('Statement PDF downloaded (demo)', 'ok')}
        >
          Download statement PDF
        </Button>
      </div>
    </div>
  );
}
