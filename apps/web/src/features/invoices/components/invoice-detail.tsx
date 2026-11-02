'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dialog,
  EmptyState,
  Field,
  LinkButton,
  Money,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
  useToast,
} from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { getInvoice, listPayments } from '@/demo';
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE, displayStatus } from '@/demo/billing';
import { CHANNEL_LABEL, formatDate, formatWhen } from '@/demo/format';
import { useDemoStore } from '@/demo/store';
import { useVoidedInvoices, voidInvoice } from '../voided-store';

export function InvoiceDetail({ id }: { id: string }) {
  const { data } = useDemoStore();
  const { toast } = useToast();
  const voided = useVoidedInvoices();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();

  const invoice = getInvoice(id, data);
  if (!invoice) {
    return (
      <EmptyState
        title="Invoice not found"
        description="It may belong to another organization or no longer exist."
        action={<LinkButton href="/invoices">Back to invoices</LinkButton>}
      />
    );
  }

  const shown = displayStatus(invoice, voided);
  const isVoid = shown === 'void';
  const payments = listPayments({}, data).filter(
    (p) => p.invoiceId === invoice.id && p.status === 'matched',
  );

  function confirmVoid() {
    if (reason.trim().length < 5) return setError('Add a reason (at least 5 characters).');
    voidInvoice(id);
    setOpen(false);
    setReason('');
    setError(undefined);
    toast(`Invoice ${invoice?.number} voided. A reversal entry was created.`, 'ok');
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={`Invoices / ${invoice.number}`}
        title={`Invoice ${invoice.number}`}
        actions={
          <>
            <LinkButton href="/invoices" variant="ghost">
              Back to invoices
            </LinkButton>
            <Button variant="danger" disabled={isVoid} onClick={() => setOpen(true)}>
              {isVoid ? 'Voided' : 'Void invoice'}
            </Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted">Tenant</span>
          <strong>{invoice.tenantName}</strong>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted">Unit</span>
          <strong>
            {invoice.unitCode} · {invoice.propertyName}
          </strong>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted">Period</span>
          <strong>{invoice.period}</strong>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted">Issued / due</span>
          <strong>
            {formatDate(invoice.issueDate)} / {formatDate(invoice.dueDate)}
          </strong>
        </div>
        <Badge tone={INVOICE_STATUS_TONE[shown]}>{INVOICE_STATUS_LABEL[shown]}</Badge>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card aria-labelledby="lines">
          <CardHeader id="lines" title="Charges" />
          <Table minWidth={320}>
            <THead>
              <TR>
                <TH>Description</TH>
                <TH align="right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {invoice.lines.map((l, idx) => (
                <TR key={`${l.kind}-${idx}`}>
                  <TD>{l.label}</TD>
                  <TD align="right">
                    <Money minor={l.amount} />
                  </TD>
                </TR>
              ))}
              {isVoid ? (
                <TR>
                  <TD className="text-danger">Reversal of {invoice.number}</TD>
                  <TD align="right" className="text-danger">
                    <Money minor={-invoice.total} />
                  </TD>
                </TR>
              ) : null}
              <TR>
                <TD className="font-bold">Total</TD>
                <TD align="right" className="font-bold">
                  <Money minor={isVoid ? 0 : invoice.total} />
                </TD>
              </TR>
            </TBody>
          </Table>
        </Card>

        <Card aria-labelledby="paid">
          <CardHeader id="paid" title="Payments allocated" />
          {payments.length === 0 ? (
            <p className="m-0 text-sm text-muted">
              No payments have been applied to this invoice yet.
            </p>
          ) : (
            <Table minWidth={360}>
              <THead>
                <TR>
                  <TH>Received</TH>
                  <TH>Channel</TH>
                  <TH>Reference</TH>
                  <TH align="right">Amount</TH>
                </TR>
              </THead>
              <TBody>
                {payments.map((p) => (
                  <TR key={p.id}>
                    <TD>{formatWhen(p.receivedAt)}</TD>
                    <TD>{CHANNEL_LABEL[p.channel]}</TD>
                    <TD className="font-mono text-xs">{p.reference}</TD>
                    <TD align="right">
                      <Money minor={p.amount} prefix={false} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-divider pt-3">
            <span className="font-semibold">Balance</span>
            <Money minor={isVoid ? 0 : invoice.balance} className="text-xl font-bold" />
          </div>
          <p className="mt-2 mb-0 text-xs text-muted">
            Paid so far <Money minor={invoice.paid} />. Payments go straight to your paybill or
            bank; Kodibox only reconciles them. Unmatched payments are handled in{' '}
            <Link href="/payments" className="font-semibold text-brand">
              Payments
            </Link>
            .
          </p>
        </Card>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Void invoice ${invoice.number}`}
        description="Nothing is deleted. A reversal entry is created that offsets this invoice, and the original stays on the tenant ledger."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmVoid}>
              Void and create reversal
            </Button>
          </>
        }
      >
        <Field label="Reason (saved in the audit log)" htmlFor="void-reason" error={error}>
          <Textarea id="void-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {invoice.paid > 0 ? (
          <p className="m-0 text-sm text-warn">
            This invoice has payments applied. They return to the tenant as credit rather than
            disappearing.
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
