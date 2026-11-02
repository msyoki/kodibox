'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Money,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  buttonClasses,
} from '@/components/ui';
import { listInvoices } from '@/demo';
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUS_TONE,
  displayStatus,
  type InvoiceDisplayStatus,
} from '@/demo/billing';
import { useDemoStore } from '@/demo/store';
import { cn } from '@/lib/cn';
import { useVoidedInvoices } from '../voided-store';

const FILTERS: (InvoiceDisplayStatus | 'all')[] = [
  'all',
  'draft',
  'sent',
  'partial',
  'paid',
  'overdue',
  'void',
];
const LIMIT = 30;

export function InvoiceList() {
  const { data } = useDemoStore();
  const voided = useVoidedInvoices();
  const [filter, setFilter] = useState<InvoiceDisplayStatus | 'all'>('all');

  const all = listInvoices({}, data).map((i) => ({ ...i, shown: displayStatus(i, voided) }));
  const rows = filter === 'all' ? all : all.filter((i) => i.shown === filter);

  return (
    <Card aria-labelledby="list">
      <CardHeader
        id="list"
        title="All invoices"
        action={
          <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const sel = f === filter;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'min-h-11 rounded-full border px-3.5 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                    sel
                      ? 'border-brand bg-brand text-white'
                      : 'border-border-strong bg-surface text-text',
                  )}
                >
                  {f === 'all' ? 'All' : INVOICE_STATUS_LABEL[f]}
                </button>
              );
            })}
          </div>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title={`No ${filter === 'all' ? '' : INVOICE_STATUS_LABEL[filter as InvoiceDisplayStatus].toLowerCase() + ' '}invoices`}
          description="Change the filter to see other invoices."
        />
      ) : (
        <Table minWidth={720}>
          <THead>
            <TR>
              <TH>Invoice</TH>
              <TH>Tenant · Unit</TH>
              <TH>Period</TH>
              <TH align="right">Amount</TH>
              <TH align="right">Paid</TH>
              <TH>Status</TH>
              <TH>Action</TH>
            </TR>
          </THead>
          <TBody>
            {rows.slice(0, LIMIT).map((i) => (
              <TR key={i.id}>
                <TD className="font-mono text-xs">{i.number}</TD>
                <TD>
                  <strong>{i.tenantName}</strong> · {i.unitCode}
                </TD>
                <TD>{i.period}</TD>
                <TD align="right">
                  <Money minor={i.total} prefix={false} />
                </TD>
                <TD align="right">
                  <Money minor={i.paid} prefix={false} />
                </TD>
                <TD>
                  <Badge tone={INVOICE_STATUS_TONE[i.shown]}>{INVOICE_STATUS_LABEL[i.shown]}</Badge>
                </TD>
                <TD>
                  <Link
                    href={`/invoices/${i.id}`}
                    className={buttonClasses('secondary', 'sm')}
                    aria-label={`View invoice ${i.number}`}
                  >
                    View
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="mt-3 mb-0 text-xs text-muted">
        Showing {Math.min(LIMIT, rows.length)} of {rows.length} invoices. Voids create a reversal,
        never delete. A void keeps the original invoice, adds an offsetting entry and requires a
        reason note that is written to the audit log.
      </p>
    </Card>
  );
}
