'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Card,
  EmptyState,
  Field,
  Input,
  Money,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui';
import type { PaymentRow, UnmatchedPayment } from '@/demo';
import { maskPayerName } from '@/demo/billing';
import { CHANNEL_LABEL, formatWhen } from '@/demo/format';
import { ORIGIN_LABEL, originOf } from '@/demo/recon';

interface Row {
  id: string;
  when: string;
  who: string;
  unit: string;
  channel: keyof typeof CHANNEL_LABEL;
  reference: string;
  source: string;
  amount: number;
  status: 'matched' | 'awaiting_approval' | 'rejected' | 'unmatched';
}

const STATUS: Record<Row['status'], { label: string; tone: 'ok' | 'warn' | 'danger' | 'info' }> = {
  matched: { label: 'Matched', tone: 'ok' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'warn' },
  rejected: { label: 'Rejected', tone: 'danger' },
  unmatched: { label: 'Unmatched', tone: 'info' },
};

const LIMIT = 40;

export function AllPaymentsPanel({
  payments,
  unmatched,
}: {
  payments: PaymentRow[];
  unmatched: UnmatchedPayment[];
}) {
  const [q, setQ] = useState('');

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = [
      ...payments.map((p) => ({
        id: p.id,
        when: p.receivedAt,
        who: p.tenantName,
        unit: p.unitCode,
        channel: p.channel,
        reference: p.reference,
        source: ORIGIN_LABEL[originOf(p)],
        amount: p.amount,
        status: p.status,
      })),
      ...unmatched.map((u) => ({
        id: u.id,
        when: u.receivedAt,
        who: maskPayerName(u.payerName),
        unit: u.accountEntered ? `acc “${u.accountEntered}”` : 'no account',
        channel: u.channel,
        reference: u.reference,
        source: ORIGIN_LABEL.statement,
        amount: u.amount,
        status: 'unmatched' as const,
      })),
    ].sort((a, b) => b.when.localeCompare(a.when));
    const needle = q.trim().toLowerCase();
    return needle
      ? all.filter((r) =>
          [r.who, r.unit, r.reference, CHANNEL_LABEL[r.channel]].some((v) =>
            v.toLowerCase().includes(needle),
          ),
        )
      : all;
  }, [payments, unmatched, q]);

  return (
    <div className="flex flex-col gap-3">
      <Field label="Search payments" htmlFor="pay-search" className="max-w-sm">
        <Input
          id="pay-search"
          type="search"
          placeholder="Tenant, unit or M-Pesa code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </Field>
      {rows.length === 0 ? (
        <EmptyState
          title="No payments match your search"
          description="Try a unit code or a reference."
        />
      ) : (
        <>
          <Card>
            <Table minWidth={680} aria-label="All payments">
              <THead>
                <TR>
                  <TH>Received</TH>
                  <TH>Payer</TH>
                  <TH>Unit</TH>
                  <TH>Channel</TH>
                  <TH>Reference</TH>
                  <TH>Source</TH>
                  <TH align="right">Amount</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.slice(0, LIMIT).map((r) => (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap">{formatWhen(r.when)}</TD>
                    <TD>{r.who}</TD>
                    <TD>{r.unit}</TD>
                    <TD>{CHANNEL_LABEL[r.channel]}</TD>
                    <TD className="font-mono text-xs">{r.reference}</TD>
                    <TD>{r.source}</TD>
                    <TD align="right">
                      <Money minor={r.amount} prefix={false} />
                    </TD>
                    <TD>
                      <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
          <p className="m-0 text-xs text-muted">
            Showing {Math.min(LIMIT, rows.length)} of {rows.length} payments. Amounts in KES.
          </p>
        </>
      )}
    </div>
  );
}
