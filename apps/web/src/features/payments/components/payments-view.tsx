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
import { ClaimsPanel } from './claims-panel';
import { ImportStatementDialog } from './import-statement-dialog';
import { NeedsMatchPanel } from './needs-match-panel';
import { RecordCashDialog } from './record-cash-dialog';

export function PaymentsView() {
  const { data, actions } = useDemoStore();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState<SubmittedCash[]>([]);
  const [cashOpen, setCashOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const unmatched = listUnmatched(data);
  const notRent = data.notRent;
  const payments = listPayments({}, data);
  const pending = payments.filter((p) => p.status === 'awaiting_approval');
  const pendingClaims = data.claims.filter((c) => c.status === 'pending');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reconcile payments"
        eyebrow="Payments"
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              Import statement
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
            label: 'Unmatched',
            badge: unmatched.length,
            content: (
              <NeedsMatchPanel
                data={data}
                unmatched={unmatched}
                onMatch={actions.matchPayment}
                onSplit={actions.splitPayment}
                onNotRent={actions.ignorePayment}
              />
            ),
          },
          {
            id: 'claims',
            label: 'Tenant claims',
            badge: pendingClaims.length,
            content: (
              <ClaimsPanel
                data={data}
                claims={data.claims}
                onApprove={actions.approveClaim}
                onReject={actions.rejectClaim}
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
                            actions.restoreNotRent(u.id);
                            toast('Moved back to Unmatched.', 'info');
                          }}
                        >
                          Move back to Unmatched
                        </Button>
                      </Card>
                    </li>
                  ))}
                </ul>
              ),
          },
        ]}
      />
      <ImportStatementDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        data={data}
        onConfirm={actions.commitImport}
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
