'use client';

import { useState } from 'react';
import { Button, Card, EmptyState, Money, Tabs, useToast } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { listPayments, listTenants, listUnmatched } from '@/demo';
import { maskPayerName } from '@/demo/billing';
import { formatWhen } from '@/demo/format';
import { useDemoStore } from '@/demo/store';
import { AllPaymentsPanel } from './all-payments-panel';
import { ApprovalsPanel, type SubmittedCash } from './approvals-panel';
import { NeedsMatchPanel } from './needs-match-panel';
import { RecordCashDialog } from './record-cash-dialog';

export function PaymentsView() {
  const { data, actions } = useDemoStore();
  const { toast } = useToast();
  const [notRentIds, setNotRentIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<SubmittedCash[]>([]);
  const [cashOpen, setCashOpen] = useState(false);

  const allUnmatched = listUnmatched(data);
  const unmatched = allUnmatched.filter((u) => !notRentIds.includes(u.id));
  const notRent = allUnmatched.filter((u) => notRentIds.includes(u.id));
  const payments = listPayments({}, data);
  const pending = payments.filter((p) => p.status === 'awaiting_approval');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reconcile payments"
        eyebrow="Payments"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast('Bank statement import is coming in M2-10.', 'info')}
            >
              Import bank statement
            </Button>
            <Button onClick={() => setCashOpen(true)}>Record cash payment</Button>
          </>
        }
      />
      <Tabs
        defaultTab="needs"
        tabs={[
          {
            id: 'all',
            label: 'All payments',
            content: <AllPaymentsPanel payments={payments} unmatched={unmatched} />,
          },
          {
            id: 'needs',
            label: 'Needs match',
            badge: unmatched.length,
            content: (
              <NeedsMatchPanel
                data={data}
                unmatched={unmatched}
                onMatch={actions.matchPayment}
                onNotRent={(id) => setNotRentIds((ids) => [...ids, id])}
              />
            ),
          },
          {
            id: 'approval',
            label: 'Awaiting approval',
            badge: pending.length + submitted.length,
            content: (
              <ApprovalsPanel
                pending={pending}
                submitted={submitted}
                onApprove={(id) => actions.approveCash(id)}
                onReject={(id) => actions.rejectCash(id)}
              />
            ),
          },
          {
            id: 'notrent',
            label: 'Not rent',
            badge: notRent.length,
            content:
              notRent.length === 0 ? (
                <EmptyState
                  title="Nothing marked as not rent"
                  description="Deposits, refunds and other non-rent receipts you set aside appear here."
                />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {notRent.map((u) => (
                    <li key={u.id}>
                      <Card className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <strong>{maskPayerName(u.payerName)}</strong>
                          <span className="text-sm text-muted">
                            <span className="font-mono">{u.reference}</span> ·{' '}
                            {formatWhen(u.receivedAt)}
                          </span>
                        </div>
                        <Money minor={u.amount} className="font-bold" />
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setNotRentIds((ids) => ids.filter((x) => x !== u.id));
                            toast('Moved back to Needs match.', 'info');
                          }}
                        >
                          Move back to Needs match
                        </Button>
                      </Card>
                    </li>
                  ))}
                </ul>
              ),
          },
        ]}
      />
      <RecordCashDialog
        open={cashOpen}
        onClose={() => setCashOpen(false)}
        tenants={listTenants({}, data)}
        onSubmit={(entry) => {
          setSubmitted((s) => [{ id: `sub_${s.length + 1}`, ...entry }, ...s]);
          setCashOpen(false);
          toast('Cash entry submitted. It needs approval from another person.', 'ok');
        }}
      />
    </div>
  );
}
