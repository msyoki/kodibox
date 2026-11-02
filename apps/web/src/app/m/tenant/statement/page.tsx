'use client';

import { useState } from 'react';
import { Button, LinkButton, Money, useToast } from '@/components/ui';
import { Eyebrow } from '@/components/tenant-app/bits';
import { useTenantLocal } from '@/components/tenant-app/local-state';
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
  const { paid } = useTenantLocal();
  const { toast } = useToast();
  const [month, setMonth] = useState<StatementMonth>('nov');
  const balance = Math.max(0, BALANCE - paid);
  const base = getLedger(month);
  const rows =
    month === 'nov' && paid > 0
      ? [{ title: 'Payment · M-Pesa', sub: 'TK2H8L3M9P · 2 Nov', delta: -paid, balance }, ...base]
      : base;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <header>
          <Eyebrow>{PROPERTY_LABEL}</Eyebrow>
          <h1 className="m-0 text-2xl font-extrabold">Payments</h1>
        </header>

        <section
          aria-labelledby="bal"
          className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
        >
          <div>
            <p id="bal" className="m-0 text-sm text-muted">
              Current balance{balance > 0 ? ` · due ${DUE_LABEL.replace('November', 'Nov')}` : ''}
            </p>
            <p className="m-0 text-2xl font-extrabold">
              <Money minor={balance} />
            </p>
          </div>
          {balance > 0 ? <LinkButton href="/m/tenant/pay">Pay</LinkButton> : null}
        </section>

        <div role="group" aria-label="Filter by month" className="flex gap-2">
          {STATEMENT_MONTHS.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={month === m.key}
              onClick={() => setMonth(m.key)}
              className={cn(
                'min-h-11 flex-1 rounded-control border px-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                month === m.key
                  ? 'border-brand bg-brand-soft text-brand'
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
          <div className="grid min-w-[300px] grid-cols-[1fr_auto_auto] gap-x-3 border-b border-border px-3 py-2 text-xs font-bold text-muted">
            <span>Entry</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Balance</span>
          </div>
          <ul className="m-0 list-none p-0">
            {rows.map((r) => (
              <li
                key={`${r.title}-${r.sub}`}
                className="grid min-w-[300px] grid-cols-[1fr_auto_auto] items-center gap-x-3 border-t border-divider px-3 py-2.5 first:border-t-0"
              >
                <span className="flex flex-col">
                  <strong className="text-sm">{r.title}</strong>
                  <span className="text-xs text-muted">{r.sub}</span>
                </span>
                <span className={cn('text-right text-sm', r.delta < 0 && 'text-ok')}>
                  <Money minor={r.delta} prefix={false} />
                </span>
                <Money
                  minor={r.balance}
                  prefix={false}
                  className="text-right text-sm font-semibold"
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
